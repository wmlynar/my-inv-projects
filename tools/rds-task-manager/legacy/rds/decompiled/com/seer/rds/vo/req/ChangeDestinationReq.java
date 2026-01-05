/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.vo.req.ChangeDestinationReq
 */
package com.seer.rds.vo.req;

public class ChangeDestinationReq {
    public String targetSiteLabel;
    public String scriptName;
    public String postAction;
    public String goodsId;
    public String isEndAction;
    public String customCommandName;
    public String customCommandType;
    public String customCommandArgs;
    public String maxSpeed;
    public String maxWSpeed;
    public String maxAcc;
    public String maxWAcc;
    public String spin;
    public Object adjustInfo;
    public String taskRecordId;
    public String orderId;

    public String getTargetSiteLabel() {
        return this.targetSiteLabel;
    }

    public String getScriptName() {
        return this.scriptName;
    }

    public String getPostAction() {
        return this.postAction;
    }

    public String getGoodsId() {
        return this.goodsId;
    }

    public String getIsEndAction() {
        return this.isEndAction;
    }

    public String getCustomCommandName() {
        return this.customCommandName;
    }

    public String getCustomCommandType() {
        return this.customCommandType;
    }

    public String getCustomCommandArgs() {
        return this.customCommandArgs;
    }

    public String getMaxSpeed() {
        return this.maxSpeed;
    }

    public String getMaxWSpeed() {
        return this.maxWSpeed;
    }

    public String getMaxAcc() {
        return this.maxAcc;
    }

    public String getMaxWAcc() {
        return this.maxWAcc;
    }

    public String getSpin() {
        return this.spin;
    }

    public Object getAdjustInfo() {
        return this.adjustInfo;
    }

    public String getTaskRecordId() {
        return this.taskRecordId;
    }

    public String getOrderId() {
        return this.orderId;
    }

    public void setTargetSiteLabel(String targetSiteLabel) {
        this.targetSiteLabel = targetSiteLabel;
    }

    public void setScriptName(String scriptName) {
        this.scriptName = scriptName;
    }

    public void setPostAction(String postAction) {
        this.postAction = postAction;
    }

    public void setGoodsId(String goodsId) {
        this.goodsId = goodsId;
    }

    public void setIsEndAction(String isEndAction) {
        this.isEndAction = isEndAction;
    }

    public void setCustomCommandName(String customCommandName) {
        this.customCommandName = customCommandName;
    }

    public void setCustomCommandType(String customCommandType) {
        this.customCommandType = customCommandType;
    }

    public void setCustomCommandArgs(String customCommandArgs) {
        this.customCommandArgs = customCommandArgs;
    }

    public void setMaxSpeed(String maxSpeed) {
        this.maxSpeed = maxSpeed;
    }

    public void setMaxWSpeed(String maxWSpeed) {
        this.maxWSpeed = maxWSpeed;
    }

    public void setMaxAcc(String maxAcc) {
        this.maxAcc = maxAcc;
    }

    public void setMaxWAcc(String maxWAcc) {
        this.maxWAcc = maxWAcc;
    }

    public void setSpin(String spin) {
        this.spin = spin;
    }

    public void setAdjustInfo(Object adjustInfo) {
        this.adjustInfo = adjustInfo;
    }

    public void setTaskRecordId(String taskRecordId) {
        this.taskRecordId = taskRecordId;
    }

    public void setOrderId(String orderId) {
        this.orderId = orderId;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof ChangeDestinationReq)) {
            return false;
        }
        ChangeDestinationReq other = (ChangeDestinationReq)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        String this$targetSiteLabel = this.getTargetSiteLabel();
        String other$targetSiteLabel = other.getTargetSiteLabel();
        if (this$targetSiteLabel == null ? other$targetSiteLabel != null : !this$targetSiteLabel.equals(other$targetSiteLabel)) {
            return false;
        }
        String this$scriptName = this.getScriptName();
        String other$scriptName = other.getScriptName();
        if (this$scriptName == null ? other$scriptName != null : !this$scriptName.equals(other$scriptName)) {
            return false;
        }
        String this$postAction = this.getPostAction();
        String other$postAction = other.getPostAction();
        if (this$postAction == null ? other$postAction != null : !this$postAction.equals(other$postAction)) {
            return false;
        }
        String this$goodsId = this.getGoodsId();
        String other$goodsId = other.getGoodsId();
        if (this$goodsId == null ? other$goodsId != null : !this$goodsId.equals(other$goodsId)) {
            return false;
        }
        String this$isEndAction = this.getIsEndAction();
        String other$isEndAction = other.getIsEndAction();
        if (this$isEndAction == null ? other$isEndAction != null : !this$isEndAction.equals(other$isEndAction)) {
            return false;
        }
        String this$customCommandName = this.getCustomCommandName();
        String other$customCommandName = other.getCustomCommandName();
        if (this$customCommandName == null ? other$customCommandName != null : !this$customCommandName.equals(other$customCommandName)) {
            return false;
        }
        String this$customCommandType = this.getCustomCommandType();
        String other$customCommandType = other.getCustomCommandType();
        if (this$customCommandType == null ? other$customCommandType != null : !this$customCommandType.equals(other$customCommandType)) {
            return false;
        }
        String this$customCommandArgs = this.getCustomCommandArgs();
        String other$customCommandArgs = other.getCustomCommandArgs();
        if (this$customCommandArgs == null ? other$customCommandArgs != null : !this$customCommandArgs.equals(other$customCommandArgs)) {
            return false;
        }
        String this$maxSpeed = this.getMaxSpeed();
        String other$maxSpeed = other.getMaxSpeed();
        if (this$maxSpeed == null ? other$maxSpeed != null : !this$maxSpeed.equals(other$maxSpeed)) {
            return false;
        }
        String this$maxWSpeed = this.getMaxWSpeed();
        String other$maxWSpeed = other.getMaxWSpeed();
        if (this$maxWSpeed == null ? other$maxWSpeed != null : !this$maxWSpeed.equals(other$maxWSpeed)) {
            return false;
        }
        String this$maxAcc = this.getMaxAcc();
        String other$maxAcc = other.getMaxAcc();
        if (this$maxAcc == null ? other$maxAcc != null : !this$maxAcc.equals(other$maxAcc)) {
            return false;
        }
        String this$maxWAcc = this.getMaxWAcc();
        String other$maxWAcc = other.getMaxWAcc();
        if (this$maxWAcc == null ? other$maxWAcc != null : !this$maxWAcc.equals(other$maxWAcc)) {
            return false;
        }
        String this$spin = this.getSpin();
        String other$spin = other.getSpin();
        if (this$spin == null ? other$spin != null : !this$spin.equals(other$spin)) {
            return false;
        }
        Object this$adjustInfo = this.getAdjustInfo();
        Object other$adjustInfo = other.getAdjustInfo();
        if (this$adjustInfo == null ? other$adjustInfo != null : !this$adjustInfo.equals(other$adjustInfo)) {
            return false;
        }
        String this$taskRecordId = this.getTaskRecordId();
        String other$taskRecordId = other.getTaskRecordId();
        if (this$taskRecordId == null ? other$taskRecordId != null : !this$taskRecordId.equals(other$taskRecordId)) {
            return false;
        }
        String this$orderId = this.getOrderId();
        String other$orderId = other.getOrderId();
        return !(this$orderId == null ? other$orderId != null : !this$orderId.equals(other$orderId));
    }

    protected boolean canEqual(Object other) {
        return other instanceof ChangeDestinationReq;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        String $targetSiteLabel = this.getTargetSiteLabel();
        result = result * 59 + ($targetSiteLabel == null ? 43 : $targetSiteLabel.hashCode());
        String $scriptName = this.getScriptName();
        result = result * 59 + ($scriptName == null ? 43 : $scriptName.hashCode());
        String $postAction = this.getPostAction();
        result = result * 59 + ($postAction == null ? 43 : $postAction.hashCode());
        String $goodsId = this.getGoodsId();
        result = result * 59 + ($goodsId == null ? 43 : $goodsId.hashCode());
        String $isEndAction = this.getIsEndAction();
        result = result * 59 + ($isEndAction == null ? 43 : $isEndAction.hashCode());
        String $customCommandName = this.getCustomCommandName();
        result = result * 59 + ($customCommandName == null ? 43 : $customCommandName.hashCode());
        String $customCommandType = this.getCustomCommandType();
        result = result * 59 + ($customCommandType == null ? 43 : $customCommandType.hashCode());
        String $customCommandArgs = this.getCustomCommandArgs();
        result = result * 59 + ($customCommandArgs == null ? 43 : $customCommandArgs.hashCode());
        String $maxSpeed = this.getMaxSpeed();
        result = result * 59 + ($maxSpeed == null ? 43 : $maxSpeed.hashCode());
        String $maxWSpeed = this.getMaxWSpeed();
        result = result * 59 + ($maxWSpeed == null ? 43 : $maxWSpeed.hashCode());
        String $maxAcc = this.getMaxAcc();
        result = result * 59 + ($maxAcc == null ? 43 : $maxAcc.hashCode());
        String $maxWAcc = this.getMaxWAcc();
        result = result * 59 + ($maxWAcc == null ? 43 : $maxWAcc.hashCode());
        String $spin = this.getSpin();
        result = result * 59 + ($spin == null ? 43 : $spin.hashCode());
        Object $adjustInfo = this.getAdjustInfo();
        result = result * 59 + ($adjustInfo == null ? 43 : $adjustInfo.hashCode());
        String $taskRecordId = this.getTaskRecordId();
        result = result * 59 + ($taskRecordId == null ? 43 : $taskRecordId.hashCode());
        String $orderId = this.getOrderId();
        result = result * 59 + ($orderId == null ? 43 : $orderId.hashCode());
        return result;
    }

    public String toString() {
        return "ChangeDestinationReq(targetSiteLabel=" + this.getTargetSiteLabel() + ", scriptName=" + this.getScriptName() + ", postAction=" + this.getPostAction() + ", goodsId=" + this.getGoodsId() + ", isEndAction=" + this.getIsEndAction() + ", customCommandName=" + this.getCustomCommandName() + ", customCommandType=" + this.getCustomCommandType() + ", customCommandArgs=" + this.getCustomCommandArgs() + ", maxSpeed=" + this.getMaxSpeed() + ", maxWSpeed=" + this.getMaxWSpeed() + ", maxAcc=" + this.getMaxAcc() + ", maxWAcc=" + this.getMaxWAcc() + ", spin=" + this.getSpin() + ", adjustInfo=" + this.getAdjustInfo() + ", taskRecordId=" + this.getTaskRecordId() + ", orderId=" + this.getOrderId() + ")";
    }
}

