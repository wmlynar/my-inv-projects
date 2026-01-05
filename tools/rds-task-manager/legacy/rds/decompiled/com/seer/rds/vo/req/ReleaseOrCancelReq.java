/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.vo.req.ReleaseOrCancelReq
 */
package com.seer.rds.vo.req;

public class ReleaseOrCancelReq {
    private String orderId;
    private String originalOrderId;

    public String getOrderId() {
        return this.orderId;
    }

    public String getOriginalOrderId() {
        return this.originalOrderId;
    }

    public void setOrderId(String orderId) {
        this.orderId = orderId;
    }

    public void setOriginalOrderId(String originalOrderId) {
        this.originalOrderId = originalOrderId;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof ReleaseOrCancelReq)) {
            return false;
        }
        ReleaseOrCancelReq other = (ReleaseOrCancelReq)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        String this$orderId = this.getOrderId();
        String other$orderId = other.getOrderId();
        if (this$orderId == null ? other$orderId != null : !this$orderId.equals(other$orderId)) {
            return false;
        }
        String this$originalOrderId = this.getOriginalOrderId();
        String other$originalOrderId = other.getOriginalOrderId();
        return !(this$originalOrderId == null ? other$originalOrderId != null : !this$originalOrderId.equals(other$originalOrderId));
    }

    protected boolean canEqual(Object other) {
        return other instanceof ReleaseOrCancelReq;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        String $orderId = this.getOrderId();
        result = result * 59 + ($orderId == null ? 43 : $orderId.hashCode());
        String $originalOrderId = this.getOriginalOrderId();
        result = result * 59 + ($originalOrderId == null ? 43 : $originalOrderId.hashCode());
        return result;
    }

    public String toString() {
        return "ReleaseOrCancelReq(orderId=" + this.getOrderId() + ", originalOrderId=" + this.getOriginalOrderId() + ")";
    }
}

