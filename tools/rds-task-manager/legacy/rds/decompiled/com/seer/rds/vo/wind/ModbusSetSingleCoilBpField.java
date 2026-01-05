/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.vo.wind.BlockDefine
 *  com.seer.rds.vo.wind.ModbusSetSingleCoilBpField
 *  org.springframework.stereotype.Component
 */
package com.seer.rds.vo.wind;

import com.seer.rds.vo.wind.BlockDefine;
import org.springframework.stereotype.Component;

@Component
@BlockDefine(name="\u8bbe\u7f6eModbus\u7ebf\u5708\u91cf", parentName="\u8bbe\u5907")
public class ModbusSetSingleCoilBpField {
    public static String ipModbusHost = "ipModbusHost";
    public static String ipModbusPort = "ipModbusPort";
    public static String ipSlaveId = "ipSlaveId";
    public static String ipCoilAddress = "ipCoilAddress";
    public static String ipCoilStatus = "ipCoilStatus";
}

