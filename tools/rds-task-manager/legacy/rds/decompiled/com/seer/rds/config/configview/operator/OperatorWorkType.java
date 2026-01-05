/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.config.configview.operator.OperatorWorkType
 */
package com.seer.rds.config.configview.operator;

public class OperatorWorkType {
    private String id = "";
    private String label = "";

    public String getId() {
        return this.id;
    }

    public String getLabel() {
        return this.label;
    }

    public void setId(String id) {
        this.id = id;
    }

    public void setLabel(String label) {
        this.label = label;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof OperatorWorkType)) {
            return false;
        }
        OperatorWorkType other = (OperatorWorkType)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        String this$id = this.getId();
        String other$id = other.getId();
        if (this$id == null ? other$id != null : !this$id.equals(other$id)) {
            return false;
        }
        String this$label = this.getLabel();
        String other$label = other.getLabel();
        return !(this$label == null ? other$label != null : !this$label.equals(other$label));
    }

    protected boolean canEqual(Object other) {
        return other instanceof OperatorWorkType;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        String $id = this.getId();
        result = result * 59 + ($id == null ? 43 : $id.hashCode());
        String $label = this.getLabel();
        result = result * 59 + ($label == null ? 43 : $label.hashCode());
        return result;
    }

    public String toString() {
        return "OperatorWorkType(id=" + this.getId() + ", label=" + this.getLabel() + ")";
    }
}

