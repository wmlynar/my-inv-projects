/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.vo.req.WindTaskRestrictionsReq
 */
package com.seer.rds.vo.req;

public class WindTaskRestrictionsReq {
    private String strategy;
    private Integer repair;

    public String getStrategy() {
        return this.strategy;
    }

    public Integer getRepair() {
        return this.repair;
    }

    public void setStrategy(String strategy) {
        this.strategy = strategy;
    }

    public void setRepair(Integer repair) {
        this.repair = repair;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof WindTaskRestrictionsReq)) {
            return false;
        }
        WindTaskRestrictionsReq other = (WindTaskRestrictionsReq)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        Integer this$repair = this.getRepair();
        Integer other$repair = other.getRepair();
        if (this$repair == null ? other$repair != null : !((Object)this$repair).equals(other$repair)) {
            return false;
        }
        String this$strategy = this.getStrategy();
        String other$strategy = other.getStrategy();
        return !(this$strategy == null ? other$strategy != null : !this$strategy.equals(other$strategy));
    }

    protected boolean canEqual(Object other) {
        return other instanceof WindTaskRestrictionsReq;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        Integer $repair = this.getRepair();
        result = result * 59 + ($repair == null ? 43 : ((Object)$repair).hashCode());
        String $strategy = this.getStrategy();
        result = result * 59 + ($strategy == null ? 43 : $strategy.hashCode());
        return result;
    }

    public String toString() {
        return "WindTaskRestrictionsReq(strategy=" + this.getStrategy() + ", repair=" + this.getRepair() + ")";
    }
}

