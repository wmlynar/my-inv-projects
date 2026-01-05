/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.vo.wind.BlockDefine
 *  com.seer.rds.vo.wind.GlobalFieldOutputParams
 *  com.seer.rds.vo.wind.Parent
 *  org.springframework.stereotype.Component
 */
package com.seer.rds.vo.wind;

import com.seer.rds.vo.wind.BlockDefine;
import com.seer.rds.vo.wind.Parent;
import org.springframework.stereotype.Component;

@Component
@BlockDefine(name="\u5168\u5c40\u8f93\u51fa\u53c2\u6570")
public class GlobalFieldOutputParams
implements Parent {
    public static String name = "name";
    public static String label = "label";
    public static String refBlockConfigId = "refBlockConfigId";
    public static String refOutputParamName = "refOutputParamName";
    public static String remark = "remark";
}

