/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.vo.general.ModbusTcpInputParamsVo
 *  com.seer.rds.vo.general.ModbusTcpInputParamsVo$ModbusTcpInputParamsVoBuilder
 */
package com.seer.rds.vo.general;

import com.seer.rds.vo.general.ModbusTcpInputParamsVo;

public class ModbusTcpInputParamsVo {
    private String name;
    private Object value;

    public static ModbusTcpInputParamsVoBuilder builder() {
        return new ModbusTcpInputParamsVoBuilder();
    }

    public String getName() {
        return this.name;
    }

    public Object getValue() {
        return this.value;
    }

    public void setName(String name) {
        this.name = name;
    }

    public void setValue(Object value) {
        this.value = value;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof ModbusTcpInputParamsVo)) {
            return false;
        }
        ModbusTcpInputParamsVo other = (ModbusTcpInputParamsVo)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        String this$name = this.getName();
        String other$name = other.getName();
        if (this$name == null ? other$name != null : !this$name.equals(other$name)) {
            return false;
        }
        Object this$value = this.getValue();
        Object other$value = other.getValue();
        return !(this$value == null ? other$value != null : !this$value.equals(other$value));
    }

    protected boolean canEqual(Object other) {
        return other instanceof ModbusTcpInputParamsVo;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        String $name = this.getName();
        result = result * 59 + ($name == null ? 43 : $name.hashCode());
        Object $value = this.getValue();
        result = result * 59 + ($value == null ? 43 : $value.hashCode());
        return result;
    }

    public String toString() {
        return "ModbusTcpInputParamsVo(name=" + this.getName() + ", value=" + this.getValue() + ")";
    }

    public ModbusTcpInputParamsVo() {
    }

    public ModbusTcpInputParamsVo(String name, Object value) {
        this.name = name;
        this.value = value;
    }
}

