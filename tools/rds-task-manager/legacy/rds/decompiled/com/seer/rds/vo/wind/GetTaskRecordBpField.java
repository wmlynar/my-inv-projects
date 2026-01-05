/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.vo.wind.BlockDefine
 *  com.seer.rds.vo.wind.GetTaskRecordBpField
 *  com.seer.rds.vo.wind.Parent
 *  org.springframework.stereotype.Component
 */
package com.seer.rds.vo.wind;

import com.seer.rds.vo.wind.BlockDefine;
import com.seer.rds.vo.wind.Parent;
import org.springframework.stereotype.Component;

@Component
@BlockDefine(name="\u6839\u636e\u4efb\u52a1\u5b9e\u4f8b ID \u67e5\u8be2\u4efb\u52a1\u5b9e\u4f8b", parentName="\u4efb\u52a1")
public class GetTaskRecordBpField
implements Parent {
    public static String taskRecordId = "taskRecordId";
    public static String taskRecord = "taskRecord";
}

