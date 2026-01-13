const path = require('path');

const assert = (condition, message) => {
  if (!condition) {
    throw new Error(message);
  }
};

const createBus = () => {
  const listeners = new Map();
  return {
    on(event, handler) {
      if (!event || typeof handler !== 'function') return () => {};
      const bucket = listeners.get(event) || new Set();
      bucket.add(handler);
      listeners.set(event, bucket);
      return () => {
        const current = listeners.get(event);
        if (!current) return;
        current.delete(handler);
      };
    },
    emit(event, payload) {
      const bucket = listeners.get(event);
      if (!bucket) return;
      bucket.forEach((handler) => handler(payload));
    }
  };
};

const callKeys = [
  'map.renderMap',
  'map.refreshSimObstacles',
  'robots.refreshRobotDiagnostics',
  'robots.renderManualDrivePanel',
  'robots.refreshRobotViews',
  'robotsView.render',
  'robotsView.syncFaultRobotSelect',
  'streamsView.render',
  'streamsView.renderFields',
  'streamsView.renderTasks',
  'streamsView.renderTrafficDiagnostics',
  'settingsView.render',
  'packaging.renderPackaging',
  'packaging.refreshPackagingState'
];

const calls = callKeys.reduce((acc, key) => {
  acc[key] = 0;
  return acc;
}, {});

const makeSpy = (key) => () => {
  calls[key] += 1;
};

const resetCalls = () => {
  callKeys.forEach((key) => {
    calls[key] = 0;
  });
};

global.window = {
  FleetUI: {
    App: {}
  }
};
global.document = {};

const App = global.window.FleetUI.App;
App.constants = {};
App.state = {};
App.elements = {};
App.helpers = {};
App.viewMeta = {};
App.services = {
  robotsView: {
    render: makeSpy('robotsView.render'),
    syncFaultRobotSelect: makeSpy('robotsView.syncFaultRobotSelect')
  },
  streamsView: {
    render: makeSpy('streamsView.render'),
    renderFields: makeSpy('streamsView.renderFields'),
    renderTasks: makeSpy('streamsView.renderTasks'),
    renderTrafficDiagnostics: makeSpy('streamsView.renderTrafficDiagnostics')
  },
  settingsView: {
    render: makeSpy('settingsView.render')
  }
};
App.bus = createBus();
App.map = {
  renderMap: makeSpy('map.renderMap'),
  refreshSimObstacles: () => {
    calls['map.refreshSimObstacles'] += 1;
    return Promise.resolve();
  }
};
App.robots = {
  refreshRobotDiagnostics: makeSpy('robots.refreshRobotDiagnostics'),
  renderManualDrivePanel: makeSpy('robots.renderManualDrivePanel'),
  refreshRobotViews: makeSpy('robots.refreshRobotViews')
};
App.packaging = {
  renderPackaging: makeSpy('packaging.renderPackaging'),
  refreshPackagingState: makeSpy('packaging.refreshPackagingState')
};
App.data = {
  isLocalSim: () => true
};

require(path.resolve(__dirname, '../../public/modules/app/app_ui.js'));

assert(App.ui && typeof App.ui.initBus === 'function', 'App.ui.initBus missing');
App.ui.initBus();

App.bus.emit('state:changed', { reason: 'map_bundle' });

const mapBundleExpected = {
  'map.renderMap': 1,
  'map.refreshSimObstacles': 1,
  'robots.refreshRobotDiagnostics': 1,
  'robots.renderManualDrivePanel': 1,
  'robotsView.render': 1,
  'streamsView.render': 1,
  'streamsView.renderFields': 1,
  'streamsView.renderTasks': 1,
  'streamsView.renderTrafficDiagnostics': 1,
  'settingsView.render': 1,
  'packaging.renderPackaging': 1,
  'packaging.refreshPackagingState': 1
};

callKeys.forEach((key) => {
  const expected = mapBundleExpected[key] || 0;
  assert(calls[key] === expected, `map_bundle expected ${key}=${expected} got ${calls[key]}`);
});

resetCalls();

App.bus.emit('state:changed', { reason: 'fleet_status' });

const fleetStatusExpected = {
  'robots.refreshRobotViews': 1,
  'streamsView.renderTasks': 1,
  'robotsView.syncFaultRobotSelect': 1
};

callKeys.forEach((key) => {
  const expected = fleetStatusExpected[key] || 0;
  assert(calls[key] === expected, `fleet_status expected ${key}=${expected} got ${calls[key]}`);
});

console.log('ok - app ui bus renders');
