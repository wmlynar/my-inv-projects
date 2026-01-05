/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  cn.afterturn.easypoi.excel.annotation.Excel
 *  com.seer.rds.vo.response.OutOrderRecordsVo
 *  com.seer.rds.vo.response.OutOrderRecordsVo$OutOrderRecordsVoBuilder
 */
package com.seer.rds.vo.response;

import cn.afterturn.easypoi.excel.annotation.Excel;
import com.seer.rds.vo.response.OutOrderRecordsVo;

public class OutOrderRecordsVo {
    @Excel(name="outOrder.export.taskRecordId", orderNum="0")
    private String taskRecordId;
    @Excel(name="outOrder.export.outOrderNo", orderNum="1")
    private String outOrderNo;
    @Excel(name="outOrder.export.createTime", orderNum="2")
    private String createTime;
    @Excel(name="outOrder.export.endTime", orderNum="3")
    private String endTime;
    @Excel(name="outOrder.export.duration", orderNum="4", type=10)
    private Double duration;
    @Excel(name="outOrder.export.agv", orderNum="5")
    private String agvId;
    @Excel(name="outOrder.export.location", orderNum="6")
    private String destination;

    public static OutOrderRecordsVoBuilder builder() {
        return new OutOrderRecordsVoBuilder();
    }

    public String getTaskRecordId() {
        return this.taskRecordId;
    }

    public String getOutOrderNo() {
        return this.outOrderNo;
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

    public String getAgvId() {
        return this.agvId;
    }

    public String getDestination() {
        return this.destination;
    }

    public void setTaskRecordId(String taskRecordId) {
        this.taskRecordId = taskRecordId;
    }

    public void setOutOrderNo(String outOrderNo) {
        this.outOrderNo = outOrderNo;
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

    public void setAgvId(String agvId) {
        this.agvId = agvId;
    }

    public void setDestination(String destination) {
        this.destination = destination;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof OutOrderRecordsVo)) {
            return false;
        }
        OutOrderRecordsVo other = (OutOrderRecordsVo)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        Double this$duration = this.getDuration();
        Double other$duration = other.getDuration();
        if (this$duration == null ? other$duration != null : !((Object)this$duration).equals(other$duration)) {
            return false;
        }
        String this$taskRecordId = this.getTaskRecordId();
        String other$taskRecordId = other.getTaskRecordId();
        if (this$taskRecordId == null ? other$taskRecordId != null : !this$taskRecordId.equals(other$taskRecordId)) {
            return false;
        }
        String this$outOrderNo = this.getOutOrderNo();
        String other$outOrderNo = other.getOutOrderNo();
        if (this$outOrderNo == null ? other$outOrderNo != null : !this$outOrderNo.equals(other$outOrderNo)) {
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
        String this$agvId = this.getAgvId();
        String other$agvId = other.getAgvId();
        if (this$agvId == null ? other$agvId != null : !this$agvId.equals(other$agvId)) {
            return false;
        }
        String this$destination = this.getDestination();
        String other$destination = other.getDestination();
        return !(this$destination == null ? other$destination != null : !this$destination.equals(other$destination));
    }

    protected boolean canEqual(Object other) {
        return other instanceof OutOrderRecordsVo;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        Double $duration = this.getDuration();
        result = result * 59 + ($duration == null ? 43 : ((Object)$duration).hashCode());
        String $taskRecordId = this.getTaskRecordId();
        result = result * 59 + ($taskRecordId == null ? 43 : $taskRecordId.hashCode());
        String $outOrderNo = this.getOutOrderNo();
        result = result * 59 + ($outOrderNo == null ? 43 : $outOrderNo.hashCode());
        String $createTime = this.getCreateTime();
        result = result * 59 + ($createTime == null ? 43 : $createTime.hashCode());
        String $endTime = this.getEndTime();
        result = result * 59 + ($endTime == null ? 43 : $endTime.hashCode());
        String $agvId = this.getAgvId();
        result = result * 59 + ($agvId == null ? 43 : $agvId.hashCode());
        String $destination = this.getDestination();
        result = result * 59 + ($destination == null ? 43 : $destination.hashCode());
        return result;
    }

    public String toString() {
        return "OutOrderRecordsVo(taskRecordId=" + this.getTaskRecordId() + ", outOrderNo=" + this.getOutOrderNo() + ", createTime=" + this.getCreateTime() + ", endTime=" + this.getEndTime() + ", duration=" + this.getDuration() + ", agvId=" + this.getAgvId() + ", destination=" + this.getDestination() + ")";
    }

    public OutOrderRecordsVo() {
    }

    public OutOrderRecordsVo(String taskRecordId, String outOrderNo, String createTime, String endTime, Double duration, String agvId, String destination) {
        this.taskRecordId = taskRecordId;
        this.outOrderNo = outOrderNo;
        this.createTime = createTime;
        this.endTime = endTime;
        this.duration = duration;
        this.agvId = agvId;
        this.destination = destination;
    }
}

