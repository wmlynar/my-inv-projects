/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.vo.wind.BlockDefine
 *  com.seer.rds.vo.wind.Parent
 *  com.seer.rds.vo.wind.TaskField
 *  org.springframework.stereotype.Component
 */
package com.seer.rds.vo.wind;

import com.seer.rds.vo.wind.BlockDefine;
import com.seer.rds.vo.wind.Parent;
import org.springframework.stereotype.Component;

@Component
@BlockDefine(name="\u4efb\u52a1\u5b57\u6bb5")
public class TaskField
implements Parent {
    public static String id = "id";
    public static String defLabel = "defLabel";
    public static String createdOn = "createdOn";
    public static String status = "status";
    public static String taskRecordId = "taskRecordId";
    public static String priority = "priority";
}

