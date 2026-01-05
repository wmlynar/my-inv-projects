/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.vo.response.UnFinishedDemandVo
 */
package com.seer.rds.vo.response;

public class UnFinishedDemandVo {
    private String id;
    private String defLabel;
    private String description;
    private String createdOn;

    public String getId() {
        return this.id;
    }

    public String getDefLabel() {
        return this.defLabel;
    }

    public String getDescription() {
        return this.description;
    }

    public String getCreatedOn() {
        return this.createdOn;
    }

    public void setId(String id) {
        this.id = id;
    }

    public void setDefLabel(String defLabel) {
        this.defLabel = defLabel;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public void setCreatedOn(String createdOn) {
        this.createdOn = createdOn;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof UnFinishedDemandVo)) {
            return false;
        }
        UnFinishedDemandVo other = (UnFinishedDemandVo)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        String this$id = this.getId();
        String other$id = other.getId();
        if (this$id == null ? other$id != null : !this$id.equals(other$id)) {
            return false;
        }
        String this$defLabel = this.getDefLabel();
        String other$defLabel = other.getDefLabel();
        if (this$defLabel == null ? other$defLabel != null : !this$defLabel.equals(other$defLabel)) {
            return false;
        }
        String this$description = this.getDescription();
        String other$description = other.getDescription();
        if (this$description == null ? other$description != null : !this$description.equals(other$description)) {
            return false;
        }
        String this$createdOn = this.getCreatedOn();
        String other$createdOn = other.getCreatedOn();
        return !(this$createdOn == null ? other$createdOn != null : !this$createdOn.equals(other$createdOn));
    }

    protected boolean canEqual(Object other) {
        return other instanceof UnFinishedDemandVo;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        String $id = this.getId();
        result = result * 59 + ($id == null ? 43 : $id.hashCode());
        String $defLabel = this.getDefLabel();
        result = result * 59 + ($defLabel == null ? 43 : $defLabel.hashCode());
        String $description = this.getDescription();
        result = result * 59 + ($description == null ? 43 : $description.hashCode());
        String $createdOn = this.getCreatedOn();
        result = result * 59 + ($createdOn == null ? 43 : $createdOn.hashCode());
        return result;
    }

    public String toString() {
        return "UnFinishedDemandVo(id=" + this.getId() + ", defLabel=" + this.getDefLabel() + ", description=" + this.getDescription() + ", createdOn=" + this.getCreatedOn() + ")";
    }
}

