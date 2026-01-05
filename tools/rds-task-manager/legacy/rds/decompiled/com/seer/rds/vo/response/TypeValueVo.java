/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.vo.response.TypeValueVo
 *  com.seer.rds.vo.response.TypeValueVo$TypeValueVoBuilder
 */
package com.seer.rds.vo.response;

import com.seer.rds.vo.response.TypeValueVo;
import java.math.BigDecimal;

public class TypeValueVo {
    private String type;
    private BigDecimal value;

    public static TypeValueVoBuilder builder() {
        return new TypeValueVoBuilder();
    }

    public String getType() {
        return this.type;
    }

    public BigDecimal getValue() {
        return this.value;
    }

    public void setType(String type) {
        this.type = type;
    }

    public void setValue(BigDecimal value) {
        this.value = value;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof TypeValueVo)) {
            return false;
        }
        TypeValueVo other = (TypeValueVo)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        String this$type = this.getType();
        String other$type = other.getType();
        if (this$type == null ? other$type != null : !this$type.equals(other$type)) {
            return false;
        }
        BigDecimal this$value = this.getValue();
        BigDecimal other$value = other.getValue();
        return !(this$value == null ? other$value != null : !((Object)this$value).equals(other$value));
    }

    protected boolean canEqual(Object other) {
        return other instanceof TypeValueVo;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        String $type = this.getType();
        result = result * 59 + ($type == null ? 43 : $type.hashCode());
        BigDecimal $value = this.getValue();
        result = result * 59 + ($value == null ? 43 : ((Object)$value).hashCode());
        return result;
    }

    public String toString() {
        return "TypeValueVo(type=" + this.getType() + ", value=" + this.getValue() + ")";
    }

    public TypeValueVo() {
    }

    public TypeValueVo(String type, BigDecimal value) {
        this.type = type;
        this.value = value;
    }
}

