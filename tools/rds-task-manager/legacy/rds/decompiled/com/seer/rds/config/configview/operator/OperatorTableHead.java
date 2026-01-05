/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.config.configview.operator.OperatorLabel
 *  com.seer.rds.config.configview.operator.OperatorTableHead
 */
package com.seer.rds.config.configview.operator;

import com.seer.rds.config.configview.operator.OperatorLabel;
import java.util.List;

public class OperatorTableHead {
    private String value = "";
    private String label = "";
    private List<OperatorLabel> status = null;

    public String getValue() {
        return this.value;
    }

    public String getLabel() {
        return this.label;
    }

    public List<OperatorLabel> getStatus() {
        return this.status;
    }

    public void setValue(String value) {
        this.value = value;
    }

    public void setLabel(String label) {
        this.label = label;
    }

    public void setStatus(List<OperatorLabel> status) {
        this.status = status;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof OperatorTableHead)) {
            return false;
        }
        OperatorTableHead other = (OperatorTableHead)o;
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
        if (this$label == null ? other$label != null : !this$label.equals(other$label)) {
            return false;
        }
        List this$status = this.getStatus();
        List other$status = other.getStatus();
        return !(this$status == null ? other$status != null : !((Object)this$status).equals(other$status));
    }

    protected boolean canEqual(Object other) {
        return other instanceof OperatorTableHead;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        String $value = this.getValue();
        result = result * 59 + ($value == null ? 43 : $value.hashCode());
        String $label = this.getLabel();
        result = result * 59 + ($label == null ? 43 : $label.hashCode());
        List $status = this.getStatus();
        result = result * 59 + ($status == null ? 43 : ((Object)$status).hashCode());
        return result;
    }

    public String toString() {
        return "OperatorTableHead(value=" + this.getValue() + ", label=" + this.getLabel() + ", status=" + this.getStatus() + ")";
    }
}

