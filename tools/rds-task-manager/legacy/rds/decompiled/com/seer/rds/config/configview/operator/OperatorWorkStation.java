/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.config.configview.operator.OperatorWorkStation
 */
package com.seer.rds.config.configview.operator;

public class OperatorWorkStation {
    private String id = "";
    private String label = "";
    private String type = "";

    public String getId() {
        return this.id;
    }

    public String getLabel() {
        return this.label;
    }

    public String getType() {
        return this.type;
    }

    public void setId(String id) {
        this.id = id;
    }

    public void setLabel(String label) {
        this.label = label;
    }

    public void setType(String type) {
        this.type = type;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof OperatorWorkStation)) {
            return false;
        }
        OperatorWorkStation other = (OperatorWorkStation)o;
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
        if (this$label == null ? other$label != null : !this$label.equals(other$label)) {
            return false;
        }
        String this$type = this.getType();
        String other$type = other.getType();
        return !(this$type == null ? other$type != null : !this$type.equals(other$type));
    }

    protected boolean canEqual(Object other) {
        return other instanceof OperatorWorkStation;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        String $id = this.getId();
        result = result * 59 + ($id == null ? 43 : $id.hashCode());
        String $label = this.getLabel();
        result = result * 59 + ($label == null ? 43 : $label.hashCode());
        String $type = this.getType();
        result = result * 59 + ($type == null ? 43 : $type.hashCode());
        return result;
    }

    public String toString() {
        return "OperatorWorkStation(id=" + this.getId() + ", label=" + this.getLabel() + ", type=" + this.getType() + ")";
    }
}

