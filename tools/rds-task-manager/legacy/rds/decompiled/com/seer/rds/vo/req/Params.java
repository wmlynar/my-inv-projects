/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.fasterxml.jackson.annotation.JsonInclude
 *  com.fasterxml.jackson.annotation.JsonInclude$Include
 *  com.seer.rds.vo.req.Params
 */
package com.seer.rds.vo.req;

import com.fasterxml.jackson.annotation.JsonInclude;

class Params {
    @JsonInclude(value=JsonInclude.Include.NON_NULL)
    Double chargeNeed;
    @JsonInclude(value=JsonInclude.Include.NON_NULL)
    Double chargeOnly;
    @JsonInclude(value=JsonInclude.Include.NON_NULL)
    Double chargedOK;
    @JsonInclude(value=JsonInclude.Include.NON_NULL)
    Double chargedFull;

    public Double getChargeNeed() {
        return this.chargeNeed;
    }

    public Double getChargeOnly() {
        return this.chargeOnly;
    }

    public Double getChargedOK() {
        return this.chargedOK;
    }

    public Double getChargedFull() {
        return this.chargedFull;
    }

    public void setChargeNeed(Double chargeNeed) {
        this.chargeNeed = chargeNeed;
    }

    public void setChargeOnly(Double chargeOnly) {
        this.chargeOnly = chargeOnly;
    }

    public void setChargedOK(Double chargedOK) {
        this.chargedOK = chargedOK;
    }

    public void setChargedFull(Double chargedFull) {
        this.chargedFull = chargedFull;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof Params)) {
            return false;
        }
        Params other = (Params)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        Double this$chargeNeed = this.getChargeNeed();
        Double other$chargeNeed = other.getChargeNeed();
        if (this$chargeNeed == null ? other$chargeNeed != null : !((Object)this$chargeNeed).equals(other$chargeNeed)) {
            return false;
        }
        Double this$chargeOnly = this.getChargeOnly();
        Double other$chargeOnly = other.getChargeOnly();
        if (this$chargeOnly == null ? other$chargeOnly != null : !((Object)this$chargeOnly).equals(other$chargeOnly)) {
            return false;
        }
        Double this$chargedOK = this.getChargedOK();
        Double other$chargedOK = other.getChargedOK();
        if (this$chargedOK == null ? other$chargedOK != null : !((Object)this$chargedOK).equals(other$chargedOK)) {
            return false;
        }
        Double this$chargedFull = this.getChargedFull();
        Double other$chargedFull = other.getChargedFull();
        return !(this$chargedFull == null ? other$chargedFull != null : !((Object)this$chargedFull).equals(other$chargedFull));
    }

    protected boolean canEqual(Object other) {
        return other instanceof Params;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        Double $chargeNeed = this.getChargeNeed();
        result = result * 59 + ($chargeNeed == null ? 43 : ((Object)$chargeNeed).hashCode());
        Double $chargeOnly = this.getChargeOnly();
        result = result * 59 + ($chargeOnly == null ? 43 : ((Object)$chargeOnly).hashCode());
        Double $chargedOK = this.getChargedOK();
        result = result * 59 + ($chargedOK == null ? 43 : ((Object)$chargedOK).hashCode());
        Double $chargedFull = this.getChargedFull();
        result = result * 59 + ($chargedFull == null ? 43 : ((Object)$chargedFull).hashCode());
        return result;
    }

    public String toString() {
        return "Params(chargeNeed=" + this.getChargeNeed() + ", chargeOnly=" + this.getChargeOnly() + ", chargedOK=" + this.getChargedOK() + ", chargedFull=" + this.getChargedFull() + ")";
    }
}

