/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.vo.req.DemandUpdateParam
 */
package com.seer.rds.vo.req;

public class DemandUpdateParam {
    private String demandId;
    private Integer status;

    public String getDemandId() {
        return this.demandId;
    }

    public Integer getStatus() {
        return this.status;
    }

    public void setDemandId(String demandId) {
        this.demandId = demandId;
    }

    public void setStatus(Integer status) {
        this.status = status;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof DemandUpdateParam)) {
            return false;
        }
        DemandUpdateParam other = (DemandUpdateParam)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        Integer this$status = this.getStatus();
        Integer other$status = other.getStatus();
        if (this$status == null ? other$status != null : !((Object)this$status).equals(other$status)) {
            return false;
        }
        String this$demandId = this.getDemandId();
        String other$demandId = other.getDemandId();
        return !(this$demandId == null ? other$demandId != null : !this$demandId.equals(other$demandId));
    }

    protected boolean canEqual(Object other) {
        return other instanceof DemandUpdateParam;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        Integer $status = this.getStatus();
        result = result * 59 + ($status == null ? 43 : ((Object)$status).hashCode());
        String $demandId = this.getDemandId();
        result = result * 59 + ($demandId == null ? 43 : $demandId.hashCode());
        return result;
    }

    public String toString() {
        return "DemandUpdateParam(demandId=" + this.getDemandId() + ", status=" + this.getStatus() + ")";
    }
}

