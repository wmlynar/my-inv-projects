/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.vo.wind.BlockDefine
 *  com.seer.rds.vo.wind.DistributeBpField
 *  com.seer.rds.vo.wind.Parent
 *  org.springframework.stereotype.Component
 */
package com.seer.rds.vo.wind;

import com.seer.rds.vo.wind.BlockDefine;
import com.seer.rds.vo.wind.Parent;
import org.springframework.stereotype.Component;

@Component
@BlockDefine(name="\u5206\u62e8", parentName="Core \u8c03\u5ea6")
public class DistributeBpField
implements Parent {
    public static String fromLoc = "fromLoc";
    public static String toLocList = "toLocList";
    public static String returnLoc = "returnLoc";
    public static String group = "group";
    public static String label = "label";
    public static String vehicle = "vehicle";
    public static String ordered = "ordered";
    public static String loadPostAction = "loadPostAction";
    public static String unloadPostActionList = "unloadPostActionList";
    public static String returnPostAction = "returnPostAction";
    public static String toLoc = "toLoc";
    public static String postAction = "postAction";
    public static String configId = "configId";
    public static String noticeFailed = "noticeFailed";
    public static String noticeFinish = "noticeFinish";
    public static String scriptName = "scriptName";
    public static String AGV = "agvId";
}

