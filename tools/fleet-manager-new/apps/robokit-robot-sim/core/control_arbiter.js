class ControlArbiter {
  constructor(options = {}) {
    this.robot = options.robot;
    this.defaultLockType = Number.isFinite(options.defaultLockType) ? options.defaultLockType : 2;
    this.strictUnlock = Boolean(options.strictUnlock);
    this.lockTtlMs = Number.isFinite(options.lockTtlMs) ? options.lockTtlMs : 0;
    this.onPreempt = typeof options.onPreempt === 'function' ? options.onPreempt : null;
    this.onEvent = typeof options.onEvent === 'function' ? options.onEvent : null;
    this.ownerId = null;
    this.expiresAt = null;
  }

  getOwner() {
    if (this.isExpired()) {
      return null;
    }
    return this.ownerId;
  }

  canControl(clientId) {
    if (!clientId) return false;
    if (this.isExpired()) {
      return false;
    }
    return this.ownerId === clientId;
  }

  touch(clientId) {
    if (!this.lockTtlMs) {
      return;
    }
    if (this.ownerId === clientId) {
      this.expiresAt = Date.now() + this.lockTtlMs;
    }
  }

  acquire(clientId, meta = {}) {
    if (!clientId) {
      return { ok: false, error: 'missing_client' };
    }
    const prevOwner = this.ownerId;
    const preempted = prevOwner && prevOwner !== clientId;
    this.ownerId = clientId;
    this.expiresAt = this.lockTtlMs ? Date.now() + this.lockTtlMs : null;
    this.applyLockMeta(meta);
    if (preempted && this.onPreempt) {
      this.onPreempt(prevOwner, clientId, meta);
    }
    this.emitEvent(preempted ? 'lock_preempted' : 'lock_acquired', {
      from: prevOwner,
      to: clientId,
      meta
    });
    return { ok: true, preempted, previousOwner: prevOwner };
  }

  release(clientId, reason = 'unlock') {
    if (!this.ownerId) {
      return { ok: true, released: false };
    }
    if (this.ownerId !== clientId) {
      return { ok: false, error: 'control_locked' };
    }
    this.ownerId = null;
    this.expiresAt = null;
    this.clearLockMeta();
    this.emitEvent(reason === 'timeout' ? 'lock_timeout' : 'lock_released', {
      by: clientId
    });
    return { ok: true, released: true };
  }

  releaseIfExpired() {
    if (!this.isExpired()) {
      return false;
    }
    const owner = this.ownerId;
    this.ownerId = null;
    this.expiresAt = null;
    this.clearLockMeta();
    this.emitEvent('lock_timeout', { by: owner });
    return true;
  }

  shouldRejectUnlock(clientId) {
    if (this.ownerId && this.ownerId !== clientId) {
      return this.strictUnlock;
    }
    return false;
  }

  isExpired() {
    if (!this.lockTtlMs || !this.expiresAt) {
      return false;
    }
    if (Date.now() <= this.expiresAt) {
      return false;
    }
    this.releaseIfExpired();
    return true;
  }

  applyLockMeta(meta = {}) {
    if (!this.robot) {
      return;
    }
    const info = this.robot.lockInfo || {};
    info.locked = true;
    info.nick_name = meta.nick_name || meta.nickName || info.nick_name || '';
    info.ip = meta.ip || info.ip || '';
    info.port = Number.isFinite(meta.port) ? meta.port : info.port || 0;
    info.time_t = Number.isFinite(meta.time_t) ? meta.time_t : Math.floor(Date.now() / 1000);
    info.type = Number.isFinite(meta.type) ? meta.type : this.defaultLockType;
    info.desc = meta.desc || '';
    this.robot.lockInfo = info;
    this.robot.lockRequest = meta.request || null;
  }

  clearLockMeta() {
    if (!this.robot) {
      return;
    }
    this.robot.lockInfo = {
      locked: false,
      nick_name: '',
      ip: '',
      port: 0,
      time_t: 0,
      type: this.defaultLockType,
      desc: ''
    };
    this.robot.lockRequest = null;
  }

  emitEvent(event, payload) {
    if (this.onEvent) {
      this.onEvent({ event, ...payload });
    }
  }
}

module.exports = {
  ControlArbiter
};
