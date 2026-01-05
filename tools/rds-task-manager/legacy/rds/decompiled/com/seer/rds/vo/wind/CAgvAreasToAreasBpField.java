/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.vo.wind.BlockDefine
 *  com.seer.rds.vo.wind.CAgvAreasToAreasBpField
 *  com.seer.rds.vo.wind.Parent
 *  org.springframework.stereotype.Component
 */
package com.seer.rds.vo.wind;

import com.seer.rds.vo.wind.BlockDefine;
import com.seer.rds.vo.wind.Parent;
import org.springframework.stereotype.Component;

@Component
@BlockDefine(name="\u5e93\u533a\u8f6c\u8fd0", parentName="Core \u8c03\u5ea6")
public class CAgvAreasToAreasBpField
implements Parent {
    public static String fromBinAreas = "fromBinAreas";
    public static String toBinAreas = "toBinAreas";
    public static String group = "group";
    public static String label = "label";
    public static String vehicle = "vehicle";
}

