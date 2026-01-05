/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.vo.wind.BlockDefine
 *  com.seer.rds.vo.wind.TerminateTaskBpField
 *  org.springframework.stereotype.Component
 */
package com.seer.rds.vo.wind;

import com.seer.rds.vo.wind.BlockDefine;
import org.springframework.stereotype.Component;

@Component
@BlockDefine(name="terminateTask", parentName="\u57fa\u7840")
public class TerminateTaskBpField {
    public static String taskRecordId = "taskRecordId";
    public static String terminateSuccess = "terminateSuccess";
}

