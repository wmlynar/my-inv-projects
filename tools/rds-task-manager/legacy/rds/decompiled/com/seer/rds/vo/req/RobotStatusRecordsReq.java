/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.vo.req.RobotStatusRecordsReq
 *  com.seer.rds.vo.req.RobotStatusRecordsReq$RobotStatusRecordsReqBuilder
 */
package com.seer.rds.vo.req;

import com.seer.rds.vo.req.RobotStatusRecordsReq;

public class RobotStatusRecordsReq {
    private String agvId;
    private String startCreateTime;
    private String endCreateTime;
    private Integer status;
    private String outOrderNo;

    public static RobotStatusRecordsReqBuilder builder() {
        return new RobotStatusRecordsReqBuilder();
    }

    public String getAgvId() {
        return this.agvId;
    }

    public String getStartCreateTime() {
        return this.startCreateTime;
    }

    public String getEndCreateTime() {
        return this.endCreateTime;
    }

    public Integer getStatus() {
        return this.status;
    }

    public String getOutOrderNo() {
        return this.outOrderNo;
    }

    public void setAgvId(String agvId) {
        this.agvId = agvId;
    }

    public void setStartCreateTime(String startCreateTime) {
        this.startCreateTime = startCreateTime;
    }

    public void setEndCreateTime(String endCreateTime) {
        this.endCreateTime = endCreateTime;
    }

    public void setStatus(Integer status) {
        this.status = status;
    }

    public void setOutOrderNo(String outOrderNo) {
        this.outOrderNo = outOrderNo;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof RobotStatusRecordsReq)) {
            return false;
        }
        RobotStatusRecordsReq other = (RobotStatusRecordsReq)o;
        if (!other.canEqual((Object)this)) {
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
        String this$startCreateTime = this.getStartCreateTime();
        String other$startCreateTime = other.getStartCreateTime();
        if (this$startCreateTime == null ? other$startCreateTime != null : !this$startCreateTime.equals(other$startCreateTime)) {
            return false;
        }
        String this$endCreateTime = this.getEndCreateTime();
        String other$endCreateTime = other.getEndCreateTime();
        if (this$endCreateTime == null ? other$endCreateTime != null : !this$endCreateTime.equals(other$endCreateTime)) {
            return false;
        }
        String this$outOrderNo = this.getOutOrderNo();
        String other$outOrderNo = other.getOutOrderNo();
        return !(this$outOrderNo == null ? other$outOrderNo != null : !this$outOrderNo.equals(other$outOrderNo));
    }

    protected boolean canEqual(Object other) {
        return other instanceof RobotStatusRecordsReq;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        Integer $status = this.getStatus();
        result = result * 59 + ($status == null ? 43 : ((Object)$status).hashCode());
        String $agvId = this.getAgvId();
        result = result * 59 + ($agvId == null ? 43 : $agvId.hashCode());
        String $startCreateTime = this.getStartCreateTime();
        result = result * 59 + ($startCreateTime == null ? 43 : $startCreateTime.hashCode());
        String $endCreateTime = this.getEndCreateTime();
        result = result * 59 + ($endCreateTime == null ? 43 : $endCreateTime.hashCode());
        String $outOrderNo = this.getOutOrderNo();
        result = result * 59 + ($outOrderNo == null ? 43 : $outOrderNo.hashCode());
        return result;
    }

    public String toString() {
        return "RobotStatusRecordsReq(agvId=" + this.getAgvId() + ", startCreateTime=" + this.getStartCreateTime() + ", endCreateTime=" + this.getEndCreateTime() + ", status=" + this.getStatus() + ", outOrderNo=" + this.getOutOrderNo() + ")";
    }

    public RobotStatusRecordsReq() {
    }

    public RobotStatusRecordsReq(String agvId, String startCreateTime, String endCreateTime, Integer status, String outOrderNo) {
        this.agvId = agvId;
        this.startCreateTime = startCreateTime;
        this.endCreateTime = endCreateTime;
        this.status = status;
        this.outOrderNo = outOrderNo;
    }
}

