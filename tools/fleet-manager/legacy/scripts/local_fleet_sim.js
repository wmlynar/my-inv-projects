const { createFleetSim } = require("../fleet-sim-core/src");
const PackagingEngine = require("./public/packaging_engine");

function createLocalFleetSim(options = {}) {
  const packagingEngine = options.packagingEngine || PackagingEngine;
  return createFleetSim({ ...options, packagingEngine });
}

module.exports = { createLocalFleetSim };
