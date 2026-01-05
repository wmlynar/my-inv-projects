/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.config.configview.operator.OperatorOrderParam
 *  com.seer.rds.config.configview.operator.OperatorOrderParamOption
 */
package com.seer.rds.config.configview.operator;

import com.seer.rds.config.configview.operator.OperatorOrderParamOption;
import java.util.List;

public class OperatorOrderParam {
    private String name = "";
    private String label = "";
    private String input = "";
    private List<OperatorOrderParamOption> options = null;
    private String optionsSource = "";
    private String dynamicOptionsSource = "";
    private Integer multiple = 0;
    private String dataId = "";
    private String inputDetails = "";
    private Boolean lazyGetSource = false;
    private List<String> groupNames = null;
    private Boolean hidden = false;
    private String defaultValue = "";

    public String getName() {
        return this.name;
    }

    public String getLabel() {
        return this.label;
    }

    public String getInput() {
        return this.input;
    }

    public List<OperatorOrderParamOption> getOptions() {
        return this.options;
    }

    public String getOptionsSource() {
        return this.optionsSource;
    }

    public String getDynamicOptionsSource() {
        return this.dynamicOptionsSource;
    }

    public Integer getMultiple() {
        return this.multiple;
    }

    public String getDataId() {
        return this.dataId;
    }

    public String getInputDetails() {
        return this.inputDetails;
    }

    public Boolean getLazyGetSource() {
        return this.lazyGetSource;
    }

    public List<String> getGroupNames() {
        return this.groupNames;
    }

    public Boolean getHidden() {
        return this.hidden;
    }

    public String getDefaultValue() {
        return this.defaultValue;
    }

    public void setName(String name) {
        this.name = name;
    }

    public void setLabel(String label) {
        this.label = label;
    }

    public void setInput(String input) {
        this.input = input;
    }

    public void setOptions(List<OperatorOrderParamOption> options) {
        this.options = options;
    }

    public void setOptionsSource(String optionsSource) {
        this.optionsSource = optionsSource;
    }

    public void setDynamicOptionsSource(String dynamicOptionsSource) {
        this.dynamicOptionsSource = dynamicOptionsSource;
    }

    public void setMultiple(Integer multiple) {
        this.multiple = multiple;
    }

    public void setDataId(String dataId) {
        this.dataId = dataId;
    }

    public void setInputDetails(String inputDetails) {
        this.inputDetails = inputDetails;
    }

    public void setLazyGetSource(Boolean lazyGetSource) {
        this.lazyGetSource = lazyGetSource;
    }

    public void setGroupNames(List<String> groupNames) {
        this.groupNames = groupNames;
    }

    public void setHidden(Boolean hidden) {
        this.hidden = hidden;
    }

    public void setDefaultValue(String defaultValue) {
        this.defaultValue = defaultValue;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof OperatorOrderParam)) {
            return false;
        }
        OperatorOrderParam other = (OperatorOrderParam)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        Integer this$multiple = this.getMultiple();
        Integer other$multiple = other.getMultiple();
        if (this$multiple == null ? other$multiple != null : !((Object)this$multiple).equals(other$multiple)) {
            return false;
        }
        Boolean this$lazyGetSource = this.getLazyGetSource();
        Boolean other$lazyGetSource = other.getLazyGetSource();
        if (this$lazyGetSource == null ? other$lazyGetSource != null : !((Object)this$lazyGetSource).equals(other$lazyGetSource)) {
            return false;
        }
        Boolean this$hidden = this.getHidden();
        Boolean other$hidden = other.getHidden();
        if (this$hidden == null ? other$hidden != null : !((Object)this$hidden).equals(other$hidden)) {
            return false;
        }
        String this$name = this.getName();
        String other$name = other.getName();
        if (this$name == null ? other$name != null : !this$name.equals(other$name)) {
            return false;
        }
        String this$label = this.getLabel();
        String other$label = other.getLabel();
        if (this$label == null ? other$label != null : !this$label.equals(other$label)) {
            return false;
        }
        String this$input = this.getInput();
        String other$input = other.getInput();
        if (this$input == null ? other$input != null : !this$input.equals(other$input)) {
            return false;
        }
        List this$options = this.getOptions();
        List other$options = other.getOptions();
        if (this$options == null ? other$options != null : !((Object)this$options).equals(other$options)) {
            return false;
        }
        String this$optionsSource = this.getOptionsSource();
        String other$optionsSource = other.getOptionsSource();
        if (this$optionsSource == null ? other$optionsSource != null : !this$optionsSource.equals(other$optionsSource)) {
            return false;
        }
        String this$dynamicOptionsSource = this.getDynamicOptionsSource();
        String other$dynamicOptionsSource = other.getDynamicOptionsSource();
        if (this$dynamicOptionsSource == null ? other$dynamicOptionsSource != null : !this$dynamicOptionsSource.equals(other$dynamicOptionsSource)) {
            return false;
        }
        String this$dataId = this.getDataId();
        String other$dataId = other.getDataId();
        if (this$dataId == null ? other$dataId != null : !this$dataId.equals(other$dataId)) {
            return false;
        }
        String this$inputDetails = this.getInputDetails();
        String other$inputDetails = other.getInputDetails();
        if (this$inputDetails == null ? other$inputDetails != null : !this$inputDetails.equals(other$inputDetails)) {
            return false;
        }
        List this$groupNames = this.getGroupNames();
        List other$groupNames = other.getGroupNames();
        if (this$groupNames == null ? other$groupNames != null : !((Object)this$groupNames).equals(other$groupNames)) {
            return false;
        }
        String this$defaultValue = this.getDefaultValue();
        String other$defaultValue = other.getDefaultValue();
        return !(this$defaultValue == null ? other$defaultValue != null : !this$defaultValue.equals(other$defaultValue));
    }

    protected boolean canEqual(Object other) {
        return other instanceof OperatorOrderParam;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        Integer $multiple = this.getMultiple();
        result = result * 59 + ($multiple == null ? 43 : ((Object)$multiple).hashCode());
        Boolean $lazyGetSource = this.getLazyGetSource();
        result = result * 59 + ($lazyGetSource == null ? 43 : ((Object)$lazyGetSource).hashCode());
        Boolean $hidden = this.getHidden();
        result = result * 59 + ($hidden == null ? 43 : ((Object)$hidden).hashCode());
        String $name = this.getName();
        result = result * 59 + ($name == null ? 43 : $name.hashCode());
        String $label = this.getLabel();
        result = result * 59 + ($label == null ? 43 : $label.hashCode());
        String $input = this.getInput();
        result = result * 59 + ($input == null ? 43 : $input.hashCode());
        List $options = this.getOptions();
        result = result * 59 + ($options == null ? 43 : ((Object)$options).hashCode());
        String $optionsSource = this.getOptionsSource();
        result = result * 59 + ($optionsSource == null ? 43 : $optionsSource.hashCode());
        String $dynamicOptionsSource = this.getDynamicOptionsSource();
        result = result * 59 + ($dynamicOptionsSource == null ? 43 : $dynamicOptionsSource.hashCode());
        String $dataId = this.getDataId();
        result = result * 59 + ($dataId == null ? 43 : $dataId.hashCode());
        String $inputDetails = this.getInputDetails();
        result = result * 59 + ($inputDetails == null ? 43 : $inputDetails.hashCode());
        List $groupNames = this.getGroupNames();
        result = result * 59 + ($groupNames == null ? 43 : ((Object)$groupNames).hashCode());
        String $defaultValue = this.getDefaultValue();
        result = result * 59 + ($defaultValue == null ? 43 : $defaultValue.hashCode());
        return result;
    }

    public String toString() {
        return "OperatorOrderParam(name=" + this.getName() + ", label=" + this.getLabel() + ", input=" + this.getInput() + ", options=" + this.getOptions() + ", optionsSource=" + this.getOptionsSource() + ", dynamicOptionsSource=" + this.getDynamicOptionsSource() + ", multiple=" + this.getMultiple() + ", dataId=" + this.getDataId() + ", inputDetails=" + this.getInputDetails() + ", lazyGetSource=" + this.getLazyGetSource() + ", groupNames=" + this.getGroupNames() + ", hidden=" + this.getHidden() + ", defaultValue=" + this.getDefaultValue() + ")";
    }
}

