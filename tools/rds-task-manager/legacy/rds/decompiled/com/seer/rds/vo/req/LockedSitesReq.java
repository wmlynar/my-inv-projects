/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.vo.req.LockedSitesReq
 *  io.swagger.annotations.ApiModel
 *  io.swagger.annotations.ApiModelProperty
 */
package com.seer.rds.vo.req;

import io.swagger.annotations.ApiModel;
import io.swagger.annotations.ApiModelProperty;
import java.io.Serializable;
import java.util.List;

@ApiModel(value="Model to update worksites locked status")
public class LockedSitesReq
implements Serializable {
    @ApiModelProperty(value="workSite siteId list")
    private List<String> siteIdList;
    @ApiModelProperty(value="workSite lockedBy value")
    private String lockedBy;

    public List<String> getSiteIdList() {
        return this.siteIdList;
    }

    public String getLockedBy() {
        return this.lockedBy;
    }

    public void setSiteIdList(List<String> siteIdList) {
        this.siteIdList = siteIdList;
    }

    public void setLockedBy(String lockedBy) {
        this.lockedBy = lockedBy;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof LockedSitesReq)) {
            return false;
        }
        LockedSitesReq other = (LockedSitesReq)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        List this$siteIdList = this.getSiteIdList();
        List other$siteIdList = other.getSiteIdList();
        if (this$siteIdList == null ? other$siteIdList != null : !((Object)this$siteIdList).equals(other$siteIdList)) {
            return false;
        }
        String this$lockedBy = this.getLockedBy();
        String other$lockedBy = other.getLockedBy();
        return !(this$lockedBy == null ? other$lockedBy != null : !this$lockedBy.equals(other$lockedBy));
    }

    protected boolean canEqual(Object other) {
        return other instanceof LockedSitesReq;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        List $siteIdList = this.getSiteIdList();
        result = result * 59 + ($siteIdList == null ? 43 : ((Object)$siteIdList).hashCode());
        String $lockedBy = this.getLockedBy();
        result = result * 59 + ($lockedBy == null ? 43 : $lockedBy.hashCode());
        return result;
    }

    public String toString() {
        return "LockedSitesReq(siteIdList=" + this.getSiteIdList() + ", lockedBy=" + this.getLockedBy() + ")";
    }
}

