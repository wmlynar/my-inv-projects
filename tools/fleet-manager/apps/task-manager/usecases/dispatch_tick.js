const { createEvent } = require('../domain/events');

async function dispatchTick({ scheduler, executor, eventLog }) {
  const actions = await scheduler.tick();
  if (eventLog) {
    eventLog.append(
      createEvent('ActionsPlanned', {
        count: actions.length
      })
    );
  }
  for (const action of actions) {
    const result = await executor(action);
    if (eventLog) {
      eventLog.append(
        createEvent('ActionExecuted', {
          robotId: action.robotId,
          targetId: action.targetId,
          ret_code: result && typeof result.ret_code === 'number' ? result.ret_code : null
        })
      );
    }
  }
}

module.exports = {
  dispatchTick
};
