/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.vo.req.WorkSiteHolderReq
 */
package com.seer.rds.vo.req;

public class WorkSiteHolderReq {
    private String SiteId;

    public String getSiteId() {
        return this.SiteId;
    }

    public void setSiteId(String SiteId) {
        this.SiteId = SiteId;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof WorkSiteHolderReq)) {
            return false;
        }
        WorkSiteHolderReq other = (WorkSiteHolderReq)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        String this$SiteId = this.getSiteId();
        String other$SiteId = other.getSiteId();
        return !(this$SiteId == null ? other$SiteId != null : !this$SiteId.equals(other$SiteId));
    }

    protected boolean canEqual(Object other) {
        return other instanceof WorkSiteHolderReq;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        String $SiteId = this.getSiteId();
        result = result * 59 + ($SiteId == null ? 43 : $SiteId.hashCode());
        return result;
    }

    public String toString() {
        return "WorkSiteHolderReq(SiteId=" + this.getSiteId() + ")";
    }
}

