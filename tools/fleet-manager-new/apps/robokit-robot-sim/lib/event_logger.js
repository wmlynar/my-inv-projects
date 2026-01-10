const fs = require('fs');

class EventLogger {
  constructor(options = {}) {
    this.path = options.path || '';
    this.stdout = Boolean(options.stdout);
    this.now = typeof options.now === 'function' ? options.now : () => Date.now();
    this.stream = null;
    if (this.path) {
      this.stream = fs.createWriteStream(this.path, { flags: 'a' });
    }
  }

  log(event, payload = {}) {
    const entry = {
      ts: this.now(),
      event,
      ...payload
    };
    const line = `${JSON.stringify(entry)}\n`;
    if (this.stream) {
      this.stream.write(line);
    }
    if (this.stdout) {
      process.stdout.write(line);
    }
  }

  close() {
    if (this.stream) {
      this.stream.end();
      this.stream = null;
    }
  }
}

module.exports = {
  EventLogger
};
