/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.vo.general.ChildrenInputParamsVo
 *  com.seer.rds.vo.general.ChildrenInputParamsVo$ChildrenInputParamsVoBuilder
 */
package com.seer.rds.vo.general;

import com.seer.rds.vo.general.ChildrenInputParamsVo;

public class ChildrenInputParamsVo {
    private String type;
    private Object value;

    public static ChildrenInputParamsVoBuilder builder() {
        return new ChildrenInputParamsVoBuilder();
    }

    public String getType() {
        return this.type;
    }

    public Object getValue() {
        return this.value;
    }

    public void setType(String type) {
        this.type = type;
    }

    public void setValue(Object value) {
        this.value = value;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof ChildrenInputParamsVo)) {
            return false;
        }
        ChildrenInputParamsVo other = (ChildrenInputParamsVo)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        String this$type = this.getType();
        String other$type = other.getType();
        if (this$type == null ? other$type != null : !this$type.equals(other$type)) {
            return false;
        }
        Object this$value = this.getValue();
        Object other$value = other.getValue();
        return !(this$value == null ? other$value != null : !this$value.equals(other$value));
    }

    protected boolean canEqual(Object other) {
        return other instanceof ChildrenInputParamsVo;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        String $type = this.getType();
        result = result * 59 + ($type == null ? 43 : $type.hashCode());
        Object $value = this.getValue();
        result = result * 59 + ($value == null ? 43 : $value.hashCode());
        return result;
    }

    public String toString() {
        return "ChildrenInputParamsVo(type=" + this.getType() + ", value=" + this.getValue() + ")";
    }

    public ChildrenInputParamsVo() {
    }

    public ChildrenInputParamsVo(String type, Object value) {
        this.type = type;
        this.value = value;
    }
}

