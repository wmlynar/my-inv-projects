/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.config.configview.operator.ExpandColContent
 *  com.seer.rds.config.configview.operator.OperatorTableExpandCols
 */
package com.seer.rds.config.configview.operator;

import com.seer.rds.config.configview.operator.ExpandColContent;
import java.util.Collections;
import java.util.List;

public class OperatorTableExpandCols {
    private String colId;
    private String label;
    private List<ExpandColContent> contents = Collections.emptyList();

    public String getColId() {
        return this.colId;
    }

    public String getLabel() {
        return this.label;
    }

    public List<ExpandColContent> getContents() {
        return this.contents;
    }

    public void setColId(String colId) {
        this.colId = colId;
    }

    public void setLabel(String label) {
        this.label = label;
    }

    public void setContents(List<ExpandColContent> contents) {
        this.contents = contents;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof OperatorTableExpandCols)) {
            return false;
        }
        OperatorTableExpandCols other = (OperatorTableExpandCols)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        String this$colId = this.getColId();
        String other$colId = other.getColId();
        if (this$colId == null ? other$colId != null : !this$colId.equals(other$colId)) {
            return false;
        }
        String this$label = this.getLabel();
        String other$label = other.getLabel();
        if (this$label == null ? other$label != null : !this$label.equals(other$label)) {
            return false;
        }
        List this$contents = this.getContents();
        List other$contents = other.getContents();
        return !(this$contents == null ? other$contents != null : !((Object)this$contents).equals(other$contents));
    }

    protected boolean canEqual(Object other) {
        return other instanceof OperatorTableExpandCols;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        String $colId = this.getColId();
        result = result * 59 + ($colId == null ? 43 : $colId.hashCode());
        String $label = this.getLabel();
        result = result * 59 + ($label == null ? 43 : $label.hashCode());
        List $contents = this.getContents();
        result = result * 59 + ($contents == null ? 43 : ((Object)$contents).hashCode());
        return result;
    }

    public String toString() {
        return "OperatorTableExpandCols(colId=" + this.getColId() + ", label=" + this.getLabel() + ", contents=" + this.getContents() + ")";
    }
}

