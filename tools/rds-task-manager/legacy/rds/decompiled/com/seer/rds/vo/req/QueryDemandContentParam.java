/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.vo.req.QueryDemandContentParam
 */
package com.seer.rds.vo.req;

public class QueryDemandContentParam {
    private String demandId;

    public String getDemandId() {
        return this.demandId;
    }

    public void setDemandId(String demandId) {
        this.demandId = demandId;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof QueryDemandContentParam)) {
            return false;
        }
        QueryDemandContentParam other = (QueryDemandContentParam)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        String this$demandId = this.getDemandId();
        String other$demandId = other.getDemandId();
        return !(this$demandId == null ? other$demandId != null : !this$demandId.equals(other$demandId));
    }

    protected boolean canEqual(Object other) {
        return other instanceof QueryDemandContentParam;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        String $demandId = this.getDemandId();
        result = result * 59 + ($demandId == null ? 43 : $demandId.hashCode());
        return result;
    }

    public String toString() {
        return "QueryDemandContentParam(demandId=" + this.getDemandId() + ")";
    }
}

