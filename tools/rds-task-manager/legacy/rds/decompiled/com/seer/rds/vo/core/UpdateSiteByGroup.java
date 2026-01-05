/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.vo.core.SiteVo
 *  com.seer.rds.vo.core.UpdateSiteByGroup
 */
package com.seer.rds.vo.core;

import com.seer.rds.vo.core.SiteVo;
import java.util.List;

public class UpdateSiteByGroup {
    private String group;
    private List<SiteVo> bin;

    public String getGroup() {
        return this.group;
    }

    public List<SiteVo> getBin() {
        return this.bin;
    }

    public void setGroup(String group) {
        this.group = group;
    }

    public void setBin(List<SiteVo> bin) {
        this.bin = bin;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof UpdateSiteByGroup)) {
            return false;
        }
        UpdateSiteByGroup other = (UpdateSiteByGroup)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        String this$group = this.getGroup();
        String other$group = other.getGroup();
        if (this$group == null ? other$group != null : !this$group.equals(other$group)) {
            return false;
        }
        List this$bin = this.getBin();
        List other$bin = other.getBin();
        return !(this$bin == null ? other$bin != null : !((Object)this$bin).equals(other$bin));
    }

    protected boolean canEqual(Object other) {
        return other instanceof UpdateSiteByGroup;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        String $group = this.getGroup();
        result = result * 59 + ($group == null ? 43 : $group.hashCode());
        List $bin = this.getBin();
        result = result * 59 + ($bin == null ? 43 : ((Object)$bin).hashCode());
        return result;
    }

    public String toString() {
        return "UpdateSiteByGroup(group=" + this.getGroup() + ", bin=" + this.getBin() + ")";
    }
}

