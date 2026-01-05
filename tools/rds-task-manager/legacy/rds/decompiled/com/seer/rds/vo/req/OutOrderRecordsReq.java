/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.vo.req.OutOrderRecordsReq
 *  com.seer.rds.vo.req.OutOrderRecordsReq$OutOrderRecordsReqBuilder
 */
package com.seer.rds.vo.req;

import com.seer.rds.vo.req.OutOrderRecordsReq;

public class OutOrderRecordsReq {
    private String agvId;
    private String startCreateTime;
    private String endCreateTime;
    private String outOrderNo;

    public static OutOrderRecordsReqBuilder builder() {
        return new OutOrderRecordsReqBuilder();
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

    public void setOutOrderNo(String outOrderNo) {
        this.outOrderNo = outOrderNo;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof OutOrderRecordsReq)) {
            return false;
        }
        OutOrderRecordsReq other = (OutOrderRecordsReq)o;
        if (!other.canEqual((Object)this)) {
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
        return other instanceof OutOrderRecordsReq;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
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
        return "OutOrderRecordsReq(agvId=" + this.getAgvId() + ", startCreateTime=" + this.getStartCreateTime() + ", endCreateTime=" + this.getEndCreateTime() + ", outOrderNo=" + this.getOutOrderNo() + ")";
    }

    public OutOrderRecordsReq() {
    }

    public OutOrderRecordsReq(String agvId, String startCreateTime, String endCreateTime, String outOrderNo) {
        this.agvId = agvId;
        this.startCreateTime = startCreateTime;
        this.endCreateTime = endCreateTime;
        this.outOrderNo = outOrderNo;
    }
}

