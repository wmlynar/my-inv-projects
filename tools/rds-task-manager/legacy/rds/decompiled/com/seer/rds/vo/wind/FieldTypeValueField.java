/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.vo.wind.BlockDefine
 *  com.seer.rds.vo.wind.FieldTypeValueField
 *  com.seer.rds.vo.wind.Parent
 *  org.springframework.stereotype.Component
 */
package com.seer.rds.vo.wind;

import com.seer.rds.vo.wind.BlockDefine;
import com.seer.rds.vo.wind.Parent;
import org.springframework.stereotype.Component;

@Component
@BlockDefine(name="\u5757\u5b57\u6bb5\u6570\u636e\u7c7b\u578b")
public class FieldTypeValueField
implements Parent {
    public static String Simple = "Simple";
    public static String Expression = "Expression";
    public static String JsonPair = "Key-Value";
}

