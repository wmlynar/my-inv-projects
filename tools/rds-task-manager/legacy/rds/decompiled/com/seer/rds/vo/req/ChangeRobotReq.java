/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.vo.req.ChangeRobotReq
 */
package com.seer.rds.vo.req;

public class ChangeRobotReq {
    private String originalAgvId;
    private String originalGroup;
    private String originalLabel;
    private String originalOrderId;
    private String toChangeAgvId;
    private String toChangeGroup;
    private String toChangeLabel;
    private String reason;
    private Boolean ifFilled;
    private String operation;
    private String operationArgs;
    private String location;
    private String binTask;
    private String scriptName;
    private String scriptArgs;
    private Integer pickUpMode;

    public String getOriginalAgvId() {
        return this.originalAgvId;
    }

    public String getOriginalGroup() {
        return this.originalGroup;
    }

    public String getOriginalLabel() {
        return this.originalLabel;
    }

    public String getOriginalOrderId() {
        return this.originalOrderId;
    }

    public String getToChangeAgvId() {
        return this.toChangeAgvId;
    }

    public String getToChangeGroup() {
        return this.toChangeGroup;
    }

    public String getToChangeLabel() {
        return this.toChangeLabel;
    }

    public String getReason() {
        return this.reason;
    }

    public Boolean getIfFilled() {
        return this.ifFilled;
    }

    public String getOperation() {
        return this.operation;
    }

    public String getOperationArgs() {
        return this.operationArgs;
    }

    public String getLocation() {
        return this.location;
    }

    public String getBinTask() {
        return this.binTask;
    }

    public String getScriptName() {
        return this.scriptName;
    }

    public String getScriptArgs() {
        return this.scriptArgs;
    }

    public Integer getPickUpMode() {
        return this.pickUpMode;
    }

    public void setOriginalAgvId(String originalAgvId) {
        this.originalAgvId = originalAgvId;
    }

    public void setOriginalGroup(String originalGroup) {
        this.originalGroup = originalGroup;
    }

    public void setOriginalLabel(String originalLabel) {
        this.originalLabel = originalLabel;
    }

    public void setOriginalOrderId(String originalOrderId) {
        this.originalOrderId = originalOrderId;
    }

    public void setToChangeAgvId(String toChangeAgvId) {
        this.toChangeAgvId = toChangeAgvId;
    }

    public void setToChangeGroup(String toChangeGroup) {
        this.toChangeGroup = toChangeGroup;
    }

    public void setToChangeLabel(String toChangeLabel) {
        this.toChangeLabel = toChangeLabel;
    }

    public void setReason(String reason) {
        this.reason = reason;
    }

    public void setIfFilled(Boolean ifFilled) {
        this.ifFilled = ifFilled;
    }

    public void setOperation(String operation) {
        this.operation = operation;
    }

    public void setOperationArgs(String operationArgs) {
        this.operationArgs = operationArgs;
    }

    public void setLocation(String location) {
        this.location = location;
    }

    public void setBinTask(String binTask) {
        this.binTask = binTask;
    }

    public void setScriptName(String scriptName) {
        this.scriptName = scriptName;
    }

    public void setScriptArgs(String scriptArgs) {
        this.scriptArgs = scriptArgs;
    }

    public void setPickUpMode(Integer pickUpMode) {
        this.pickUpMode = pickUpMode;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof ChangeRobotReq)) {
            return false;
        }
        ChangeRobotReq other = (ChangeRobotReq)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        Boolean this$ifFilled = this.getIfFilled();
        Boolean other$ifFilled = other.getIfFilled();
        if (this$ifFilled == null ? other$ifFilled != null : !((Object)this$ifFilled).equals(other$ifFilled)) {
            return false;
        }
        Integer this$pickUpMode = this.getPickUpMode();
        Integer other$pickUpMode = other.getPickUpMode();
        if (this$pickUpMode == null ? other$pickUpMode != null : !((Object)this$pickUpMode).equals(other$pickUpMode)) {
            return false;
        }
        String this$originalAgvId = this.getOriginalAgvId();
        String other$originalAgvId = other.getOriginalAgvId();
        if (this$originalAgvId == null ? other$originalAgvId != null : !this$originalAgvId.equals(other$originalAgvId)) {
            return false;
        }
        String this$originalGroup = this.getOriginalGroup();
        String other$originalGroup = other.getOriginalGroup();
        if (this$originalGroup == null ? other$originalGroup != null : !this$originalGroup.equals(other$originalGroup)) {
            return false;
        }
        String this$originalLabel = this.getOriginalLabel();
        String other$originalLabel = other.getOriginalLabel();
        if (this$originalLabel == null ? other$originalLabel != null : !this$originalLabel.equals(other$originalLabel)) {
            return false;
        }
        String this$originalOrderId = this.getOriginalOrderId();
        String other$originalOrderId = other.getOriginalOrderId();
        if (this$originalOrderId == null ? other$originalOrderId != null : !this$originalOrderId.equals(other$originalOrderId)) {
            return false;
        }
        String this$toChangeAgvId = this.getToChangeAgvId();
        String other$toChangeAgvId = other.getToChangeAgvId();
        if (this$toChangeAgvId == null ? other$toChangeAgvId != null : !this$toChangeAgvId.equals(other$toChangeAgvId)) {
            return false;
        }
        String this$toChangeGroup = this.getToChangeGroup();
        String other$toChangeGroup = other.getToChangeGroup();
        if (this$toChangeGroup == null ? other$toChangeGroup != null : !this$toChangeGroup.equals(other$toChangeGroup)) {
            return false;
        }
        String this$toChangeLabel = this.getToChangeLabel();
        String other$toChangeLabel = other.getToChangeLabel();
        if (this$toChangeLabel == null ? other$toChangeLabel != null : !this$toChangeLabel.equals(other$toChangeLabel)) {
            return false;
        }
        String this$reason = this.getReason();
        String other$reason = other.getReason();
        if (this$reason == null ? other$reason != null : !this$reason.equals(other$reason)) {
            return false;
        }
        String this$operation = this.getOperation();
        String other$operation = other.getOperation();
        if (this$operation == null ? other$operation != null : !this$operation.equals(other$operation)) {
            return false;
        }
        String this$operationArgs = this.getOperationArgs();
        String other$operationArgs = other.getOperationArgs();
        if (this$operationArgs == null ? other$operationArgs != null : !this$operationArgs.equals(other$operationArgs)) {
            return false;
        }
        String this$location = this.getLocation();
        String other$location = other.getLocation();
        if (this$location == null ? other$location != null : !this$location.equals(other$location)) {
            return false;
        }
        String this$binTask = this.getBinTask();
        String other$binTask = other.getBinTask();
        if (this$binTask == null ? other$binTask != null : !this$binTask.equals(other$binTask)) {
            return false;
        }
        String this$scriptName = this.getScriptName();
        String other$scriptName = other.getScriptName();
        if (this$scriptName == null ? other$scriptName != null : !this$scriptName.equals(other$scriptName)) {
            return false;
        }
        String this$scriptArgs = this.getScriptArgs();
        String other$scriptArgs = other.getScriptArgs();
        return !(this$scriptArgs == null ? other$scriptArgs != null : !this$scriptArgs.equals(other$scriptArgs));
    }

    protected boolean canEqual(Object other) {
        return other instanceof ChangeRobotReq;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        Boolean $ifFilled = this.getIfFilled();
        result = result * 59 + ($ifFilled == null ? 43 : ((Object)$ifFilled).hashCode());
        Integer $pickUpMode = this.getPickUpMode();
        result = result * 59 + ($pickUpMode == null ? 43 : ((Object)$pickUpMode).hashCode());
        String $originalAgvId = this.getOriginalAgvId();
        result = result * 59 + ($originalAgvId == null ? 43 : $originalAgvId.hashCode());
        String $originalGroup = this.getOriginalGroup();
        result = result * 59 + ($originalGroup == null ? 43 : $originalGroup.hashCode());
        String $originalLabel = this.getOriginalLabel();
        result = result * 59 + ($originalLabel == null ? 43 : $originalLabel.hashCode());
        String $originalOrderId = this.getOriginalOrderId();
        result = result * 59 + ($originalOrderId == null ? 43 : $originalOrderId.hashCode());
        String $toChangeAgvId = this.getToChangeAgvId();
        result = result * 59 + ($toChangeAgvId == null ? 43 : $toChangeAgvId.hashCode());
        String $toChangeGroup = this.getToChangeGroup();
        result = result * 59 + ($toChangeGroup == null ? 43 : $toChangeGroup.hashCode());
        String $toChangeLabel = this.getToChangeLabel();
        result = result * 59 + ($toChangeLabel == null ? 43 : $toChangeLabel.hashCode());
        String $reason = this.getReason();
        result = result * 59 + ($reason == null ? 43 : $reason.hashCode());
        String $operation = this.getOperation();
        result = result * 59 + ($operation == null ? 43 : $operation.hashCode());
        String $operationArgs = this.getOperationArgs();
        result = result * 59 + ($operationArgs == null ? 43 : $operationArgs.hashCode());
        String $location = this.getLocation();
        result = result * 59 + ($location == null ? 43 : $location.hashCode());
        String $binTask = this.getBinTask();
        result = result * 59 + ($binTask == null ? 43 : $binTask.hashCode());
        String $scriptName = this.getScriptName();
        result = result * 59 + ($scriptName == null ? 43 : $scriptName.hashCode());
        String $scriptArgs = this.getScriptArgs();
        result = result * 59 + ($scriptArgs == null ? 43 : $scriptArgs.hashCode());
        return result;
    }

    public String toString() {
        return "ChangeRobotReq(originalAgvId=" + this.getOriginalAgvId() + ", originalGroup=" + this.getOriginalGroup() + ", originalLabel=" + this.getOriginalLabel() + ", originalOrderId=" + this.getOriginalOrderId() + ", toChangeAgvId=" + this.getToChangeAgvId() + ", toChangeGroup=" + this.getToChangeGroup() + ", toChangeLabel=" + this.getToChangeLabel() + ", reason=" + this.getReason() + ", ifFilled=" + this.getIfFilled() + ", operation=" + this.getOperation() + ", operationArgs=" + this.getOperationArgs() + ", location=" + this.getLocation() + ", binTask=" + this.getBinTask() + ", scriptName=" + this.getScriptName() + ", scriptArgs=" + this.getScriptArgs() + ", pickUpMode=" + this.getPickUpMode() + ")";
    }
}

