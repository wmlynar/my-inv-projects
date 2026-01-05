/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.config.configview.operator.OperatorOrderOptionCheckParent
 */
package com.seer.rds.config.configview.operator;

import java.util.List;

public class OperatorOrderOptionCheckParent {
    private String parent;
    private List<String> value;

    public String getParent() {
        return this.parent;
    }

    public List<String> getValue() {
        return this.value;
    }

    public void setParent(String parent) {
        this.parent = parent;
    }

    public void setValue(List<String> value) {
        this.value = value;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof OperatorOrderOptionCheckParent)) {
            return false;
        }
        OperatorOrderOptionCheckParent other = (OperatorOrderOptionCheckParent)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        String this$parent = this.getParent();
        String other$parent = other.getParent();
        if (this$parent == null ? other$parent != null : !this$parent.equals(other$parent)) {
            return false;
        }
        List this$value = this.getValue();
        List other$value = other.getValue();
        return !(this$value == null ? other$value != null : !((Object)this$value).equals(other$value));
    }

    protected boolean canEqual(Object other) {
        return other instanceof OperatorOrderOptionCheckParent;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        String $parent = this.getParent();
        result = result * 59 + ($parent == null ? 43 : $parent.hashCode());
        List $value = this.getValue();
        result = result * 59 + ($value == null ? 43 : ((Object)$value).hashCode());
        return result;
    }

    public String toString() {
        return "OperatorOrderOptionCheckParent(parent=" + this.getParent() + ", value=" + this.getValue() + ")";
    }
}

