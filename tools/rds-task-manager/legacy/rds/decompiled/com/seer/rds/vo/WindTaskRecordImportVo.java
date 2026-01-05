/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  cn.afterturn.easypoi.excel.annotation.Excel
 *  com.seer.rds.vo.WindTaskRecordImportVo
 *  com.seer.rds.vo.WindTaskRecordImportVo$WindTaskRecordImportVoBuilder
 */
package com.seer.rds.vo;

import cn.afterturn.easypoi.excel.annotation.Excel;
import com.seer.rds.vo.WindTaskRecordImportVo;

public class WindTaskRecordImportVo {
    @Excel(name="taskRecordID", orderNum="0")
    private String id;
    @Excel(name="status", orderNum="1")
    private Object status;
    @Excel(name="agv", orderNum="2")
    private String agvId;
    @Excel(name="defLabel", orderNum="3")
    private String defLabel;
    @Excel(name="stateDescription", orderNum="4")
    private String stateDescription;
    private String defId;
    @Excel(name="createdOn", orderNum="5")
    private String createdOn;
    @Excel(name="endedOn", orderNum="6")
    private String endedOn;
    @Excel(name="firstExecutorTime", orderNum="7")
    private String firstExecutorTime;
    @Excel(name="executorTime(s)", orderNum="8")
    private Integer executorTime;
    @Excel(name="endedReason", orderNum="9")
    private String endedReason;
    @Excel(name="path", orderNum="10")
    private String path;
    @Excel(name="defVersion", orderNum="11")
    private Integer defVersion;
    private String parentTaskRecordId;
    private Boolean ifHaveChildTask;
    private String rootTaskRecordId;
    private String inputParams;
    private String taskDefDetail;
    private Integer priority;
    private String outOrderNo;
    @Excel(name="workType", orderNum="12")
    private String workTypes;
    @Excel(name="workStation", orderNum="13")
    private String workStations;
    @Excel(name="callWorkType", orderNum="14")
    private String callWorkType;
    @Excel(name="callWorkStation", orderNum="15")
    private String callWorkStation;

    public static WindTaskRecordImportVoBuilder builder() {
        return new WindTaskRecordImportVoBuilder();
    }

    public String getId() {
        return this.id;
    }

    public Object getStatus() {
        return this.status;
    }

    public String getAgvId() {
        return this.agvId;
    }

    public String getDefLabel() {
        return this.defLabel;
    }

    public String getStateDescription() {
        return this.stateDescription;
    }

    public String getDefId() {
        return this.defId;
    }

    public String getCreatedOn() {
        return this.createdOn;
    }

    public String getEndedOn() {
        return this.endedOn;
    }

    public String getFirstExecutorTime() {
        return this.firstExecutorTime;
    }

    public Integer getExecutorTime() {
        return this.executorTime;
    }

    public String getEndedReason() {
        return this.endedReason;
    }

    public String getPath() {
        return this.path;
    }

    public Integer getDefVersion() {
        return this.defVersion;
    }

    public String getParentTaskRecordId() {
        return this.parentTaskRecordId;
    }

    public Boolean getIfHaveChildTask() {
        return this.ifHaveChildTask;
    }

    public String getRootTaskRecordId() {
        return this.rootTaskRecordId;
    }

    public String getInputParams() {
        return this.inputParams;
    }

    public String getTaskDefDetail() {
        return this.taskDefDetail;
    }

    public Integer getPriority() {
        return this.priority;
    }

    public String getOutOrderNo() {
        return this.outOrderNo;
    }

    public String getWorkTypes() {
        return this.workTypes;
    }

    public String getWorkStations() {
        return this.workStations;
    }

    public String getCallWorkType() {
        return this.callWorkType;
    }

    public String getCallWorkStation() {
        return this.callWorkStation;
    }

    public void setId(String id) {
        this.id = id;
    }

    public void setStatus(Object status) {
        this.status = status;
    }

    public void setAgvId(String agvId) {
        this.agvId = agvId;
    }

    public void setDefLabel(String defLabel) {
        this.defLabel = defLabel;
    }

    public void setStateDescription(String stateDescription) {
        this.stateDescription = stateDescription;
    }

    public void setDefId(String defId) {
        this.defId = defId;
    }

    public void setCreatedOn(String createdOn) {
        this.createdOn = createdOn;
    }

    public void setEndedOn(String endedOn) {
        this.endedOn = endedOn;
    }

    public void setFirstExecutorTime(String firstExecutorTime) {
        this.firstExecutorTime = firstExecutorTime;
    }

    public void setExecutorTime(Integer executorTime) {
        this.executorTime = executorTime;
    }

    public void setEndedReason(String endedReason) {
        this.endedReason = endedReason;
    }

    public void setPath(String path) {
        this.path = path;
    }

    public void setDefVersion(Integer defVersion) {
        this.defVersion = defVersion;
    }

    public void setParentTaskRecordId(String parentTaskRecordId) {
        this.parentTaskRecordId = parentTaskRecordId;
    }

    public void setIfHaveChildTask(Boolean ifHaveChildTask) {
        this.ifHaveChildTask = ifHaveChildTask;
    }

    public void setRootTaskRecordId(String rootTaskRecordId) {
        this.rootTaskRecordId = rootTaskRecordId;
    }

    public void setInputParams(String inputParams) {
        this.inputParams = inputParams;
    }

    public void setTaskDefDetail(String taskDefDetail) {
        this.taskDefDetail = taskDefDetail;
    }

    public void setPriority(Integer priority) {
        this.priority = priority;
    }

    public void setOutOrderNo(String outOrderNo) {
        this.outOrderNo = outOrderNo;
    }

    public void setWorkTypes(String workTypes) {
        this.workTypes = workTypes;
    }

    public void setWorkStations(String workStations) {
        this.workStations = workStations;
    }

    public void setCallWorkType(String callWorkType) {
        this.callWorkType = callWorkType;
    }

    public void setCallWorkStation(String callWorkStation) {
        this.callWorkStation = callWorkStation;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof WindTaskRecordImportVo)) {
            return false;
        }
        WindTaskRecordImportVo other = (WindTaskRecordImportVo)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        Integer this$executorTime = this.getExecutorTime();
        Integer other$executorTime = other.getExecutorTime();
        if (this$executorTime == null ? other$executorTime != null : !((Object)this$executorTime).equals(other$executorTime)) {
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
        String this$id = this.getId();
        String other$id = other.getId();
        if (this$id == null ? other$id != null : !this$id.equals(other$id)) {
            return false;
        }
        Object this$status = this.getStatus();
        Object other$status = other.getStatus();
        if (this$status == null ? other$status != null : !this$status.equals(other$status)) {
            return false;
        }
        String this$agvId = this.getAgvId();
        String other$agvId = other.getAgvId();
        if (this$agvId == null ? other$agvId != null : !this$agvId.equals(other$agvId)) {
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
        String this$defId = this.getDefId();
        String other$defId = other.getDefId();
        if (this$defId == null ? other$defId != null : !this$defId.equals(other$defId)) {
            return false;
        }
        String this$createdOn = this.getCreatedOn();
        String other$createdOn = other.getCreatedOn();
        if (this$createdOn == null ? other$createdOn != null : !this$createdOn.equals(other$createdOn)) {
            return false;
        }
        String this$endedOn = this.getEndedOn();
        String other$endedOn = other.getEndedOn();
        if (this$endedOn == null ? other$endedOn != null : !this$endedOn.equals(other$endedOn)) {
            return false;
        }
        String this$firstExecutorTime = this.getFirstExecutorTime();
        String other$firstExecutorTime = other.getFirstExecutorTime();
        if (this$firstExecutorTime == null ? other$firstExecutorTime != null : !this$firstExecutorTime.equals(other$firstExecutorTime)) {
            return false;
        }
        String this$endedReason = this.getEndedReason();
        String other$endedReason = other.getEndedReason();
        if (this$endedReason == null ? other$endedReason != null : !this$endedReason.equals(other$endedReason)) {
            return false;
        }
        String this$path = this.getPath();
        String other$path = other.getPath();
        if (this$path == null ? other$path != null : !this$path.equals(other$path)) {
            return false;
        }
        String this$parentTaskRecordId = this.getParentTaskRecordId();
        String other$parentTaskRecordId = other.getParentTaskRecordId();
        if (this$parentTaskRecordId == null ? other$parentTaskRecordId != null : !this$parentTaskRecordId.equals(other$parentTaskRecordId)) {
            return false;
        }
        String this$rootTaskRecordId = this.getRootTaskRecordId();
        String other$rootTaskRecordId = other.getRootTaskRecordId();
        if (this$rootTaskRecordId == null ? other$rootTaskRecordId != null : !this$rootTaskRecordId.equals(other$rootTaskRecordId)) {
            return false;
        }
        String this$inputParams = this.getInputParams();
        String other$inputParams = other.getInputParams();
        if (this$inputParams == null ? other$inputParams != null : !this$inputParams.equals(other$inputParams)) {
            return false;
        }
        String this$taskDefDetail = this.getTaskDefDetail();
        String other$taskDefDetail = other.getTaskDefDetail();
        if (this$taskDefDetail == null ? other$taskDefDetail != null : !this$taskDefDetail.equals(other$taskDefDetail)) {
            return false;
        }
        String this$outOrderNo = this.getOutOrderNo();
        String other$outOrderNo = other.getOutOrderNo();
        if (this$outOrderNo == null ? other$outOrderNo != null : !this$outOrderNo.equals(other$outOrderNo)) {
            return false;
        }
        String this$workTypes = this.getWorkTypes();
        String other$workTypes = other.getWorkTypes();
        if (this$workTypes == null ? other$workTypes != null : !this$workTypes.equals(other$workTypes)) {
            return false;
        }
        String this$workStations = this.getWorkStations();
        String other$workStations = other.getWorkStations();
        if (this$workStations == null ? other$workStations != null : !this$workStations.equals(other$workStations)) {
            return false;
        }
        String this$callWorkType = this.getCallWorkType();
        String other$callWorkType = other.getCallWorkType();
        if (this$callWorkType == null ? other$callWorkType != null : !this$callWorkType.equals(other$callWorkType)) {
            return false;
        }
        String this$callWorkStation = this.getCallWorkStation();
        String other$callWorkStation = other.getCallWorkStation();
        return !(this$callWorkStation == null ? other$callWorkStation != null : !this$callWorkStation.equals(other$callWorkStation));
    }

    protected boolean canEqual(Object other) {
        return other instanceof WindTaskRecordImportVo;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        Integer $executorTime = this.getExecutorTime();
        result = result * 59 + ($executorTime == null ? 43 : ((Object)$executorTime).hashCode());
        Integer $defVersion = this.getDefVersion();
        result = result * 59 + ($defVersion == null ? 43 : ((Object)$defVersion).hashCode());
        Boolean $ifHaveChildTask = this.getIfHaveChildTask();
        result = result * 59 + ($ifHaveChildTask == null ? 43 : ((Object)$ifHaveChildTask).hashCode());
        Integer $priority = this.getPriority();
        result = result * 59 + ($priority == null ? 43 : ((Object)$priority).hashCode());
        String $id = this.getId();
        result = result * 59 + ($id == null ? 43 : $id.hashCode());
        Object $status = this.getStatus();
        result = result * 59 + ($status == null ? 43 : $status.hashCode());
        String $agvId = this.getAgvId();
        result = result * 59 + ($agvId == null ? 43 : $agvId.hashCode());
        String $defLabel = this.getDefLabel();
        result = result * 59 + ($defLabel == null ? 43 : $defLabel.hashCode());
        String $stateDescription = this.getStateDescription();
        result = result * 59 + ($stateDescription == null ? 43 : $stateDescription.hashCode());
        String $defId = this.getDefId();
        result = result * 59 + ($defId == null ? 43 : $defId.hashCode());
        String $createdOn = this.getCreatedOn();
        result = result * 59 + ($createdOn == null ? 43 : $createdOn.hashCode());
        String $endedOn = this.getEndedOn();
        result = result * 59 + ($endedOn == null ? 43 : $endedOn.hashCode());
        String $firstExecutorTime = this.getFirstExecutorTime();
        result = result * 59 + ($firstExecutorTime == null ? 43 : $firstExecutorTime.hashCode());
        String $endedReason = this.getEndedReason();
        result = result * 59 + ($endedReason == null ? 43 : $endedReason.hashCode());
        String $path = this.getPath();
        result = result * 59 + ($path == null ? 43 : $path.hashCode());
        String $parentTaskRecordId = this.getParentTaskRecordId();
        result = result * 59 + ($parentTaskRecordId == null ? 43 : $parentTaskRecordId.hashCode());
        String $rootTaskRecordId = this.getRootTaskRecordId();
        result = result * 59 + ($rootTaskRecordId == null ? 43 : $rootTaskRecordId.hashCode());
        String $inputParams = this.getInputParams();
        result = result * 59 + ($inputParams == null ? 43 : $inputParams.hashCode());
        String $taskDefDetail = this.getTaskDefDetail();
        result = result * 59 + ($taskDefDetail == null ? 43 : $taskDefDetail.hashCode());
        String $outOrderNo = this.getOutOrderNo();
        result = result * 59 + ($outOrderNo == null ? 43 : $outOrderNo.hashCode());
        String $workTypes = this.getWorkTypes();
        result = result * 59 + ($workTypes == null ? 43 : $workTypes.hashCode());
        String $workStations = this.getWorkStations();
        result = result * 59 + ($workStations == null ? 43 : $workStations.hashCode());
        String $callWorkType = this.getCallWorkType();
        result = result * 59 + ($callWorkType == null ? 43 : $callWorkType.hashCode());
        String $callWorkStation = this.getCallWorkStation();
        result = result * 59 + ($callWorkStation == null ? 43 : $callWorkStation.hashCode());
        return result;
    }

    public String toString() {
        return "WindTaskRecordImportVo(id=" + this.getId() + ", status=" + this.getStatus() + ", agvId=" + this.getAgvId() + ", defLabel=" + this.getDefLabel() + ", stateDescription=" + this.getStateDescription() + ", defId=" + this.getDefId() + ", createdOn=" + this.getCreatedOn() + ", endedOn=" + this.getEndedOn() + ", firstExecutorTime=" + this.getFirstExecutorTime() + ", executorTime=" + this.getExecutorTime() + ", endedReason=" + this.getEndedReason() + ", path=" + this.getPath() + ", defVersion=" + this.getDefVersion() + ", parentTaskRecordId=" + this.getParentTaskRecordId() + ", ifHaveChildTask=" + this.getIfHaveChildTask() + ", rootTaskRecordId=" + this.getRootTaskRecordId() + ", inputParams=" + this.getInputParams() + ", taskDefDetail=" + this.getTaskDefDetail() + ", priority=" + this.getPriority() + ", outOrderNo=" + this.getOutOrderNo() + ", workTypes=" + this.getWorkTypes() + ", workStations=" + this.getWorkStations() + ", callWorkType=" + this.getCallWorkType() + ", callWorkStation=" + this.getCallWorkStation() + ")";
    }

    public WindTaskRecordImportVo() {
    }

    public WindTaskRecordImportVo(String id, Object status, String agvId, String defLabel, String stateDescription, String defId, String createdOn, String endedOn, String firstExecutorTime, Integer executorTime, String endedReason, String path, Integer defVersion, String parentTaskRecordId, Boolean ifHaveChildTask, String rootTaskRecordId, String inputParams, String taskDefDetail, Integer priority, String outOrderNo, String workTypes, String workStations, String callWorkType, String callWorkStation) {
        this.id = id;
        this.status = status;
        this.agvId = agvId;
        this.defLabel = defLabel;
        this.stateDescription = stateDescription;
        this.defId = defId;
        this.createdOn = createdOn;
        this.endedOn = endedOn;
        this.firstExecutorTime = firstExecutorTime;
        this.executorTime = executorTime;
        this.endedReason = endedReason;
        this.path = path;
        this.defVersion = defVersion;
        this.parentTaskRecordId = parentTaskRecordId;
        this.ifHaveChildTask = ifHaveChildTask;
        this.rootTaskRecordId = rootTaskRecordId;
        this.inputParams = inputParams;
        this.taskDefDetail = taskDefDetail;
        this.priority = priority;
        this.outOrderNo = outOrderNo;
        this.workTypes = workTypes;
        this.workStations = workStations;
        this.callWorkType = callWorkType;
        this.callWorkStation = callWorkStation;
    }
}

