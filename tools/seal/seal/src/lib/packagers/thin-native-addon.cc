#include <node.h>
#include <v8.h>

#include <errno.h>
#include <limits.h>
#include <stdint.h>
#include <stdlib.h>
#include <string.h>
#include <sys/mman.h>
#include <sys/stat.h>
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
#ifdef MADV_WIPEONFORK
  (void)madvise(ptr, len, MADV_WIPEONFORK);
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

static void Initialize(v8::Local<v8::Object> exports) {
  NODE_SET_METHOD(exports, "readExternalStringFromFd", ReadExternalStringFromFd);
}

NODE_MODULE(seal_thin_native, Initialize)

}  // namespace seal_thin_native
