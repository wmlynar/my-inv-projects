/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.vo.wind.BlockDefine
 *  com.seer.rds.vo.wind.CAgvOperationBpField
 *  com.seer.rds.vo.wind.Parent
 *  org.springframework.stereotype.Component
 */
package com.seer.rds.vo.wind;

import com.seer.rds.vo.wind.BlockDefine;
import com.seer.rds.vo.wind.Parent;
import org.springframework.stereotype.Component;

@Component
@BlockDefine(name="\u673a\u5668\u4eba\u901a\u7528\u52a8\u4f5c", parentName="Core \u8c03\u5ea6")
public class CAgvOperationBpField
implements Parent {
    public static String agvId = "agvId";
    public static String targetSiteLabel = "targetSiteLabel";
    public static String scriptName = "scriptName";
    public static String postAction = "postAction";
    public static String goodsId = "goodsId";
    public static String isEndAction = "isEndAction";
    public static String customCommandName = "customCommandName";
    public static String customCommandType = "customCommandType";
    public static String customCommandArgs = "customCommandArgs";
    public static String maxSpeed = "max_speed";
    public static String maxWSpeed = "max_wspeed";
    public static String maxAcc = "max_acc";
    public static String maxWAcc = "max_wacc";
    public static String spin = "spin";
    public static String adjustInfo = "adjustInfo";
}

