"use strict";

const { TrafficStrategies } = require("@fleet-manager/core-mapf");

const listTrafficStrategies = () => {
  if (!TrafficStrategies?.list) return [];
  return TrafficStrategies.list().map((entry) => entry.name);
};

const cli = () => {
  const args = process.argv.slice(2);
  if (args.includes("--list")) {
    console.log(listTrafficStrategies().join("\n"));
    return;
  }
  require("./server");
};

module.exports = {
  cli
};
