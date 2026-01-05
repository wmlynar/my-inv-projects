/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.model.admin.UserConfigRecord
 *  com.seer.rds.service.system.ConfigService
 *  com.seer.rds.vo.req.UserMapConfigReq
 */
package com.seer.rds.service.system;

import com.seer.rds.model.admin.UserConfigRecord;
import com.seer.rds.vo.req.UserMapConfigReq;
import java.util.List;

public interface ConfigService {
    public UserConfigRecord getMapConfigByUserKey(String var1);

    public void saveMapConfig(UserMapConfigReq var1);

    public UserConfigRecord getTittleConfigByUserKey(String var1);

    public List<UserConfigRecord> getMapsConfigByUserKey(String var1);
}

