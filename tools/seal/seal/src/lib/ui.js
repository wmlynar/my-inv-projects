"use strict";

let chalk = require("chalk");
chalk = chalk.default ?? chalk;

function info(msg) { console.log(chalk.cyan("[INFO]"), msg); }
function warn(msg) { console.log(chalk.yellow("[WARN]"), msg); }
function err(msg) { console.error(chalk.red("[ERR ]"), msg); }
function ok(msg) { console.log(chalk.green("[ OK ]"), msg); }

function hr() { console.log(chalk.gray("—".repeat(72))); }

module.exports = { info, warn, err, ok, hr };
