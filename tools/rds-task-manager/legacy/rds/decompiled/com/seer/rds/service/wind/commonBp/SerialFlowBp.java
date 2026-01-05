/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.constant.TaskBlockStatusEnum
 *  com.seer.rds.service.agv.WindService
 *  com.seer.rds.service.wind.AbstractBp
 *  com.seer.rds.service.wind.AbstratRootBp
 *  com.seer.rds.service.wind.commonBp.SerialFlowBp
 *  org.slf4j.Logger
 *  org.slf4j.LoggerFactory
 *  org.springframework.beans.factory.annotation.Autowired
 *  org.springframework.context.annotation.Scope
 *  org.springframework.stereotype.Component
 */
package com.seer.rds.service.wind.commonBp;

import com.seer.rds.constant.TaskBlockStatusEnum;
import com.seer.rds.service.agv.WindService;
import com.seer.rds.service.wind.AbstractBp;
import com.seer.rds.service.wind.AbstratRootBp;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Scope;
import org.springframework.stereotype.Component;

@Component(value="SerialFlowBp")
@Scope(value="prototype")
public class SerialFlowBp
extends AbstractBp {
    private static final Logger log = LoggerFactory.getLogger(SerialFlowBp.class);
    @Autowired
    private WindService windService;

    protected void getInputParamsAndExecute(AbstratRootBp rootBp) throws Exception {
    }

    protected void setBlockInputParamsValue(AbstratRootBp rootBp) throws Exception {
        this.blockRecord.setBlockInputParams(this.inputParams != null ? this.inputParams.toJSONString() : null);
        this.blockRecord.setStatus(Integer.valueOf(TaskBlockStatusEnum.running.getStatus()));
        this.windService.saveBlockRecord(this.blockRecord, this.blockVo.getBlockId(), this.blockVo.getBlockType(), this.taskRecord.getProjectId(), this.taskId, this.taskRecord.getId(), this.startOn);
    }
}

