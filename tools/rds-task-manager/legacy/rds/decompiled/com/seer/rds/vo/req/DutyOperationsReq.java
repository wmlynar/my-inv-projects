/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.fasterxml.jackson.annotation.JsonInclude
 *  com.fasterxml.jackson.annotation.JsonInclude$Include
 *  com.seer.rds.vo.req.DutyOperationsReq
 */
package com.seer.rds.vo.req;

import com.fasterxml.jackson.annotation.JsonInclude;

public class DutyOperationsReq {
    private Boolean onDuty;
    @JsonInclude(value=JsonInclude.Include.NON_NULL)
    private Boolean stop;
    @JsonInclude(value=JsonInclude.Include.NON_NULL)
    private Boolean forbidCharge;

    public Boolean getOnDuty() {
        return this.onDuty;
    }

    public Boolean getStop() {
        return this.stop;
    }

    public Boolean getForbidCharge() {
        return this.forbidCharge;
    }

    public void setOnDuty(Boolean onDuty) {
        this.onDuty = onDuty;
    }

    public void setStop(Boolean stop) {
        this.stop = stop;
    }

    public void setForbidCharge(Boolean forbidCharge) {
        this.forbidCharge = forbidCharge;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof DutyOperationsReq)) {
            return false;
        }
        DutyOperationsReq other = (DutyOperationsReq)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        Boolean this$onDuty = this.getOnDuty();
        Boolean other$onDuty = other.getOnDuty();
        if (this$onDuty == null ? other$onDuty != null : !((Object)this$onDuty).equals(other$onDuty)) {
            return false;
        }
        Boolean this$stop = this.getStop();
        Boolean other$stop = other.getStop();
        if (this$stop == null ? other$stop != null : !((Object)this$stop).equals(other$stop)) {
            return false;
        }
        Boolean this$forbidCharge = this.getForbidCharge();
        Boolean other$forbidCharge = other.getForbidCharge();
        return !(this$forbidCharge == null ? other$forbidCharge != null : !((Object)this$forbidCharge).equals(other$forbidCharge));
    }

    protected boolean canEqual(Object other) {
        return other instanceof DutyOperationsReq;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        Boolean $onDuty = this.getOnDuty();
        result = result * 59 + ($onDuty == null ? 43 : ((Object)$onDuty).hashCode());
        Boolean $stop = this.getStop();
        result = result * 59 + ($stop == null ? 43 : ((Object)$stop).hashCode());
        Boolean $forbidCharge = this.getForbidCharge();
        result = result * 59 + ($forbidCharge == null ? 43 : ((Object)$forbidCharge).hashCode());
        return result;
    }

    public String toString() {
        return "DutyOperationsReq(onDuty=" + this.getOnDuty() + ", stop=" + this.getStop() + ", forbidCharge=" + this.getForbidCharge() + ")";
    }
}

