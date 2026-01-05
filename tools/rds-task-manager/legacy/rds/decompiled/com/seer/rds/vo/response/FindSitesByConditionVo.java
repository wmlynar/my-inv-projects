/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.model.worksite.WorkSite
 *  com.seer.rds.vo.response.FindSitesByConditionVo
 */
package com.seer.rds.vo.response;

import com.seer.rds.model.worksite.WorkSite;
import java.util.List;

public class FindSitesByConditionVo {
    List<WorkSite> siteList;

    public List<WorkSite> getSiteList() {
        return this.siteList;
    }

    public void setSiteList(List<WorkSite> siteList) {
        this.siteList = siteList;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof FindSitesByConditionVo)) {
            return false;
        }
        FindSitesByConditionVo other = (FindSitesByConditionVo)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        List this$siteList = this.getSiteList();
        List other$siteList = other.getSiteList();
        return !(this$siteList == null ? other$siteList != null : !((Object)this$siteList).equals(other$siteList));
    }

    protected boolean canEqual(Object other) {
        return other instanceof FindSitesByConditionVo;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        List $siteList = this.getSiteList();
        result = result * 59 + ($siteList == null ? 43 : ((Object)$siteList).hashCode());
        return result;
    }

    public String toString() {
        return "FindSitesByConditionVo(siteList=" + this.getSiteList() + ")";
    }
}

