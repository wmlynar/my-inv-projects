/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.vo.req.LockDemandParam
 */
package com.seer.rds.vo.req;

public class LockDemandParam {
    private String demandId;
    private String userName;
    private String jobNumber;

    public String getDemandId() {
        return this.demandId;
    }

    public String getUserName() {
        return this.userName;
    }

    public String getJobNumber() {
        return this.jobNumber;
    }

    public void setDemandId(String demandId) {
        this.demandId = demandId;
    }

    public void setUserName(String userName) {
        this.userName = userName;
    }

    public void setJobNumber(String jobNumber) {
        this.jobNumber = jobNumber;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof LockDemandParam)) {
            return false;
        }
        LockDemandParam other = (LockDemandParam)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        String this$demandId = this.getDemandId();
        String other$demandId = other.getDemandId();
        if (this$demandId == null ? other$demandId != null : !this$demandId.equals(other$demandId)) {
            return false;
        }
        String this$userName = this.getUserName();
        String other$userName = other.getUserName();
        if (this$userName == null ? other$userName != null : !this$userName.equals(other$userName)) {
            return false;
        }
        String this$jobNumber = this.getJobNumber();
        String other$jobNumber = other.getJobNumber();
        return !(this$jobNumber == null ? other$jobNumber != null : !this$jobNumber.equals(other$jobNumber));
    }

    protected boolean canEqual(Object other) {
        return other instanceof LockDemandParam;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        String $demandId = this.getDemandId();
        result = result * 59 + ($demandId == null ? 43 : $demandId.hashCode());
        String $userName = this.getUserName();
        result = result * 59 + ($userName == null ? 43 : $userName.hashCode());
        String $jobNumber = this.getJobNumber();
        result = result * 59 + ($jobNumber == null ? 43 : $jobNumber.hashCode());
        return result;
    }

    public String toString() {
        return "LockDemandParam(demandId=" + this.getDemandId() + ", userName=" + this.getUserName() + ", jobNumber=" + this.getJobNumber() + ")";
    }
}

