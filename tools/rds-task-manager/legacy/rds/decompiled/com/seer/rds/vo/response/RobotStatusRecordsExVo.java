/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  cn.afterturn.easypoi.excel.annotation.Excel
 *  com.seer.rds.vo.response.RobotStatusRecordsExVo
 *  com.seer.rds.vo.response.RobotStatusRecordsExVo$RobotStatusRecordsExVoBuilder
 */
package com.seer.rds.vo.response;

import cn.afterturn.easypoi.excel.annotation.Excel;
import com.seer.rds.vo.response.RobotStatusRecordsExVo;

public class RobotStatusRecordsExVo {
    @Excel(name="agvRecord.export.agv", orderNum="0")
    private String agvId;
    @Excel(name="agvRecord.export.status", orderNum="1")
    private String status;
    @Excel(name="agvRecord.export.createTime", orderNum="2")
    private String createTime;
    @Excel(name="agvRecord.export.endTime", orderNum="3")
    private String endTime;
    @Excel(name="agvRecord.export.duration", orderNum="4", type=10)
    private Double duration;
    @Excel(name="agvRecord.export.outOrderNo", orderNum="5")
    private String outOrderNo;
    @Excel(name="agvRecord.export.taskRecordId", orderNum="6")
    private String taskRecordId;
    @Excel(name="agvRecord.export.orderId", orderNum="7")
    private String orderId;
    @Excel(name="agvRecord.export.location", orderNum="8")
    private String destination;

    public static RobotStatusRecordsExVoBuilder builder() {
        return new RobotStatusRecordsExVoBuilder();
    }

    public String getAgvId() {
        return this.agvId;
    }

    public String getStatus() {
        return this.status;
    }

    public String getCreateTime() {
        return this.createTime;
    }

    public String getEndTime() {
        return this.endTime;
    }

    public Double getDuration() {
        return this.duration;
    }

    public String getOutOrderNo() {
        return this.outOrderNo;
    }

    public String getTaskRecordId() {
        return this.taskRecordId;
    }

    public String getOrderId() {
        return this.orderId;
    }

    public String getDestination() {
        return this.destination;
    }

    public void setAgvId(String agvId) {
        this.agvId = agvId;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public void setCreateTime(String createTime) {
        this.createTime = createTime;
    }

    public void setEndTime(String endTime) {
        this.endTime = endTime;
    }

    public void setDuration(Double duration) {
        this.duration = duration;
    }

    public void setOutOrderNo(String outOrderNo) {
        this.outOrderNo = outOrderNo;
    }

    public void setTaskRecordId(String taskRecordId) {
        this.taskRecordId = taskRecordId;
    }

    public void setOrderId(String orderId) {
        this.orderId = orderId;
    }

    public void setDestination(String destination) {
        this.destination = destination;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof RobotStatusRecordsExVo)) {
            return false;
        }
        RobotStatusRecordsExVo other = (RobotStatusRecordsExVo)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        Double this$duration = this.getDuration();
        Double other$duration = other.getDuration();
        if (this$duration == null ? other$duration != null : !((Object)this$duration).equals(other$duration)) {
            return false;
        }
        String this$agvId = this.getAgvId();
        String other$agvId = other.getAgvId();
        if (this$agvId == null ? other$agvId != null : !this$agvId.equals(other$agvId)) {
            return false;
        }
        String this$status = this.getStatus();
        String other$status = other.getStatus();
        if (this$status == null ? other$status != null : !this$status.equals(other$status)) {
            return false;
        }
        String this$createTime = this.getCreateTime();
        String other$createTime = other.getCreateTime();
        if (this$createTime == null ? other$createTime != null : !this$createTime.equals(other$createTime)) {
            return false;
        }
        String this$endTime = this.getEndTime();
        String other$endTime = other.getEndTime();
        if (this$endTime == null ? other$endTime != null : !this$endTime.equals(other$endTime)) {
            return false;
        }
        String this$outOrderNo = this.getOutOrderNo();
        String other$outOrderNo = other.getOutOrderNo();
        if (this$outOrderNo == null ? other$outOrderNo != null : !this$outOrderNo.equals(other$outOrderNo)) {
            return false;
        }
        String this$taskRecordId = this.getTaskRecordId();
        String other$taskRecordId = other.getTaskRecordId();
        if (this$taskRecordId == null ? other$taskRecordId != null : !this$taskRecordId.equals(other$taskRecordId)) {
            return false;
        }
        String this$orderId = this.getOrderId();
        String other$orderId = other.getOrderId();
        if (this$orderId == null ? other$orderId != null : !this$orderId.equals(other$orderId)) {
            return false;
        }
        String this$destination = this.getDestination();
        String other$destination = other.getDestination();
        return !(this$destination == null ? other$destination != null : !this$destination.equals(other$destination));
    }

    protected boolean canEqual(Object other) {
        return other instanceof RobotStatusRecordsExVo;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        Double $duration = this.getDuration();
        result = result * 59 + ($duration == null ? 43 : ((Object)$duration).hashCode());
        String $agvId = this.getAgvId();
        result = result * 59 + ($agvId == null ? 43 : $agvId.hashCode());
        String $status = this.getStatus();
        result = result * 59 + ($status == null ? 43 : $status.hashCode());
        String $createTime = this.getCreateTime();
        result = result * 59 + ($createTime == null ? 43 : $createTime.hashCode());
        String $endTime = this.getEndTime();
        result = result * 59 + ($endTime == null ? 43 : $endTime.hashCode());
        String $outOrderNo = this.getOutOrderNo();
        result = result * 59 + ($outOrderNo == null ? 43 : $outOrderNo.hashCode());
        String $taskRecordId = this.getTaskRecordId();
        result = result * 59 + ($taskRecordId == null ? 43 : $taskRecordId.hashCode());
        String $orderId = this.getOrderId();
        result = result * 59 + ($orderId == null ? 43 : $orderId.hashCode());
        String $destination = this.getDestination();
        result = result * 59 + ($destination == null ? 43 : $destination.hashCode());
        return result;
    }

    public String toString() {
        return "RobotStatusRecordsExVo(agvId=" + this.getAgvId() + ", status=" + this.getStatus() + ", createTime=" + this.getCreateTime() + ", endTime=" + this.getEndTime() + ", duration=" + this.getDuration() + ", outOrderNo=" + this.getOutOrderNo() + ", taskRecordId=" + this.getTaskRecordId() + ", orderId=" + this.getOrderId() + ", destination=" + this.getDestination() + ")";
    }

    public RobotStatusRecordsExVo() {
    }

    public RobotStatusRecordsExVo(String agvId, String status, String createTime, String endTime, Double duration, String outOrderNo, String taskRecordId, String orderId, String destination) {
        this.agvId = agvId;
        this.status = status;
        this.createTime = createTime;
        this.endTime = endTime;
        this.duration = duration;
        this.outOrderNo = outOrderNo;
        this.taskRecordId = taskRecordId;
        this.orderId = orderId;
        this.destination = destination;
    }
}

