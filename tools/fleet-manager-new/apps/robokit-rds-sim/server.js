const { startHttpStub } = require('./http_stub');
const { startTcpSim } = require('./tcp_sim');

startTcpSim();
startHttpStub();
console.log('robokit-rds-sim ready');
