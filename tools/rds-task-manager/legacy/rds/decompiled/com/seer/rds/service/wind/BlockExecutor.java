/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.alibaba.fastjson.JSONObject
 *  com.seer.rds.model.wind.BaseRecord
 *  com.seer.rds.service.wind.AbstratRootBp
 *  com.seer.rds.service.wind.BlockExecutor
 *  com.seer.rds.vo.WindBlockVo
 */
package com.seer.rds.service.wind;

import com.alibaba.fastjson.JSONObject;
import com.seer.rds.model.wind.BaseRecord;
import com.seer.rds.service.wind.AbstratRootBp;
import com.seer.rds.vo.WindBlockVo;

public interface BlockExecutor<T extends BaseRecord> {
    public Object execute(AbstratRootBp var1, String var2, T var3, WindBlockVo var4, JSONObject var5, Object var6);
}

