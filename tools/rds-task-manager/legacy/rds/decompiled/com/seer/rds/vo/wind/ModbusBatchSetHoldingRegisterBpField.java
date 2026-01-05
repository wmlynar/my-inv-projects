/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.vo.wind.BlockDefine
 *  com.seer.rds.vo.wind.ModbusBatchSetHoldingRegisterBpField
 *  org.springframework.stereotype.Component
 */
package com.seer.rds.vo.wind;

import com.seer.rds.vo.wind.BlockDefine;
import org.springframework.stereotype.Component;

@Component
@BlockDefine(name="\u6279\u91cf\u5199\u5165\u4fdd\u6301\u5bc4\u5b58\u5668", parentName="\u8bbe\u5907")
public class ModbusBatchSetHoldingRegisterBpField {
    public static String ipModbusHost = "ipModbusHost";
    public static String ipModbusPort = "ipModbusPort";
    public static String ipSlaveId = "ipSlaveId";
    public static String ipRegisterAddress = "ipRegisterAddress";
    public static String ipRegisterData = "ipRegisterData";
}

