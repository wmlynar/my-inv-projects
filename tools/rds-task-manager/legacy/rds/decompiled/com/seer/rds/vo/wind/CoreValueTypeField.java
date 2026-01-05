/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.vo.wind.BlockDefine
 *  com.seer.rds.vo.wind.CoreValueTypeField
 *  com.seer.rds.vo.wind.Parent
 *  org.springframework.stereotype.Component
 */
package com.seer.rds.vo.wind;

import com.seer.rds.vo.wind.BlockDefine;
import com.seer.rds.vo.wind.Parent;
import org.springframework.stereotype.Component;

@Component
@BlockDefine(name="Core \u8fd0\u5355\u53c2\u6570\u6570\u636e\u7c7b\u578b")
public class CoreValueTypeField
implements Parent {
    public static String JSONObject = "JSONObject";
    public static String JSONArray = "JSONArray";
    public static String String = "String";
    public static String Double = "Double";
    public static String Boolean = "Boolean";
    public static String Long = "Long";
    public static String Any = "Any";
}

