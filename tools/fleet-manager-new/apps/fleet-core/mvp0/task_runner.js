const DEFAULT_TOLERANCE_M = 0.02;
const DEFAULT_PICK_HEIGHT_M = 1.2;
const DEFAULT_DROP_HEIGHT_M = 0.1;
const DEFAULT_PICK_START_HEIGHT_M = 0.1;

function buildPickDropSteps(task) {
  const steps = [];
  const pickParams = buildPickParams(task);
  const dropParams = buildDropParams(task, pickParams);

  let index = 1;
  if (task.fromNodeId) {
    steps.push(buildMoveStep(task, task.fromNodeId, index++, pickParams));
  }
  if (task.toNodeId) {
    steps.push(buildMoveStep(task, task.toNodeId, index++, dropParams));
  }

  return steps;
}

function buildMoveStep(task, nodeId, index, params) {
  return {
    stepId: `${task.taskId}:step:${index}`,
    type: 'moveTo',
    status: 'pending',
    statusReasonCode: 'NONE',
    targetRef: { nodeId },
    params: params || null
  };
}

function normalizeOperationParams(params, operation) {
  const base = params && typeof params === 'object' ? { ...params } : {};
  base.operation = base.operation || operation;
  return base;
}

function buildPickParams(task) {
  if (task.pickParams) {
    return normalizeOperationParams(task.pickParams, 'ForkLoad');
  }
  const pickHeight = Number.isFinite(task.pickHeightM) ? task.pickHeightM : DEFAULT_PICK_HEIGHT_M;
  return {
    operation: 'ForkLoad',
    start_height: DEFAULT_PICK_START_HEIGHT_M,
    end_height: pickHeight,
    recognize: false
  };
}

function buildDropParams(task, pickParams) {
  if (task.dropParams) {
    return normalizeOperationParams(task.dropParams, 'ForkUnload');
  }
  const pickHeight = Number.isFinite(task.pickHeightM)
    ? task.pickHeightM
    : (Number.isFinite(pickParams?.end_height) ? pickParams.end_height : DEFAULT_PICK_HEIGHT_M);
  const dropHeight = Number.isFinite(task.dropHeightM) ? task.dropHeightM : DEFAULT_DROP_HEIGHT_M;
  return {
    operation: 'ForkUnload',
    start_height: pickHeight,
    end_height: dropHeight,
    recognize: false
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
      payload: buildGoTargetPayload(step)
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

function buildGoTargetPayload(step) {
  const payload = { targetRef: { nodeId: step.targetRef.nodeId } };
  const params = step.params || {};
  if (params.operation) payload.operation = params.operation;
  if (params.start_height !== undefined) payload.start_height = params.start_height;
  if (params.end_height !== undefined) payload.end_height = params.end_height;
  if (params.recognize !== undefined) payload.recognize = params.recognize;
  if (params.recfile !== undefined) payload.recfile = params.recfile;
  if (params.rec_height !== undefined) payload.rec_height = params.rec_height;
  if (params.skill_name !== undefined) payload.skill_name = params.skill_name;
  return payload;
}

module.exports = {
  DEFAULT_TOLERANCE_M,
  buildPickDropSteps,
  updateTaskForRobot,
  commandForStep
};
