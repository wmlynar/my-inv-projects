/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.vo.req.QueryTaskRecordReq
 */
package com.seer.rds.vo.req;

import java.util.List;

public class QueryTaskRecordReq {
    private String taskId;
    private String taskLabel;
    private String taskRecordId;
    private Integer status;
    private String agvId;
    private List<String> agvIdList;
    private String startDate;
    private String endDate;
    private Boolean isOrderDesc;
    private String language;
    private Integer ifParentOrChildOrAll;
    private Integer ifPeriodTask;
    private String parentTaskId;
    private String workTypes;
    private String workStations;
    private String outOrderNo;
    private String defLabel;
    private String stateDescription;

    public String getTaskId() {
        return this.taskId;
    }

    public String getTaskLabel() {
        return this.taskLabel;
    }

    public String getTaskRecordId() {
        return this.taskRecordId;
    }

    public Integer getStatus() {
        return this.status;
    }

    public String getAgvId() {
        return this.agvId;
    }

    public List<String> getAgvIdList() {
        return this.agvIdList;
    }

    public String getStartDate() {
        return this.startDate;
    }

    public String getEndDate() {
        return this.endDate;
    }

    public Boolean getIsOrderDesc() {
        return this.isOrderDesc;
    }

    public String getLanguage() {
        return this.language;
    }

    public Integer getIfParentOrChildOrAll() {
        return this.ifParentOrChildOrAll;
    }

    public Integer getIfPeriodTask() {
        return this.ifPeriodTask;
    }

    public String getParentTaskId() {
        return this.parentTaskId;
    }

    public String getWorkTypes() {
        return this.workTypes;
    }

    public String getWorkStations() {
        return this.workStations;
    }

    public String getOutOrderNo() {
        return this.outOrderNo;
    }

    public String getDefLabel() {
        return this.defLabel;
    }

    public String getStateDescription() {
        return this.stateDescription;
    }

    public void setTaskId(String taskId) {
        this.taskId = taskId;
    }

    public void setTaskLabel(String taskLabel) {
        this.taskLabel = taskLabel;
    }

    public void setTaskRecordId(String taskRecordId) {
        this.taskRecordId = taskRecordId;
    }

    public void setStatus(Integer status) {
        this.status = status;
    }

    public void setAgvId(String agvId) {
        this.agvId = agvId;
    }

    public void setAgvIdList(List<String> agvIdList) {
        this.agvIdList = agvIdList;
    }

    public void setStartDate(String startDate) {
        this.startDate = startDate;
    }

    public void setEndDate(String endDate) {
        this.endDate = endDate;
    }

    public void setIsOrderDesc(Boolean isOrderDesc) {
        this.isOrderDesc = isOrderDesc;
    }

    public void setLanguage(String language) {
        this.language = language;
    }

    public void setIfParentOrChildOrAll(Integer ifParentOrChildOrAll) {
        this.ifParentOrChildOrAll = ifParentOrChildOrAll;
    }

    public void setIfPeriodTask(Integer ifPeriodTask) {
        this.ifPeriodTask = ifPeriodTask;
    }

    public void setParentTaskId(String parentTaskId) {
        this.parentTaskId = parentTaskId;
    }

    public void setWorkTypes(String workTypes) {
        this.workTypes = workTypes;
    }

    public void setWorkStations(String workStations) {
        this.workStations = workStations;
    }

    public void setOutOrderNo(String outOrderNo) {
        this.outOrderNo = outOrderNo;
    }

    public void setDefLabel(String defLabel) {
        this.defLabel = defLabel;
    }

    public void setStateDescription(String stateDescription) {
        this.stateDescription = stateDescription;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof QueryTaskRecordReq)) {
            return false;
        }
        QueryTaskRecordReq other = (QueryTaskRecordReq)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        Integer this$status = this.getStatus();
        Integer other$status = other.getStatus();
        if (this$status == null ? other$status != null : !((Object)this$status).equals(other$status)) {
            return false;
        }
        Boolean this$isOrderDesc = this.getIsOrderDesc();
        Boolean other$isOrderDesc = other.getIsOrderDesc();
        if (this$isOrderDesc == null ? other$isOrderDesc != null : !((Object)this$isOrderDesc).equals(other$isOrderDesc)) {
            return false;
        }
        Integer this$ifParentOrChildOrAll = this.getIfParentOrChildOrAll();
        Integer other$ifParentOrChildOrAll = other.getIfParentOrChildOrAll();
        if (this$ifParentOrChildOrAll == null ? other$ifParentOrChildOrAll != null : !((Object)this$ifParentOrChildOrAll).equals(other$ifParentOrChildOrAll)) {
            return false;
        }
        Integer this$ifPeriodTask = this.getIfPeriodTask();
        Integer other$ifPeriodTask = other.getIfPeriodTask();
        if (this$ifPeriodTask == null ? other$ifPeriodTask != null : !((Object)this$ifPeriodTask).equals(other$ifPeriodTask)) {
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
        String this$taskRecordId = this.getTaskRecordId();
        String other$taskRecordId = other.getTaskRecordId();
        if (this$taskRecordId == null ? other$taskRecordId != null : !this$taskRecordId.equals(other$taskRecordId)) {
            return false;
        }
        String this$agvId = this.getAgvId();
        String other$agvId = other.getAgvId();
        if (this$agvId == null ? other$agvId != null : !this$agvId.equals(other$agvId)) {
            return false;
        }
        List this$agvIdList = this.getAgvIdList();
        List other$agvIdList = other.getAgvIdList();
        if (this$agvIdList == null ? other$agvIdList != null : !((Object)this$agvIdList).equals(other$agvIdList)) {
            return false;
        }
        String this$startDate = this.getStartDate();
        String other$startDate = other.getStartDate();
        if (this$startDate == null ? other$startDate != null : !this$startDate.equals(other$startDate)) {
            return false;
        }
        String this$endDate = this.getEndDate();
        String other$endDate = other.getEndDate();
        if (this$endDate == null ? other$endDate != null : !this$endDate.equals(other$endDate)) {
            return false;
        }
        String this$language = this.getLanguage();
        String other$language = other.getLanguage();
        if (this$language == null ? other$language != null : !this$language.equals(other$language)) {
            return false;
        }
        String this$parentTaskId = this.getParentTaskId();
        String other$parentTaskId = other.getParentTaskId();
        if (this$parentTaskId == null ? other$parentTaskId != null : !this$parentTaskId.equals(other$parentTaskId)) {
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
        String this$outOrderNo = this.getOutOrderNo();
        String other$outOrderNo = other.getOutOrderNo();
        if (this$outOrderNo == null ? other$outOrderNo != null : !this$outOrderNo.equals(other$outOrderNo)) {
            return false;
        }
        String this$defLabel = this.getDefLabel();
        String other$defLabel = other.getDefLabel();
        if (this$defLabel == null ? other$defLabel != null : !this$defLabel.equals(other$defLabel)) {
            return false;
        }
        String this$stateDescription = this.getStateDescription();
        String other$stateDescription = other.getStateDescription();
        return !(this$stateDescription == null ? other$stateDescription != null : !this$stateDescription.equals(other$stateDescription));
    }

    protected boolean canEqual(Object other) {
        return other instanceof QueryTaskRecordReq;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        Integer $status = this.getStatus();
        result = result * 59 + ($status == null ? 43 : ((Object)$status).hashCode());
        Boolean $isOrderDesc = this.getIsOrderDesc();
        result = result * 59 + ($isOrderDesc == null ? 43 : ((Object)$isOrderDesc).hashCode());
        Integer $ifParentOrChildOrAll = this.getIfParentOrChildOrAll();
        result = result * 59 + ($ifParentOrChildOrAll == null ? 43 : ((Object)$ifParentOrChildOrAll).hashCode());
        Integer $ifPeriodTask = this.getIfPeriodTask();
        result = result * 59 + ($ifPeriodTask == null ? 43 : ((Object)$ifPeriodTask).hashCode());
        String $taskId = this.getTaskId();
        result = result * 59 + ($taskId == null ? 43 : $taskId.hashCode());
        String $taskLabel = this.getTaskLabel();
        result = result * 59 + ($taskLabel == null ? 43 : $taskLabel.hashCode());
        String $taskRecordId = this.getTaskRecordId();
        result = result * 59 + ($taskRecordId == null ? 43 : $taskRecordId.hashCode());
        String $agvId = this.getAgvId();
        result = result * 59 + ($agvId == null ? 43 : $agvId.hashCode());
        List $agvIdList = this.getAgvIdList();
        result = result * 59 + ($agvIdList == null ? 43 : ((Object)$agvIdList).hashCode());
        String $startDate = this.getStartDate();
        result = result * 59 + ($startDate == null ? 43 : $startDate.hashCode());
        String $endDate = this.getEndDate();
        result = result * 59 + ($endDate == null ? 43 : $endDate.hashCode());
        String $language = this.getLanguage();
        result = result * 59 + ($language == null ? 43 : $language.hashCode());
        String $parentTaskId = this.getParentTaskId();
        result = result * 59 + ($parentTaskId == null ? 43 : $parentTaskId.hashCode());
        String $workTypes = this.getWorkTypes();
        result = result * 59 + ($workTypes == null ? 43 : $workTypes.hashCode());
        String $workStations = this.getWorkStations();
        result = result * 59 + ($workStations == null ? 43 : $workStations.hashCode());
        String $outOrderNo = this.getOutOrderNo();
        result = result * 59 + ($outOrderNo == null ? 43 : $outOrderNo.hashCode());
        String $defLabel = this.getDefLabel();
        result = result * 59 + ($defLabel == null ? 43 : $defLabel.hashCode());
        String $stateDescription = this.getStateDescription();
        result = result * 59 + ($stateDescription == null ? 43 : $stateDescription.hashCode());
        return result;
    }

    public String toString() {
        return "QueryTaskRecordReq(taskId=" + this.getTaskId() + ", taskLabel=" + this.getTaskLabel() + ", taskRecordId=" + this.getTaskRecordId() + ", status=" + this.getStatus() + ", agvId=" + this.getAgvId() + ", agvIdList=" + this.getAgvIdList() + ", startDate=" + this.getStartDate() + ", endDate=" + this.getEndDate() + ", isOrderDesc=" + this.getIsOrderDesc() + ", language=" + this.getLanguage() + ", ifParentOrChildOrAll=" + this.getIfParentOrChildOrAll() + ", ifPeriodTask=" + this.getIfPeriodTask() + ", parentTaskId=" + this.getParentTaskId() + ", workTypes=" + this.getWorkTypes() + ", workStations=" + this.getWorkStations() + ", outOrderNo=" + this.getOutOrderNo() + ", defLabel=" + this.getDefLabel() + ", stateDescription=" + this.getStateDescription() + ")";
    }
}

