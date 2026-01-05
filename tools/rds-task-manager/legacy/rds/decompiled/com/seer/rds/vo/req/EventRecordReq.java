/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.vo.req.EventRecordReq
 */
package com.seer.rds.vo.req;

public class EventRecordReq {
    private String id;
    private Integer status;
    private String createdOn;
    private String endedOn;
    private String defLabel;

    public String getId() {
        return this.id;
    }

    public Integer getStatus() {
        return this.status;
    }

    public String getCreatedOn() {
        return this.createdOn;
    }

    public String getEndedOn() {
        return this.endedOn;
    }

    public String getDefLabel() {
        return this.defLabel;
    }

    public void setId(String id) {
        this.id = id;
    }

    public void setStatus(Integer status) {
        this.status = status;
    }

    public void setCreatedOn(String createdOn) {
        this.createdOn = createdOn;
    }

    public void setEndedOn(String endedOn) {
        this.endedOn = endedOn;
    }

    public void setDefLabel(String defLabel) {
        this.defLabel = defLabel;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof EventRecordReq)) {
            return false;
        }
        EventRecordReq other = (EventRecordReq)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        Integer this$status = this.getStatus();
        Integer other$status = other.getStatus();
        if (this$status == null ? other$status != null : !((Object)this$status).equals(other$status)) {
            return false;
        }
        String this$id = this.getId();
        String other$id = other.getId();
        if (this$id == null ? other$id != null : !this$id.equals(other$id)) {
            return false;
        }
        String this$createdOn = this.getCreatedOn();
        String other$createdOn = other.getCreatedOn();
        if (this$createdOn == null ? other$createdOn != null : !this$createdOn.equals(other$createdOn)) {
            return false;
        }
        String this$endedOn = this.getEndedOn();
        String other$endedOn = other.getEndedOn();
        if (this$endedOn == null ? other$endedOn != null : !this$endedOn.equals(other$endedOn)) {
            return false;
        }
        String this$defLabel = this.getDefLabel();
        String other$defLabel = other.getDefLabel();
        return !(this$defLabel == null ? other$defLabel != null : !this$defLabel.equals(other$defLabel));
    }

    protected boolean canEqual(Object other) {
        return other instanceof EventRecordReq;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        Integer $status = this.getStatus();
        result = result * 59 + ($status == null ? 43 : ((Object)$status).hashCode());
        String $id = this.getId();
        result = result * 59 + ($id == null ? 43 : $id.hashCode());
        String $createdOn = this.getCreatedOn();
        result = result * 59 + ($createdOn == null ? 43 : $createdOn.hashCode());
        String $endedOn = this.getEndedOn();
        result = result * 59 + ($endedOn == null ? 43 : $endedOn.hashCode());
        String $defLabel = this.getDefLabel();
        result = result * 59 + ($defLabel == null ? 43 : $defLabel.hashCode());
        return result;
    }

    public String toString() {
        return "EventRecordReq(id=" + this.getId() + ", status=" + this.getStatus() + ", createdOn=" + this.getCreatedOn() + ", endedOn=" + this.getEndedOn() + ", defLabel=" + this.getDefLabel() + ")";
    }
}

