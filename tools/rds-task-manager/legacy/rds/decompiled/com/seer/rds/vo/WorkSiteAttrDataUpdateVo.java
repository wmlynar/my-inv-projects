/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.vo.WorkSiteAttrDataUpdateVo
 *  com.seer.rds.vo.WorkSiteAttrDataUpdateVo$WorkSiteAttrDataUpdateVoBuilder
 */
package com.seer.rds.vo;

import com.seer.rds.vo.WorkSiteAttrDataUpdateVo;

public class WorkSiteAttrDataUpdateVo {
    String siteId;
    String extFieldName;
    String updateValue;

    public static WorkSiteAttrDataUpdateVoBuilder builder() {
        return new WorkSiteAttrDataUpdateVoBuilder();
    }

    public String getSiteId() {
        return this.siteId;
    }

    public String getExtFieldName() {
        return this.extFieldName;
    }

    public String getUpdateValue() {
        return this.updateValue;
    }

    public void setSiteId(String siteId) {
        this.siteId = siteId;
    }

    public void setExtFieldName(String extFieldName) {
        this.extFieldName = extFieldName;
    }

    public void setUpdateValue(String updateValue) {
        this.updateValue = updateValue;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof WorkSiteAttrDataUpdateVo)) {
            return false;
        }
        WorkSiteAttrDataUpdateVo other = (WorkSiteAttrDataUpdateVo)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        String this$siteId = this.getSiteId();
        String other$siteId = other.getSiteId();
        if (this$siteId == null ? other$siteId != null : !this$siteId.equals(other$siteId)) {
            return false;
        }
        String this$extFieldName = this.getExtFieldName();
        String other$extFieldName = other.getExtFieldName();
        if (this$extFieldName == null ? other$extFieldName != null : !this$extFieldName.equals(other$extFieldName)) {
            return false;
        }
        String this$updateValue = this.getUpdateValue();
        String other$updateValue = other.getUpdateValue();
        return !(this$updateValue == null ? other$updateValue != null : !this$updateValue.equals(other$updateValue));
    }

    protected boolean canEqual(Object other) {
        return other instanceof WorkSiteAttrDataUpdateVo;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        String $siteId = this.getSiteId();
        result = result * 59 + ($siteId == null ? 43 : $siteId.hashCode());
        String $extFieldName = this.getExtFieldName();
        result = result * 59 + ($extFieldName == null ? 43 : $extFieldName.hashCode());
        String $updateValue = this.getUpdateValue();
        result = result * 59 + ($updateValue == null ? 43 : $updateValue.hashCode());
        return result;
    }

    public String toString() {
        return "WorkSiteAttrDataUpdateVo(siteId=" + this.getSiteId() + ", extFieldName=" + this.getExtFieldName() + ", updateValue=" + this.getUpdateValue() + ")";
    }

    public WorkSiteAttrDataUpdateVo() {
    }

    public WorkSiteAttrDataUpdateVo(String siteId, String extFieldName, String updateValue) {
        this.siteId = siteId;
        this.extFieldName = extFieldName;
        this.updateValue = updateValue;
    }
}

