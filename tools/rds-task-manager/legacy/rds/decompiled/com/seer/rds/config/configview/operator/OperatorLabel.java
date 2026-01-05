/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.config.configview.operator.OperatorLabel
 */
package com.seer.rds.config.configview.operator;

public class OperatorLabel {
    private String value = "";
    private String label = "";

    public String getValue() {
        return this.value;
    }

    public String getLabel() {
        return this.label;
    }

    public void setValue(String value) {
        this.value = value;
    }

    public void setLabel(String label) {
        this.label = label;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof OperatorLabel)) {
            return false;
        }
        OperatorLabel other = (OperatorLabel)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        String this$value = this.getValue();
        String other$value = other.getValue();
        if (this$value == null ? other$value != null : !this$value.equals(other$value)) {
            return false;
        }
        String this$label = this.getLabel();
        String other$label = other.getLabel();
        return !(this$label == null ? other$label != null : !this$label.equals(other$label));
    }

    protected boolean canEqual(Object other) {
        return other instanceof OperatorLabel;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        String $value = this.getValue();
        result = result * 59 + ($value == null ? 43 : $value.hashCode());
        String $label = this.getLabel();
        result = result * 59 + ($label == null ? 43 : $label.hashCode());
        return result;
    }

    public String toString() {
        return "OperatorLabel(value=" + this.getValue() + ", label=" + this.getLabel() + ")";
    }
}

