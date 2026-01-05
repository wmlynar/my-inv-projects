/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.vo.general.InputParamsVo
 *  com.seer.rds.vo.general.InputParamsVo$InputParamsVoBuilder
 */
package com.seer.rds.vo.general;

import com.seer.rds.vo.general.InputParamsVo;

public class InputParamsVo {
    private Object value;

    public static InputParamsVoBuilder builder() {
        return new InputParamsVoBuilder();
    }

    public Object getValue() {
        return this.value;
    }

    public void setValue(Object value) {
        this.value = value;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof InputParamsVo)) {
            return false;
        }
        InputParamsVo other = (InputParamsVo)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        Object this$value = this.getValue();
        Object other$value = other.getValue();
        return !(this$value == null ? other$value != null : !this$value.equals(other$value));
    }

    protected boolean canEqual(Object other) {
        return other instanceof InputParamsVo;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        Object $value = this.getValue();
        result = result * 59 + ($value == null ? 43 : $value.hashCode());
        return result;
    }

    public String toString() {
        return "InputParamsVo(value=" + this.getValue() + ")";
    }

    public InputParamsVo() {
    }

    public InputParamsVo(Object value) {
        this.value = value;
    }
}

