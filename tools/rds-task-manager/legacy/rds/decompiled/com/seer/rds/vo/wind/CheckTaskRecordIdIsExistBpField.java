/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.vo.wind.BlockDefine
 *  com.seer.rds.vo.wind.CheckTaskRecordIdIsExistBpField
 *  org.springframework.stereotype.Component
 */
package com.seer.rds.vo.wind;

import com.seer.rds.vo.wind.BlockDefine;
import org.springframework.stereotype.Component;

@Component
@BlockDefine(name="checkTaskRecordIdIsExist", parentName="\u57fa\u7840")
public class CheckTaskRecordIdIsExistBpField {
    public static String taskRecordId = "taskRecordId";
    public static String isExist = "taskRecordIdIsExist";
}

