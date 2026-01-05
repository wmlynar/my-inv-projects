/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.vo.ScriptTaskRecord
 *  com.seer.rds.vo.ScriptTaskRecord$ScriptTaskRecordBuilder
 */
package com.seer.rds.vo;

import com.seer.rds.vo.ScriptTaskRecord;

public class ScriptTaskRecord {
    private String agvId;
    private String endedOn;
    private String rootTaskRecordId;
    private Integer defVersion;
    private String outOrderNo;
    private String parentTaskRecordId;
    private Boolean ifHaveChildTask;
    private Integer priority;
    private Integer executorTime;
    private String path;
    private String defLabel;
    private String stateDescription;
    private String createdOn;
    private String defId;
    private String firstExecutorTime;
    private String id;
    private String endedReason;
    private Integer status;
    private String workTypes;
    private String workStations;

    public static ScriptTaskRecordBuilder builder() {
        return new ScriptTaskRecordBuilder();
    }

    public String getAgvId() {
        return this.agvId;
    }

    public String getEndedOn() {
        return this.endedOn;
    }

    public String getRootTaskRecordId() {
        return this.rootTaskRecordId;
    }

    public Integer getDefVersion() {
        return this.defVersion;
    }

    public String getOutOrderNo() {
        return this.outOrderNo;
    }

    public String getParentTaskRecordId() {
        return this.parentTaskRecordId;
    }

    public Boolean getIfHaveChildTask() {
        return this.ifHaveChildTask;
    }

    public Integer getPriority() {
        return this.priority;
    }

    public Integer getExecutorTime() {
        return this.executorTime;
    }

    public String getPath() {
        return this.path;
    }

    public String getDefLabel() {
        return this.defLabel;
    }

    public String getStateDescription() {
        return this.stateDescription;
    }

    public String getCreatedOn() {
        return this.createdOn;
    }

    public String getDefId() {
        return this.defId;
    }

    public String getFirstExecutorTime() {
        return this.firstExecutorTime;
    }

    public String getId() {
        return this.id;
    }

    public String getEndedReason() {
        return this.endedReason;
    }

    public Integer getStatus() {
        return this.status;
    }

    public String getWorkTypes() {
        return this.workTypes;
    }

    public String getWorkStations() {
        return this.workStations;
    }

    public void setAgvId(String agvId) {
        this.agvId = agvId;
    }

    public void setEndedOn(String endedOn) {
        this.endedOn = endedOn;
    }

    public void setRootTaskRecordId(String rootTaskRecordId) {
        this.rootTaskRecordId = rootTaskRecordId;
    }

    public void setDefVersion(Integer defVersion) {
        this.defVersion = defVersion;
    }

    public void setOutOrderNo(String outOrderNo) {
        this.outOrderNo = outOrderNo;
    }

    public void setParentTaskRecordId(String parentTaskRecordId) {
        this.parentTaskRecordId = parentTaskRecordId;
    }

    public void setIfHaveChildTask(Boolean ifHaveChildTask) {
        this.ifHaveChildTask = ifHaveChildTask;
    }

    public void setPriority(Integer priority) {
        this.priority = priority;
    }

    public void setExecutorTime(Integer executorTime) {
        this.executorTime = executorTime;
    }

    public void setPath(String path) {
        this.path = path;
    }

    public void setDefLabel(String defLabel) {
        this.defLabel = defLabel;
    }

    public void setStateDescription(String stateDescription) {
        this.stateDescription = stateDescription;
    }

    public void setCreatedOn(String createdOn) {
        this.createdOn = createdOn;
    }

    public void setDefId(String defId) {
        this.defId = defId;
    }

    public void setFirstExecutorTime(String firstExecutorTime) {
        this.firstExecutorTime = firstExecutorTime;
    }

    public void setId(String id) {
        this.id = id;
    }

    public void setEndedReason(String endedReason) {
        this.endedReason = endedReason;
    }

    public void setStatus(Integer status) {
        this.status = status;
    }

    public void setWorkTypes(String workTypes) {
        this.workTypes = workTypes;
    }

    public void setWorkStations(String workStations) {
        this.workStations = workStations;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof ScriptTaskRecord)) {
            return false;
        }
        ScriptTaskRecord other = (ScriptTaskRecord)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        Integer this$defVersion = this.getDefVersion();
        Integer other$defVersion = other.getDefVersion();
        if (this$defVersion == null ? other$defVersion != null : !((Object)this$defVersion).equals(other$defVersion)) {
            return false;
        }
        Boolean this$ifHaveChildTask = this.getIfHaveChildTask();
        Boolean other$ifHaveChildTask = other.getIfHaveChildTask();
        if (this$ifHaveChildTask == null ? other$ifHaveChildTask != null : !((Object)this$ifHaveChildTask).equals(other$ifHaveChildTask)) {
            return false;
        }
        Integer this$priority = this.getPriority();
        Integer other$priority = other.getPriority();
        if (this$priority == null ? other$priority != null : !((Object)this$priority).equals(other$priority)) {
            return false;
        }
        Integer this$executorTime = this.getExecutorTime();
        Integer other$executorTime = other.getExecutorTime();
        if (this$executorTime == null ? other$executorTime != null : !((Object)this$executorTime).equals(other$executorTime)) {
            return false;
        }
        Integer this$status = this.getStatus();
        Integer other$status = other.getStatus();
        if (this$status == null ? other$status != null : !((Object)this$status).equals(other$status)) {
            return false;
        }
        String this$agvId = this.getAgvId();
        String other$agvId = other.getAgvId();
        if (this$agvId == null ? other$agvId != null : !this$agvId.equals(other$agvId)) {
            return false;
        }
        String this$endedOn = this.getEndedOn();
        String other$endedOn = other.getEndedOn();
        if (this$endedOn == null ? other$endedOn != null : !this$endedOn.equals(other$endedOn)) {
            return false;
        }
        String this$rootTaskRecordId = this.getRootTaskRecordId();
        String other$rootTaskRecordId = other.getRootTaskRecordId();
        if (this$rootTaskRecordId == null ? other$rootTaskRecordId != null : !this$rootTaskRecordId.equals(other$rootTaskRecordId)) {
            return false;
        }
        String this$outOrderNo = this.getOutOrderNo();
        String other$outOrderNo = other.getOutOrderNo();
        if (this$outOrderNo == null ? other$outOrderNo != null : !this$outOrderNo.equals(other$outOrderNo)) {
            return false;
        }
        String this$parentTaskRecordId = this.getParentTaskRecordId();
        String other$parentTaskRecordId = other.getParentTaskRecordId();
        if (this$parentTaskRecordId == null ? other$parentTaskRecordId != null : !this$parentTaskRecordId.equals(other$parentTaskRecordId)) {
            return false;
        }
        String this$path = this.getPath();
        String other$path = other.getPath();
        if (this$path == null ? other$path != null : !this$path.equals(other$path)) {
            return false;
        }
        String this$defLabel = this.getDefLabel();
        String other$defLabel = other.getDefLabel();
        if (this$defLabel == null ? other$defLabel != null : !this$defLabel.equals(other$defLabel)) {
            return false;
        }
        String this$stateDescription = this.getStateDescription();
        String other$stateDescription = other.getStateDescription();
        if (this$stateDescription == null ? other$stateDescription != null : !this$stateDescription.equals(other$stateDescription)) {
            return false;
        }
        String this$createdOn = this.getCreatedOn();
        String other$createdOn = other.getCreatedOn();
        if (this$createdOn == null ? other$createdOn != null : !this$createdOn.equals(other$createdOn)) {
            return false;
        }
        String this$defId = this.getDefId();
        String other$defId = other.getDefId();
        if (this$defId == null ? other$defId != null : !this$defId.equals(other$defId)) {
            return false;
        }
        String this$firstExecutorTime = this.getFirstExecutorTime();
        String other$firstExecutorTime = other.getFirstExecutorTime();
        if (this$firstExecutorTime == null ? other$firstExecutorTime != null : !this$firstExecutorTime.equals(other$firstExecutorTime)) {
            return false;
        }
        String this$id = this.getId();
        String other$id = other.getId();
        if (this$id == null ? other$id != null : !this$id.equals(other$id)) {
            return false;
        }
        String this$endedReason = this.getEndedReason();
        String other$endedReason = other.getEndedReason();
        if (this$endedReason == null ? other$endedReason != null : !this$endedReason.equals(other$endedReason)) {
            return false;
        }
        String this$workTypes = this.getWorkTypes();
        String other$workTypes = other.getWorkTypes();
        if (this$workTypes == null ? other$workTypes != null : !this$workTypes.equals(other$workTypes)) {
            return false;
        }
        String this$workStations = this.getWorkStations();
        String other$workStations = other.getWorkStations();
        return !(this$workStations == null ? other$workStations != null : !this$workStations.equals(other$workStations));
    }

    protected boolean canEqual(Object other) {
        return other instanceof ScriptTaskRecord;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        Integer $defVersion = this.getDefVersion();
        result = result * 59 + ($defVersion == null ? 43 : ((Object)$defVersion).hashCode());
        Boolean $ifHaveChildTask = this.getIfHaveChildTask();
        result = result * 59 + ($ifHaveChildTask == null ? 43 : ((Object)$ifHaveChildTask).hashCode());
        Integer $priority = this.getPriority();
        result = result * 59 + ($priority == null ? 43 : ((Object)$priority).hashCode());
        Integer $executorTime = this.getExecutorTime();
        result = result * 59 + ($executorTime == null ? 43 : ((Object)$executorTime).hashCode());
        Integer $status = this.getStatus();
        result = result * 59 + ($status == null ? 43 : ((Object)$status).hashCode());
        String $agvId = this.getAgvId();
        result = result * 59 + ($agvId == null ? 43 : $agvId.hashCode());
        String $endedOn = this.getEndedOn();
        result = result * 59 + ($endedOn == null ? 43 : $endedOn.hashCode());
        String $rootTaskRecordId = this.getRootTaskRecordId();
        result = result * 59 + ($rootTaskRecordId == null ? 43 : $rootTaskRecordId.hashCode());
        String $outOrderNo = this.getOutOrderNo();
        result = result * 59 + ($outOrderNo == null ? 43 : $outOrderNo.hashCode());
        String $parentTaskRecordId = this.getParentTaskRecordId();
        result = result * 59 + ($parentTaskRecordId == null ? 43 : $parentTaskRecordId.hashCode());
        String $path = this.getPath();
        result = result * 59 + ($path == null ? 43 : $path.hashCode());
        String $defLabel = this.getDefLabel();
        result = result * 59 + ($defLabel == null ? 43 : $defLabel.hashCode());
        String $stateDescription = this.getStateDescription();
        result = result * 59 + ($stateDescription == null ? 43 : $stateDescription.hashCode());
        String $createdOn = this.getCreatedOn();
        result = result * 59 + ($createdOn == null ? 43 : $createdOn.hashCode());
        String $defId = this.getDefId();
        result = result * 59 + ($defId == null ? 43 : $defId.hashCode());
        String $firstExecutorTime = this.getFirstExecutorTime();
        result = result * 59 + ($firstExecutorTime == null ? 43 : $firstExecutorTime.hashCode());
        String $id = this.getId();
        result = result * 59 + ($id == null ? 43 : $id.hashCode());
        String $endedReason = this.getEndedReason();
        result = result * 59 + ($endedReason == null ? 43 : $endedReason.hashCode());
        String $workTypes = this.getWorkTypes();
        result = result * 59 + ($workTypes == null ? 43 : $workTypes.hashCode());
        String $workStations = this.getWorkStations();
        result = result * 59 + ($workStations == null ? 43 : $workStations.hashCode());
        return result;
    }

    public String toString() {
        return "ScriptTaskRecord(agvId=" + this.getAgvId() + ", endedOn=" + this.getEndedOn() + ", rootTaskRecordId=" + this.getRootTaskRecordId() + ", defVersion=" + this.getDefVersion() + ", outOrderNo=" + this.getOutOrderNo() + ", parentTaskRecordId=" + this.getParentTaskRecordId() + ", ifHaveChildTask=" + this.getIfHaveChildTask() + ", priority=" + this.getPriority() + ", executorTime=" + this.getExecutorTime() + ", path=" + this.getPath() + ", defLabel=" + this.getDefLabel() + ", stateDescription=" + this.getStateDescription() + ", createdOn=" + this.getCreatedOn() + ", defId=" + this.getDefId() + ", firstExecutorTime=" + this.getFirstExecutorTime() + ", id=" + this.getId() + ", endedReason=" + this.getEndedReason() + ", status=" + this.getStatus() + ", workTypes=" + this.getWorkTypes() + ", workStations=" + this.getWorkStations() + ")";
    }

    public ScriptTaskRecord(String agvId, String endedOn, String rootTaskRecordId, Integer defVersion, String outOrderNo, String parentTaskRecordId, Boolean ifHaveChildTask, Integer priority, Integer executorTime, String path, String defLabel, String stateDescription, String createdOn, String defId, String firstExecutorTime, String id, String endedReason, Integer status, String workTypes, String workStations) {
        this.agvId = agvId;
        this.endedOn = endedOn;
        this.rootTaskRecordId = rootTaskRecordId;
        this.defVersion = defVersion;
        this.outOrderNo = outOrderNo;
        this.parentTaskRecordId = parentTaskRecordId;
        this.ifHaveChildTask = ifHaveChildTask;
        this.priority = priority;
        this.executorTime = executorTime;
        this.path = path;
        this.defLabel = defLabel;
        this.stateDescription = stateDescription;
        this.createdOn = createdOn;
        this.defId = defId;
        this.firstExecutorTime = firstExecutorTime;
        this.id = id;
        this.endedReason = endedReason;
        this.status = status;
        this.workTypes = workTypes;
        this.workStations = workStations;
    }

    public ScriptTaskRecord() {
    }
}

