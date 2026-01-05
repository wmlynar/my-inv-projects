/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.vo.wind.BlockDefine
 *  com.seer.rds.vo.wind.ModbusBatchReadSingleCoilBpField
 *  org.springframework.stereotype.Component
 */
package com.seer.rds.vo.wind;

import com.seer.rds.vo.wind.BlockDefine;
import org.springframework.stereotype.Component;

@Component
@BlockDefine(name="\u6279\u91cf\u8bfb\u53d6Modbus01\u7ebf\u5708\u91cf", parentName="\u8bbe\u5907")
public class ModbusBatchReadSingleCoilBpField {
    public static String ipModbusHost = "ipModbusHost";
    public static String ipModbusPort = "ipModbusPort";
    public static String ipSlaveId = "ipSlaveId";
    public static String ipRegisterOffset = "ipRegisterOffset";
    public static String ipLength = "ipLength";
    public static String ctxModbusValue = "modbusValue";
}

