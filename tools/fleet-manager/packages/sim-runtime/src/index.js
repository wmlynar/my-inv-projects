"use strict";

const { ManualClock } = require("@fleet-manager/core-time");
const MotionKernel = require("./motion_kernel");
const { createFleetSim } = require("./fleet_sim");
const Algorithms = require("./algorithms");

class SimRuntime {
  constructor(options = {}) {
    this.graph = options.graph || null;
    this.timingModel = options.timingModel || null;
    this.clock = options.clock || new ManualClock(0);
    this.robots = new Map();
  }

  setRobots(robots = []) {
    this.robots.clear();
    robots.forEach((robot) => {
      this.robots.set(robot.id, {
        id: robot.id,
        nodeId: robot.start,
        goal: robot.goal || null,
        pose: null,
        route: null,
        schedule: null,
        segmentIndex: 0,
        lastSegmentEnd: null
      });
    });
  }

  applyPlans(plans = []) {
    plans.forEach((plan) => {
      const robot = this.robots.get(plan.robotId);
      if (!robot) return;
      robot.route = plan.route || null;
      robot.schedule = plan.schedule || null;
      robot.segmentIndex = 0;
      robot.lastSegmentEnd = null;
    });
  }

  tick(deltaMs) {
    this.clock.advance(deltaMs);
    const now = this.clock.now();
    for (const robot of this.robots.values()) {
      const schedule = robot.schedule || [];
      const segments = robot.route?.segments || [];
      if (!schedule.length || robot.segmentIndex >= schedule.length) {
        continue;
      }
      const entry = schedule[robot.segmentIndex];
      const segment = segments[robot.segmentIndex];
      if (!entry || !segment) {
        continue;
      }
      if (now >= entry.endTime) {
        robot.nodeId = segment.end;
        robot.segmentIndex += 1;
        robot.lastSegmentEnd = entry.endTime;
        if (this.timingModel) {
          this.timingModel.record(segment.id, entry.endTime - entry.startTime);
        }
        continue;
      }
      if (now >= entry.startTime) {
        const ratio = Math.min(1, Math.max(0, (now - entry.startTime) / (entry.endTime - entry.startTime)));
        const startNode = this.graph?.nodeById?.get(segment.start);
        const endNode = this.graph?.nodeById?.get(segment.end);
        if (startNode && endNode) {
          robot.pose = {
            x: startNode.pos.x + (endNode.pos.x - startNode.pos.x) * ratio,
            y: startNode.pos.y + (endNode.pos.y - startNode.pos.y) * ratio
          };
        }
      }
    }
  }

  snapshot() {
    return {
      timeMs: this.clock.now(),
      robots: Array.from(this.robots.values()).map((robot) => ({
        id: robot.id,
        nodeId: robot.nodeId,
        goal: robot.goal,
        pose: robot.pose,
        segmentIndex: robot.segmentIndex
      }))
    };
  }
}

module.exports = {
  SimRuntime,
  MotionKernel,
  createFleetSim,
  Algorithms
};
