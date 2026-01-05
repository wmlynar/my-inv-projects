# Robokit Client

Thin TCP wrapper around Robokit APIs, exposing the calls we expect to use in the
fleet manager.

```js
const { RobokitClient } = require('../shared/robokit_client');

const robot = new RobokitClient({ host: '127.0.0.1' });
const status = await robot.getStatusLoc();
```

Multi-robot helper:

```js
const { RobokitFleet } = require('../shared/robokit_fleet');

const fleet = new RobokitFleet();
fleet.addRobot('RB-01', { host: '10.0.0.11' });
fleet.addRobot('RB-02', { host: '10.0.0.12' });

fleet.on('push', (id, payload) => {
  console.log(id, payload);
});

fleet.connectPushAll({ intervalMs: 500, fields: ['x', 'y', 'task_status'] });
```

Optional settings:
- `retries`, `retryDelayMs`
- `retryMaxDelayMs`, `retryBackoffFactor`, `retryJitterMs`
- `maxConcurrent`
- `failureThreshold`, `circuitOpenMs`
- `healthCheckIntervalMs`, `offlineThresholdMs`
- `payloadTransform` (e.g. `RobokitClient.snakeCasePayload`)
- `pushPort`, `pushReconnect`, `pushReconnectDelayMs`
- `pushReconnectMaxDelayMs`, `pushReconnectBackoffFactor`

## Status

- `getStatusInfo()`
- `getStatusRun()`
- `getStatusMode()`
- `getStatusLoc()`
- `getStatusSpeed()`
- `getStatusBlock()`
- `getStatusBattery()`
- `getStatusPath()`
- `getStatusArea()`
- `getStatusEmergency()`
- `getStatusIo()`
- `getStatusImu()`
- `getStatusUltrasonic()`
- `getStatusObstacle()`
- `getStatusTask()`
- `getStatusReloc()`
- `getStatusLoadMap()`
- `getStatusTaskList()`
- `getStatusFork()`
- `getStatusAlarm()`
- `getStatusAll()`
- `getStatusMap()`
- `getStatusStations()`
- `getStatusParams()`

## Control

- `controlStop()`
- `controlReloc(payload)`
- `controlLoadMap(payload)`

## Tasks

- `goTarget(id)`
- `goPoint(x, y, angle)`
- `goMultiStation(taskList)`
- `pauseTask()`
- `resumeTask()`
- `cancelTask()`
- `getTaskPath()`
- `clearTask()`
- `clearMultiStation()`

## IO / Other

- `setDo(payload)`
- `setDoBatch(payload)`
- `setDi(payload)`
- `forkHeight(payload)`
- `forkStop(payload)`
- `audioPlay(payload)`

## Push stream

```js
const robot = new RobokitClient({ host: '127.0.0.1', pushReconnect: true });
robot.on('push', (payload) => {
  console.log('push', payload);
});
robot.on('offline', () => {
  console.log('robot offline');
});
robot.on('online', () => {
  console.log('robot online');
});
robot.on('push_config', (ack) => {
  console.log('push config ok', ack);
});
robot.connectPush({ intervalMs: 500, fields: ['x', 'y', 'task_status'] });
robot.startHealthCheck();
```

## Payload normalization

```js
const robot = new RobokitClient({
  host: '127.0.0.1',
  payloadTransform: RobokitClient.snakeCasePayload
});
```
