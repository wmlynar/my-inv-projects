/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.config.configview.operator.OperatorOrderOptionCheckParent
 *  com.seer.rds.config.configview.operator.OperatorOrderParamOption
 */
package com.seer.rds.config.configview.operator;

import com.seer.rds.config.configview.operator.OperatorOrderOptionCheckParent;
import java.util.List;

public class OperatorOrderParamOption {
    private String value = "";
    private String label = "";
    private Boolean defaultOption = false;
    private String color = "";
    private List<OperatorOrderOptionCheckParent> checkParent = null;

    public String getValue() {
        return this.value;
    }

    public String getLabel() {
        return this.label;
    }

    public Boolean getDefaultOption() {
        return this.defaultOption;
    }

    public String getColor() {
        return this.color;
    }

    public List<OperatorOrderOptionCheckParent> getCheckParent() {
        return this.checkParent;
    }

    public void setValue(String value) {
        this.value = value;
    }

    public void setLabel(String label) {
        this.label = label;
    }

    public void setDefaultOption(Boolean defaultOption) {
        this.defaultOption = defaultOption;
    }

    public void setColor(String color) {
        this.color = color;
    }

    public void setCheckParent(List<OperatorOrderOptionCheckParent> checkParent) {
        this.checkParent = checkParent;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof OperatorOrderParamOption)) {
            return false;
        }
        OperatorOrderParamOption other = (OperatorOrderParamOption)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        Boolean this$defaultOption = this.getDefaultOption();
        Boolean other$defaultOption = other.getDefaultOption();
        if (this$defaultOption == null ? other$defaultOption != null : !((Object)this$defaultOption).equals(other$defaultOption)) {
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
        String this$color = this.getColor();
        String other$color = other.getColor();
        if (this$color == null ? other$color != null : !this$color.equals(other$color)) {
            return false;
        }
        List this$checkParent = this.getCheckParent();
        List other$checkParent = other.getCheckParent();
        return !(this$checkParent == null ? other$checkParent != null : !((Object)this$checkParent).equals(other$checkParent));
    }

    protected boolean canEqual(Object other) {
        return other instanceof OperatorOrderParamOption;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        Boolean $defaultOption = this.getDefaultOption();
        result = result * 59 + ($defaultOption == null ? 43 : ((Object)$defaultOption).hashCode());
        String $value = this.getValue();
        result = result * 59 + ($value == null ? 43 : $value.hashCode());
        String $label = this.getLabel();
        result = result * 59 + ($label == null ? 43 : $label.hashCode());
        String $color = this.getColor();
        result = result * 59 + ($color == null ? 43 : $color.hashCode());
        List $checkParent = this.getCheckParent();
        result = result * 59 + ($checkParent == null ? 43 : ((Object)$checkParent).hashCode());
        return result;
    }

    public String toString() {
        return "OperatorOrderParamOption(value=" + this.getValue() + ", label=" + this.getLabel() + ", defaultOption=" + this.getDefaultOption() + ", color=" + this.getColor() + ", checkParent=" + this.getCheckParent() + ")";
    }
}

