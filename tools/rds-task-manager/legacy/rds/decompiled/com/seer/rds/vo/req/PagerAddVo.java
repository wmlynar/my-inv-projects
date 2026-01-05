/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.model.device.Pager
 *  com.seer.rds.model.device.PagerAddressRecord
 *  com.seer.rds.vo.req.PagerAddVo
 */
package com.seer.rds.vo.req;

import com.seer.rds.model.device.Pager;
import com.seer.rds.model.device.PagerAddressRecord;
import java.util.List;

public class PagerAddVo {
    private Pager pager;
    private List<PagerAddressRecord> pagerAddressRecords;
    private List<Long> delIds;

    public Pager getPager() {
        return this.pager;
    }

    public List<PagerAddressRecord> getPagerAddressRecords() {
        return this.pagerAddressRecords;
    }

    public List<Long> getDelIds() {
        return this.delIds;
    }

    public void setPager(Pager pager) {
        this.pager = pager;
    }

    public void setPagerAddressRecords(List<PagerAddressRecord> pagerAddressRecords) {
        this.pagerAddressRecords = pagerAddressRecords;
    }

    public void setDelIds(List<Long> delIds) {
        this.delIds = delIds;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof PagerAddVo)) {
            return false;
        }
        PagerAddVo other = (PagerAddVo)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        Pager this$pager = this.getPager();
        Pager other$pager = other.getPager();
        if (this$pager == null ? other$pager != null : !this$pager.equals(other$pager)) {
            return false;
        }
        List this$pagerAddressRecords = this.getPagerAddressRecords();
        List other$pagerAddressRecords = other.getPagerAddressRecords();
        if (this$pagerAddressRecords == null ? other$pagerAddressRecords != null : !((Object)this$pagerAddressRecords).equals(other$pagerAddressRecords)) {
            return false;
        }
        List this$delIds = this.getDelIds();
        List other$delIds = other.getDelIds();
        return !(this$delIds == null ? other$delIds != null : !((Object)this$delIds).equals(other$delIds));
    }

    protected boolean canEqual(Object other) {
        return other instanceof PagerAddVo;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        Pager $pager = this.getPager();
        result = result * 59 + ($pager == null ? 43 : $pager.hashCode());
        List $pagerAddressRecords = this.getPagerAddressRecords();
        result = result * 59 + ($pagerAddressRecords == null ? 43 : ((Object)$pagerAddressRecords).hashCode());
        List $delIds = this.getDelIds();
        result = result * 59 + ($delIds == null ? 43 : ((Object)$delIds).hashCode());
        return result;
    }

    public String toString() {
        return "PagerAddVo(pager=" + this.getPager() + ", pagerAddressRecords=" + this.getPagerAddressRecords() + ", delIds=" + this.getDelIds() + ")";
    }
}

