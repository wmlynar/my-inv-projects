class CommandCache {
  constructor(options = {}) {
    this.ttlMs = Number.isFinite(options.ttlMs) ? options.ttlMs : 10000;
    this.maxEntries = Number.isFinite(options.maxEntries) ? options.maxEntries : 1000;
    this.now = typeof options.now === 'function' ? options.now : () => Date.now();
    this.entries = new Map();
  }

  makeKey(clientId, apiNo, commandId) {
    return `${clientId || ''}|${apiNo || ''}|${commandId || ''}`;
  }

  get(clientId, apiNo, commandId) {
    if (!commandId) {
      return null;
    }
    const key = this.makeKey(clientId, apiNo, commandId);
    const entry = this.entries.get(key);
    if (!entry) {
      return null;
    }
    if (entry.expiresAt && this.now() > entry.expiresAt) {
      this.entries.delete(key);
      return null;
    }
    return entry.response;
  }

  set(clientId, apiNo, commandId, response) {
    if (!commandId) {
      return;
    }
    const key = this.makeKey(clientId, apiNo, commandId);
    const expiresAt = this.ttlMs ? this.now() + this.ttlMs : null;
    this.entries.set(key, { response, expiresAt });
    this.prune();
  }

  prune() {
    if (this.maxEntries && this.entries.size > this.maxEntries) {
      const overflow = this.entries.size - this.maxEntries;
      if (overflow <= 0) {
        return;
      }
      let removed = 0;
      for (const key of this.entries.keys()) {
        this.entries.delete(key);
        removed += 1;
        if (removed >= overflow) {
          break;
        }
      }
    }
  }
}

module.exports = {
  CommandCache
};
