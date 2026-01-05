/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.vo.block.SetSiteUnlockedBpInput
 */
package com.seer.rds.vo.block;

public class SetSiteUnlockedBpInput {
    private String siteId;

    public String getSiteId() {
        return this.siteId;
    }

    public void setSiteId(String siteId) {
        this.siteId = siteId;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof SetSiteUnlockedBpInput)) {
            return false;
        }
        SetSiteUnlockedBpInput other = (SetSiteUnlockedBpInput)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        String this$siteId = this.getSiteId();
        String other$siteId = other.getSiteId();
        return !(this$siteId == null ? other$siteId != null : !this$siteId.equals(other$siteId));
    }

    protected boolean canEqual(Object other) {
        return other instanceof SetSiteUnlockedBpInput;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        String $siteId = this.getSiteId();
        result = result * 59 + ($siteId == null ? 43 : $siteId.hashCode());
        return result;
    }

    public String toString() {
        return "SetSiteUnlockedBpInput(siteId=" + this.getSiteId() + ")";
    }
}

