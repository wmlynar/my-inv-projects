/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.vo.AttrVo
 *  com.seer.rds.vo.AttrVo$AttrVoBuilder
 *  io.swagger.annotations.ApiModel
 *  io.swagger.annotations.ApiModelProperty
 */
package com.seer.rds.vo;

import com.seer.rds.vo.AttrVo;
import io.swagger.annotations.ApiModel;
import io.swagger.annotations.ApiModelProperty;

@ApiModel(value="Extension Field Object")
public class AttrVo {
    @ApiModelProperty(value="attributeName", name="attributeName", required=true)
    private String attributeName;
    @ApiModelProperty(value="attributeValue", name="attributeValue", required=true)
    private String attributeValue;

    public static AttrVoBuilder builder() {
        return new AttrVoBuilder();
    }

    public String getAttributeName() {
        return this.attributeName;
    }

    public String getAttributeValue() {
        return this.attributeValue;
    }

    public void setAttributeName(String attributeName) {
        this.attributeName = attributeName;
    }

    public void setAttributeValue(String attributeValue) {
        this.attributeValue = attributeValue;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof AttrVo)) {
            return false;
        }
        AttrVo other = (AttrVo)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        String this$attributeName = this.getAttributeName();
        String other$attributeName = other.getAttributeName();
        if (this$attributeName == null ? other$attributeName != null : !this$attributeName.equals(other$attributeName)) {
            return false;
        }
        String this$attributeValue = this.getAttributeValue();
        String other$attributeValue = other.getAttributeValue();
        return !(this$attributeValue == null ? other$attributeValue != null : !this$attributeValue.equals(other$attributeValue));
    }

    protected boolean canEqual(Object other) {
        return other instanceof AttrVo;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        String $attributeName = this.getAttributeName();
        result = result * 59 + ($attributeName == null ? 43 : $attributeName.hashCode());
        String $attributeValue = this.getAttributeValue();
        result = result * 59 + ($attributeValue == null ? 43 : $attributeValue.hashCode());
        return result;
    }

    public String toString() {
        return "AttrVo(attributeName=" + this.getAttributeName() + ", attributeValue=" + this.getAttributeValue() + ")";
    }

    public AttrVo() {
    }

    public AttrVo(String attributeName, String attributeValue) {
        this.attributeName = attributeName;
        this.attributeValue = attributeValue;
    }
}

