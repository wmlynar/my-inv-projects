/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.dao.WindDataCacheSplitMapper
 *  com.seer.rds.model.wind.WindDataCacheSplit
 *  com.seer.rds.runnable.InitCacheDataRunnable
 *  com.seer.rds.service.agv.WindService
 *  com.seer.rds.service.wind.commonBp.CacheDataBp
 *  com.seer.rds.util.SpringUtil
 *  org.slf4j.Logger
 *  org.slf4j.LoggerFactory
 */
package com.seer.rds.runnable;

import com.seer.rds.dao.WindDataCacheSplitMapper;
import com.seer.rds.model.wind.WindDataCacheSplit;
import com.seer.rds.service.agv.WindService;
import com.seer.rds.service.wind.commonBp.CacheDataBp;
import com.seer.rds.util.SpringUtil;
import java.util.ArrayList;
import java.util.Date;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class InitCacheDataRunnable
implements Runnable {
    private static final Logger log = LoggerFactory.getLogger(InitCacheDataRunnable.class);

    @Override
    public void run() {
        log.info("start init cache");
        WindService windService = (WindService)SpringUtil.getBean(WindService.class);
        ConcurrentHashMap dataCache = windService.getDataCache();
        try {
            if (!windService.hasAlreadyMoved()) {
                this.deliverCacheToNewTable(windService, dataCache);
                dataCache = windService.getDataCache();
            }
        }
        catch (Throwable e) {
            log.error("InitCacheDataRunnable", e);
        }
        CacheDataBp.cacheMap = dataCache;
    }

    private void deliverCacheToNewTable(WindService windService, ConcurrentHashMap<String, Object> dataCache) {
        log.info("try to move all data cache from t_winddatacache to t_winddatacachesplit");
        log.info("exists new cache counts: {}", (Object)dataCache.size());
        ConcurrentHashMap dataCacheOld = windService.getDataCacheOld();
        log.info("exists old cache counts: {}", (Object)dataCacheOld.size());
        WindDataCacheSplitMapper cacheSplitMapper = (WindDataCacheSplitMapper)SpringUtil.getBean(WindDataCacheSplitMapper.class);
        int moved = 0;
        StringBuilder movedStr = new StringBuilder();
        ArrayList<WindDataCacheSplit> caches = new ArrayList<WindDataCacheSplit>();
        for (Map.Entry entry : dataCacheOld.entrySet()) {
            String key = (String)entry.getKey();
            Object value = entry.getValue();
            if (dataCache.containsKey(key)) {
                log.warn("key '{}' already exists", (Object)key);
                continue;
            }
            if (key != null && value != null) {
                WindDataCacheSplit cacheSplit = new WindDataCacheSplit(key, value.toString(), new Date());
                if (key.startsWith("1.7") || key.startsWith("1.8") || key.startsWith("waitPass") || key.equals("ifLoadTemplate")) {
                    cacheSplit.setKeep(Integer.valueOf(1));
                }
                caches.add(cacheSplit);
                ++moved;
                movedStr.append(key).append(":").append(value).append(",");
                continue;
            }
            log.error("move error key = {}, value = {}", (Object)key, value);
        }
        caches.add(new WindDataCacheSplit("moved_all_to_cache_split", "true", new Date(), Integer.valueOf(1)));
        cacheSplitMapper.saveAllAndFlush(caches);
        log.info("moved success counts: {}, data: {}", (Object)moved, (Object)movedStr);
    }
}

