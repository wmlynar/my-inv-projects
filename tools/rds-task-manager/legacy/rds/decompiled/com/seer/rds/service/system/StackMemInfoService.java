/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.alibaba.fastjson.JSONObject
 *  com.seer.rds.service.system.StackMemInfoService
 */
package com.seer.rds.service.system;

import com.alibaba.fastjson.JSONObject;
import java.text.ParseException;
import java.util.Date;
import java.util.List;

public interface StackMemInfoService {
    public List<String> getNowStackMemoryPercent();

    public JSONObject getAvgStackMemPercent(Date var1) throws ParseException;
}

