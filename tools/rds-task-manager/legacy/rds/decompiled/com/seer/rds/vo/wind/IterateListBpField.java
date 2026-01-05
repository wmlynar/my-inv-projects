/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.vo.wind.BlockDefine
 *  com.seer.rds.vo.wind.IterateListBpField
 *  com.seer.rds.vo.wind.Parent
 *  org.springframework.stereotype.Component
 */
package com.seer.rds.vo.wind;

import com.seer.rds.vo.wind.BlockDefine;
import com.seer.rds.vo.wind.Parent;
import org.springframework.stereotype.Component;

@Component
@BlockDefine(name="\u904d\u5386\u6570\u7ec4", parentName="\u6d41\u7a0b")
public class IterateListBpField
implements Parent {
    public static String list = "list";
    public static String ctxIndex = "index";
    public static String ctxItem = "item";
    public static String ctxSize = "size";
}

