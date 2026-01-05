/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.vo.req.PagerEnableOrDisableVo
 */
package com.seer.rds.vo.req;

import java.util.List;

public class PagerEnableOrDisableVo {
    private List<Long> pagerIds;

    public List<Long> getPagerIds() {
        return this.pagerIds;
    }

    public void setPagerIds(List<Long> pagerIds) {
        this.pagerIds = pagerIds;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof PagerEnableOrDisableVo)) {
            return false;
        }
        PagerEnableOrDisableVo other = (PagerEnableOrDisableVo)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        List this$pagerIds = this.getPagerIds();
        List other$pagerIds = other.getPagerIds();
        return !(this$pagerIds == null ? other$pagerIds != null : !((Object)this$pagerIds).equals(other$pagerIds));
    }

    protected boolean canEqual(Object other) {
        return other instanceof PagerEnableOrDisableVo;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        List $pagerIds = this.getPagerIds();
        result = result * 59 + ($pagerIds == null ? 43 : ((Object)$pagerIds).hashCode());
        return result;
    }

    public String toString() {
        return "PagerEnableOrDisableVo(pagerIds=" + this.getPagerIds() + ")";
    }
}

