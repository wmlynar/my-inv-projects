/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.vo.wind.BlockDefine
 *  com.seer.rds.vo.wind.ParamPreField
 *  com.seer.rds.vo.wind.Parent
 *  org.springframework.stereotype.Component
 */
package com.seer.rds.vo.wind;

import com.seer.rds.vo.wind.BlockDefine;
import com.seer.rds.vo.wind.Parent;
import org.springframework.stereotype.Component;

@Component
@BlockDefine(name="\u5168\u5c40\u8f93\u5165\u53c2\u6570\u524d\u7f00")
public class ParamPreField
implements Parent {
    public static String task = "task";
    public static String taskInputs = "taskInputs";
    public static String taskInputsExt = "ext";
    public static String blocks = "blocks";
    public static String variables = "variables";
}

