/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.vo.wind.BlockDefine
 *  com.seer.rds.vo.wind.MailBpField
 *  com.seer.rds.vo.wind.Parent
 *  org.springframework.stereotype.Component
 */
package com.seer.rds.vo.wind;

import com.seer.rds.vo.wind.BlockDefine;
import com.seer.rds.vo.wind.Parent;
import org.springframework.stereotype.Component;

@Component
@BlockDefine(name="\u53d1\u7b80\u5355\u90ae\u4ef6", parentName="\u57fa\u7840")
public class MailBpField
implements Parent {
    public static String toAddresses = "toAddresses";
    public static String subject = "subject";
    public static String content = "content";
}

