function applyEvent(state, event) {
  if (!event || !event.type) {
    return;
  }
  switch (event.type) {
    case 'WorksiteUpdated': {
      const { id, filled, blocked } = event.payload || {};
      const updates = {};
      if (typeof filled === 'boolean') {
        updates.filled = filled;
      }
      if (typeof blocked === 'boolean') {
        updates.blocked = blocked;
      }
      state.setWorksiteState(id, updates);
      return;
    }
    default:
      return;
  }
}

module.exports = {
  applyEvent
};
