/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.vo.req.TestRecordReq
 */
package com.seer.rds.vo.req;

public class TestRecordReq {
    private String taskLabel;

    public String getTaskLabel() {
        return this.taskLabel;
    }

    public void setTaskLabel(String taskLabel) {
        this.taskLabel = taskLabel;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof TestRecordReq)) {
            return false;
        }
        TestRecordReq other = (TestRecordReq)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        String this$taskLabel = this.getTaskLabel();
        String other$taskLabel = other.getTaskLabel();
        return !(this$taskLabel == null ? other$taskLabel != null : !this$taskLabel.equals(other$taskLabel));
    }

    protected boolean canEqual(Object other) {
        return other instanceof TestRecordReq;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        String $taskLabel = this.getTaskLabel();
        result = result * 59 + ($taskLabel == null ? 43 : $taskLabel.hashCode());
        return result;
    }

    public String toString() {
        return "TestRecordReq(taskLabel=" + this.getTaskLabel() + ")";
    }
}

