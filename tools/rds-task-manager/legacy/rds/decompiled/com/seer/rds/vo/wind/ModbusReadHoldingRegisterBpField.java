/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.vo.wind.BlockDefine
 *  com.seer.rds.vo.wind.ModbusReadHoldingRegisterBpField
 *  org.springframework.stereotype.Component
 */
package com.seer.rds.vo.wind;

import com.seer.rds.vo.wind.BlockDefine;
import org.springframework.stereotype.Component;

@Component
@BlockDefine(name="\u8bfb\u53d6Modbus03\u5bc4\u5b58\u5668\u503c", parentName="\u8bbe\u5907")
public class ModbusReadHoldingRegisterBpField {
    public static String ipModbusHost = "ipModbusHost";
    public static String ipModbusPort = "ipModbusPort";
    public static String ipSlaveId = "ipSlaveId";
    public static String ipRegisterAddress = "ipRegisterAddress";
    public static String ctxModbusValue = "modbusValue";
}

