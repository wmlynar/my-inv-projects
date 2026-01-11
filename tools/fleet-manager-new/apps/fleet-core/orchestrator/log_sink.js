const fs = require('node:fs');

const createMemoryLogSink = () => {
  const records = [];
  return {
    records,
    writeTick(record) {
      records.push(record);
    }
  };
};

const createJsonlSink = (filePath) => {
  return {
    writeTick(record) {
      const line = `${JSON.stringify(record)}\n`;
      fs.appendFileSync(filePath, line, 'utf8');
    }
  };
};

module.exports = {
  createMemoryLogSink,
  createJsonlSink
};
