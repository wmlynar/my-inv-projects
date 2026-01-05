/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.vo.req.WindTaskLogReq
 */
package com.seer.rds.vo.req;

import java.util.List;

public class WindTaskLogReq {
    private String taskRecordId;
    private List<String> levels;

    public String getTaskRecordId() {
        return this.taskRecordId;
    }

    public List<String> getLevels() {
        return this.levels;
    }

    public void setTaskRecordId(String taskRecordId) {
        this.taskRecordId = taskRecordId;
    }

    public void setLevels(List<String> levels) {
        this.levels = levels;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof WindTaskLogReq)) {
            return false;
        }
        WindTaskLogReq other = (WindTaskLogReq)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        String this$taskRecordId = this.getTaskRecordId();
        String other$taskRecordId = other.getTaskRecordId();
        if (this$taskRecordId == null ? other$taskRecordId != null : !this$taskRecordId.equals(other$taskRecordId)) {
            return false;
        }
        List this$levels = this.getLevels();
        List other$levels = other.getLevels();
        return !(this$levels == null ? other$levels != null : !((Object)this$levels).equals(other$levels));
    }

    protected boolean canEqual(Object other) {
        return other instanceof WindTaskLogReq;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        String $taskRecordId = this.getTaskRecordId();
        result = result * 59 + ($taskRecordId == null ? 43 : $taskRecordId.hashCode());
        List $levels = this.getLevels();
        result = result * 59 + ($levels == null ? 43 : ((Object)$levels).hashCode());
        return result;
    }

    public String toString() {
        return "WindTaskLogReq(taskRecordId=" + this.getTaskRecordId() + ", levels=" + this.getLevels() + ")";
    }
}

