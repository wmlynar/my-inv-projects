/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.util.configFileMeta.ClassFieldMeta
 */
package com.seer.rds.util.configFileMeta;

public class ClassFieldMeta {
    String fieldName = "";
    String describe = "";
    Object defaultValue = null;
    String remark = "";
    Integer min = null;
    Integer max = null;
    String fieldType = "";
    Object ofType = "";

    public String getFieldName() {
        return this.fieldName;
    }

    public String getDescribe() {
        return this.describe;
    }

    public Object getDefaultValue() {
        return this.defaultValue;
    }

    public String getRemark() {
        return this.remark;
    }

    public Integer getMin() {
        return this.min;
    }

    public Integer getMax() {
        return this.max;
    }

    public String getFieldType() {
        return this.fieldType;
    }

    public Object getOfType() {
        return this.ofType;
    }

    public void setFieldName(String fieldName) {
        this.fieldName = fieldName;
    }

    public void setDescribe(String describe) {
        this.describe = describe;
    }

    public void setDefaultValue(Object defaultValue) {
        this.defaultValue = defaultValue;
    }

    public void setRemark(String remark) {
        this.remark = remark;
    }

    public void setMin(Integer min) {
        this.min = min;
    }

    public void setMax(Integer max) {
        this.max = max;
    }

    public void setFieldType(String fieldType) {
        this.fieldType = fieldType;
    }

    public void setOfType(Object ofType) {
        this.ofType = ofType;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof ClassFieldMeta)) {
            return false;
        }
        ClassFieldMeta other = (ClassFieldMeta)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        Integer this$min = this.getMin();
        Integer other$min = other.getMin();
        if (this$min == null ? other$min != null : !((Object)this$min).equals(other$min)) {
            return false;
        }
        Integer this$max = this.getMax();
        Integer other$max = other.getMax();
        if (this$max == null ? other$max != null : !((Object)this$max).equals(other$max)) {
            return false;
        }
        String this$fieldName = this.getFieldName();
        String other$fieldName = other.getFieldName();
        if (this$fieldName == null ? other$fieldName != null : !this$fieldName.equals(other$fieldName)) {
            return false;
        }
        String this$describe = this.getDescribe();
        String other$describe = other.getDescribe();
        if (this$describe == null ? other$describe != null : !this$describe.equals(other$describe)) {
            return false;
        }
        Object this$defaultValue = this.getDefaultValue();
        Object other$defaultValue = other.getDefaultValue();
        if (this$defaultValue == null ? other$defaultValue != null : !this$defaultValue.equals(other$defaultValue)) {
            return false;
        }
        String this$remark = this.getRemark();
        String other$remark = other.getRemark();
        if (this$remark == null ? other$remark != null : !this$remark.equals(other$remark)) {
            return false;
        }
        String this$fieldType = this.getFieldType();
        String other$fieldType = other.getFieldType();
        if (this$fieldType == null ? other$fieldType != null : !this$fieldType.equals(other$fieldType)) {
            return false;
        }
        Object this$ofType = this.getOfType();
        Object other$ofType = other.getOfType();
        return !(this$ofType == null ? other$ofType != null : !this$ofType.equals(other$ofType));
    }

    protected boolean canEqual(Object other) {
        return other instanceof ClassFieldMeta;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        Integer $min = this.getMin();
        result = result * 59 + ($min == null ? 43 : ((Object)$min).hashCode());
        Integer $max = this.getMax();
        result = result * 59 + ($max == null ? 43 : ((Object)$max).hashCode());
        String $fieldName = this.getFieldName();
        result = result * 59 + ($fieldName == null ? 43 : $fieldName.hashCode());
        String $describe = this.getDescribe();
        result = result * 59 + ($describe == null ? 43 : $describe.hashCode());
        Object $defaultValue = this.getDefaultValue();
        result = result * 59 + ($defaultValue == null ? 43 : $defaultValue.hashCode());
        String $remark = this.getRemark();
        result = result * 59 + ($remark == null ? 43 : $remark.hashCode());
        String $fieldType = this.getFieldType();
        result = result * 59 + ($fieldType == null ? 43 : $fieldType.hashCode());
        Object $ofType = this.getOfType();
        result = result * 59 + ($ofType == null ? 43 : $ofType.hashCode());
        return result;
    }

    public String toString() {
        return "ClassFieldMeta(fieldName=" + this.getFieldName() + ", describe=" + this.getDescribe() + ", defaultValue=" + this.getDefaultValue() + ", remark=" + this.getRemark() + ", min=" + this.getMin() + ", max=" + this.getMax() + ", fieldType=" + this.getFieldType() + ", ofType=" + this.getOfType() + ")";
    }
}

