/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.vo.wind.BlockDefine
 *  com.seer.rds.vo.wind.BlockField
 *  com.seer.rds.vo.wind.Parent
 *  org.springframework.stereotype.Component
 */
package com.seer.rds.vo.wind;

import com.seer.rds.vo.wind.BlockDefine;
import com.seer.rds.vo.wind.Parent;
import org.springframework.stereotype.Component;

@Component
@BlockDefine(name="\u5757\u901a\u7528\u5b57\u6bb5")
public class BlockField
implements Parent {
    public static String id = "id";
    public static String name = "name";
    public static String blockType = "blockType";
    public static String children = "children";
    public static String childrenDefault = "default";
    public static String inputParams = "inputParams";
    public static String refTaskDefId = "refTaskDefId";
    public static String selected = "selected";
    public static String remark = "remark";
    public static String maxTimeOut = "maxTimeOut";
    public static String errorMsg = "errorMsg";
}

