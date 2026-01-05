"use strict";

const { RdsHttpClient } = require("./rds_http_client");
const { loadRdsScene, parseRdsScene, propsToMap } = require("./rds_scene");
const { findRobotParamPath, parseRobotParam } = require("./rds_param");

const mapRdsStatus = (status) => {
  if (!status) return "unknown";
  if (status === "idle") return "ready";
  if (status === "moving") return "in_progress";
  return "unknown";
};

module.exports = {
  RdsHttpClient,
  loadRdsScene,
  parseRdsScene,
  propsToMap,
  findRobotParamPath,
  parseRobotParam,
  mapRdsStatus
};
