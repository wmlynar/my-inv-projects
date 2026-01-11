const { encodeFrame, responseApi, RbkParser } = require('../../robokit-lib/rbk');

function createRbkCodec(options = {}) {
  const parser = new RbkParser({
    maxBodyLength: options.maxBodyLength,
    strictStartMark: options.strictStartMark,
    reportErrors: Boolean(options.reportErrors)
  });

  function decode(chunk) {
    return parser.push(chunk);
  }

  function encode(seq, apiNo, payload, opts = {}) {
    return encodeFrame(seq, apiNo, payload, opts);
  }

  return {
    decode,
    encode,
    responseApi
  };
}

module.exports = {
  createRbkCodec
};
