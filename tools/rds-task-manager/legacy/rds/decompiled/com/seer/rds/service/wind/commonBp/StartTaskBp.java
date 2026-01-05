/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.alibaba.fastjson.JSONObject
 *  com.google.common.collect.Maps
 *  com.seer.rds.config.GlobalCacheConfig
 *  com.seer.rds.constant.TaskLogLevelEnum
 *  com.seer.rds.service.agv.WindService
 *  com.seer.rds.service.wind.AbstractBp
 *  com.seer.rds.service.wind.AbstratRootBp
 *  com.seer.rds.service.wind.commonBp.StartTaskBp
 *  com.seer.rds.service.wind.commonBp.StopTaskBp
 *  com.seer.rds.vo.wind.ParamPreField
 *  com.seer.rds.vo.wind.StopTaskBpField
 *  org.slf4j.Logger
 *  org.slf4j.LoggerFactory
 *  org.springframework.beans.factory.annotation.Autowired
 *  org.springframework.context.annotation.Scope
 *  org.springframework.stereotype.Component
 */
package com.seer.rds.service.wind.commonBp;

import com.alibaba.fastjson.JSONObject;
import com.google.common.collect.Maps;
import com.seer.rds.config.GlobalCacheConfig;
import com.seer.rds.constant.TaskLogLevelEnum;
import com.seer.rds.service.agv.WindService;
import com.seer.rds.service.wind.AbstractBp;
import com.seer.rds.service.wind.AbstratRootBp;
import com.seer.rds.service.wind.commonBp.StopTaskBp;
import com.seer.rds.vo.wind.ParamPreField;
import com.seer.rds.vo.wind.StopTaskBpField;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import java.util.concurrent.locks.LockSupport;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Scope;
import org.springframework.stereotype.Component;

@Component(value="StartTaskBp")
@Scope(value="prototype")
public class StartTaskBp
extends AbstractBp {
    private static final Logger log = LoggerFactory.getLogger(StartTaskBp.class);
    @Autowired
    private WindService windService;
    private String taskRecordId;
    private boolean startSuccess;

    protected void getInputParamsAndExecute(AbstratRootBp rootBp) throws Exception {
        this.taskRecordId = rootBp.getInputParamValue(this.taskId, this.inputParams, StopTaskBpField.taskRecordId).toString();
        try {
            List cacheThread = GlobalCacheConfig.getCacheThread((String)this.taskRecordId);
            this.startSuccess = false;
            if (cacheThread.size() == 0) {
                log.info("This taskrecordid does not exist");
                this.windService.saveLog(TaskLogLevelEnum.stop.getLevel(), String.format("[%s]@{wind.bp.unExecutable}", this.getClass().getSimpleName()), this.taskRecord.getProjectId(), this.taskId, this.taskRecord.getId(), this.blockVo.getBlockId());
                this.blockRecord.setOutputParams(JSONObject.toJSONString(AbstratRootBp.outputParamsMap.get()));
                this.blockRecord.setInputParams(JSONObject.toJSONString(AbstratRootBp.inputParamsMap.get()));
                this.blockRecord.setInternalVariables(JSONObject.toJSONString(AbstratRootBp.taskVariablesMap.get()));
                this.blockRecord.setBlockInputParams(this.inputParams != null ? this.inputParams.toJSONString() : null);
                super.getWindService().saveSuspendErrorBlockRecord(this.blockRecord, this.blockVo.getBlockId(), this.blockVo.getBlockType(), this.taskRecord.getProjectId(), this.taskId, this.taskRecord.getId(), this.startOn, "This task record id does not exist");
            }
            GlobalCacheConfig.clearCacheInterrupt((String)this.taskRecordId);
            List cacheThreadSet = GlobalCacheConfig.getCacheThread((String)this.taskRecordId);
            for (Thread thread : cacheThreadSet) {
                LockSupport.unpark(thread);
            }
            this.startSuccess = true;
            Map paramMap = (Map)((ConcurrentHashMap)AbstratRootBp.outputParamsMap.get()).get(ParamPreField.blocks);
            ConcurrentMap childParamMap = Maps.newConcurrentMap();
            childParamMap.put("startSuccess", this.startSuccess);
            paramMap.put(this.blockVo.getBlockName(), childParamMap);
            ((ConcurrentHashMap)AbstratRootBp.outputParamsMap.get()).put(ParamPreField.blocks, paramMap);
            this.saveLogResult((Object)this.startSuccess);
        }
        catch (Exception e) {
            log.error("StartTaskBp [{}] {}]", (Object)this.taskRecordId, (Object)e.getMessage());
            this.saveLogError(e.getMessage());
            super.getWindService().updateTaskRecordEndedReason(this.taskRecord.getId(), "StartTaskBp @{wind.bp.fail}");
            throw e;
        }
    }

    protected void setBlockInputParamsValue(AbstratRootBp rootBp) throws Exception {
        StopTaskBp bpData = new StopTaskBp();
        bpData.setTaskRecordId(this.taskRecordId);
        this.blockRecord.setBlockInputParamsValue(JSONObject.toJSONString((Object)bpData));
        this.windService.saveBlockRecord(this.blockRecord, this.blockVo.getBlockId(), this.blockVo.getBlockType(), this.taskRecord.getProjectId(), this.taskId, this.taskRecord.getId(), this.startOn);
    }

    public WindService getWindService() {
        return this.windService;
    }

    public String getTaskRecordId() {
        return this.taskRecordId;
    }

    public boolean isStartSuccess() {
        return this.startSuccess;
    }

    public void setWindService(WindService windService) {
        this.windService = windService;
    }

    public void setTaskRecordId(String taskRecordId) {
        this.taskRecordId = taskRecordId;
    }

    public void setStartSuccess(boolean startSuccess) {
        this.startSuccess = startSuccess;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof StartTaskBp)) {
            return false;
        }
        StartTaskBp other = (StartTaskBp)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        if (this.isStartSuccess() != other.isStartSuccess()) {
            return false;
        }
        WindService this$windService = this.getWindService();
        WindService other$windService = other.getWindService();
        if (this$windService == null ? other$windService != null : !this$windService.equals(other$windService)) {
            return false;
        }
        String this$taskRecordId = this.getTaskRecordId();
        String other$taskRecordId = other.getTaskRecordId();
        return !(this$taskRecordId == null ? other$taskRecordId != null : !this$taskRecordId.equals(other$taskRecordId));
    }

    protected boolean canEqual(Object other) {
        return other instanceof StartTaskBp;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        result = result * 59 + (this.isStartSuccess() ? 79 : 97);
        WindService $windService = this.getWindService();
        result = result * 59 + ($windService == null ? 43 : $windService.hashCode());
        String $taskRecordId = this.getTaskRecordId();
        result = result * 59 + ($taskRecordId == null ? 43 : $taskRecordId.hashCode());
        return result;
    }

    public String toString() {
        return "StartTaskBp(windService=" + this.getWindService() + ", taskRecordId=" + this.getTaskRecordId() + ", startSuccess=" + this.isStartSuccess() + ")";
    }
}

