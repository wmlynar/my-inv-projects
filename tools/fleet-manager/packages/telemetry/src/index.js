"use strict";

const createTelemetry = () => {
  const events = [];
  return {
    emit: (type, payload) => {
      events.push({ type, payload, at: Date.now() });
    },
    snapshot: () => events.slice()
  };
};

module.exports = {
  createTelemetry
};
