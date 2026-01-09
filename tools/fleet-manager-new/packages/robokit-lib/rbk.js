const START_MARK = 0x5a;
const VERSION = (() => {
  const raw = process.env.RBK_VERSION || process.env.ROBOKIT_VERSION_BYTE;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed & 0xff : 0x01;
})();
const HEADER_LEN = 16;
const RESPONSE_OFFSET = 10000;

const PORTS = Object.freeze({
  ROBOD: 19200,
  STATE: 19204,
  CTRL: 19205,
  TASK: 19206,
  CONFIG: 19207,
  KERNEL: 19208,
  OTHER: 19210,
  PUSH: 19301
});

const API = Object.freeze({
  robot_status_info_req: 1000,
  robot_status_run_req: 1002,
  robot_status_mode_req: 1003,
  robot_status_loc_req: 1004,
  robot_status_speed_req: 1005,
  robot_status_block_req: 1006,
  robot_status_battery_req: 1007,
  robot_status_motor_req: 1040,
  robot_status_brake_req: 1008,
  robot_status_laser_req: 1009,
  robot_status_path_req: 1010,
  robot_status_area_req: 1011,
  robot_status_emergency_req: 1012,
  robot_status_io_res: 1013,
  robot_status_io_req: 1013,
  robot_status_imu_req: 1014,
  robot_status_ultrasonic_req: 1016,
  robot_status_polygon_req: 1018,
  robot_status_obstacle_req: 1019,
  robot_status_task_req: 1020,
  robot_status_reloc_req: 1021,
  robot_status_loadmap_req: 1022,
  robot_status_calibration_req: 1023,
  robot_status_tracking_req: 1024,
  robot_status_slam_req: 1025,
  robot_status_tasklist_req: 1026,
  robot_status_fork_req: 1028,
  robot_status_all1_req: 1100,
  robot_status_all2_req: 1101,
  robot_status_all3_req: 1102,
  robot_status_all4_req: 1103,
  robot_status_init_req: 1111,
  robot_status_map_req: 1300,
  robot_status_station_req: 1301,
  robot_status_params_req: 1400,
  robot_status_device_types_req: 1500,
  robot_status_file_list_req: 1505,
  robot_status_file_list_modules_req: 1506,
  robot_status_device_types_ext_req: 1511,
  robot_status_device_types_module_req: 1550,
  robot_status_map_properties_req: 1700,
  robot_status_file_req: 1800,
  robot_status_alarm_req: 1050,
  robot_status_alarm_res: 1050,
  robot_status_current_lock_req: 1060,
  robot_control_stop_req: 2000,
  robot_control_gyrocal_req: 2001,
  robot_control_reloc_req: 2002,
  robot_control_comfirmloc_req: 2003,
  robot_control_cancelreloc_req: 2004,
  robot_control_clearencoder_req: 2005,
  robot_control_motion_req: 2010,
  robot_control_loadmap_req: 2022,
  robot_task_pause_req: 3001,
  robot_task_resume_req: 3002,
  robot_task_cancel_req: 3003,
  robot_task_gopoint_req: 3050,
  robot_task_gotarget_req: 3051,
  robot_task_target_path_req: 3053,
  robot_task_translate_req: 3055,
  robot_task_turn_req: 3056,
  robot_task_gostart_req: 3057,
  robot_task_goend_req: 3058,
  robot_task_gowait_req: 3059,
  robot_task_charge_req: 3060,
  robot_task_test_req: 3061,
  robot_task_goshelf_req: 3063,
  robot_task_multistation_req: 3066,
  robot_task_clear_multistation_req: 3067,
  robot_task_clear_task_req: 3068,
  robot_task_uwb_follow_req: 3070,
  robot_task_calibwheel_req: 3080,
  robot_task_caliblaser_req: 3081,
  robot_task_calibminspeed_req: 3082,
  robot_task_calibcancel_req: 3089,
  robot_task_calibclear_req: 3090,
  robot_tasklist_req: 3100,
  robot_tasklist_status_req: 3101,
  robot_tasklist_pause_req: 3102,
  robot_tasklist_resume_req: 3103,
  robot_tasklist_cancel_req: 3104,
  robot_tasklist_next_req: 3105,
  robot_tasklist_name_req: 3106,
  robot_tasklist_result_req: 3110,
  robot_tasklist_result_list_req: 3111,
  robot_tasklist_upload_req: 3112,
  robot_tasklist_download_req: 3113,
  robot_tasklist_delete_req: 3114,
  robot_tasklist_list_req: 3115,
  robot_config_push_req: 4091,
  robot_config_req_4005: 4005,
  robot_config_req_4006: 4006,
  robot_config_req_4009: 4009,
  robot_config_req_4010: 4010,
  robot_config_req_4011: 4011,
  robot_daemon_ls_req: 5100,
  robot_daemon_scp_req: 5101,
  robot_daemon_rm_req: 5102,
  robot_other_audio_play_req: 6000,
  robot_other_setdo_req: 6001,
  robot_other_setdobatch_req: 6002,
  robot_other_softemc_req: 6004,
  robot_other_audiopause_req: 6010,
  robot_other_audiocont_req: 6011,
  robot_other_setdi_req: 6020,
  robot_other_audiolist_req: 6033,
  robot_other_forkheight_req: 6040,
  robot_other_forkstop_req: 6041,
  robot_push_config_req: 9300,
  robot_push: 19301
});

function responseApi(apiNo) {
  return apiNo + RESPONSE_OFFSET;
}

function encodeFrame(seq, apiNo, payload, options = {}) {
  const body = payload ? Buffer.from(JSON.stringify(payload), 'utf8') : Buffer.alloc(0);
  const buffer = Buffer.alloc(HEADER_LEN + body.length);
  const reserved = Buffer.alloc(6, 0);
  const reservedOverride = options.reserved;

  if (reservedOverride) {
    const source = Buffer.isBuffer(reservedOverride)
      ? reservedOverride
      : Buffer.from(reservedOverride);
    source.copy(reserved, 0, 0, Math.min(source.length, reserved.length));
  } else if (options.jsonSize !== undefined) {
    let jsonSize = Number.isFinite(options.jsonSize) ? options.jsonSize : 0;
    jsonSize = Math.max(0, Math.min(0xffff, jsonSize));
    if (jsonSize > 0) {
      reserved[2] = (jsonSize >> 8) & 0xff;
      reserved[3] = jsonSize & 0xff;
    }
  }
  buffer.writeUInt8(START_MARK, 0);
  buffer.writeUInt8(VERSION, 1);
  buffer.writeUInt16BE(seq & 0xffff, 2);
  buffer.writeUInt32BE(body.length, 4);
  buffer.writeUInt16BE(apiNo & 0xffff, 8);
  reserved.copy(buffer, 10);
  if (body.length > 0) {
    body.copy(buffer, HEADER_LEN);
  }
  return buffer;
}

class RbkParser {
  constructor(options = {}) {
    this.buffer = Buffer.alloc(0);
    this.maxBodyLength = options.maxBodyLength || 1024 * 1024;
  }

  push(chunk) {
    const messages = [];
    if (!chunk || chunk.length === 0) {
      return messages;
    }
    this.buffer = Buffer.concat([this.buffer, chunk]);

    while (this.buffer.length >= HEADER_LEN) {
      if (this.buffer[0] !== START_MARK) {
        const nextSync = this.buffer.indexOf(START_MARK);
        if (nextSync === -1) {
          this.buffer = Buffer.alloc(0);
          return messages;
        }
        this.buffer = this.buffer.slice(nextSync);
        if (this.buffer.length < HEADER_LEN) {
          return messages;
        }
      }

      const version = this.buffer[1];
      const seq = this.buffer.readUInt16BE(2);
      const bodyLength = this.buffer.readUInt32BE(4);
      const apiNo = this.buffer.readUInt16BE(8);
      const reserved = this.buffer.slice(10, 16);
      const jsonSizeHeader = (reserved[2] << 8) | reserved[3];

      if (bodyLength > this.maxBodyLength) {
        throw new Error(`rbk body too large: ${bodyLength}`);
      }

      const frameLength = HEADER_LEN + bodyLength;
      if (this.buffer.length < frameLength) {
        return messages;
      }

      const body = this.buffer.slice(HEADER_LEN, frameLength);
      let payload = null;
      let jsonError = null;
      let jsonSize = 0;
      let binary = Buffer.alloc(0);
      if (bodyLength > 0) {
        const parseJson = (buffer) => {
          try {
            return { payload: JSON.parse(buffer.toString('utf8')), error: null };
          } catch (err) {
            return { payload: null, error: err.message };
          }
        };
        let parsed = false;

        if (jsonSizeHeader > 0 && jsonSizeHeader <= bodyLength) {
          const head = body.slice(0, jsonSizeHeader);
          const headResult = parseJson(head);
          if (!headResult.error) {
            const tail = body.slice(jsonSizeHeader);
            const tailText = tail.toString('utf8').trimStart();
            if (tailText.startsWith('{') || tailText.startsWith('[')) {
              const tailResult = parseJson(tail);
              if (!tailResult.error) {
                payload = tailResult.payload;
                jsonSize = tail.length;
                binary = head;
                parsed = true;
              } else {
                payload = headResult.payload;
                jsonSize = jsonSizeHeader;
                binary = tail;
                parsed = true;
              }
            } else {
              payload = headResult.payload;
              jsonSize = jsonSizeHeader;
              binary = tail;
              parsed = true;
            }
          } else {
            const tail = body.slice(jsonSizeHeader);
            const tailResult = parseJson(tail);
            if (!tailResult.error) {
              payload = tailResult.payload;
              jsonSize = tail.length;
              binary = body.slice(0, jsonSizeHeader);
              parsed = true;
            }
          }
        }

        if (!parsed) {
          const fullResult = parseJson(body);
          payload = fullResult.payload;
          jsonSize = body.length;
          if (fullResult.error) {
            jsonError = fullResult.error;
          }
        }
      }

      const rawFrame = Buffer.from(this.buffer.slice(0, frameLength));
      const rawHeader = rawFrame.slice(0, HEADER_LEN);

      messages.push({
        seq,
        apiNo,
        version,
        bodyLength,
        jsonSizeHeader,
        payload,
        jsonError,
        jsonSize,
        binary,
        reserved,
        rawBody: body,
        rawHeader,
        rawFrame
      });

      this.buffer = this.buffer.slice(frameLength);
    }

    return messages;
  }
}

module.exports = {
  START_MARK,
  VERSION,
  HEADER_LEN,
  RESPONSE_OFFSET,
  PORTS,
  API,
  responseApi,
  encodeFrame,
  RbkParser
};
