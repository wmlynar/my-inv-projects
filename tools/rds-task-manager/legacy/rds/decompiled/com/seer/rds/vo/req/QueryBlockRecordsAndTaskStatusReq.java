/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.vo.req.QueryBlockRecordsAndTaskStatusReq
 */
package com.seer.rds.vo.req;

public class QueryBlockRecordsAndTaskStatusReq {
    private String taskRecordId;

    public String getTaskRecordId() {
        return this.taskRecordId;
    }

    public void setTaskRecordId(String taskRecordId) {
        this.taskRecordId = taskRecordId;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof QueryBlockRecordsAndTaskStatusReq)) {
            return false;
        }
        QueryBlockRecordsAndTaskStatusReq other = (QueryBlockRecordsAndTaskStatusReq)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        String this$taskRecordId = this.getTaskRecordId();
        String other$taskRecordId = other.getTaskRecordId();
        return !(this$taskRecordId == null ? other$taskRecordId != null : !this$taskRecordId.equals(other$taskRecordId));
    }

    protected boolean canEqual(Object other) {
        return other instanceof QueryBlockRecordsAndTaskStatusReq;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        String $taskRecordId = this.getTaskRecordId();
        result = result * 59 + ($taskRecordId == null ? 43 : $taskRecordId.hashCode());
        return result;
    }

    public String toString() {
        return "QueryBlockRecordsAndTaskStatusReq(taskRecordId=" + this.getTaskRecordId() + ")";
    }
}

