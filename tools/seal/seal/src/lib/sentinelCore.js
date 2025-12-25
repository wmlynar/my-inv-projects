"use strict";

const crypto = require("crypto");

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c >>> 0;
  }
  return table;
})();

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    const byte = buf[i];
    crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function sha256(input) {
  return crypto.createHash("sha256").update(input).digest();
}

function normalizeAppId(value) {
  const raw = String(value || "").trim().toLowerCase();
  if (!raw) throw new Error("sentinel appId is empty");
  if (raw.length > 64) throw new Error(`sentinel appId too long (${raw.length} > 64)`);
  if (!/^[a-z0-9._-]+$/.test(raw)) {
    throw new Error(`sentinel appId has invalid chars: ${raw}`);
  }
  return raw;
}

function parseNamespaceId(hex32) {
  const raw = String(hex32 || "").trim().toLowerCase();
  if (!/^[0-9a-f]{32}$/.test(raw)) {
    throw new Error("namespaceId must be 16 bytes hex (32 chars)");
  }
  return Buffer.from(raw, "hex");
}

function buildAnchor(namespaceIdHex, appId) {
  const ns = parseNamespaceId(namespaceIdHex);
  const aid = Buffer.from(normalizeAppId(appId), "utf8");
  const prefix = Buffer.from([0x6e, 0x00]); // "n\0"
  const sep = Buffer.from([0x00]);
  return Buffer.concat([prefix, ns, sep, aid]);
}

function deriveOpaqueDir(namespaceIdHex) {
  const ns = parseNamespaceId(namespaceIdHex);
  const prefix = Buffer.from([0x64, 0x00]); // "d\0"
  const hash = sha256(Buffer.concat([prefix, ns])).toString("hex");
  return `.${hash.slice(0, 10)}`;
}

function deriveOpaqueFile(namespaceIdHex, appId) {
  const anchor = buildAnchor(namespaceIdHex, appId);
  const prefix = Buffer.from([0x66, 0x00]); // "f\0"
  const hash = sha256(Buffer.concat([prefix, anchor])).toString("hex");
  return hash.slice(0, 12);
}

function buildFingerprintString(level, { mid, rid, puid, eah, cpuid, includePuid, includeCpuId }) {
  const lvl = Number(level);
  if (!Number.isFinite(lvl)) throw new Error(`Invalid level: ${level}`);
  const lines = [];
  if (lvl === 0) {
    lines.push("v0");
  } else if (lvl === 1) {
    if (!mid) throw new Error("Missing machine-id for L1");
    lines.push("v1", `mid=${mid}`);
    if (includeCpuId) {
      if (!cpuid) throw new Error("Missing cpuid for L1+flag");
      lines.push(`cpuid=${cpuid}`);
    }
  } else if (lvl === 2) {
    if (!mid || !rid) throw new Error("Missing mid/rid for L2");
    lines.push("v2", `mid=${mid}`, `rid=${rid}`);
    if (includeCpuId) {
      if (!cpuid) throw new Error("Missing cpuid for L2+flag");
      lines.push(`cpuid=${cpuid}`);
    }
  } else if (lvl === 3) {
    if (!mid || !rid || !puid) throw new Error("Missing mid/rid/puid for L3");
    lines.push("v3", `mid=${mid}`, `rid=${rid}`, `puid=${puid}`);
    if (includeCpuId) {
      if (!cpuid) throw new Error("Missing cpuid for L3+flag");
      lines.push(`cpuid=${cpuid}`);
    }
  } else if (lvl === 4) {
    if (!mid || !rid || !eah) throw new Error("Missing mid/rid/eah for L4");
    lines.push("v4", `mid=${mid}`, `rid=${rid}`);
    if (includeCpuId) {
      if (!cpuid) throw new Error("Missing cpuid for L4+flag");
      lines.push(`cpuid=${cpuid}`);
    }
    if (includePuid) {
      if (!puid) throw new Error("Missing puid for L4+flag");
      lines.push(`puid=${puid}`);
    }
    lines.push(`eah=${eah}`);
  } else {
    throw new Error(`Unsupported level: ${level}`);
  }
  return lines.join("\n") + "\n";
}

function maskBytes(buf, maskKey) {
  const out = Buffer.allocUnsafe(buf.length);
  for (let i = 0; i < buf.length; i++) {
    out[i] = buf[i] ^ maskKey[i % maskKey.length];
  }
  return out;
}

function packBlobV1({ level, flags, installId, fpHash }, anchor) {
  if (!Buffer.isBuffer(installId) || installId.length !== 32) {
    throw new Error("installId must be 32 bytes");
  }
  if (!Buffer.isBuffer(fpHash) || fpHash.length !== 32) {
    throw new Error("fpHash must be 32 bytes");
  }
  const blob = Buffer.alloc(76);
  blob.writeUInt8(1, 0); // version
  blob.writeUInt8(Number(level) & 0xff, 1);
  blob.writeUInt16LE(Number(flags) & 0xffff, 2);
  blob.writeUInt32LE(0, 4); // reserved
  installId.copy(blob, 8);
  fpHash.copy(blob, 40);

  const maskKey = sha256(Buffer.concat([Buffer.from([0x6d, 0x00]), anchor])); // "m\0"
  const masked = maskBytes(blob.slice(0, 72), maskKey);
  masked.copy(blob, 0);
  const crc = crc32(masked);
  blob.writeUInt32LE(crc >>> 0, 72);
  return blob;
}

function unpackBlobV1(blob, anchor) {
  if (!Buffer.isBuffer(blob) || blob.length !== 76) {
    throw new Error("blob must be 76 bytes");
  }
  const masked = blob.slice(0, 72);
  const want = blob.readUInt32LE(72);
  const got = crc32(masked);
  if ((got >>> 0) !== (want >>> 0)) {
    throw new Error("CRC32 mismatch");
  }
  const maskKey = sha256(Buffer.concat([Buffer.from([0x6d, 0x00]), anchor]));
  const raw = maskBytes(masked, maskKey);
  const version = raw.readUInt8(0);
  const level = raw.readUInt8(1);
  const flags = raw.readUInt16LE(2);
  const installId = Buffer.from(raw.slice(8, 40));
  const fpHash = Buffer.from(raw.slice(40, 72));
  return { version, level, flags, installId, fpHash };
}

module.exports = {
  crc32,
  sha256,
  normalizeAppId,
  parseNamespaceId,
  buildAnchor,
  deriveOpaqueDir,
  deriveOpaqueFile,
  buildFingerprintString,
  packBlobV1,
  unpackBlobV1,
};
