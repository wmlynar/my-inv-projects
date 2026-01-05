const fs = require('fs');
const path = require('path');

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

class EventLog {
  constructor(filePath) {
    this.filePath = filePath;
    ensureDir(path.dirname(filePath));
  }

  append(event) {
    if (!event) {
      return;
    }
    const line = `${JSON.stringify(event)}\n`;
    fs.appendFileSync(this.filePath, line, 'utf8');
  }
}

module.exports = {
  EventLog
};
