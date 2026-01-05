/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.listener.WindEvent
 *  com.seer.rds.listener.WindEvent$WindEventBuilder
 *  com.seer.rds.model.wind.TaskRecord
 *  com.seer.rds.model.wind.WindBlockRecord
 *  com.seer.rds.vo.WindBlockVo
 *  com.seer.rds.vo.WorkSiteVo
 */
package com.seer.rds.listener;

import com.seer.rds.listener.WindEvent;
import com.seer.rds.model.wind.TaskRecord;
import com.seer.rds.model.wind.WindBlockRecord;
import com.seer.rds.vo.WindBlockVo;
import com.seer.rds.vo.WorkSiteVo;

public class WindEvent {
    private Integer type;
    private String status;
    private String taskId;
    private String taskLabel;
    private String agvId;
    private String workSite;
    private TaskRecord taskRecord;
    private WindBlockRecord blockRecord;
    private WindBlockVo blockVo;
    private WorkSiteVo workSiteVo;
    private Object data;
    private String msg;
    private String errorCode;
    private String errorDesc;

    public static WindEventBuilder builder() {
        return new WindEventBuilder();
    }

    public Integer getType() {
        return this.type;
    }

    public String getStatus() {
        return this.status;
    }

    public String getTaskId() {
        return this.taskId;
    }

    public String getTaskLabel() {
        return this.taskLabel;
    }

    public String getAgvId() {
        return this.agvId;
    }

    public String getWorkSite() {
        return this.workSite;
    }

    public TaskRecord getTaskRecord() {
        return this.taskRecord;
    }

    public WindBlockRecord getBlockRecord() {
        return this.blockRecord;
    }

    public WindBlockVo getBlockVo() {
        return this.blockVo;
    }

    public WorkSiteVo getWorkSiteVo() {
        return this.workSiteVo;
    }

    public Object getData() {
        return this.data;
    }

    public String getMsg() {
        return this.msg;
    }

    public String getErrorCode() {
        return this.errorCode;
    }

    public String getErrorDesc() {
        return this.errorDesc;
    }

    public void setType(Integer type) {
        this.type = type;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public void setTaskId(String taskId) {
        this.taskId = taskId;
    }

    public void setTaskLabel(String taskLabel) {
        this.taskLabel = taskLabel;
    }

    public void setAgvId(String agvId) {
        this.agvId = agvId;
    }

    public void setWorkSite(String workSite) {
        this.workSite = workSite;
    }

    public void setTaskRecord(TaskRecord taskRecord) {
        this.taskRecord = taskRecord;
    }

    public void setBlockRecord(WindBlockRecord blockRecord) {
        this.blockRecord = blockRecord;
    }

    public void setBlockVo(WindBlockVo blockVo) {
        this.blockVo = blockVo;
    }

    public void setWorkSiteVo(WorkSiteVo workSiteVo) {
        this.workSiteVo = workSiteVo;
    }

    public void setData(Object data) {
        this.data = data;
    }

    public void setMsg(String msg) {
        this.msg = msg;
    }

    public void setErrorCode(String errorCode) {
        this.errorCode = errorCode;
    }

    public void setErrorDesc(String errorDesc) {
        this.errorDesc = errorDesc;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof WindEvent)) {
            return false;
        }
        WindEvent other = (WindEvent)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        Integer this$type = this.getType();
        Integer other$type = other.getType();
        if (this$type == null ? other$type != null : !((Object)this$type).equals(other$type)) {
            return false;
        }
        String this$status = this.getStatus();
        String other$status = other.getStatus();
        if (this$status == null ? other$status != null : !this$status.equals(other$status)) {
            return false;
        }
        String this$taskId = this.getTaskId();
        String other$taskId = other.getTaskId();
        if (this$taskId == null ? other$taskId != null : !this$taskId.equals(other$taskId)) {
            return false;
        }
        String this$taskLabel = this.getTaskLabel();
        String other$taskLabel = other.getTaskLabel();
        if (this$taskLabel == null ? other$taskLabel != null : !this$taskLabel.equals(other$taskLabel)) {
            return false;
        }
        String this$agvId = this.getAgvId();
        String other$agvId = other.getAgvId();
        if (this$agvId == null ? other$agvId != null : !this$agvId.equals(other$agvId)) {
            return false;
        }
        String this$workSite = this.getWorkSite();
        String other$workSite = other.getWorkSite();
        if (this$workSite == null ? other$workSite != null : !this$workSite.equals(other$workSite)) {
            return false;
        }
        TaskRecord this$taskRecord = this.getTaskRecord();
        TaskRecord other$taskRecord = other.getTaskRecord();
        if (this$taskRecord == null ? other$taskRecord != null : !this$taskRecord.equals(other$taskRecord)) {
            return false;
        }
        WindBlockRecord this$blockRecord = this.getBlockRecord();
        WindBlockRecord other$blockRecord = other.getBlockRecord();
        if (this$blockRecord == null ? other$blockRecord != null : !this$blockRecord.equals(other$blockRecord)) {
            return false;
        }
        WindBlockVo this$blockVo = this.getBlockVo();
        WindBlockVo other$blockVo = other.getBlockVo();
        if (this$blockVo == null ? other$blockVo != null : !this$blockVo.equals(other$blockVo)) {
            return false;
        }
        WorkSiteVo this$workSiteVo = this.getWorkSiteVo();
        WorkSiteVo other$workSiteVo = other.getWorkSiteVo();
        if (this$workSiteVo == null ? other$workSiteVo != null : !this$workSiteVo.equals(other$workSiteVo)) {
            return false;
        }
        Object this$data = this.getData();
        Object other$data = other.getData();
        if (this$data == null ? other$data != null : !this$data.equals(other$data)) {
            return false;
        }
        String this$msg = this.getMsg();
        String other$msg = other.getMsg();
        if (this$msg == null ? other$msg != null : !this$msg.equals(other$msg)) {
            return false;
        }
        String this$errorCode = this.getErrorCode();
        String other$errorCode = other.getErrorCode();
        if (this$errorCode == null ? other$errorCode != null : !this$errorCode.equals(other$errorCode)) {
            return false;
        }
        String this$errorDesc = this.getErrorDesc();
        String other$errorDesc = other.getErrorDesc();
        return !(this$errorDesc == null ? other$errorDesc != null : !this$errorDesc.equals(other$errorDesc));
    }

    protected boolean canEqual(Object other) {
        return other instanceof WindEvent;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        Integer $type = this.getType();
        result = result * 59 + ($type == null ? 43 : ((Object)$type).hashCode());
        String $status = this.getStatus();
        result = result * 59 + ($status == null ? 43 : $status.hashCode());
        String $taskId = this.getTaskId();
        result = result * 59 + ($taskId == null ? 43 : $taskId.hashCode());
        String $taskLabel = this.getTaskLabel();
        result = result * 59 + ($taskLabel == null ? 43 : $taskLabel.hashCode());
        String $agvId = this.getAgvId();
        result = result * 59 + ($agvId == null ? 43 : $agvId.hashCode());
        String $workSite = this.getWorkSite();
        result = result * 59 + ($workSite == null ? 43 : $workSite.hashCode());
        TaskRecord $taskRecord = this.getTaskRecord();
        result = result * 59 + ($taskRecord == null ? 43 : $taskRecord.hashCode());
        WindBlockRecord $blockRecord = this.getBlockRecord();
        result = result * 59 + ($blockRecord == null ? 43 : $blockRecord.hashCode());
        WindBlockVo $blockVo = this.getBlockVo();
        result = result * 59 + ($blockVo == null ? 43 : $blockVo.hashCode());
        WorkSiteVo $workSiteVo = this.getWorkSiteVo();
        result = result * 59 + ($workSiteVo == null ? 43 : $workSiteVo.hashCode());
        Object $data = this.getData();
        result = result * 59 + ($data == null ? 43 : $data.hashCode());
        String $msg = this.getMsg();
        result = result * 59 + ($msg == null ? 43 : $msg.hashCode());
        String $errorCode = this.getErrorCode();
        result = result * 59 + ($errorCode == null ? 43 : $errorCode.hashCode());
        String $errorDesc = this.getErrorDesc();
        result = result * 59 + ($errorDesc == null ? 43 : $errorDesc.hashCode());
        return result;
    }

    public String toString() {
        return "WindEvent(type=" + this.getType() + ", status=" + this.getStatus() + ", taskId=" + this.getTaskId() + ", taskLabel=" + this.getTaskLabel() + ", agvId=" + this.getAgvId() + ", workSite=" + this.getWorkSite() + ", taskRecord=" + this.getTaskRecord() + ", blockRecord=" + this.getBlockRecord() + ", blockVo=" + this.getBlockVo() + ", workSiteVo=" + this.getWorkSiteVo() + ", data=" + this.getData() + ", msg=" + this.getMsg() + ", errorCode=" + this.getErrorCode() + ", errorDesc=" + this.getErrorDesc() + ")";
    }

    public WindEvent() {
    }

    public WindEvent(Integer type, String status, String taskId, String taskLabel, String agvId, String workSite, TaskRecord taskRecord, WindBlockRecord blockRecord, WindBlockVo blockVo, WorkSiteVo workSiteVo, Object data, String msg, String errorCode, String errorDesc) {
        this.type = type;
        this.status = status;
        this.taskId = taskId;
        this.taskLabel = taskLabel;
        this.agvId = agvId;
        this.workSite = workSite;
        this.taskRecord = taskRecord;
        this.blockRecord = blockRecord;
        this.blockVo = blockVo;
        this.workSiteVo = workSiteVo;
        this.data = data;
        this.msg = msg;
        this.errorCode = errorCode;
        this.errorDesc = errorDesc;
    }
}

