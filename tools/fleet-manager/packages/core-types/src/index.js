"use strict";

const ok = (value) => ({ ok: true, value });
const err = (error) => ({ ok: false, error });

const isOk = (result) => Boolean(result && result.ok === true);
const isErr = (result) => Boolean(result && result.ok === false);

const asId = (value, label = "id") => {
  if (value === null || value === undefined) {
    throw new Error(`${label}_missing`);
  }
  const id = String(value).trim();
  if (!id) {
    throw new Error(`${label}_empty`);
  }
  return id;
};

module.exports = {
  ok,
  err,
  isOk,
  isErr,
  asId,
  ...require("./task_status_contract")
};
