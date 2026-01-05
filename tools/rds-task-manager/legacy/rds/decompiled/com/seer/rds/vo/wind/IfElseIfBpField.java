/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.vo.wind.BlockDefine
 *  com.seer.rds.vo.wind.IfElseIfBpField
 *  com.seer.rds.vo.wind.Parent
 *  org.springframework.stereotype.Component
 */
package com.seer.rds.vo.wind;

import com.seer.rds.vo.wind.BlockDefine;
import com.seer.rds.vo.wind.Parent;
import org.springframework.stereotype.Component;

@Component
@BlockDefine(name="IfElseIf", parentName="\u6d41\u7a0b")
public class IfElseIfBpField
implements Parent {
    public static String conditionIf = "conditionIf";
    public static String conditionElseIf = "conditionElseIf";
    public static String ifTrue = "if";
    public static String elseIfTrue = "else_if";
    public static String elseTrue = "else";
}

