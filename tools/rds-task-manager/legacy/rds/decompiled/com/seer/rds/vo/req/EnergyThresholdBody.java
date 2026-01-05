/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.vo.req.EnergyThresholdBody
 */
package com.seer.rds.vo.req;

import java.io.Serializable;

public class EnergyThresholdBody
implements Serializable {
    private static final long serialVersionUID = 1L;
    private Double chargeOnly;
    private Double charge;
    private Double taskReady;
    private Double fullyCharged;

    public Double getChargeOnly() {
        return this.chargeOnly;
    }

    public Double getCharge() {
        return this.charge;
    }

    public Double getTaskReady() {
        return this.taskReady;
    }

    public Double getFullyCharged() {
        return this.fullyCharged;
    }

    public void setChargeOnly(Double chargeOnly) {
        this.chargeOnly = chargeOnly;
    }

    public void setCharge(Double charge) {
        this.charge = charge;
    }

    public void setTaskReady(Double taskReady) {
        this.taskReady = taskReady;
    }

    public void setFullyCharged(Double fullyCharged) {
        this.fullyCharged = fullyCharged;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof EnergyThresholdBody)) {
            return false;
        }
        EnergyThresholdBody other = (EnergyThresholdBody)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        Double this$chargeOnly = this.getChargeOnly();
        Double other$chargeOnly = other.getChargeOnly();
        if (this$chargeOnly == null ? other$chargeOnly != null : !((Object)this$chargeOnly).equals(other$chargeOnly)) {
            return false;
        }
        Double this$charge = this.getCharge();
        Double other$charge = other.getCharge();
        if (this$charge == null ? other$charge != null : !((Object)this$charge).equals(other$charge)) {
            return false;
        }
        Double this$taskReady = this.getTaskReady();
        Double other$taskReady = other.getTaskReady();
        if (this$taskReady == null ? other$taskReady != null : !((Object)this$taskReady).equals(other$taskReady)) {
            return false;
        }
        Double this$fullyCharged = this.getFullyCharged();
        Double other$fullyCharged = other.getFullyCharged();
        return !(this$fullyCharged == null ? other$fullyCharged != null : !((Object)this$fullyCharged).equals(other$fullyCharged));
    }

    protected boolean canEqual(Object other) {
        return other instanceof EnergyThresholdBody;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        Double $chargeOnly = this.getChargeOnly();
        result = result * 59 + ($chargeOnly == null ? 43 : ((Object)$chargeOnly).hashCode());
        Double $charge = this.getCharge();
        result = result * 59 + ($charge == null ? 43 : ((Object)$charge).hashCode());
        Double $taskReady = this.getTaskReady();
        result = result * 59 + ($taskReady == null ? 43 : ((Object)$taskReady).hashCode());
        Double $fullyCharged = this.getFullyCharged();
        result = result * 59 + ($fullyCharged == null ? 43 : ((Object)$fullyCharged).hashCode());
        return result;
    }

    public String toString() {
        return "EnergyThresholdBody(chargeOnly=" + this.getChargeOnly() + ", charge=" + this.getCharge() + ", taskReady=" + this.getTaskReady() + ", fullyCharged=" + this.getFullyCharged() + ")";
    }
}

