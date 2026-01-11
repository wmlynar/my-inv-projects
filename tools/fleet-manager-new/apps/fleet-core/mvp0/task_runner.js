const DEFAULT_TOLERANCE_M = 0.02;
const DEFAULT_PICK_HEIGHT_M = 1.2;
const DEFAULT_DROP_HEIGHT_M = 0.1;

function buildPickDropSteps(task) {
  const steps = [];
  const pickHeight = Number.isFinite(task.pickHeightM) ? task.pickHeightM : DEFAULT_PICK_HEIGHT_M;
  const dropHeight = Number.isFinite(task.dropHeightM) ? task.dropHeightM : DEFAULT_DROP_HEIGHT_M;

  let index = 1;
  if (task.fromNodeId) {
    steps.push(buildMoveStep(task, task.fromNodeId, index++));
  }
  steps.push(buildForkStep(task, pickHeight, index++));
  if (task.toNodeId) {
    steps.push(buildMoveStep(task, task.toNodeId, index++));
  }
  steps.push(buildForkStep(task, dropHeight, index++));
  if (task.parkNodeId) {
    steps.push(buildMoveStep(task, task.parkNodeId, index++));
  }

  return steps;
}

function buildMoveStep(task, nodeId, index) {
  return {
    stepId: `${task.taskId}:step:${index}`,
    type: 'moveTo',
    status: 'pending',
    statusReasonCode: 'NONE',
    targetRef: { nodeId },
    params: null
  };
}

function buildForkStep(task, toHeightM, index) {
  return {
    stepId: `${task.taskId}:step:${index}`,
    type: 'forkHeight',
    status: 'pending',
    statusReasonCode: 'NONE',
    targetRef: null,
    params: { toHeightM }
  };
}

function updateTaskForRobot(task, robot, options = {}) {
  if (!task.steps || task.steps.length === 0) {
    task.steps = buildPickDropSteps(task);
  }
  if (task.status === 'assigned') {
    task.status = 'running';
  }

  let activeStep = task.steps.find((step) => step.status !== 'completed');
  if (!activeStep) {
    task.status = 'completed';
    return { task, activeStep: null };
  }

  const toleranceM = Number.isFinite(options.toleranceM)
    ? options.toleranceM
    : DEFAULT_TOLERANCE_M;

  if (activeStep.type === 'moveTo') {
    if (robot?.nodeId && activeStep.targetRef?.nodeId && robot.nodeId === activeStep.targetRef.nodeId) {
      activeStep.status = 'completed';
    }
  } else if (activeStep.type === 'forkHeight') {
    if (Number.isFinite(robot?.forkHeightM) && Number.isFinite(activeStep.params?.toHeightM)) {
      if (Math.abs(robot.forkHeightM - activeStep.params.toHeightM) <= toleranceM) {
        activeStep.status = 'completed';
      }
    }
  }

  activeStep = task.steps.find((step) => step.status !== 'completed');
  if (!activeStep) {
    task.status = 'completed';
    return { task, activeStep: null };
  }

  if (activeStep.status === 'pending') {
    activeStep.status = 'running';
  }

  return { task, activeStep };
}

function commandForStep(robotId, step) {
  if (!step) return null;
  if (step.type === 'moveTo') {
    if (!step.targetRef?.nodeId) return null;
    return {
      robotId,
      type: 'goTarget',
      payload: { targetRef: { nodeId: step.targetRef.nodeId } }
    };
  }
  if (step.type === 'forkHeight') {
    if (!Number.isFinite(step.params?.toHeightM)) return null;
    return {
      robotId,
      type: 'forkHeight',
      payload: { toHeightM: step.params.toHeightM }
    };
  }
  return null;
}

module.exports = {
  DEFAULT_TOLERANCE_M,
  buildPickDropSteps,
  updateTaskForRobot,
  commandForStep
};
