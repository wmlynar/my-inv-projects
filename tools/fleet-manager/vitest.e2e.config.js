const path = require("node:path");

module.exports = {
  test: {
    include: [path.join(__dirname, "e2e", "**", "*.test.mjs")],
    environment: "node",
    testTimeout: 60000
  }
};
