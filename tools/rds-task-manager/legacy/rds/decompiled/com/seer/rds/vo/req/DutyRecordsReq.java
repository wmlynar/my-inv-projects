/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.vo.req.DutyRecordsReq
 */
package com.seer.rds.vo.req;

public class DutyRecordsReq {
    private Boolean onDuty;
    private String startTime;
    private String endTime;

    public Boolean getOnDuty() {
        return this.onDuty;
    }

    public String getStartTime() {
        return this.startTime;
    }

    public String getEndTime() {
        return this.endTime;
    }

    public void setOnDuty(Boolean onDuty) {
        this.onDuty = onDuty;
    }

    public void setStartTime(String startTime) {
        this.startTime = startTime;
    }

    public void setEndTime(String endTime) {
        this.endTime = endTime;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof DutyRecordsReq)) {
            return false;
        }
        DutyRecordsReq other = (DutyRecordsReq)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        Boolean this$onDuty = this.getOnDuty();
        Boolean other$onDuty = other.getOnDuty();
        if (this$onDuty == null ? other$onDuty != null : !((Object)this$onDuty).equals(other$onDuty)) {
            return false;
        }
        String this$startTime = this.getStartTime();
        String other$startTime = other.getStartTime();
        if (this$startTime == null ? other$startTime != null : !this$startTime.equals(other$startTime)) {
            return false;
        }
        String this$endTime = this.getEndTime();
        String other$endTime = other.getEndTime();
        return !(this$endTime == null ? other$endTime != null : !this$endTime.equals(other$endTime));
    }

    protected boolean canEqual(Object other) {
        return other instanceof DutyRecordsReq;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        Boolean $onDuty = this.getOnDuty();
        result = result * 59 + ($onDuty == null ? 43 : ((Object)$onDuty).hashCode());
        String $startTime = this.getStartTime();
        result = result * 59 + ($startTime == null ? 43 : $startTime.hashCode());
        String $endTime = this.getEndTime();
        result = result * 59 + ($endTime == null ? 43 : $endTime.hashCode());
        return result;
    }

    public String toString() {
        return "DutyRecordsReq(onDuty=" + this.getOnDuty() + ", startTime=" + this.getStartTime() + ", endTime=" + this.getEndTime() + ")";
    }
}

