/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.vo.wind.BlockDefine
 *  com.seer.rds.vo.wind.Parent
 *  com.seer.rds.vo.wind.TaskStateBpField
 *  org.springframework.stereotype.Component
 */
package com.seer.rds.vo.wind;

import com.seer.rds.vo.wind.BlockDefine;
import com.seer.rds.vo.wind.Parent;
import org.springframework.stereotype.Component;

@Component
@BlockDefine(name="\u4efb\u52a1/\u5757\u8fd0\u884c\u72b6\u6001", parentName="\u57fa\u7840")
public class TaskStateBpField
implements Parent {
    public static String isTaskState = "isTaskState";
    public static String stateCode = "stateCode";
    public static String stateMsg = "stateMsg";
}

