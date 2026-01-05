/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.vo.wind.BlockDefine
 *  com.seer.rds.vo.wind.Parent
 *  com.seer.rds.vo.wind.TryCatchBpField
 *  org.springframework.stereotype.Component
 */
package com.seer.rds.vo.wind;

import com.seer.rds.vo.wind.BlockDefine;
import com.seer.rds.vo.wind.Parent;
import org.springframework.stereotype.Component;

@Component
@BlockDefine(name="\u6355\u83b7\u5f02\u5e38", parentName="\u6d41\u7a0b")
public class TryCatchBpField
implements Parent {
    public static String swallowError = "swallowError";
    public static String ignoreAbort = "ignoreAbort";
    public static String tryChild = "try";
    public static String catchChild = "catch";
}

