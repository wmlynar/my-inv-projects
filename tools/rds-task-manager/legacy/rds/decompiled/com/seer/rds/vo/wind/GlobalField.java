/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.vo.wind.BlockDefine
 *  com.seer.rds.vo.wind.GlobalField
 *  com.seer.rds.vo.wind.Parent
 *  org.springframework.stereotype.Component
 */
package com.seer.rds.vo.wind;

import com.seer.rds.vo.wind.BlockDefine;
import com.seer.rds.vo.wind.Parent;
import org.springframework.stereotype.Component;

@Component
@BlockDefine(name="root\u5757\u53c2\u6570")
public class GlobalField
implements Parent {
    public static String id = "id";
    public static String label = "label";
    public static String inputParams = "inputParams";
    public static String outputParams = "outputParams";
    public static String rootBlock = "rootBlock";
}

