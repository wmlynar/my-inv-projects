/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.constant.TaskLogLevelEnum
 *  com.seer.rds.service.agv.WindService
 *  com.seer.rds.service.wind.AbstractBp
 *  com.seer.rds.service.wind.AbstratRootBp
 *  com.seer.rds.service.wind.RootBp
 *  com.seer.rds.service.wind.taskBp.MarkTaskEndBp
 *  org.slf4j.Logger
 *  org.slf4j.LoggerFactory
 *  org.springframework.beans.factory.annotation.Autowired
 *  org.springframework.context.annotation.Scope
 *  org.springframework.stereotype.Component
 */
package com.seer.rds.service.wind.taskBp;

import com.seer.rds.constant.TaskLogLevelEnum;
import com.seer.rds.service.agv.WindService;
import com.seer.rds.service.wind.AbstractBp;
import com.seer.rds.service.wind.AbstratRootBp;
import com.seer.rds.service.wind.RootBp;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Scope;
import org.springframework.stereotype.Component;

@Component(value="MarkTaskEndBp")
@Scope(value="prototype")
public class MarkTaskEndBp
extends AbstractBp {
    private static final Logger log = LoggerFactory.getLogger(MarkTaskEndBp.class);
    @Autowired
    private WindService windService;

    protected void getInputParamsAndExecute(AbstratRootBp rootBp) throws Exception {
        this.windService.saveLog(TaskLogLevelEnum.info.getLevel(), "[MarkTaskEndBp]@{wind.bp.start}", this.taskRecord.getProjectId(), this.taskId, this.taskRecord.getId(), this.blockVo.getBlockId());
        RootBp.taskStatus.put(this.taskId + this.taskRecord.getId(), false);
    }

    protected void setBlockInputParamsValue(AbstratRootBp rootBp) throws Exception {
        this.blockRecord.setBlockInputParams(this.inputParams != null ? this.inputParams.toJSONString() : null);
        this.windService.saveBlockRecord(this.blockRecord, this.blockVo.getBlockId(), this.blockVo.getBlockType(), this.taskRecord.getProjectId(), this.taskId, this.taskRecord.getId(), this.startOn);
    }
}

