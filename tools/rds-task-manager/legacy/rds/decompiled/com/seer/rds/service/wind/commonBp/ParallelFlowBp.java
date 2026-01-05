/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.alibaba.fastjson.JSONArray
 *  com.seer.rds.service.agv.WindService
 *  com.seer.rds.service.wind.AbstractBp
 *  com.seer.rds.service.wind.AbstratRootBp
 *  com.seer.rds.service.wind.RootBp
 *  com.seer.rds.service.wind.commonBp.ParallelFlowBp
 *  org.slf4j.Logger
 *  org.slf4j.LoggerFactory
 *  org.springframework.beans.factory.annotation.Autowired
 *  org.springframework.context.annotation.Scope
 *  org.springframework.stereotype.Component
 */
package com.seer.rds.service.wind.commonBp;

import com.alibaba.fastjson.JSONArray;
import com.seer.rds.service.agv.WindService;
import com.seer.rds.service.wind.AbstractBp;
import com.seer.rds.service.wind.AbstratRootBp;
import com.seer.rds.service.wind.RootBp;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Scope;
import org.springframework.stereotype.Component;

@Component(value="ParallelFlowBp")
@Scope(value="prototype")
public class ParallelFlowBp
extends AbstractBp {
    private static final Logger log = LoggerFactory.getLogger(ParallelFlowBp.class);
    @Autowired
    private WindService windService;
    public static final String ParallelFlowBpCacheKey = "ParallelFlowBpCacheKey:";

    protected void getInputParamsAndExecute(AbstratRootBp rootBp) throws Exception {
    }

    protected void setBlockInputParamsValue(AbstratRootBp rootBp) throws Exception {
        this.blockRecord.setBlockInputParams(this.inputParams != null ? this.inputParams.toJSONString() : null);
        this.windService.saveBlockRecord(this.blockRecord, this.blockVo.getBlockId(), this.blockVo.getBlockType(), this.taskRecord.getProjectId(), this.taskId, this.taskRecord.getId(), this.startOn);
    }

    protected void runChildBlock(AbstratRootBp rootBp) {
        if (!"End".equals(this.state) && ((Boolean)RootBp.taskStatus.get(this.taskId + this.taskRecord.getId())).booleanValue() && this.childDefaultArray != null) {
            JSONArray childArray = (JSONArray)this.childDefaultArray;
            rootBp.executeChild(rootBp, this.taskId, this.taskRecord, childArray, Boolean.valueOf(false));
        }
    }
}

