/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.vo.req.FindSitesConditionReq
 */
package com.seer.rds.vo.req;

import java.util.List;

public class FindSitesConditionReq {
    private List<String> groupNames;
    private List<String> siteIds;

    public List<String> getGroupNames() {
        return this.groupNames;
    }

    public List<String> getSiteIds() {
        return this.siteIds;
    }

    public void setGroupNames(List<String> groupNames) {
        this.groupNames = groupNames;
    }

    public void setSiteIds(List<String> siteIds) {
        this.siteIds = siteIds;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof FindSitesConditionReq)) {
            return false;
        }
        FindSitesConditionReq other = (FindSitesConditionReq)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        List this$groupNames = this.getGroupNames();
        List other$groupNames = other.getGroupNames();
        if (this$groupNames == null ? other$groupNames != null : !((Object)this$groupNames).equals(other$groupNames)) {
            return false;
        }
        List this$siteIds = this.getSiteIds();
        List other$siteIds = other.getSiteIds();
        return !(this$siteIds == null ? other$siteIds != null : !((Object)this$siteIds).equals(other$siteIds));
    }

    protected boolean canEqual(Object other) {
        return other instanceof FindSitesConditionReq;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        List $groupNames = this.getGroupNames();
        result = result * 59 + ($groupNames == null ? 43 : ((Object)$groupNames).hashCode());
        List $siteIds = this.getSiteIds();
        result = result * 59 + ($siteIds == null ? 43 : ((Object)$siteIds).hashCode());
        return result;
    }

    public String toString() {
        return "FindSitesConditionReq(groupNames=" + this.getGroupNames() + ", siteIds=" + this.getSiteIds() + ")";
    }
}

