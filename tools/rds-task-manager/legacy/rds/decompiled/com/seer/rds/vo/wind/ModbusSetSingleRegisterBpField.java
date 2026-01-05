/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.vo.wind.BlockDefine
 *  com.seer.rds.vo.wind.ModbusSetSingleRegisterBpField
 *  org.springframework.stereotype.Component
 */
package com.seer.rds.vo.wind;

import com.seer.rds.vo.wind.BlockDefine;
import org.springframework.stereotype.Component;

@Component
@BlockDefine(name="\u8bbe\u7f6eModbus\u5bc4\u5b58\u5668\u503c", parentName="\u8bbe\u5907")
public class ModbusSetSingleRegisterBpField {
    public static String ipModbusHost = "ipModbusHost";
    public static String ipModbusPort = "ipModbusPort";
    public static String ipSlaveId = "ipSlaveId";
    public static String ipRegisterAddress = "ipRegisterAddress";
    public static String ipRegisterData = "ipRegisterData";
}

