/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.alibaba.fastjson.JSONObject
 *  com.google.common.collect.Maps
 *  com.seer.rds.service.agv.WorkSiteService
 *  com.seer.rds.service.wind.AbstractBp
 *  com.seer.rds.service.wind.AbstratRootBp
 *  com.seer.rds.service.wind.commonBp.GetLockedSitesByTaskRecordIdBp
 *  com.seer.rds.vo.wind.GetLockedSitesByTaskRecordIdField
 *  com.seer.rds.vo.wind.ParamPreField
 *  org.slf4j.Logger
 *  org.slf4j.LoggerFactory
 *  org.springframework.beans.factory.annotation.Autowired
 *  org.springframework.context.annotation.Scope
 *  org.springframework.stereotype.Component
 */
package com.seer.rds.service.wind.commonBp;

import com.alibaba.fastjson.JSONObject;
import com.google.common.collect.Maps;
import com.seer.rds.service.agv.WorkSiteService;
import com.seer.rds.service.wind.AbstractBp;
import com.seer.rds.service.wind.AbstratRootBp;
import com.seer.rds.vo.wind.GetLockedSitesByTaskRecordIdField;
import com.seer.rds.vo.wind.ParamPreField;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Scope;
import org.springframework.stereotype.Component;

@Component(value="GetLockedSitesByTaskRecordIdBp")
@Scope(value="prototype")
public class GetLockedSitesByTaskRecordIdBp
extends AbstractBp {
    private static final Logger log = LoggerFactory.getLogger(GetLockedSitesByTaskRecordIdBp.class);
    private Object taskRecordId;
    @Autowired
    private WorkSiteService workSiteService;

    protected void getInputParamsAndExecute(AbstratRootBp rootBp) throws Exception {
        this.taskRecordId = (String)rootBp.getInputParamValue(this.taskId, this.inputParams, GetLockedSitesByTaskRecordIdField.taskRecordId);
        Object result = null;
        try {
            List siteIdsByLockedBy = this.workSiteService.findSiteIdsByLockedBy((String)this.taskRecordId);
            Map paramMap = (Map)((ConcurrentHashMap)AbstratRootBp.outputParamsMap.get()).get(ParamPreField.blocks);
            ConcurrentMap childParamMap = Maps.newConcurrentMap();
            childParamMap.put(GetLockedSitesByTaskRecordIdField.lockedSiteIdList, null == siteIdsByLockedBy ? "" : siteIdsByLockedBy);
            paramMap.put(this.blockVo.getBlockName(), childParamMap);
            ((ConcurrentHashMap)AbstratRootBp.outputParamsMap.get()).put(ParamPreField.blocks, paramMap);
            this.saveLogResult((Object)(siteIdsByLockedBy == null ? "" : JSONObject.toJSONString((Object)siteIdsByLockedBy)));
        }
        catch (Exception e) {
            log.error("getLockedSitesByTaskRecordIdBp error {}", (Throwable)e);
            throw e;
        }
    }

    protected void setBlockInputParamsValue(AbstratRootBp rootBp) throws Exception {
    }
}

