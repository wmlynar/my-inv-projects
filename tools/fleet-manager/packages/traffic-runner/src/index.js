"use strict";

const { ReservationTable } = require("@fleet-manager/core-reservations");
const { buildSchedule, repairSchedule } = require("@fleet-manager/core-scheduler");
const { planMultiAgent, listStrategies } = require("@fleet-manager/core-mapf");

const createRunner = (options = {}) => {
  const graph = options.graph;
  const timingModel = options.timingModel || null;
  const schedulerOptions = options.schedulerOptions || {};
  const table = options.reservationTable || new ReservationTable();

  const run = (snapshot, runOptions = {}) => {
    const timeMs = snapshot.timeMs || 0;
    const robots = snapshot.robots || [];
    const intents = planMultiAgent(graph, robots, runOptions);
    const plans = [];

    for (const intent of intents) {
      const schedule = buildSchedule(intent.route, {
        ...schedulerOptions,
        startTimeMs: timeMs,
        timingModel
      });
      const repaired = repairSchedule(
        schedule,
        table,
        (entry) => `edge:${entry.segmentId}`,
        runOptions.repairOptions || {}
      );
      if (!repaired.ok) {
        return { ok: false, error: repaired.error };
      }
      plans.push({
        robotId: intent.robotId,
        route: intent.route,
        schedule: repaired.schedule
      });
    }

    return { ok: true, plans };
  };

  return {
    run,
    reservationTable: table
  };
};

module.exports = {
  createRunner,
  listStrategies
};
