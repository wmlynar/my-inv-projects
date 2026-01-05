"use strict";

const rbk = require("./rbk");
const { RobokitClient } = require("./robokit_client");
const { RobokitFleet } = require("./robokit_fleet");
const taskStatus = require("./task_status_contract");

const mapRobokitStatus = (status) => {
  if (!status) return "unknown";
  if (status === "READY") return "ready";
  if (status === "RUNNING") return "in_progress";
  return "unknown";
};

module.exports = {
  ...rbk,
  RobokitClient,
  RobokitFleet,
  ...taskStatus,
  mapRobokitStatus
};
