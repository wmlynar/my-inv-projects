/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.vo.wind.BlockDefine
 *  com.seer.rds.vo.wind.GetLockedSitesByTaskRecordIdField
 *  com.seer.rds.vo.wind.Parent
 *  org.springframework.stereotype.Component
 */
package com.seer.rds.vo.wind;

import com.seer.rds.vo.wind.BlockDefine;
import com.seer.rds.vo.wind.Parent;
import org.springframework.stereotype.Component;

@Component
@BlockDefine(name="\u6839\u636e\u4efb\u52a1\u5b9e\u4f8bID\u83b7\u53d6\u52a0\u9501\u5e93\u4f4d", parentName="\u5e93\u4f4d")
public class GetLockedSitesByTaskRecordIdField
implements Parent {
    public static String taskRecordId = "taskRecordId";
    public static String lockedSiteIdList = "lockedSiteIdList";
}

