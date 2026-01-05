/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.service.admin.DataCacheService
 *  com.seer.rds.vo.response.DataCacheResp
 *  com.seer.rds.vo.response.PaginationResponseVo
 */
package com.seer.rds.service.admin;

import com.seer.rds.vo.response.DataCacheResp;
import com.seer.rds.vo.response.PaginationResponseVo;

public interface DataCacheService {
    public PaginationResponseVo findAllDataCache(int var1, int var2, DataCacheResp var3);
}

