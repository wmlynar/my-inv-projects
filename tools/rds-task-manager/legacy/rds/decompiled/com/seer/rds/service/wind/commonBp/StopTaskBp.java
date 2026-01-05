/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.alibaba.fastjson.JSONObject
 *  com.google.common.collect.Maps
 *  com.seer.rds.constant.TaskLogLevelEnum
 *  com.seer.rds.dao.WindTaskRecordMapper
 *  com.seer.rds.model.wind.WindTaskRecord
 *  com.seer.rds.service.agv.WindService
 *  com.seer.rds.service.wind.AbstractBp
 *  com.seer.rds.service.wind.AbstratRootBp
 *  com.seer.rds.service.wind.commonBp.StopTaskBp
 *  com.seer.rds.vo.StopAllTaskReq$StopTask
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
import com.seer.rds.constant.TaskLogLevelEnum;
import com.seer.rds.dao.WindTaskRecordMapper;
import com.seer.rds.model.wind.WindTaskRecord;
import com.seer.rds.service.agv.WindService;
import com.seer.rds.service.wind.AbstractBp;
import com.seer.rds.service.wind.AbstratRootBp;
import com.seer.rds.vo.StopAllTaskReq;
import com.seer.rds.vo.wind.ParamPreField;
import com.seer.rds.vo.wind.StopTaskBpField;
import java.util.ArrayList;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Scope;
import org.springframework.stereotype.Component;

@Component(value="StopTaskBp")
@Scope(value="prototype")
public class StopTaskBp
extends AbstractBp {
    private static final Logger log = LoggerFactory.getLogger(StopTaskBp.class);
    @Autowired
    private WindService windService;
    @Autowired
    private WindTaskRecordMapper windTaskRecordMapper;
    private String taskRecordId;
    private boolean stopSuccess;

    protected void getInputParamsAndExecute(AbstratRootBp rootBp) throws Exception {
        this.taskRecordId = rootBp.getInputParamValue(this.taskId, this.inputParams, StopTaskBpField.taskRecordId).toString();
        try {
            boolean isStop;
            StopAllTaskReq.StopTask task = new StopAllTaskReq.StopTask();
            task.setTaskId(this.taskId);
            task.setTaskRecordId(this.taskRecordId);
            ArrayList<StopAllTaskReq.StopTask> taskList = new ArrayList<StopAllTaskReq.StopTask>();
            taskList.add(task);
            WindTaskRecord windTaskRecord = this.windTaskRecordMapper.findById((Object)this.taskRecordId).orElse(null);
            this.stopSuccess = true;
            if (windTaskRecord == null) {
                this.stopSuccess = false;
                log.info("This taskrecordid does not exist");
                this.windService.saveLog(TaskLogLevelEnum.stop.getLevel(), String.format("[%s]@{wind.bp.unExecutable}", this.getClass().getSimpleName()), this.taskRecord.getProjectId(), this.taskId, this.taskRecord.getId(), this.blockVo.getBlockId());
                this.blockRecord.setOutputParams(JSONObject.toJSONString(AbstratRootBp.outputParamsMap.get()));
                this.blockRecord.setInputParams(JSONObject.toJSONString(AbstratRootBp.inputParamsMap.get()));
                this.blockRecord.setInternalVariables(JSONObject.toJSONString(AbstratRootBp.taskVariablesMap.get()));
                this.blockRecord.setBlockInputParams(this.inputParams != null ? this.inputParams.toJSONString() : null);
                super.getWindService().saveSuspendErrorBlockRecord(this.blockRecord, this.blockVo.getBlockId(), this.blockVo.getBlockType(), this.taskRecord.getProjectId(), this.taskId, this.taskRecord.getId(), this.startOn, "This task record id does not exist");
            }
            if (!(isStop = this.windService.stopTask(taskList))) {
                this.stopSuccess = false;
                log.info("This task cannot be stoped");
                this.windService.saveLog(TaskLogLevelEnum.stop.getLevel(), String.format("[%s]@{wind.bp.unExecutable}", this.getClass().getSimpleName()), this.taskRecord.getProjectId(), this.taskId, this.taskRecord.getId(), this.blockVo.getBlockId());
                this.blockRecord.setOutputParams(JSONObject.toJSONString(AbstratRootBp.outputParamsMap.get()));
                this.blockRecord.setInputParams(JSONObject.toJSONString(AbstratRootBp.inputParamsMap.get()));
                this.blockRecord.setInternalVariables(JSONObject.toJSONString(AbstratRootBp.taskVariablesMap.get()));
                this.blockRecord.setBlockInputParams(this.inputParams != null ? this.inputParams.toJSONString() : null);
                super.getWindService().saveSuspendErrorBlockRecord(this.blockRecord, this.blockVo.getBlockId(), this.blockVo.getBlockType(), this.taskRecord.getProjectId(), this.taskId, this.taskRecord.getId(), this.startOn, "This task has already ended and can not be stoped");
            }
            Map paramMap = (Map)((ConcurrentHashMap)AbstratRootBp.outputParamsMap.get()).get(ParamPreField.blocks);
            ConcurrentMap childParamMap = Maps.newConcurrentMap();
            childParamMap.put("stopSuccess", this.stopSuccess);
            paramMap.put(this.blockVo.getBlockName(), childParamMap);
            ((ConcurrentHashMap)AbstratRootBp.outputParamsMap.get()).put(ParamPreField.blocks, paramMap);
            this.saveLogResult((Object)this.stopSuccess);
        }
        catch (Exception e) {
            log.error("StopTaskBP [{}] {}]", (Object)this.taskRecordId, (Object)e.getMessage());
            this.saveLogError(e.getMessage());
            super.getWindService().updateTaskRecordEndedReason(this.taskRecord.getId(), "StopTaskBp @{wind.bp.fail}");
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

    public WindTaskRecordMapper getWindTaskRecordMapper() {
        return this.windTaskRecordMapper;
    }

    public String getTaskRecordId() {
        return this.taskRecordId;
    }

    public boolean isStopSuccess() {
        return this.stopSuccess;
    }

    public void setWindService(WindService windService) {
        this.windService = windService;
    }

    public void setWindTaskRecordMapper(WindTaskRecordMapper windTaskRecordMapper) {
        this.windTaskRecordMapper = windTaskRecordMapper;
    }

    public void setTaskRecordId(String taskRecordId) {
        this.taskRecordId = taskRecordId;
    }

    public void setStopSuccess(boolean stopSuccess) {
        this.stopSuccess = stopSuccess;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof StopTaskBp)) {
            return false;
        }
        StopTaskBp other = (StopTaskBp)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        if (this.isStopSuccess() != other.isStopSuccess()) {
            return false;
        }
        WindService this$windService = this.getWindService();
        WindService other$windService = other.getWindService();
        if (this$windService == null ? other$windService != null : !this$windService.equals(other$windService)) {
            return false;
        }
        WindTaskRecordMapper this$windTaskRecordMapper = this.getWindTaskRecordMapper();
        WindTaskRecordMapper other$windTaskRecordMapper = other.getWindTaskRecordMapper();
        if (this$windTaskRecordMapper == null ? other$windTaskRecordMapper != null : !this$windTaskRecordMapper.equals(other$windTaskRecordMapper)) {
            return false;
        }
        String this$taskRecordId = this.getTaskRecordId();
        String other$taskRecordId = other.getTaskRecordId();
        return !(this$taskRecordId == null ? other$taskRecordId != null : !this$taskRecordId.equals(other$taskRecordId));
    }

    protected boolean canEqual(Object other) {
        return other instanceof StopTaskBp;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        result = result * 59 + (this.isStopSuccess() ? 79 : 97);
        WindService $windService = this.getWindService();
        result = result * 59 + ($windService == null ? 43 : $windService.hashCode());
        WindTaskRecordMapper $windTaskRecordMapper = this.getWindTaskRecordMapper();
        result = result * 59 + ($windTaskRecordMapper == null ? 43 : $windTaskRecordMapper.hashCode());
        String $taskRecordId = this.getTaskRecordId();
        result = result * 59 + ($taskRecordId == null ? 43 : $taskRecordId.hashCode());
        return result;
    }

    public String toString() {
        return "StopTaskBp(windService=" + this.getWindService() + ", windTaskRecordMapper=" + this.getWindTaskRecordMapper() + ", taskRecordId=" + this.getTaskRecordId() + ", stopSuccess=" + this.isStopSuccess() + ")";
    }
}

