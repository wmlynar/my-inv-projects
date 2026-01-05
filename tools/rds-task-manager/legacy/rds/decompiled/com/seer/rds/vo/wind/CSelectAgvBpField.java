/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.vo.wind.BlockDefine
 *  com.seer.rds.vo.wind.CSelectAgvBpField
 *  com.seer.rds.vo.wind.Parent
 *  org.springframework.stereotype.Component
 */
package com.seer.rds.vo.wind;

import com.seer.rds.vo.wind.BlockDefine;
import com.seer.rds.vo.wind.Parent;
import org.springframework.stereotype.Component;

@Component
@BlockDefine(name="\u9009\u62e9\u673a\u5668\u4eba", parentName="Core \u8c03\u5ea6")
public class CSelectAgvBpField
implements Parent {
    public static String priority = "priority";
    public static String vehicle = "vehicle";
    public static String tag = "tag";
    public static String group = "group";
    public static String keyRoute = "keyRoute";
    public static String ctxSelectedAgvId = "selectedAgvId";
    public static String keyTask = "keyTask";
    public static String prePointRedo = "prePointRedo";
    public static String mapfPriority = "mapfPriority";
    public static String keyGoodsId = "keyGoodsId";
    public static String loadBlockCount = "loadBlockCount";
}

