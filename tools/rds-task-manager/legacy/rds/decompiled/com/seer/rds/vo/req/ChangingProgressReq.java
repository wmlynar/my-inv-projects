/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.vo.req.ChangingProgressReq
 */
package com.seer.rds.vo.req;

public class ChangingProgressReq {
    private String originalRobot;
    private String replaceRobot;
    private String orderId;
    private Integer status;

    public String getOriginalRobot() {
        return this.originalRobot;
    }

    public String getReplaceRobot() {
        return this.replaceRobot;
    }

    public String getOrderId() {
        return this.orderId;
    }

    public Integer getStatus() {
        return this.status;
    }

    public void setOriginalRobot(String originalRobot) {
        this.originalRobot = originalRobot;
    }

    public void setReplaceRobot(String replaceRobot) {
        this.replaceRobot = replaceRobot;
    }

    public void setOrderId(String orderId) {
        this.orderId = orderId;
    }

    public void setStatus(Integer status) {
        this.status = status;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof ChangingProgressReq)) {
            return false;
        }
        ChangingProgressReq other = (ChangingProgressReq)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        Integer this$status = this.getStatus();
        Integer other$status = other.getStatus();
        if (this$status == null ? other$status != null : !((Object)this$status).equals(other$status)) {
            return false;
        }
        String this$originalRobot = this.getOriginalRobot();
        String other$originalRobot = other.getOriginalRobot();
        if (this$originalRobot == null ? other$originalRobot != null : !this$originalRobot.equals(other$originalRobot)) {
            return false;
        }
        String this$replaceRobot = this.getReplaceRobot();
        String other$replaceRobot = other.getReplaceRobot();
        if (this$replaceRobot == null ? other$replaceRobot != null : !this$replaceRobot.equals(other$replaceRobot)) {
            return false;
        }
        String this$orderId = this.getOrderId();
        String other$orderId = other.getOrderId();
        return !(this$orderId == null ? other$orderId != null : !this$orderId.equals(other$orderId));
    }

    protected boolean canEqual(Object other) {
        return other instanceof ChangingProgressReq;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        Integer $status = this.getStatus();
        result = result * 59 + ($status == null ? 43 : ((Object)$status).hashCode());
        String $originalRobot = this.getOriginalRobot();
        result = result * 59 + ($originalRobot == null ? 43 : $originalRobot.hashCode());
        String $replaceRobot = this.getReplaceRobot();
        result = result * 59 + ($replaceRobot == null ? 43 : $replaceRobot.hashCode());
        String $orderId = this.getOrderId();
        result = result * 59 + ($orderId == null ? 43 : $orderId.hashCode());
        return result;
    }

    public String toString() {
        return "ChangingProgressReq(originalRobot=" + this.getOriginalRobot() + ", replaceRobot=" + this.getReplaceRobot() + ", orderId=" + this.getOrderId() + ", status=" + this.getStatus() + ")";
    }
}

