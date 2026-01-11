const WRONG_PORT_CODE = 60000;
const CONTROL_LOCKED_CODE = 60001;

function buildErrorResponse(message, code = 1, extra = {}) {
  return {
    ret_code: code,
    err_msg: message,
    message,
    ...extra
  };
}

function wrongPortError() {
  return buildErrorResponse('wrong_port', WRONG_PORT_CODE);
}

function controlLockedError() {
  return buildErrorResponse('control_locked', CONTROL_LOCKED_CODE);
}

function unsupportedApiError(apiNo) {
  return buildErrorResponse(`unsupported_api_${apiNo}`, 1);
}

module.exports = {
  WRONG_PORT_CODE,
  CONTROL_LOCKED_CODE,
  buildErrorResponse,
  wrongPortError,
  controlLockedError,
  unsupportedApiError
};
