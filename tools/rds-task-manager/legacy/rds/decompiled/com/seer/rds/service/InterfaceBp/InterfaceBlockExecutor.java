/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.alibaba.fastjson.JSONObject
 *  com.seer.rds.model.wind.BaseRecord
 *  com.seer.rds.service.InterfaceBp.InterfaceBlockExecutor
 *  com.seer.rds.service.wind.InterfaceRootBp
 *  com.seer.rds.vo.WindBlockVo
 */
package com.seer.rds.service.InterfaceBp;

import com.alibaba.fastjson.JSONObject;
import com.seer.rds.model.wind.BaseRecord;
import com.seer.rds.service.wind.InterfaceRootBp;
import com.seer.rds.vo.WindBlockVo;

public interface InterfaceBlockExecutor {
    public Object execute(InterfaceRootBp var1, String var2, BaseRecord var3, WindBlockVo var4, JSONObject var5, Object var6);
}

