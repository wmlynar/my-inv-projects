/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.vo.wind.BlockDefine
 *  com.seer.rds.vo.wind.NoticeOperatorBpField
 *  com.seer.rds.vo.wind.Parent
 *  org.springframework.stereotype.Component
 */
package com.seer.rds.vo.wind;

import com.seer.rds.vo.wind.BlockDefine;
import com.seer.rds.vo.wind.Parent;
import org.springframework.stereotype.Component;

@Component
@BlockDefine(name="\u901a\u77e5\u624b\u6301\u7aef", parentName="\u57fa\u7840")
public class NoticeOperatorBpField
implements Parent {
    public static String workTypes = "workTypes";
    public static String workStations = "workStations";
    public static String content = "content";
    public static String needConfirm = "needConfirm";
    public static String keepTime = "keepTime";
    public static String retryTimes = "retryTimes";
}

