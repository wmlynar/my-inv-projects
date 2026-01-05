/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.annotation.Description
 *  com.seer.rds.model.wind.BaseRecord
 *  com.seer.rds.model.wind.TaskRecord
 *  io.swagger.annotations.ApiModelProperty
 *  javax.persistence.Column
 *  javax.persistence.Lob
 *  javax.persistence.MappedSuperclass
 *  javax.persistence.Transient
 */
package com.seer.rds.model.wind;

import com.seer.rds.annotation.Description;
import com.seer.rds.model.wind.BaseRecord;
import io.swagger.annotations.ApiModelProperty;
import java.util.Date;
import javax.persistence.Column;
import javax.persistence.Lob;
import javax.persistence.MappedSuperclass;
import javax.persistence.Transient;

@MappedSuperclass
public class TaskRecord
extends BaseRecord {
    @Description(value="@{TaskRecord.outOrderNo}")
    public String outOrderNo;
    public String rootBlockStateId;
    public Integer discontinued;
    @Description(value="@{TaskRecord.stateDescription}")
    public String stateDescription;
    @Column(nullable=true, columnDefinition="varchar(255)")
    public String callWorkType;
    @Column(nullable=true, columnDefinition="varchar(255)")
    public String callWorkStation;
    @Column(nullable=true, columnDefinition="varchar(255)")
    @Description(value="@{TaskRecord.workTypes}")
    public String workTypes;
    @Column(nullable=true, columnDefinition="varchar(255)")
    @Description(value="@{TaskRecord.workStations}")
    public String workStations;
    public Integer dispensable;
    @Column(nullable=true, columnDefinition="varchar(150)")
    @Description(value="@{TaskRecord.agvId}")
    public String agvId;
    @Column(nullable=false, columnDefinition="int default 0")
    @Description(value="@{TaskRecord.isDel}")
    public Integer isDel = 0;
    @Lob
    @Description(value="@{TaskRecord.path}")
    private String path;
    @Transient
    public InheritableThreadLocal<String> orderId = new InheritableThreadLocal();
    public Date firstExecutorTime;
    public Integer executorTime;
    public String parentTaskRecordId;
    public Boolean ifHaveChildTask;
    public String rootTaskRecordId;
    @Column(nullable=false, columnDefinition="INT default 0")
    @ApiModelProperty(value="\u662f\u5426\u5468\u671f\u4efb\u52a1 0:\u4e0d\u4e3a\u5468\u671f\u4efb\u52a1,1:\u5468\u671f\u4efb\u52a1")
    @Description(value="@{TaskRecord.periodicTask}")
    public Integer periodicTask = 0;
    @Column(nullable=false, columnDefinition="int default 1")
    @Description(value="@{TaskRecord.priority}")
    public Integer priority = 1;

    public String getOutOrderNo() {
        return this.outOrderNo;
    }

    public String getRootBlockStateId() {
        return this.rootBlockStateId;
    }

    public Integer getDiscontinued() {
        return this.discontinued;
    }

    public String getStateDescription() {
        return this.stateDescription;
    }

    public String getCallWorkType() {
        return this.callWorkType;
    }

    public String getCallWorkStation() {
        return this.callWorkStation;
    }

    public String getWorkTypes() {
        return this.workTypes;
    }

    public String getWorkStations() {
        return this.workStations;
    }

    public Integer getDispensable() {
        return this.dispensable;
    }

    public String getAgvId() {
        return this.agvId;
    }

    public Integer getIsDel() {
        return this.isDel;
    }

    public String getPath() {
        return this.path;
    }

    public InheritableThreadLocal<String> getOrderId() {
        return this.orderId;
    }

    public Date getFirstExecutorTime() {
        return this.firstExecutorTime;
    }

    public Integer getExecutorTime() {
        return this.executorTime;
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

    public Integer getPeriodicTask() {
        return this.periodicTask;
    }

    public Integer getPriority() {
        return this.priority;
    }

    public void setOutOrderNo(String outOrderNo) {
        this.outOrderNo = outOrderNo;
    }

    public void setRootBlockStateId(String rootBlockStateId) {
        this.rootBlockStateId = rootBlockStateId;
    }

    public void setDiscontinued(Integer discontinued) {
        this.discontinued = discontinued;
    }

    public void setStateDescription(String stateDescription) {
        this.stateDescription = stateDescription;
    }

    public void setCallWorkType(String callWorkType) {
        this.callWorkType = callWorkType;
    }

    public void setCallWorkStation(String callWorkStation) {
        this.callWorkStation = callWorkStation;
    }

    public void setWorkTypes(String workTypes) {
        this.workTypes = workTypes;
    }

    public void setWorkStations(String workStations) {
        this.workStations = workStations;
    }

    public void setDispensable(Integer dispensable) {
        this.dispensable = dispensable;
    }

    public void setAgvId(String agvId) {
        this.agvId = agvId;
    }

    public void setIsDel(Integer isDel) {
        this.isDel = isDel;
    }

    public void setPath(String path) {
        this.path = path;
    }

    public void setOrderId(InheritableThreadLocal<String> orderId) {
        this.orderId = orderId;
    }

    public void setFirstExecutorTime(Date firstExecutorTime) {
        this.firstExecutorTime = firstExecutorTime;
    }

    public void setExecutorTime(Integer executorTime) {
        this.executorTime = executorTime;
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

    public void setPeriodicTask(Integer periodicTask) {
        this.periodicTask = periodicTask;
    }

    public void setPriority(Integer priority) {
        this.priority = priority;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof TaskRecord)) {
            return false;
        }
        TaskRecord other = (TaskRecord)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        Integer this$discontinued = this.getDiscontinued();
        Integer other$discontinued = other.getDiscontinued();
        if (this$discontinued == null ? other$discontinued != null : !((Object)this$discontinued).equals(other$discontinued)) {
            return false;
        }
        Integer this$dispensable = this.getDispensable();
        Integer other$dispensable = other.getDispensable();
        if (this$dispensable == null ? other$dispensable != null : !((Object)this$dispensable).equals(other$dispensable)) {
            return false;
        }
        Integer this$isDel = this.getIsDel();
        Integer other$isDel = other.getIsDel();
        if (this$isDel == null ? other$isDel != null : !((Object)this$isDel).equals(other$isDel)) {
            return false;
        }
        Integer this$executorTime = this.getExecutorTime();
        Integer other$executorTime = other.getExecutorTime();
        if (this$executorTime == null ? other$executorTime != null : !((Object)this$executorTime).equals(other$executorTime)) {
            return false;
        }
        Boolean this$ifHaveChildTask = this.getIfHaveChildTask();
        Boolean other$ifHaveChildTask = other.getIfHaveChildTask();
        if (this$ifHaveChildTask == null ? other$ifHaveChildTask != null : !((Object)this$ifHaveChildTask).equals(other$ifHaveChildTask)) {
            return false;
        }
        Integer this$periodicTask = this.getPeriodicTask();
        Integer other$periodicTask = other.getPeriodicTask();
        if (this$periodicTask == null ? other$periodicTask != null : !((Object)this$periodicTask).equals(other$periodicTask)) {
            return false;
        }
        Integer this$priority = this.getPriority();
        Integer other$priority = other.getPriority();
        if (this$priority == null ? other$priority != null : !((Object)this$priority).equals(other$priority)) {
            return false;
        }
        String this$outOrderNo = this.getOutOrderNo();
        String other$outOrderNo = other.getOutOrderNo();
        if (this$outOrderNo == null ? other$outOrderNo != null : !this$outOrderNo.equals(other$outOrderNo)) {
            return false;
        }
        String this$rootBlockStateId = this.getRootBlockStateId();
        String other$rootBlockStateId = other.getRootBlockStateId();
        if (this$rootBlockStateId == null ? other$rootBlockStateId != null : !this$rootBlockStateId.equals(other$rootBlockStateId)) {
            return false;
        }
        String this$stateDescription = this.getStateDescription();
        String other$stateDescription = other.getStateDescription();
        if (this$stateDescription == null ? other$stateDescription != null : !this$stateDescription.equals(other$stateDescription)) {
            return false;
        }
        String this$callWorkType = this.getCallWorkType();
        String other$callWorkType = other.getCallWorkType();
        if (this$callWorkType == null ? other$callWorkType != null : !this$callWorkType.equals(other$callWorkType)) {
            return false;
        }
        String this$callWorkStation = this.getCallWorkStation();
        String other$callWorkStation = other.getCallWorkStation();
        if (this$callWorkStation == null ? other$callWorkStation != null : !this$callWorkStation.equals(other$callWorkStation)) {
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
        String this$agvId = this.getAgvId();
        String other$agvId = other.getAgvId();
        if (this$agvId == null ? other$agvId != null : !this$agvId.equals(other$agvId)) {
            return false;
        }
        String this$path = this.getPath();
        String other$path = other.getPath();
        if (this$path == null ? other$path != null : !this$path.equals(other$path)) {
            return false;
        }
        InheritableThreadLocal this$orderId = this.getOrderId();
        InheritableThreadLocal other$orderId = other.getOrderId();
        if (this$orderId == null ? other$orderId != null : !this$orderId.equals(other$orderId)) {
            return false;
        }
        Date this$firstExecutorTime = this.getFirstExecutorTime();
        Date other$firstExecutorTime = other.getFirstExecutorTime();
        if (this$firstExecutorTime == null ? other$firstExecutorTime != null : !((Object)this$firstExecutorTime).equals(other$firstExecutorTime)) {
            return false;
        }
        String this$parentTaskRecordId = this.getParentTaskRecordId();
        String other$parentTaskRecordId = other.getParentTaskRecordId();
        if (this$parentTaskRecordId == null ? other$parentTaskRecordId != null : !this$parentTaskRecordId.equals(other$parentTaskRecordId)) {
            return false;
        }
        String this$rootTaskRecordId = this.getRootTaskRecordId();
        String other$rootTaskRecordId = other.getRootTaskRecordId();
        return !(this$rootTaskRecordId == null ? other$rootTaskRecordId != null : !this$rootTaskRecordId.equals(other$rootTaskRecordId));
    }

    protected boolean canEqual(Object other) {
        return other instanceof TaskRecord;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        Integer $discontinued = this.getDiscontinued();
        result = result * 59 + ($discontinued == null ? 43 : ((Object)$discontinued).hashCode());
        Integer $dispensable = this.getDispensable();
        result = result * 59 + ($dispensable == null ? 43 : ((Object)$dispensable).hashCode());
        Integer $isDel = this.getIsDel();
        result = result * 59 + ($isDel == null ? 43 : ((Object)$isDel).hashCode());
        Integer $executorTime = this.getExecutorTime();
        result = result * 59 + ($executorTime == null ? 43 : ((Object)$executorTime).hashCode());
        Boolean $ifHaveChildTask = this.getIfHaveChildTask();
        result = result * 59 + ($ifHaveChildTask == null ? 43 : ((Object)$ifHaveChildTask).hashCode());
        Integer $periodicTask = this.getPeriodicTask();
        result = result * 59 + ($periodicTask == null ? 43 : ((Object)$periodicTask).hashCode());
        Integer $priority = this.getPriority();
        result = result * 59 + ($priority == null ? 43 : ((Object)$priority).hashCode());
        String $outOrderNo = this.getOutOrderNo();
        result = result * 59 + ($outOrderNo == null ? 43 : $outOrderNo.hashCode());
        String $rootBlockStateId = this.getRootBlockStateId();
        result = result * 59 + ($rootBlockStateId == null ? 43 : $rootBlockStateId.hashCode());
        String $stateDescription = this.getStateDescription();
        result = result * 59 + ($stateDescription == null ? 43 : $stateDescription.hashCode());
        String $callWorkType = this.getCallWorkType();
        result = result * 59 + ($callWorkType == null ? 43 : $callWorkType.hashCode());
        String $callWorkStation = this.getCallWorkStation();
        result = result * 59 + ($callWorkStation == null ? 43 : $callWorkStation.hashCode());
        String $workTypes = this.getWorkTypes();
        result = result * 59 + ($workTypes == null ? 43 : $workTypes.hashCode());
        String $workStations = this.getWorkStations();
        result = result * 59 + ($workStations == null ? 43 : $workStations.hashCode());
        String $agvId = this.getAgvId();
        result = result * 59 + ($agvId == null ? 43 : $agvId.hashCode());
        String $path = this.getPath();
        result = result * 59 + ($path == null ? 43 : $path.hashCode());
        InheritableThreadLocal $orderId = this.getOrderId();
        result = result * 59 + ($orderId == null ? 43 : $orderId.hashCode());
        Date $firstExecutorTime = this.getFirstExecutorTime();
        result = result * 59 + ($firstExecutorTime == null ? 43 : ((Object)$firstExecutorTime).hashCode());
        String $parentTaskRecordId = this.getParentTaskRecordId();
        result = result * 59 + ($parentTaskRecordId == null ? 43 : $parentTaskRecordId.hashCode());
        String $rootTaskRecordId = this.getRootTaskRecordId();
        result = result * 59 + ($rootTaskRecordId == null ? 43 : $rootTaskRecordId.hashCode());
        return result;
    }

    public String toString() {
        return "TaskRecord(outOrderNo=" + this.getOutOrderNo() + ", rootBlockStateId=" + this.getRootBlockStateId() + ", discontinued=" + this.getDiscontinued() + ", stateDescription=" + this.getStateDescription() + ", callWorkType=" + this.getCallWorkType() + ", callWorkStation=" + this.getCallWorkStation() + ", workTypes=" + this.getWorkTypes() + ", workStations=" + this.getWorkStations() + ", dispensable=" + this.getDispensable() + ", agvId=" + this.getAgvId() + ", isDel=" + this.getIsDel() + ", path=" + this.getPath() + ", orderId=" + this.getOrderId() + ", firstExecutorTime=" + this.getFirstExecutorTime() + ", executorTime=" + this.getExecutorTime() + ", parentTaskRecordId=" + this.getParentTaskRecordId() + ", ifHaveChildTask=" + this.getIfHaveChildTask() + ", rootTaskRecordId=" + this.getRootTaskRecordId() + ", periodicTask=" + this.getPeriodicTask() + ", priority=" + this.getPriority() + ")";
    }

    public TaskRecord() {
    }

    public TaskRecord(String outOrderNo, String rootBlockStateId, Integer discontinued, String stateDescription, String callWorkType, String callWorkStation, String workTypes, String workStations, Integer dispensable, String agvId, Integer isDel, String path, InheritableThreadLocal<String> orderId, Date firstExecutorTime, Integer executorTime, String parentTaskRecordId, Boolean ifHaveChildTask, String rootTaskRecordId, Integer periodicTask, Integer priority) {
        this.outOrderNo = outOrderNo;
        this.rootBlockStateId = rootBlockStateId;
        this.discontinued = discontinued;
        this.stateDescription = stateDescription;
        this.callWorkType = callWorkType;
        this.callWorkStation = callWorkStation;
        this.workTypes = workTypes;
        this.workStations = workStations;
        this.dispensable = dispensable;
        this.agvId = agvId;
        this.isDel = isDel;
        this.path = path;
        this.orderId = orderId;
        this.firstExecutorTime = firstExecutorTime;
        this.executorTime = executorTime;
        this.parentTaskRecordId = parentTaskRecordId;
        this.ifHaveChildTask = ifHaveChildTask;
        this.rootTaskRecordId = rootTaskRecordId;
        this.periodicTask = periodicTask;
        this.priority = priority;
    }
}

