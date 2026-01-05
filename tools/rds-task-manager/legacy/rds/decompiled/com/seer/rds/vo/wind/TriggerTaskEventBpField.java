/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.vo.wind.BlockDefine
 *  com.seer.rds.vo.wind.Parent
 *  com.seer.rds.vo.wind.TriggerTaskEventBpField
 *  org.springframework.stereotype.Component
 */
package com.seer.rds.vo.wind;

import com.seer.rds.vo.wind.BlockDefine;
import com.seer.rds.vo.wind.Parent;
import org.springframework.stereotype.Component;

@Component
@BlockDefine(name="\u89e6\u53d1\u4efb\u52a1\u4e8b\u4ef6", parentName="\u4efb\u52a1")
public class TriggerTaskEventBpField
implements Parent {
    public static String eventName = "eventName";
    public static String eventData = "eventData";
}

