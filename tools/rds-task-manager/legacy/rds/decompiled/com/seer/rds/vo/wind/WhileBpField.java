/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.vo.wind.BlockDefine
 *  com.seer.rds.vo.wind.WhileBpField
 *  org.springframework.stereotype.Component
 */
package com.seer.rds.vo.wind;

import com.seer.rds.vo.wind.BlockDefine;
import org.springframework.stereotype.Component;

@Component
@BlockDefine(name="while\u5faa\u73af", parentName="\u6d41\u7a0b")
public class WhileBpField {
    public static String loopCondition = "loopCondition";
    public static String retryPeriod = "retryPeriod";
    public static String runOnce = "runOnce";
    public static String printContinuously = "printContinuously";
}

