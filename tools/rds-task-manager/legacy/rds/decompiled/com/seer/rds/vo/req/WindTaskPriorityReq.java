/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.vo.req.WindTaskPriorityReq
 */
package com.seer.rds.vo.req;

import java.util.List;

public class WindTaskPriorityReq {
    private List<String> taskRecordIds;
    private Integer priority;

    public List<String> getTaskRecordIds() {
        return this.taskRecordIds;
    }

    public Integer getPriority() {
        return this.priority;
    }

    public void setTaskRecordIds(List<String> taskRecordIds) {
        this.taskRecordIds = taskRecordIds;
    }

    public void setPriority(Integer priority) {
        this.priority = priority;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof WindTaskPriorityReq)) {
            return false;
        }
        WindTaskPriorityReq other = (WindTaskPriorityReq)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        Integer this$priority = this.getPriority();
        Integer other$priority = other.getPriority();
        if (this$priority == null ? other$priority != null : !((Object)this$priority).equals(other$priority)) {
            return false;
        }
        List this$taskRecordIds = this.getTaskRecordIds();
        List other$taskRecordIds = other.getTaskRecordIds();
        return !(this$taskRecordIds == null ? other$taskRecordIds != null : !((Object)this$taskRecordIds).equals(other$taskRecordIds));
    }

    protected boolean canEqual(Object other) {
        return other instanceof WindTaskPriorityReq;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        Integer $priority = this.getPriority();
        result = result * 59 + ($priority == null ? 43 : ((Object)$priority).hashCode());
        List $taskRecordIds = this.getTaskRecordIds();
        result = result * 59 + ($taskRecordIds == null ? 43 : ((Object)$taskRecordIds).hashCode());
        return result;
    }

    public String toString() {
        return "WindTaskPriorityReq(taskRecordIds=" + this.getTaskRecordIds() + ", priority=" + this.getPriority() + ")";
    }
}

