const fs = require('node:fs');

const replayRecords = (records, handler) => {
  if (!Array.isArray(records)) return;
  records.forEach((record) => {
    handler(record);
  });
};

const replayJsonl = (filePath, handler) => {
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  lines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed) return;
    handler(JSON.parse(trimmed));
  });
};

module.exports = {
  replayRecords,
  replayJsonl
};
