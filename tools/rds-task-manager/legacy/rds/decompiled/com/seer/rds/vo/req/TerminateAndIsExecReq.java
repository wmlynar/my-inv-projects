/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.vo.req.TerminateAndIsExecReq
 */
package com.seer.rds.vo.req;

public class TerminateAndIsExecReq {
    private String agvArray;
    private Boolean disable;
    private String taskRecordArray;
    private Boolean isUnlockSite;

    public String getAgvArray() {
        return this.agvArray;
    }

    public Boolean getDisable() {
        return this.disable;
    }

    public String getTaskRecordArray() {
        return this.taskRecordArray;
    }

    public Boolean getIsUnlockSite() {
        return this.isUnlockSite;
    }

    public void setAgvArray(String agvArray) {
        this.agvArray = agvArray;
    }

    public void setDisable(Boolean disable) {
        this.disable = disable;
    }

    public void setTaskRecordArray(String taskRecordArray) {
        this.taskRecordArray = taskRecordArray;
    }

    public void setIsUnlockSite(Boolean isUnlockSite) {
        this.isUnlockSite = isUnlockSite;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof TerminateAndIsExecReq)) {
            return false;
        }
        TerminateAndIsExecReq other = (TerminateAndIsExecReq)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        Boolean this$disable = this.getDisable();
        Boolean other$disable = other.getDisable();
        if (this$disable == null ? other$disable != null : !((Object)this$disable).equals(other$disable)) {
            return false;
        }
        Boolean this$isUnlockSite = this.getIsUnlockSite();
        Boolean other$isUnlockSite = other.getIsUnlockSite();
        if (this$isUnlockSite == null ? other$isUnlockSite != null : !((Object)this$isUnlockSite).equals(other$isUnlockSite)) {
            return false;
        }
        String this$agvArray = this.getAgvArray();
        String other$agvArray = other.getAgvArray();
        if (this$agvArray == null ? other$agvArray != null : !this$agvArray.equals(other$agvArray)) {
            return false;
        }
        String this$taskRecordArray = this.getTaskRecordArray();
        String other$taskRecordArray = other.getTaskRecordArray();
        return !(this$taskRecordArray == null ? other$taskRecordArray != null : !this$taskRecordArray.equals(other$taskRecordArray));
    }

    protected boolean canEqual(Object other) {
        return other instanceof TerminateAndIsExecReq;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        Boolean $disable = this.getDisable();
        result = result * 59 + ($disable == null ? 43 : ((Object)$disable).hashCode());
        Boolean $isUnlockSite = this.getIsUnlockSite();
        result = result * 59 + ($isUnlockSite == null ? 43 : ((Object)$isUnlockSite).hashCode());
        String $agvArray = this.getAgvArray();
        result = result * 59 + ($agvArray == null ? 43 : $agvArray.hashCode());
        String $taskRecordArray = this.getTaskRecordArray();
        result = result * 59 + ($taskRecordArray == null ? 43 : $taskRecordArray.hashCode());
        return result;
    }

    public String toString() {
        return "TerminateAndIsExecReq(agvArray=" + this.getAgvArray() + ", disable=" + this.getDisable() + ", taskRecordArray=" + this.getTaskRecordArray() + ", isUnlockSite=" + this.getIsUnlockSite() + ")";
    }

    public TerminateAndIsExecReq withAgvArray(String agvArray) {
        return this.agvArray == agvArray ? this : new TerminateAndIsExecReq(agvArray, this.disable, this.taskRecordArray, this.isUnlockSite);
    }

    public TerminateAndIsExecReq withDisable(Boolean disable) {
        return this.disable == disable ? this : new TerminateAndIsExecReq(this.agvArray, disable, this.taskRecordArray, this.isUnlockSite);
    }

    public TerminateAndIsExecReq withTaskRecordArray(String taskRecordArray) {
        return this.taskRecordArray == taskRecordArray ? this : new TerminateAndIsExecReq(this.agvArray, this.disable, taskRecordArray, this.isUnlockSite);
    }

    public TerminateAndIsExecReq withIsUnlockSite(Boolean isUnlockSite) {
        return this.isUnlockSite == isUnlockSite ? this : new TerminateAndIsExecReq(this.agvArray, this.disable, this.taskRecordArray, isUnlockSite);
    }

    public TerminateAndIsExecReq(String agvArray, Boolean disable, String taskRecordArray, Boolean isUnlockSite) {
        this.agvArray = agvArray;
        this.disable = disable;
        this.taskRecordArray = taskRecordArray;
        this.isUnlockSite = isUnlockSite;
    }

    public TerminateAndIsExecReq() {
    }
}

