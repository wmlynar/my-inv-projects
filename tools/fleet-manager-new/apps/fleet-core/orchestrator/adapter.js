function buildCommandForStep(robot, step) {
  if (!step) return null;
  if (step.type === 'moveTo') {
    if (!step.targetRef?.nodeId) return null;
    return {
      robotId: robot.robotId,
      type: 'goTarget',
      payload: { targetRef: { nodeId: step.targetRef.nodeId } }
    };
  }
  if (step.type === 'forkHeight') {
    if (!Number.isFinite(step.params?.toHeightM)) return null;
    return {
      robotId: robot.robotId,
      type: 'forkHeight',
      payload: { toHeightM: step.params.toHeightM }
    };
  }
  return null;
}

module.exports = {
  buildCommandForStep
};
