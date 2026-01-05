/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.vo.wind.BlockDefine
 *  com.seer.rds.vo.wind.GetBinTaskInfoBpField
 *  com.seer.rds.vo.wind.Parent
 *  org.springframework.stereotype.Component
 */
package com.seer.rds.vo.wind;

import com.seer.rds.vo.wind.BlockDefine;
import com.seer.rds.vo.wind.Parent;
import org.springframework.stereotype.Component;

@Component
@BlockDefine(name="\u83b7\u53d6 binTask \u8fd4\u56de\u503c", parentName="Core \u8c03\u5ea6")
public class GetBinTaskInfoBpField
implements Parent {
    public static String agvId = "agvId";
    public static String retry = "retry";
    public static String retryTimes = "retryTimes";
    public static String retryInterval = "retryInterval";
    public static String targetKey = "targetKey";
    public static String response = "response";
}

