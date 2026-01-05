/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.vo.req.DistributeReq
 */
package com.seer.rds.vo.req;

public class DistributeReq {
    private String workType;
    private String workStation;

    public String getWorkType() {
        return this.workType;
    }

    public String getWorkStation() {
        return this.workStation;
    }

    public void setWorkType(String workType) {
        this.workType = workType;
    }

    public void setWorkStation(String workStation) {
        this.workStation = workStation;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof DistributeReq)) {
            return false;
        }
        DistributeReq other = (DistributeReq)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        String this$workType = this.getWorkType();
        String other$workType = other.getWorkType();
        if (this$workType == null ? other$workType != null : !this$workType.equals(other$workType)) {
            return false;
        }
        String this$workStation = this.getWorkStation();
        String other$workStation = other.getWorkStation();
        return !(this$workStation == null ? other$workStation != null : !this$workStation.equals(other$workStation));
    }

    protected boolean canEqual(Object other) {
        return other instanceof DistributeReq;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        String $workType = this.getWorkType();
        result = result * 59 + ($workType == null ? 43 : $workType.hashCode());
        String $workStation = this.getWorkStation();
        result = result * 59 + ($workStation == null ? 43 : $workStation.hashCode());
        return result;
    }

    public String toString() {
        return "DistributeReq(workType=" + this.getWorkType() + ", workStation=" + this.getWorkStation() + ")";
    }
}

