"use strict";

const { planRoute } = require("@fleet-manager/core-planning-single");
const TrafficStrategies = require("./traffic_strategies");

const orderByPriority = (robots) => {
  return [...robots].sort((a, b) => {
    const pa = Number.isFinite(a.priority) ? a.priority : 0;
    const pb = Number.isFinite(b.priority) ? b.priority : 0;
    if (pa !== pb) return pb - pa;
    return String(a.id).localeCompare(String(b.id));
  });
};

const strategies = {
  prioritized: (graph, robots, options = {}) => {
    const ordered = orderByPriority(robots);
    return ordered.map((robot) => ({
      robotId: robot.id,
      route: planRoute(graph, robot.start, robot.goal, options)
    }));
  },
  roundRobin: (graph, robots, options = {}) => {
    const ordered = [...robots].sort((a, b) => String(a.id).localeCompare(String(b.id)));
    return ordered.map((robot) => ({
      robotId: robot.id,
      route: planRoute(graph, robot.start, robot.goal, options)
    }));
  }
};

const listStrategies = () => {
  const base = Object.keys(strategies);
  const traffic = Array.isArray(TrafficStrategies?.STRATEGY_NAMES)
    ? TrafficStrategies.STRATEGY_NAMES
    : [];
  return Array.from(new Set([...base, ...traffic]));
};

const planMultiAgent = (graph, robots, options = {}) => {
  const name = options.strategy || "prioritized";
  const strategy = strategies[name];
  if (strategy) {
    return strategy(graph, robots, options);
  }
  const trafficNames = Array.isArray(TrafficStrategies?.STRATEGY_NAMES)
    ? new Set(TrafficStrategies.STRATEGY_NAMES)
    : null;
  if (trafficNames && trafficNames.has(name)) {
    return strategies.prioritized(graph, robots, options);
  }
  throw new Error(`unknown_strategy:${name}`);
};

module.exports = {
  listStrategies,
  planMultiAgent,
  TrafficStrategies
};
