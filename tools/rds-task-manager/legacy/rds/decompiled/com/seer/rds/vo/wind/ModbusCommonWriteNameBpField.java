/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.vo.wind.BlockDefine
 *  com.seer.rds.vo.wind.ModbusCommonWriteNameBpField
 *  org.springframework.stereotype.Component
 */
package com.seer.rds.vo.wind;

import com.seer.rds.vo.wind.BlockDefine;
import org.springframework.stereotype.Component;

@Component
@BlockDefine(name="\u901a\u7528\u5199\u5165Modbus", parentName="\u8bbe\u5907")
public class ModbusCommonWriteNameBpField {
    public static String addrType = "addrType";
    public static String newValue = "newValue";
    public static String instanceName = "instanceName";
    public static String address = "address";
    public static String remark = "remark";
}

