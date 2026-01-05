/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.vo.req.StatRecordReq
 *  io.swagger.annotations.ApiModel
 *  io.swagger.annotations.ApiModelProperty
 */
package com.seer.rds.vo.req;

import io.swagger.annotations.ApiModel;
import io.swagger.annotations.ApiModelProperty;
import java.math.BigDecimal;

@ApiModel(value="\u7edf\u8ba1")
public class StatRecordReq {
    @ApiModelProperty(value="\u7edf\u8ba1\u7b49\u7ea7: Hour, Day, Month, Year", required=true, example="Hour")
    private String level;
    @ApiModelProperty(value="\u7edf\u8ba1\u7c7b\u578b(\u591a\u4e2a\u7528','\u9694\u5f00): VehicleOfflineTime, VehicleErrorTime, VehicleUnavailableTime, VehicleExecutingTime, VehicleChargingTime, VehicleIdleTime, OrderBusinessOdo, OrderCreatedNum, OrderFinishedNum,OrderTakingNum,OrderStoppedNum, WindTaskCreatedNum, WindTaskFinishedNum, WindTaskStoppedNum,AlarmsWarningsTime,AlarmsErrorsTime,AlarmsFatalsTime,AlarmsWarningsNum,AlarmsErrorsNum,AlarmsFatalsNum", required=true)
    private String types;
    @ApiModelProperty(value="\u7edf\u8ba1\u8d77\u59cb\u65f6\u95f4(\u5305\u542b)", required=true, example="1970-01-01 00")
    private String start;
    @ApiModelProperty(value="\u7edf\u8ba1\u7ed3\u675f\u65f6\u95f4(\u4e0d\u5305\u542b)", required=true, example="1970-01-02 00")
    private String end;
    @ApiModelProperty(value="\u8f66\u8f86\u540d\u79f0")
    private String vehicle;
    @ApiModelProperty(value="\u4efb\u52a1\u540d\u79f0")
    private String taskLabel;
    @ApiModelProperty(value="\u5de5\u4f4d\u540d\u79f0")
    private String workTypeId;
    @ApiModelProperty(value="\u5c97\u4f4d\u540d\u79f0")
    private String workStationId;
    @ApiModelProperty(value="\u65f6\u95f4\u5355\u4f4d\uff0c\u9ed8\u8ba4\u6beb\u79d2(\u7edf\u8ba1\u7c7b\u578b\u4e3a\u65f6\u95f4\u65f6\u751f\u6548)\uff0c\u8fd8\u652f\u6301 sec, min, hour")
    private String timeUnit;
    @Deprecated
    @ApiModelProperty(value="\u5c0f\u8f66\u5de5\u4f5c\u65f6\u95f4\uff0c\u7528\u4f5c\u8ba1\u7b97\u6548\u7387")
    private BigDecimal vehicleWorkingTime;
    @ApiModelProperty(value="\u8be5\u63a5\u53e3\u662f\u5426\u662f\u8ba1\u7b97\u6548\u7387")
    private Boolean isVehicleEfficiency;
    @ApiModelProperty(value="\u6392\u5e8f\u5b57\u6bb5")
    private String sortBy;
    @ApiModelProperty(value="\u6392\u5e8f")
    private String sort;
    @ApiModelProperty(value="\u673a\u5668\u4eba\u4e0a\u73ed\u65f6\u95f4", required=true, example="08:00:00")
    private String onWorkTime;
    @ApiModelProperty(value="\u673a\u5668\u4eba\u4e0b\u73ed\u65f6\u95f4", required=true, example="20:00:00")
    private String offWorkTime;

    public String getLevel() {
        return this.level;
    }

    public String getTypes() {
        return this.types;
    }

    public String getStart() {
        return this.start;
    }

    public String getEnd() {
        return this.end;
    }

    public String getVehicle() {
        return this.vehicle;
    }

    public String getTaskLabel() {
        return this.taskLabel;
    }

    public String getWorkTypeId() {
        return this.workTypeId;
    }

    public String getWorkStationId() {
        return this.workStationId;
    }

    public String getTimeUnit() {
        return this.timeUnit;
    }

    @Deprecated
    public BigDecimal getVehicleWorkingTime() {
        return this.vehicleWorkingTime;
    }

    public Boolean getIsVehicleEfficiency() {
        return this.isVehicleEfficiency;
    }

    public String getSortBy() {
        return this.sortBy;
    }

    public String getSort() {
        return this.sort;
    }

    public String getOnWorkTime() {
        return this.onWorkTime;
    }

    public String getOffWorkTime() {
        return this.offWorkTime;
    }

    public void setLevel(String level) {
        this.level = level;
    }

    public void setTypes(String types) {
        this.types = types;
    }

    public void setStart(String start) {
        this.start = start;
    }

    public void setEnd(String end) {
        this.end = end;
    }

    public void setVehicle(String vehicle) {
        this.vehicle = vehicle;
    }

    public void setTaskLabel(String taskLabel) {
        this.taskLabel = taskLabel;
    }

    public void setWorkTypeId(String workTypeId) {
        this.workTypeId = workTypeId;
    }

    public void setWorkStationId(String workStationId) {
        this.workStationId = workStationId;
    }

    public void setTimeUnit(String timeUnit) {
        this.timeUnit = timeUnit;
    }

    @Deprecated
    public void setVehicleWorkingTime(BigDecimal vehicleWorkingTime) {
        this.vehicleWorkingTime = vehicleWorkingTime;
    }

    public void setIsVehicleEfficiency(Boolean isVehicleEfficiency) {
        this.isVehicleEfficiency = isVehicleEfficiency;
    }

    public void setSortBy(String sortBy) {
        this.sortBy = sortBy;
    }

    public void setSort(String sort) {
        this.sort = sort;
    }

    public void setOnWorkTime(String onWorkTime) {
        this.onWorkTime = onWorkTime;
    }

    public void setOffWorkTime(String offWorkTime) {
        this.offWorkTime = offWorkTime;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof StatRecordReq)) {
            return false;
        }
        StatRecordReq other = (StatRecordReq)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        Boolean this$isVehicleEfficiency = this.getIsVehicleEfficiency();
        Boolean other$isVehicleEfficiency = other.getIsVehicleEfficiency();
        if (this$isVehicleEfficiency == null ? other$isVehicleEfficiency != null : !((Object)this$isVehicleEfficiency).equals(other$isVehicleEfficiency)) {
            return false;
        }
        String this$level = this.getLevel();
        String other$level = other.getLevel();
        if (this$level == null ? other$level != null : !this$level.equals(other$level)) {
            return false;
        }
        String this$types = this.getTypes();
        String other$types = other.getTypes();
        if (this$types == null ? other$types != null : !this$types.equals(other$types)) {
            return false;
        }
        String this$start = this.getStart();
        String other$start = other.getStart();
        if (this$start == null ? other$start != null : !this$start.equals(other$start)) {
            return false;
        }
        String this$end = this.getEnd();
        String other$end = other.getEnd();
        if (this$end == null ? other$end != null : !this$end.equals(other$end)) {
            return false;
        }
        String this$vehicle = this.getVehicle();
        String other$vehicle = other.getVehicle();
        if (this$vehicle == null ? other$vehicle != null : !this$vehicle.equals(other$vehicle)) {
            return false;
        }
        String this$taskLabel = this.getTaskLabel();
        String other$taskLabel = other.getTaskLabel();
        if (this$taskLabel == null ? other$taskLabel != null : !this$taskLabel.equals(other$taskLabel)) {
            return false;
        }
        String this$workTypeId = this.getWorkTypeId();
        String other$workTypeId = other.getWorkTypeId();
        if (this$workTypeId == null ? other$workTypeId != null : !this$workTypeId.equals(other$workTypeId)) {
            return false;
        }
        String this$workStationId = this.getWorkStationId();
        String other$workStationId = other.getWorkStationId();
        if (this$workStationId == null ? other$workStationId != null : !this$workStationId.equals(other$workStationId)) {
            return false;
        }
        String this$timeUnit = this.getTimeUnit();
        String other$timeUnit = other.getTimeUnit();
        if (this$timeUnit == null ? other$timeUnit != null : !this$timeUnit.equals(other$timeUnit)) {
            return false;
        }
        BigDecimal this$vehicleWorkingTime = this.getVehicleWorkingTime();
        BigDecimal other$vehicleWorkingTime = other.getVehicleWorkingTime();
        if (this$vehicleWorkingTime == null ? other$vehicleWorkingTime != null : !((Object)this$vehicleWorkingTime).equals(other$vehicleWorkingTime)) {
            return false;
        }
        String this$sortBy = this.getSortBy();
        String other$sortBy = other.getSortBy();
        if (this$sortBy == null ? other$sortBy != null : !this$sortBy.equals(other$sortBy)) {
            return false;
        }
        String this$sort = this.getSort();
        String other$sort = other.getSort();
        if (this$sort == null ? other$sort != null : !this$sort.equals(other$sort)) {
            return false;
        }
        String this$onWorkTime = this.getOnWorkTime();
        String other$onWorkTime = other.getOnWorkTime();
        if (this$onWorkTime == null ? other$onWorkTime != null : !this$onWorkTime.equals(other$onWorkTime)) {
            return false;
        }
        String this$offWorkTime = this.getOffWorkTime();
        String other$offWorkTime = other.getOffWorkTime();
        return !(this$offWorkTime == null ? other$offWorkTime != null : !this$offWorkTime.equals(other$offWorkTime));
    }

    protected boolean canEqual(Object other) {
        return other instanceof StatRecordReq;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        Boolean $isVehicleEfficiency = this.getIsVehicleEfficiency();
        result = result * 59 + ($isVehicleEfficiency == null ? 43 : ((Object)$isVehicleEfficiency).hashCode());
        String $level = this.getLevel();
        result = result * 59 + ($level == null ? 43 : $level.hashCode());
        String $types = this.getTypes();
        result = result * 59 + ($types == null ? 43 : $types.hashCode());
        String $start = this.getStart();
        result = result * 59 + ($start == null ? 43 : $start.hashCode());
        String $end = this.getEnd();
        result = result * 59 + ($end == null ? 43 : $end.hashCode());
        String $vehicle = this.getVehicle();
        result = result * 59 + ($vehicle == null ? 43 : $vehicle.hashCode());
        String $taskLabel = this.getTaskLabel();
        result = result * 59 + ($taskLabel == null ? 43 : $taskLabel.hashCode());
        String $workTypeId = this.getWorkTypeId();
        result = result * 59 + ($workTypeId == null ? 43 : $workTypeId.hashCode());
        String $workStationId = this.getWorkStationId();
        result = result * 59 + ($workStationId == null ? 43 : $workStationId.hashCode());
        String $timeUnit = this.getTimeUnit();
        result = result * 59 + ($timeUnit == null ? 43 : $timeUnit.hashCode());
        BigDecimal $vehicleWorkingTime = this.getVehicleWorkingTime();
        result = result * 59 + ($vehicleWorkingTime == null ? 43 : ((Object)$vehicleWorkingTime).hashCode());
        String $sortBy = this.getSortBy();
        result = result * 59 + ($sortBy == null ? 43 : $sortBy.hashCode());
        String $sort = this.getSort();
        result = result * 59 + ($sort == null ? 43 : $sort.hashCode());
        String $onWorkTime = this.getOnWorkTime();
        result = result * 59 + ($onWorkTime == null ? 43 : $onWorkTime.hashCode());
        String $offWorkTime = this.getOffWorkTime();
        result = result * 59 + ($offWorkTime == null ? 43 : $offWorkTime.hashCode());
        return result;
    }

    public String toString() {
        return "StatRecordReq(level=" + this.getLevel() + ", types=" + this.getTypes() + ", start=" + this.getStart() + ", end=" + this.getEnd() + ", vehicle=" + this.getVehicle() + ", taskLabel=" + this.getTaskLabel() + ", workTypeId=" + this.getWorkTypeId() + ", workStationId=" + this.getWorkStationId() + ", timeUnit=" + this.getTimeUnit() + ", vehicleWorkingTime=" + this.getVehicleWorkingTime() + ", isVehicleEfficiency=" + this.getIsVehicleEfficiency() + ", sortBy=" + this.getSortBy() + ", sort=" + this.getSort() + ", onWorkTime=" + this.getOnWorkTime() + ", offWorkTime=" + this.getOffWorkTime() + ")";
    }

    public StatRecordReq withLevel(String level) {
        return this.level == level ? this : new StatRecordReq(level, this.types, this.start, this.end, this.vehicle, this.taskLabel, this.workTypeId, this.workStationId, this.timeUnit, this.vehicleWorkingTime, this.isVehicleEfficiency, this.sortBy, this.sort, this.onWorkTime, this.offWorkTime);
    }

    public StatRecordReq withTypes(String types) {
        return this.types == types ? this : new StatRecordReq(this.level, types, this.start, this.end, this.vehicle, this.taskLabel, this.workTypeId, this.workStationId, this.timeUnit, this.vehicleWorkingTime, this.isVehicleEfficiency, this.sortBy, this.sort, this.onWorkTime, this.offWorkTime);
    }

    public StatRecordReq withStart(String start) {
        return this.start == start ? this : new StatRecordReq(this.level, this.types, start, this.end, this.vehicle, this.taskLabel, this.workTypeId, this.workStationId, this.timeUnit, this.vehicleWorkingTime, this.isVehicleEfficiency, this.sortBy, this.sort, this.onWorkTime, this.offWorkTime);
    }

    public StatRecordReq withEnd(String end) {
        return this.end == end ? this : new StatRecordReq(this.level, this.types, this.start, end, this.vehicle, this.taskLabel, this.workTypeId, this.workStationId, this.timeUnit, this.vehicleWorkingTime, this.isVehicleEfficiency, this.sortBy, this.sort, this.onWorkTime, this.offWorkTime);
    }

    public StatRecordReq withVehicle(String vehicle) {
        return this.vehicle == vehicle ? this : new StatRecordReq(this.level, this.types, this.start, this.end, vehicle, this.taskLabel, this.workTypeId, this.workStationId, this.timeUnit, this.vehicleWorkingTime, this.isVehicleEfficiency, this.sortBy, this.sort, this.onWorkTime, this.offWorkTime);
    }

    public StatRecordReq withTaskLabel(String taskLabel) {
        return this.taskLabel == taskLabel ? this : new StatRecordReq(this.level, this.types, this.start, this.end, this.vehicle, taskLabel, this.workTypeId, this.workStationId, this.timeUnit, this.vehicleWorkingTime, this.isVehicleEfficiency, this.sortBy, this.sort, this.onWorkTime, this.offWorkTime);
    }

    public StatRecordReq withWorkTypeId(String workTypeId) {
        return this.workTypeId == workTypeId ? this : new StatRecordReq(this.level, this.types, this.start, this.end, this.vehicle, this.taskLabel, workTypeId, this.workStationId, this.timeUnit, this.vehicleWorkingTime, this.isVehicleEfficiency, this.sortBy, this.sort, this.onWorkTime, this.offWorkTime);
    }

    public StatRecordReq withWorkStationId(String workStationId) {
        return this.workStationId == workStationId ? this : new StatRecordReq(this.level, this.types, this.start, this.end, this.vehicle, this.taskLabel, this.workTypeId, workStationId, this.timeUnit, this.vehicleWorkingTime, this.isVehicleEfficiency, this.sortBy, this.sort, this.onWorkTime, this.offWorkTime);
    }

    public StatRecordReq withTimeUnit(String timeUnit) {
        return this.timeUnit == timeUnit ? this : new StatRecordReq(this.level, this.types, this.start, this.end, this.vehicle, this.taskLabel, this.workTypeId, this.workStationId, timeUnit, this.vehicleWorkingTime, this.isVehicleEfficiency, this.sortBy, this.sort, this.onWorkTime, this.offWorkTime);
    }

    @Deprecated
    public StatRecordReq withVehicleWorkingTime(BigDecimal vehicleWorkingTime) {
        return this.vehicleWorkingTime == vehicleWorkingTime ? this : new StatRecordReq(this.level, this.types, this.start, this.end, this.vehicle, this.taskLabel, this.workTypeId, this.workStationId, this.timeUnit, vehicleWorkingTime, this.isVehicleEfficiency, this.sortBy, this.sort, this.onWorkTime, this.offWorkTime);
    }

    public StatRecordReq withIsVehicleEfficiency(Boolean isVehicleEfficiency) {
        return this.isVehicleEfficiency == isVehicleEfficiency ? this : new StatRecordReq(this.level, this.types, this.start, this.end, this.vehicle, this.taskLabel, this.workTypeId, this.workStationId, this.timeUnit, this.vehicleWorkingTime, isVehicleEfficiency, this.sortBy, this.sort, this.onWorkTime, this.offWorkTime);
    }

    public StatRecordReq withSortBy(String sortBy) {
        return this.sortBy == sortBy ? this : new StatRecordReq(this.level, this.types, this.start, this.end, this.vehicle, this.taskLabel, this.workTypeId, this.workStationId, this.timeUnit, this.vehicleWorkingTime, this.isVehicleEfficiency, sortBy, this.sort, this.onWorkTime, this.offWorkTime);
    }

    public StatRecordReq withSort(String sort) {
        return this.sort == sort ? this : new StatRecordReq(this.level, this.types, this.start, this.end, this.vehicle, this.taskLabel, this.workTypeId, this.workStationId, this.timeUnit, this.vehicleWorkingTime, this.isVehicleEfficiency, this.sortBy, sort, this.onWorkTime, this.offWorkTime);
    }

    public StatRecordReq withOnWorkTime(String onWorkTime) {
        return this.onWorkTime == onWorkTime ? this : new StatRecordReq(this.level, this.types, this.start, this.end, this.vehicle, this.taskLabel, this.workTypeId, this.workStationId, this.timeUnit, this.vehicleWorkingTime, this.isVehicleEfficiency, this.sortBy, this.sort, onWorkTime, this.offWorkTime);
    }

    public StatRecordReq withOffWorkTime(String offWorkTime) {
        return this.offWorkTime == offWorkTime ? this : new StatRecordReq(this.level, this.types, this.start, this.end, this.vehicle, this.taskLabel, this.workTypeId, this.workStationId, this.timeUnit, this.vehicleWorkingTime, this.isVehicleEfficiency, this.sortBy, this.sort, this.onWorkTime, offWorkTime);
    }

    public StatRecordReq(String level, String types, String start, String end, String vehicle, String taskLabel, String workTypeId, String workStationId, String timeUnit, BigDecimal vehicleWorkingTime, Boolean isVehicleEfficiency, String sortBy, String sort, String onWorkTime, String offWorkTime) {
        this.level = level;
        this.types = types;
        this.start = start;
        this.end = end;
        this.vehicle = vehicle;
        this.taskLabel = taskLabel;
        this.workTypeId = workTypeId;
        this.workStationId = workStationId;
        this.timeUnit = timeUnit;
        this.vehicleWorkingTime = vehicleWorkingTime;
        this.isVehicleEfficiency = isVehicleEfficiency;
        this.sortBy = sortBy;
        this.sort = sort;
        this.onWorkTime = onWorkTime;
        this.offWorkTime = offWorkTime;
    }

    public StatRecordReq() {
    }
}

