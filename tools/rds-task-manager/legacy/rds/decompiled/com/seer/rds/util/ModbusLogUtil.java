/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.config.PropConfig
 *  com.seer.rds.model.modbus.ModbusReadLog
 *  com.seer.rds.model.modbus.ModbusWriteLog
 *  com.seer.rds.service.modbus.ModbusService
 *  com.seer.rds.util.ModbusLogUtil
 *  com.seer.rds.util.SpringUtil
 */
package com.seer.rds.util;

import com.seer.rds.config.PropConfig;
import com.seer.rds.model.modbus.ModbusReadLog;
import com.seer.rds.model.modbus.ModbusWriteLog;
import com.seer.rds.service.modbus.ModbusService;
import com.seer.rds.util.SpringUtil;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

public class ModbusLogUtil {
    private static final ConcurrentHashMap<String, String> lastReadValues = new ConcurrentHashMap();

    public static void saveReadLogIfChanged(String ip, int port, int slaveId, String functionCode, int offset, int readLength, String remark, String newValue) {
        if (PropConfig.ifModbusLog().booleanValue()) {
            ModbusService modbusService = (ModbusService)SpringUtil.getBean(ModbusService.class);
            String key = ip + ":" + port + ":" + slaveId + ":" + offset + ":" + readLength;
            String oldValue = Optional.ofNullable((String)lastReadValues.get(key)).orElse("");
            if (!oldValue.equals(newValue = Optional.ofNullable(newValue).orElse("error"))) {
                lastReadValues.put(key, newValue);
                ModbusReadLog build = ModbusReadLog.builder().mHost(ip).mPort(Integer.valueOf(port)).functionCode(functionCode).slaveId(Integer.valueOf(slaveId)).mOffset(Integer.valueOf(offset)).readLength(Integer.valueOf(readLength)).remark(remark).oldValues(oldValue).newValues(newValue).build();
                modbusService.saveReadLog(build);
            }
        }
    }

    public static void saveWriteLog(String ip, int port, int slaveId, String functionCode, int offset, int writeLength, String remark, String value) {
        if (PropConfig.ifModbusLog().booleanValue()) {
            ModbusService modbusService = (ModbusService)SpringUtil.getBean(ModbusService.class);
            ModbusWriteLog build = ModbusWriteLog.builder().mHost(ip).mPort(Integer.valueOf(port)).functionCode(functionCode).slaveId(Integer.valueOf(slaveId)).mOffset(Integer.valueOf(offset)).writeLength(Integer.valueOf(writeLength)).remark(remark).writeValues(value).build();
            modbusService.saveWriteLog(build);
        }
    }
}

