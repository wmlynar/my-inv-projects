#include <node.h>
#include <node_buffer.h>
#include <v8.h>

#include <errno.h>
#include <fcntl.h>
#include <limits.h>
#include <stdint.h>
#include <stdlib.h>
#include <string.h>
#include <sys/mman.h>
#include <sys/stat.h>
#include <sys/types.h>
#include <sys/wait.h>
#include <unistd.h>

namespace seal_thin_native {

static void wipe_bytes(void *ptr, size_t len) {
#if defined(__GLIBC__) && defined(__GLIBC_PREREQ)
#if __GLIBC_PREREQ(2, 25)
  explicit_bzero(ptr, len);
#else
  volatile unsigned char *p = reinterpret_cast<volatile unsigned char *>(ptr);
  while (len--) {
    *p++ = 0;
  }
#endif
#else
  volatile unsigned char *p = reinterpret_cast<volatile unsigned char *>(ptr);
  while (len--) {
    *p++ = 0;
  }
#endif
}

static void best_effort_protect(void *ptr, size_t len) {
  if (!ptr || len == 0) return;
#ifdef MADV_DONTDUMP
  (void)madvise(ptr, len, MADV_DONTDUMP);
#endif
#ifdef MADV_DONTFORK
  (void)madvise(ptr, len, MADV_DONTFORK);
#endif
#ifdef MADV_WIPEONFORK
  (void)madvise(ptr, len, MADV_WIPEONFORK);
#endif
#ifdef MADV_UNMERGEABLE
  (void)madvise(ptr, len, MADV_UNMERGEABLE);
#endif
  (void)mlock(ptr, len);
}

static bool read_fully(int fd, uint8_t *buf, size_t len) {
  size_t off = 0;
  while (off < len) {
    ssize_t rc = read(fd, buf + off, len - off);
    if (rc == 0) return false;
    if (rc < 0) {
      if (errno == EINTR) continue;
      return false;
    }
    off += static_cast<size_t>(rc);
  }
  return true;
}

static bool is_ascii(const uint8_t *buf, size_t len) {
  for (size_t i = 0; i < len; i++) {
    if (buf[i] & 0x80) return false;
  }
  return true;
}

static size_t utf8_to_utf16(const uint8_t *in, size_t len, uint16_t *out) {
  size_t i = 0;
  size_t o = 0;
  while (i < len) {
    uint32_t cp = 0xfffd;
    uint8_t c = in[i];
    if (c < 0x80) {
      cp = c;
      i += 1;
    } else if ((c & 0xe0) == 0xc0 && i + 1 < len && (in[i + 1] & 0xc0) == 0x80) {
      cp = ((uint32_t)(c & 0x1f) << 6) | (uint32_t)(in[i + 1] & 0x3f);
      if (cp < 0x80) cp = 0xfffd;
      i += 2;
    } else if ((c & 0xf0) == 0xe0 && i + 2 < len &&
               (in[i + 1] & 0xc0) == 0x80 && (in[i + 2] & 0xc0) == 0x80) {
      cp = ((uint32_t)(c & 0x0f) << 12) | ((uint32_t)(in[i + 1] & 0x3f) << 6) |
           (uint32_t)(in[i + 2] & 0x3f);
      if (cp < 0x800 || (cp >= 0xd800 && cp <= 0xdfff)) cp = 0xfffd;
      i += 3;
    } else if ((c & 0xf8) == 0xf0 && i + 3 < len &&
               (in[i + 1] & 0xc0) == 0x80 && (in[i + 2] & 0xc0) == 0x80 &&
               (in[i + 3] & 0xc0) == 0x80) {
      cp = ((uint32_t)(c & 0x07) << 18) | ((uint32_t)(in[i + 1] & 0x3f) << 12) |
           ((uint32_t)(in[i + 2] & 0x3f) << 6) | (uint32_t)(in[i + 3] & 0x3f);
      if (cp < 0x10000 || cp > 0x10ffff) cp = 0xfffd;
      i += 4;
    } else {
      cp = 0xfffd;
      i += 1;
    }

    if (cp <= 0xffff) {
      out[o++] = static_cast<uint16_t>(cp);
    } else {
      cp -= 0x10000;
      out[o++] = static_cast<uint16_t>(0xd800 + (cp >> 10));
      out[o++] = static_cast<uint16_t>(0xdc00 + (cp & 0x3ff));
    }
  }
  return o;
}

static void throw_error(v8::Isolate *isolate, const char *msg) {
  isolate->ThrowException(
    v8::Exception::Error(v8::String::NewFromUtf8(isolate, msg, v8::NewStringType::kNormal).ToLocalChecked())
  );
}

class ExternalOneByteResource : public v8::String::ExternalOneByteStringResource {
 public:
  ExternalOneByteResource(char *data, size_t len) : data_(data), len_(len) {}
  const char *data() const override { return data_; }
  size_t length() const override { return len_; }
  void Dispose() override {
    if (data_) {
      wipe_bytes(data_, len_);
      munmap(data_, len_);
      data_ = nullptr;
    }
    delete this;
  }

 private:
  char *data_;
  size_t len_;
};

class ExternalTwoByteResource : public v8::String::ExternalStringResource {
 public:
  ExternalTwoByteResource(uint16_t *data, size_t len) : data_(data), len_(len) {}
  const uint16_t *data() const override { return data_; }
  size_t length() const override { return len_; }
  void Dispose() override {
    if (data_) {
      wipe_bytes(data_, len_ * sizeof(uint16_t));
      munmap(data_, len_ * sizeof(uint16_t));
      data_ = nullptr;
    }
    delete this;
  }

 private:
  uint16_t *data_;
  size_t len_;
};

static void ReadExternalStringFromFd(const v8::FunctionCallbackInfo<v8::Value> &args) {
  v8::Isolate *isolate = args.GetIsolate();
  v8::HandleScope scope(isolate);

  if (args.Length() < 1 || !args[0]->IsInt32()) {
    throw_error(isolate, "expected fd (int)");
    return;
  }

  int fd = args[0]->Int32Value(isolate->GetCurrentContext()).FromMaybe(-1);
  if (fd < 0) {
    throw_error(isolate, "invalid fd");
    return;
  }

  struct stat st;
  if (fstat(fd, &st) != 0) {
    (void)close(fd);
    throw_error(isolate, "fstat failed");
    return;
  }
  if (st.st_size == 0) {
    (void)close(fd);
    args.GetReturnValue().Set(v8::String::Empty(isolate));
    return;
  }
  if (st.st_size < 0 || static_cast<unsigned long long>(st.st_size) > static_cast<unsigned long long>(SIZE_MAX)) {
    (void)close(fd);
    throw_error(isolate, "invalid size");
    return;
  }

  size_t len = static_cast<size_t>(st.st_size);
  void *raw_map = mmap(nullptr, len, PROT_READ | PROT_WRITE, MAP_PRIVATE | MAP_ANONYMOUS, -1, 0);
  if (raw_map == MAP_FAILED) {
    (void)close(fd);
    throw_error(isolate, "mmap failed");
    return;
  }

  uint8_t *raw = reinterpret_cast<uint8_t *>(raw_map);
  if (!read_fully(fd, raw, len)) {
    (void)close(fd);
    wipe_bytes(raw, len);
    munmap(raw, len);
    throw_error(isolate, "read failed");
    return;
  }
  (void)close(fd);

  if (is_ascii(raw, len)) {
    best_effort_protect(raw, len);
    ExternalOneByteResource *res = new ExternalOneByteResource(reinterpret_cast<char *>(raw), len);
    v8::Local<v8::String> str;
    if (!v8::String::NewExternalOneByte(isolate, res).ToLocal(&str)) {
      res->Dispose();
      throw_error(isolate, "external string failed");
      return;
    }
    args.GetReturnValue().Set(str);
    return;
  }

  if (len > SIZE_MAX / sizeof(uint16_t)) {
    wipe_bytes(raw, len);
    munmap(raw, len);
    throw_error(isolate, "size overflow");
    return;
  }

  void *out_map = mmap(nullptr, len * sizeof(uint16_t), PROT_READ | PROT_WRITE,
                       MAP_PRIVATE | MAP_ANONYMOUS, -1, 0);
  if (out_map == MAP_FAILED) {
    wipe_bytes(raw, len);
    munmap(raw, len);
    throw_error(isolate, "mmap failed");
    return;
  }

  uint16_t *out = reinterpret_cast<uint16_t *>(out_map);
  size_t out_len = utf8_to_utf16(raw, len, out);
  wipe_bytes(raw, len);
  munmap(raw, len);

  best_effort_protect(out, out_len * sizeof(uint16_t));
  ExternalTwoByteResource *res = new ExternalTwoByteResource(out, out_len);
  v8::Local<v8::String> str;
  if (!v8::String::NewExternalTwoByte(isolate, res).ToLocal(&str)) {
    res->Dispose();
    throw_error(isolate, "external string failed");
    return;
  }
  args.GetReturnValue().Set(str);
}

static int masked_contains(const uint8_t *buf, size_t len, const uint8_t *mask, size_t mask_len, uint8_t key) {
  if (!buf || !mask || mask_len == 0 || len < mask_len) return 0;
  for (size_t i = 0; i <= len - mask_len; i++) {
    int ok = 1;
    for (size_t j = 0; j < mask_len; j++) {
      if ((buf[i + j] ^ key) != mask[j]) {
        ok = 0;
        break;
      }
    }
    if (ok) return 1;
  }
  return 0;
}

static int parse_hex_uintptr(const char **ptr, uintptr_t *out) {
  const char *p = *ptr;
  uintptr_t val = 0;
  int digits = 0;
  while (*p) {
    char c = *p;
    int v = -1;
    if (c >= '0' && c <= '9') v = c - '0';
    else if (c >= 'a' && c <= 'f') v = 10 + (c - 'a');
    else if (c >= 'A' && c <= 'F') v = 10 + (c - 'A');
    else break;
    val = (val << 4) | (uintptr_t)v;
    digits++;
    p++;
  }
  if (digits == 0) return 0;
  *out = val;
  *ptr = p;
  return 1;
}

static const char *skip_spaces(const char *p) {
  while (*p == ' ' || *p == '\t') p++;
  return p;
}

static int is_anon_path(const char *path) {
  if (!path || *path == '\0') return 1;
  if (path[0] != '[') return 0;
  if (strncmp(path, "[heap]", 6) == 0) return 1;
  if (strncmp(path, "[anon", 5) == 0) return 1;
  if (strncmp(path, "[stack", 6) == 0) return 1;
  return 0;
}

static int scan_range_fd(int memfd,
                         uintptr_t start,
                         uintptr_t end,
                         const uint8_t *mask,
                         size_t mask_len,
                         uint8_t key,
                         size_t max_total,
                         size_t max_region,
                         size_t *scanned,
                         uint8_t *chunk_buf,
                         size_t chunk_cap,
                         uint8_t *carry_buf,
                         size_t carry_cap) {
  if (end <= start) return 0;
  uintptr_t addr = start;
  size_t carry_len = 0;
  while (addr < end) {
    if (*scanned >= max_total) return 0;
    size_t remaining = max_total - *scanned;
    uintptr_t region_left = end - addr;
    size_t chunk = max_region;
    if (chunk > chunk_cap) chunk = chunk_cap;
    if (chunk > region_left) chunk = (size_t)region_left;
    if (chunk > remaining) chunk = remaining;
    if (chunk == 0) break;
    ssize_t read_len = pread(memfd, chunk_buf, chunk, (off_t)addr);
    if (read_len <= 0) {
      addr += chunk;
      continue;
    }
    *scanned += (size_t)read_len;
    if (carry_len > 0 && carry_buf && carry_cap > 0) {
      size_t combined_len = carry_len + (size_t)read_len;
      uint8_t *tmp = chunk_buf;
      memmove(tmp + carry_len, tmp, (size_t)read_len);
      memcpy(tmp, carry_buf, carry_len);
      if (masked_contains(tmp, combined_len, mask, mask_len, key)) return 1;
      if (mask_len > 1) {
        size_t tail = mask_len - 1;
        if (tail > combined_len) tail = combined_len;
        memcpy(carry_buf, tmp + combined_len - tail, tail);
        carry_len = tail;
      }
    } else {
      if (masked_contains(chunk_buf, (size_t)read_len, mask, mask_len, key)) return 1;
      if (mask_len > 1 && carry_buf && carry_cap > 0) {
        size_t tail = mask_len - 1;
        if (tail > (size_t)read_len) tail = (size_t)read_len;
        memcpy(carry_buf, chunk_buf + (size_t)read_len - tail, tail);
        carry_len = tail;
      }
    }
    addr += (uintptr_t)chunk;
  }
  return 0;
}

static int scan_self_memory_masked(const uint8_t *mask,
                                   size_t mask_len,
                                   uint8_t key,
                                   size_t max_total,
                                   size_t max_region,
                                   uint8_t *chunk_buf,
                                   size_t chunk_cap,
                                   uint8_t *carry_buf,
                                   size_t carry_cap) {
  if (!mask || mask_len == 0 || !chunk_buf || chunk_cap == 0) return -1;
  int memfd = open("/proc/self/mem", O_RDONLY);
  if (memfd < 0) return -1;
  int mapsfd = open("/proc/self/maps", O_RDONLY);
  if (mapsfd < 0) {
    close(memfd);
    return -1;
  }
  char buf[16384];
  char line[512];
  size_t line_len = 0;
  ssize_t nread = 0;
  size_t scanned = 0;
  int found = 0;
  while ((nread = read(mapsfd, buf, sizeof(buf))) > 0) {
    for (ssize_t i = 0; i < nread; i++) {
      char c = buf[i];
      if (c == '\n') {
        line[line_len] = '\0';
        line_len = 0;
        const char *p = line;
        uintptr_t start = 0;
        uintptr_t end = 0;
        if (!parse_hex_uintptr(&p, &start)) continue;
        if (*p != '-') continue;
        p++;
        if (!parse_hex_uintptr(&p, &end)) continue;
        p = skip_spaces(p);
        char perms[5] = {0, 0, 0, 0, 0};
        for (int k = 0; k < 4 && p[k]; k++) perms[k] = p[k];
        if (perms[0] != 'r' || perms[1] != 'w') continue;
        p += 4;
        int tokens = 0;
        while (*p && tokens < 3) {
          p = skip_spaces(p);
          if (!*p) break;
          while (*p && *p != ' ' && *p != '\t') p++;
          tokens++;
        }
        p = skip_spaces(p);
        if (!is_anon_path(p)) continue;
        int res = scan_range_fd(memfd, start, end, mask, mask_len, key,
                                max_total, max_region, &scanned,
                                chunk_buf, chunk_cap, carry_buf, carry_cap);
        if (res == 1) {
          found = 1;
          goto done;
        }
        if (scanned >= max_total) goto done;
        continue;
      }
      if (line_len < sizeof(line) - 1) {
        line[line_len++] = c;
      }
    }
  }
  if (line_len > 0 && !found) {
    line[line_len] = '\0';
    const char *p = line;
    uintptr_t start = 0;
    uintptr_t end = 0;
    if (parse_hex_uintptr(&p, &start) && *p == '-') {
      p++;
      if (parse_hex_uintptr(&p, &end)) {
        p = skip_spaces(p);
        char perms[5] = {0, 0, 0, 0, 0};
        for (int k = 0; k < 4 && p[k]; k++) perms[k] = p[k];
        if (perms[0] == 'r' && perms[1] == 'w') {
          p += 4;
          int tokens = 0;
          while (*p && tokens < 3) {
            p = skip_spaces(p);
            if (!*p) break;
            while (*p && *p != ' ' && *p != '\t') p++;
            tokens++;
          }
          p = skip_spaces(p);
          if (is_anon_path(p)) {
            int res = scan_range_fd(memfd, start, end, mask, mask_len, key,
                                    max_total, max_region, &scanned,
                                    chunk_buf, chunk_cap, carry_buf, carry_cap);
            if (res == 1) found = 1;
          }
        }
      }
    }
  }
done:
  close(mapsfd);
  close(memfd);
  if (found) return 1;
  return 0;
}

static void E2eForkScanMasked(const v8::FunctionCallbackInfo<v8::Value> &args) {
  v8::Isolate *isolate = args.GetIsolate();
  v8::HandleScope scope(isolate);

  if (args.Length() < 2 || !node::Buffer::HasInstance(args[0]) || !args[1]->IsUint32()) {
    throw_error(isolate, "expected (Buffer mask, key[, maxTotal[, maxRegion]])");
    return;
  }

  uint8_t *mask = reinterpret_cast<uint8_t *>(node::Buffer::Data(args[0]));
  size_t mask_len = node::Buffer::Length(args[0]);
  uint32_t key = args[1]->Uint32Value(isolate->GetCurrentContext()).FromMaybe(0);
  size_t max_total = (args.Length() >= 3 && args[2]->IsNumber())
    ? static_cast<size_t>(args[2]->IntegerValue(isolate->GetCurrentContext()).FromMaybe(0))
    : 16777216;
  size_t max_region = (args.Length() >= 4 && args[3]->IsNumber())
    ? static_cast<size_t>(args[3]->IntegerValue(isolate->GetCurrentContext()).FromMaybe(0))
    : 262144;

  if (!mask || mask_len == 0) {
    throw_error(isolate, "invalid mask");
    return;
  }
  if (max_total == 0) max_total = 16777216;
  if (max_region == 0) max_region = 262144;
  if (max_region < mask_len) max_region = mask_len;

  uint8_t *mask_copy = static_cast<uint8_t *>(malloc(mask_len));
  if (!mask_copy) {
    throw_error(isolate, "alloc failed");
    return;
  }
  memcpy(mask_copy, mask, mask_len);

  size_t carry_cap = mask_len > 1 ? mask_len - 1 : 0;
  size_t chunk_cap = max_region + carry_cap;
  uint8_t *chunk_buf = static_cast<uint8_t *>(malloc(chunk_cap));
  if (!chunk_buf) {
    free(mask_copy);
    throw_error(isolate, "alloc failed");
    return;
  }
  uint8_t *carry_buf = nullptr;
  if (mask_len > 1) {
    carry_buf = static_cast<uint8_t *>(malloc(carry_cap));
    if (!carry_buf) {
      free(chunk_buf);
      free(mask_copy);
      throw_error(isolate, "alloc failed");
      return;
    }
    memset(carry_buf, 0, carry_cap);
  }

  pid_t pid = fork();
  if (pid < 0) {
    if (carry_buf) free(carry_buf);
    free(chunk_buf);
    free(mask_copy);
    throw_error(isolate, "fork failed");
    return;
  }
  if (pid == 0) {
    int found = scan_self_memory_masked(mask_copy, mask_len, static_cast<uint8_t>(key),
                                        max_total, max_region, chunk_buf, chunk_cap,
                                        carry_buf, carry_cap);
    int code = (found == 1) ? 1 : (found == 0 ? 0 : 2);
    _exit(code);
  }

  int status = 0;
  if (waitpid(pid, &status, 0) < 0) {
    if (carry_buf) free(carry_buf);
    free(chunk_buf);
    free(mask_copy);
    throw_error(isolate, "waitpid failed");
    return;
  }

  if (carry_buf) free(carry_buf);
  free(chunk_buf);
  free(mask_copy);

  int code = 2;
  if (WIFEXITED(status)) {
    code = WEXITSTATUS(status);
  }
  args.GetReturnValue().Set(v8::Integer::New(isolate, code));
}

static void Initialize(v8::Local<v8::Object> exports) {
  NODE_SET_METHOD(exports, "readExternalStringFromFd", ReadExternalStringFromFd);
  NODE_SET_METHOD(exports, "e2eForkScanMasked", E2eForkScanMasked);
}

NODE_MODULE(seal_thin_native, Initialize)

}  // namespace seal_thin_native
