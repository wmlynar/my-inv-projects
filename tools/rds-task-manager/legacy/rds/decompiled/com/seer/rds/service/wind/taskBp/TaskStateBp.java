/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.alibaba.fastjson.JSONObject
 *  com.seer.rds.model.wind.BaseRecord
 *  com.seer.rds.model.wind.TaskRecord
 *  com.seer.rds.service.agv.WindService
 *  com.seer.rds.service.factory.RecordUpdaterFactory
 *  com.seer.rds.service.wind.AbstractBp
 *  com.seer.rds.service.wind.AbstratRootBp
 *  com.seer.rds.service.wind.taskBp.TaskStateBp
 *  com.seer.rds.vo.wind.TaskStateBpField
 *  org.slf4j.Logger
 *  org.slf4j.LoggerFactory
 *  org.springframework.beans.factory.annotation.Autowired
 *  org.springframework.context.annotation.Scope
 *  org.springframework.stereotype.Component
 */
package com.seer.rds.service.wind.taskBp;

import com.alibaba.fastjson.JSONObject;
import com.seer.rds.model.wind.BaseRecord;
import com.seer.rds.model.wind.TaskRecord;
import com.seer.rds.service.agv.WindService;
import com.seer.rds.service.factory.RecordUpdaterFactory;
import com.seer.rds.service.wind.AbstractBp;
import com.seer.rds.service.wind.AbstratRootBp;
import com.seer.rds.vo.wind.TaskStateBpField;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Scope;
import org.springframework.stereotype.Component;

@Component(value="TaskStateBp")
@Scope(value="prototype")
public class TaskStateBp
extends AbstractBp<TaskRecord> {
    private static final Logger log = LoggerFactory.getLogger(TaskStateBp.class);
    @Autowired
    private WindService windService;
    private Object stateCode;
    private Object stateMsg;

    protected void getInputParamsAndExecute(AbstratRootBp rootBp) throws Exception {
        this.stateMsg = rootBp.getInputParamValue(this.taskId, this.inputParams, TaskStateBpField.stateMsg);
        if (this.stateMsg != null) {
            ((TaskRecord)this.taskRecord).setStateDescription(this.stateMsg.toString());
            RecordUpdaterFactory.getUpdater((BaseRecord)this.taskRecord).updateRecord(this.taskRecord);
        }
    }

    protected void setBlockInputParamsValue(AbstratRootBp rootBp) {
        TaskStateBp bpData = new TaskStateBp();
        bpData.setStateCode(this.stateCode);
        bpData.setStateMsg(this.stateMsg);
        this.blockRecord.setBlockInputParamsValue(JSONObject.toJSONString((Object)bpData));
        this.windService.saveBlockRecord(this.blockRecord, this.blockVo.getBlockId(), this.blockVo.getBlockType(), ((TaskRecord)this.taskRecord).getProjectId(), this.taskId, ((TaskRecord)this.taskRecord).getId(), this.startOn);
    }

    public WindService getWindService() {
        return this.windService;
    }

    public Object getStateCode() {
        return this.stateCode;
    }

    public Object getStateMsg() {
        return this.stateMsg;
    }

    public void setWindService(WindService windService) {
        this.windService = windService;
    }

    public void setStateCode(Object stateCode) {
        this.stateCode = stateCode;
    }

    public void setStateMsg(Object stateMsg) {
        this.stateMsg = stateMsg;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof TaskStateBp)) {
            return false;
        }
        TaskStateBp other = (TaskStateBp)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        WindService this$windService = this.getWindService();
        WindService other$windService = other.getWindService();
        if (this$windService == null ? other$windService != null : !this$windService.equals(other$windService)) {
            return false;
        }
        Object this$stateCode = this.getStateCode();
        Object other$stateCode = other.getStateCode();
        if (this$stateCode == null ? other$stateCode != null : !this$stateCode.equals(other$stateCode)) {
            return false;
        }
        Object this$stateMsg = this.getStateMsg();
        Object other$stateMsg = other.getStateMsg();
        return !(this$stateMsg == null ? other$stateMsg != null : !this$stateMsg.equals(other$stateMsg));
    }

    protected boolean canEqual(Object other) {
        return other instanceof TaskStateBp;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        WindService $windService = this.getWindService();
        result = result * 59 + ($windService == null ? 43 : $windService.hashCode());
        Object $stateCode = this.getStateCode();
        result = result * 59 + ($stateCode == null ? 43 : $stateCode.hashCode());
        Object $stateMsg = this.getStateMsg();
        result = result * 59 + ($stateMsg == null ? 43 : $stateMsg.hashCode());
        return result;
    }

    public String toString() {
        return "TaskStateBp(windService=" + this.getWindService() + ", stateCode=" + this.getStateCode() + ", stateMsg=" + this.getStateMsg() + ")";
    }
}

