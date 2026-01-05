/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.vo.wind.BlockDefine
 *  com.seer.rds.vo.wind.Parent
 *  com.seer.rds.vo.wind.PostBpField
 *  org.springframework.stereotype.Component
 */
package com.seer.rds.vo.wind;

import com.seer.rds.vo.wind.BlockDefine;
import com.seer.rds.vo.wind.Parent;
import org.springframework.stereotype.Component;

@Component
@BlockDefine(name="\u53d1\u9001 POST \u8bf7\u6c42\uff0c\u53c2\u6570\u4e3a JSON \u683c\u5f0f", parentName="\u57fa\u7840")
public class PostBpField
implements Parent {
    public static String url = "url";
    public static String param = "param";
    public static String header = "header";
    public static String timeout = "timeout";
    public static String retry = "retry";
    public static String retryTimes = "retryTimes";
    public static String retryInterval = "retryInterval";
    public static String response = "response";
    public static String mediaType = "mediaType";
}

