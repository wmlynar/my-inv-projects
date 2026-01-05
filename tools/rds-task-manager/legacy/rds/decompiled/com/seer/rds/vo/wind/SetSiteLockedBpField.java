/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.vo.wind.BlockDefine
 *  com.seer.rds.vo.wind.SetSiteLockedBpField
 *  org.springframework.stereotype.Component
 */
package com.seer.rds.vo.wind;

import com.seer.rds.vo.wind.BlockDefine;
import org.springframework.stereotype.Component;

@Component
@BlockDefine(name="\u9501\u5b9a\u5e93\u4f4d", parentName="\u5e93\u4f4d")
public class SetSiteLockedBpField {
    public static String siteId = "siteId";
    public static String ifFair = "ifFair";
    public static String lockedId = "lockedId";
    public static String retryTimes = "retryTimes";
}

