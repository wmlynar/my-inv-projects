/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.dao.DataCacheMapper
 *  com.seer.rds.service.admin.DataCacheService
 *  com.seer.rds.service.admin.impl.DataCacheServiceImpl
 *  com.seer.rds.service.wind.commonBp.CacheDataBp
 *  com.seer.rds.vo.response.DataCacheResp
 *  com.seer.rds.vo.response.PaginationResponseVo
 *  org.slf4j.Logger
 *  org.slf4j.LoggerFactory
 *  org.springframework.beans.factory.annotation.Autowired
 *  org.springframework.stereotype.Service
 */
package com.seer.rds.service.admin.impl;

import com.seer.rds.dao.DataCacheMapper;
import com.seer.rds.service.admin.DataCacheService;
import com.seer.rds.service.wind.commonBp.CacheDataBp;
import com.seer.rds.vo.response.DataCacheResp;
import com.seer.rds.vo.response.PaginationResponseVo;
import java.util.ArrayList;
import java.util.Iterator;
import java.util.Map;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class DataCacheServiceImpl
implements DataCacheService {
    private static Logger logger = LoggerFactory.getLogger((String)"DataCacheServiceImpl");
    @Autowired
    private DataCacheMapper dataCacheMapper;

    public PaginationResponseVo findAllDataCache(int page, int size, DataCacheResp queryParam) {
        DataCacheResp dataCacheResp;
        ArrayList<Object> systemLogRespList = new ArrayList<Object>();
        Iterator iterator = CacheDataBp.cacheMap.entrySet().iterator();
        int count = 0;
        while (iterator.hasNext()) {
            Map.Entry entry = iterator.next();
            if (count <= page * size - 1 && count >= (page - 1) * size) {
                String key = (String)entry.getKey();
                String value = entry.getValue().toString();
                logger.info("Key = " + key + ", Value = " + value);
                dataCacheResp = new DataCacheResp();
                dataCacheResp.setId("" + UUID.randomUUID());
                dataCacheResp.setKey(key);
                dataCacheResp.setValue((Object)value);
                systemLogRespList.add(dataCacheResp);
            }
            ++count;
        }
        int num = systemLogRespList.size();
        if (queryParam.getKey() != null) {
            ArrayList<DataCacheResp> tmp = new ArrayList<DataCacheResp>();
            for (int i = 0; i < num; ++i) {
                if (!((DataCacheResp)systemLogRespList.get(i)).getKey().contains(queryParam.getKey())) continue;
                dataCacheResp = new DataCacheResp();
                dataCacheResp = (DataCacheResp)systemLogRespList.get(i);
                tmp.add(dataCacheResp);
            }
            systemLogRespList.clear();
            systemLogRespList.addAll(tmp);
        }
        PaginationResponseVo paginationResponseVo = new PaginationResponseVo();
        paginationResponseVo.setTotalCount(Long.valueOf(count));
        paginationResponseVo.setCurrentPage(Integer.valueOf(page));
        paginationResponseVo.setPageSize(Integer.valueOf(size));
        paginationResponseVo.setTotalPage(Integer.valueOf(count % size != 0 ? count / size + 1 : count / size));
        paginationResponseVo.setPageList(systemLogRespList);
        return paginationResponseVo;
    }
}

