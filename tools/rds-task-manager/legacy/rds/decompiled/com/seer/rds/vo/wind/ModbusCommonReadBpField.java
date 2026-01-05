/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.vo.wind.BlockDefine
 *  com.seer.rds.vo.wind.ModbusCommonReadBpField
 *  org.springframework.stereotype.Component
 */
package com.seer.rds.vo.wind;

import com.seer.rds.vo.wind.BlockDefine;
import org.springframework.stereotype.Component;

@Component
@BlockDefine(name="\u901a\u7528\u8bfb\u53d6Modbus", parentName="\u8bbe\u5907")
public class ModbusCommonReadBpField {
    public static String addrType = "addrType";
    public static String ipModbusHost = "ipModbusHost";
    public static String ipModbusPort = "ipModbusPort";
    public static String ipSlaveId = "ipSlaveId";
    public static String ipAddress = "ipAddress";
    public static String alias = "alias";
    public static String ctxModbusValue = "modbusValue";
}

