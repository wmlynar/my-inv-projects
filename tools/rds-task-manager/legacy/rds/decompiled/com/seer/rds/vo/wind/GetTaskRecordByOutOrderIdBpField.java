/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.vo.wind.BlockDefine
 *  com.seer.rds.vo.wind.GetTaskRecordByOutOrderIdBpField
 *  com.seer.rds.vo.wind.Parent
 *  org.springframework.stereotype.Component
 */
package com.seer.rds.vo.wind;

import com.seer.rds.vo.wind.BlockDefine;
import com.seer.rds.vo.wind.Parent;
import org.springframework.stereotype.Component;

@Component
@BlockDefine(name="\u6839\u636e\u5916\u90e8\u8ba2\u5355 ID \u67e5\u8be2\u4efb\u52a1\u5b9e\u4f8b", parentName="\u4efb\u52a1")
public class GetTaskRecordByOutOrderIdBpField
implements Parent {
    public static String outOrderId = "outOrderId";
    public static String taskRecordList = "taskRecordIdList";
}

