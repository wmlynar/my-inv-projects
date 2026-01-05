const { createEvent } = require('../domain/events');
const { applyEvent } = require('../domain/reducers');

function updateWorksite({ state, worksiteId, updates, eventLog }) {
  const current = state.getWorksiteState(worksiteId);
  const payload = { id: worksiteId };
  if (typeof updates.filled === 'boolean') {
    payload.filled = updates.filled;
  } else {
    payload.filled = current.filled;
  }
  if (typeof updates.blocked === 'boolean') {
    payload.blocked = updates.blocked;
  } else {
    payload.blocked = current.blocked;
  }
  const event = createEvent('WorksiteUpdated', {
    id: payload.id,
    filled: payload.filled,
    blocked: payload.blocked
  });
  applyEvent(state, event);
  if (eventLog) {
    eventLog.append(event);
  }
  return state.getWorksiteState(worksiteId);
}

module.exports = {
  updateWorksite
};
