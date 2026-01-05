/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.vo.general.WindDetailInputParamsVo
 *  com.seer.rds.vo.general.WindDetailInputParamsVo$WindDetailInputParamsVoBuilder
 */
package com.seer.rds.vo.general;

import com.seer.rds.vo.general.WindDetailInputParamsVo;

public class WindDetailInputParamsVo {
    private String name = "";
    private String type = "";
    private String label = "";
    private Boolean required = false;
    private String defaultValue = "";

    public static WindDetailInputParamsVoBuilder builder() {
        return new WindDetailInputParamsVoBuilder();
    }

    public String getName() {
        return this.name;
    }

    public String getType() {
        return this.type;
    }

    public String getLabel() {
        return this.label;
    }

    public Boolean getRequired() {
        return this.required;
    }

    public String getDefaultValue() {
        return this.defaultValue;
    }

    public void setName(String name) {
        this.name = name;
    }

    public void setType(String type) {
        this.type = type;
    }

    public void setLabel(String label) {
        this.label = label;
    }

    public void setRequired(Boolean required) {
        this.required = required;
    }

    public void setDefaultValue(String defaultValue) {
        this.defaultValue = defaultValue;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof WindDetailInputParamsVo)) {
            return false;
        }
        WindDetailInputParamsVo other = (WindDetailInputParamsVo)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        Boolean this$required = this.getRequired();
        Boolean other$required = other.getRequired();
        if (this$required == null ? other$required != null : !((Object)this$required).equals(other$required)) {
            return false;
        }
        String this$name = this.getName();
        String other$name = other.getName();
        if (this$name == null ? other$name != null : !this$name.equals(other$name)) {
            return false;
        }
        String this$type = this.getType();
        String other$type = other.getType();
        if (this$type == null ? other$type != null : !this$type.equals(other$type)) {
            return false;
        }
        String this$label = this.getLabel();
        String other$label = other.getLabel();
        if (this$label == null ? other$label != null : !this$label.equals(other$label)) {
            return false;
        }
        String this$defaultValue = this.getDefaultValue();
        String other$defaultValue = other.getDefaultValue();
        return !(this$defaultValue == null ? other$defaultValue != null : !this$defaultValue.equals(other$defaultValue));
    }

    protected boolean canEqual(Object other) {
        return other instanceof WindDetailInputParamsVo;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        Boolean $required = this.getRequired();
        result = result * 59 + ($required == null ? 43 : ((Object)$required).hashCode());
        String $name = this.getName();
        result = result * 59 + ($name == null ? 43 : $name.hashCode());
        String $type = this.getType();
        result = result * 59 + ($type == null ? 43 : $type.hashCode());
        String $label = this.getLabel();
        result = result * 59 + ($label == null ? 43 : $label.hashCode());
        String $defaultValue = this.getDefaultValue();
        result = result * 59 + ($defaultValue == null ? 43 : $defaultValue.hashCode());
        return result;
    }

    public String toString() {
        return "WindDetailInputParamsVo(name=" + this.getName() + ", type=" + this.getType() + ", label=" + this.getLabel() + ", required=" + this.getRequired() + ", defaultValue=" + this.getDefaultValue() + ")";
    }

    public WindDetailInputParamsVo() {
    }

    public WindDetailInputParamsVo(String name, String type, String label, Boolean required, String defaultValue) {
        this.name = name;
        this.type = type;
        this.label = label;
        this.required = required;
        this.defaultValue = defaultValue;
    }
}

