/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.model.worksite.SiteNode
 */
package com.seer.rds.model.worksite;

public class SiteNode {
    private String taskRecord;
    private int priority = 1;
    private SiteNode next;

    public String getTaskRecord() {
        return this.taskRecord;
    }

    public int getPriority() {
        return this.priority;
    }

    public SiteNode getNext() {
        return this.next;
    }

    public void setTaskRecord(String taskRecord) {
        this.taskRecord = taskRecord;
    }

    public void setPriority(int priority) {
        this.priority = priority;
    }

    public void setNext(SiteNode next) {
        this.next = next;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof SiteNode)) {
            return false;
        }
        SiteNode other = (SiteNode)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        if (this.getPriority() != other.getPriority()) {
            return false;
        }
        String this$taskRecord = this.getTaskRecord();
        String other$taskRecord = other.getTaskRecord();
        if (this$taskRecord == null ? other$taskRecord != null : !this$taskRecord.equals(other$taskRecord)) {
            return false;
        }
        SiteNode this$next = this.getNext();
        SiteNode other$next = other.getNext();
        return !(this$next == null ? other$next != null : !this$next.equals(other$next));
    }

    protected boolean canEqual(Object other) {
        return other instanceof SiteNode;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        result = result * 59 + this.getPriority();
        String $taskRecord = this.getTaskRecord();
        result = result * 59 + ($taskRecord == null ? 43 : $taskRecord.hashCode());
        SiteNode $next = this.getNext();
        result = result * 59 + ($next == null ? 43 : $next.hashCode());
        return result;
    }

    public String toString() {
        return "SiteNode(taskRecord=" + this.getTaskRecord() + ", priority=" + this.getPriority() + ", next=" + this.getNext() + ")";
    }
}

