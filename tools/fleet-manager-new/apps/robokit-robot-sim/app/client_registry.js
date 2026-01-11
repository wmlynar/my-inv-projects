class ClientRegistry {
  constructor(options = {}) {
    this.strategy = options.strategy || 'ip';
    this.ttlMs = Number.isFinite(options.ttlMs) ? options.ttlMs : 10000;
    this.idleMs = Number.isFinite(options.idleMs) ? options.idleMs : 60000;
    this.onSessionEmpty = typeof options.onSessionEmpty === 'function' ? options.onSessionEmpty : null;
    this.onSessionExpired = typeof options.onSessionExpired === 'function' ? options.onSessionExpired : null;
    this.now = typeof options.now === 'function' ? options.now : () => Date.now();
    this.sessions = new Map();
  }

  getClientId({ ip, nickName, port }) {
    if (this.strategy === 'ip+nick+port') {
      if (nickName) {
        return `${ip}:${nickName}:${port}`;
      }
      return `${ip}:${port}`;
    }
    if (this.strategy === 'ip+nick' && nickName) {
      return `${ip}:${nickName}`;
    }
    return ip || '';
  }

  attach(context) {
    const ip = context.remoteAddress;
    const port = context.remotePort;
    const clientId = this.getClientId({ ip, port });
    let session = this.sessions.get(clientId);
    if (!session) {
      session = this.createSession(clientId, ip, null);
      this.sessions.set(clientId, session);
    }
    if (session.expiresAt) {
      session.expiresAt = null;
    }
    session.connections.add(context);
    session.lastSeenAt = this.now();
    context.clientId = clientId;
    context.clientSession = session;
    return session;
  }

  detach(context) {
    const session = context.clientSession;
    if (!session) {
      return;
    }
    session.connections.delete(context);
    session.lastSeenAt = this.now();
    if (session.connections.size === 0) {
      session.expiresAt = this.now() + this.ttlMs;
      if (this.onSessionEmpty) {
        this.onSessionEmpty(session);
      }
      if (this.ttlMs === 0) {
        if (this.onSessionExpired) {
          this.onSessionExpired(session);
        }
        this.sessions.delete(session.id);
      }
    }
  }

  touch(context) {
    const session = context.clientSession;
    if (session) {
      session.lastSeenAt = this.now();
    }
  }

  migrateByNick(ip, nickName) {
    if (!ip || !nickName || this.strategy !== 'ip+nick') {
      return null;
    }
    const newId = this.getClientId({ ip, nickName });
    let target = this.sessions.get(newId);
    if (!target) {
      target = this.createSession(newId, ip, nickName);
      this.sessions.set(newId, target);
    }
    const candidates = Array.from(this.sessions.values()).filter(
      (session) => session.ip === ip && session.id !== newId
    );
    for (const session of candidates) {
      for (const conn of session.connections) {
        target.connections.add(conn);
        conn.clientId = newId;
        conn.clientSession = target;
      }
      session.connections.clear();
      this.sessions.delete(session.id);
    }
    target.nickName = nickName;
    target.lastSeenAt = this.now();
    return target;
  }

  sweep(now = this.now()) {
    for (const session of this.sessions.values()) {
      const ttlExpired = session.expiresAt && now >= session.expiresAt;
      const idleExpired = this.idleMs && now - session.lastSeenAt >= this.idleMs;
      if (session.connections.size > 0 && idleExpired) {
        for (const conn of session.connections) {
          if (conn && conn.socket && !conn.socket.destroyed) {
            conn.socket.destroy();
          }
        }
        session.connections.clear();
      }
      if ((session.connections.size === 0 && ttlExpired) || idleExpired) {
        if (this.onSessionExpired) {
          this.onSessionExpired(session);
        }
        this.sessions.delete(session.id);
      }
    }
  }

  createSession(id, ip, nickName) {
    return {
      id,
      ip,
      nickName,
      connections: new Set(),
      lastSeenAt: this.now(),
      expiresAt: null
    };
  }
}

module.exports = {
  ClientRegistry
};
