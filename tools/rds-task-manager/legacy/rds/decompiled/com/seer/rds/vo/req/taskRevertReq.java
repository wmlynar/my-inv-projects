/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.vo.req.taskRevertReq
 */
package com.seer.rds.vo.req;

public class taskRevertReq {
    private String taskRecordId;
    private String taskId;
    private String revertId;

    public String getTaskRecordId() {
        return this.taskRecordId;
    }

    public String getTaskId() {
        return this.taskId;
    }

    public String getRevertId() {
        return this.revertId;
    }

    public void setTaskRecordId(String taskRecordId) {
        this.taskRecordId = taskRecordId;
    }

    public void setTaskId(String taskId) {
        this.taskId = taskId;
    }

    public void setRevertId(String revertId) {
        this.revertId = revertId;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof taskRevertReq)) {
            return false;
        }
        taskRevertReq other = (taskRevertReq)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        String this$taskRecordId = this.getTaskRecordId();
        String other$taskRecordId = other.getTaskRecordId();
        if (this$taskRecordId == null ? other$taskRecordId != null : !this$taskRecordId.equals(other$taskRecordId)) {
            return false;
        }
        String this$taskId = this.getTaskId();
        String other$taskId = other.getTaskId();
        if (this$taskId == null ? other$taskId != null : !this$taskId.equals(other$taskId)) {
            return false;
        }
        String this$revertId = this.getRevertId();
        String other$revertId = other.getRevertId();
        return !(this$revertId == null ? other$revertId != null : !this$revertId.equals(other$revertId));
    }

    protected boolean canEqual(Object other) {
        return other instanceof taskRevertReq;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        String $taskRecordId = this.getTaskRecordId();
        result = result * 59 + ($taskRecordId == null ? 43 : $taskRecordId.hashCode());
        String $taskId = this.getTaskId();
        result = result * 59 + ($taskId == null ? 43 : $taskId.hashCode());
        String $revertId = this.getRevertId();
        result = result * 59 + ($revertId == null ? 43 : $revertId.hashCode());
        return result;
    }

    public String toString() {
        return "taskRevertReq(taskRecordId=" + this.getTaskRecordId() + ", taskId=" + this.getTaskId() + ", revertId=" + this.getRevertId() + ")";
    }
}

