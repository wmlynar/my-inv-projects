function nowIso() {
  return new Date().toISOString();
}

function createEvent(type, payload) {
  return {
    type,
    at: nowIso(),
    payload: payload || {}
  };
}

module.exports = {
  createEvent
};
