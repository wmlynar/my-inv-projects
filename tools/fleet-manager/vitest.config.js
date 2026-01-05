const path = require("node:path");

module.exports = {
  test: {
    include: [
      path.join(__dirname, "packages", "**", "test", "**", "*.test.mjs")
    ],
    environment: "node"
  }
};
