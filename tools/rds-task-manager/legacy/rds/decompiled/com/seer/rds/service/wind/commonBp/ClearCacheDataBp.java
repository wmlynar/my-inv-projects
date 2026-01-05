/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.service.agv.WindService
 *  com.seer.rds.service.wind.AbstractBp
 *  com.seer.rds.service.wind.AbstratRootBp
 *  com.seer.rds.service.wind.commonBp.CacheDataBp
 *  com.seer.rds.service.wind.commonBp.ClearCacheDataBp
 *  com.seer.rds.util.SpringUtil
 *  com.seer.rds.vo.wind.CacheDataBpField
 *  org.slf4j.Logger
 *  org.slf4j.LoggerFactory
 *  org.springframework.context.annotation.Scope
 *  org.springframework.stereotype.Component
 */
package com.seer.rds.service.wind.commonBp;

import com.seer.rds.service.agv.WindService;
import com.seer.rds.service.wind.AbstractBp;
import com.seer.rds.service.wind.AbstratRootBp;
import com.seer.rds.service.wind.commonBp.CacheDataBp;
import com.seer.rds.util.SpringUtil;
import com.seer.rds.vo.wind.CacheDataBpField;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Scope;
import org.springframework.stereotype.Component;

@Component(value="ClearCacheDataBp")
@Scope(value="prototype")
public class ClearCacheDataBp
extends AbstractBp {
    private static final Logger log = LoggerFactory.getLogger(ClearCacheDataBp.class);
    private Object key;

    protected void getInputParamsAndExecute(AbstratRootBp rootBp) throws Exception {
        this.key = rootBp.getInputParamValue(this.taskId, this.inputParams, CacheDataBpField.key);
        Object result = null;
        try {
            CacheDataBp.cacheMap.remove(this.key);
            WindService windService = (WindService)SpringUtil.getBean(WindService.class);
            int removed = windService.removeDataCache(this.key.toString());
            log.info("clearCacheParam count: {}", (Object)removed);
        }
        catch (Exception e) {
            log.error("clearCacheParam error {}", (Throwable)e);
            throw e;
        }
        this.saveLogResult((Object)(result == null ? "" : result));
        this.blockOutParamsValue.put("codeInfo", result == null ? "" : result);
    }

    protected void setBlockInputParamsValue(AbstratRootBp rootBp) throws Exception {
    }
}

