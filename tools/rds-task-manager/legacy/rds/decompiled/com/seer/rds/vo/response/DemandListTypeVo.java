/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.vo.response.DemandListTypeVo
 *  com.seer.rds.vo.response.DemandTypeVo
 */
package com.seer.rds.vo.response;

import com.seer.rds.vo.response.DemandTypeVo;
import java.util.List;

public class DemandListTypeVo {
    private List<DemandTypeVo> demandTypeList;

    public List<DemandTypeVo> getDemandTypeList() {
        return this.demandTypeList;
    }

    public void setDemandTypeList(List<DemandTypeVo> demandTypeList) {
        this.demandTypeList = demandTypeList;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof DemandListTypeVo)) {
            return false;
        }
        DemandListTypeVo other = (DemandListTypeVo)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        List this$demandTypeList = this.getDemandTypeList();
        List other$demandTypeList = other.getDemandTypeList();
        return !(this$demandTypeList == null ? other$demandTypeList != null : !((Object)this$demandTypeList).equals(other$demandTypeList));
    }

    protected boolean canEqual(Object other) {
        return other instanceof DemandListTypeVo;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        List $demandTypeList = this.getDemandTypeList();
        result = result * 59 + ($demandTypeList == null ? 43 : ((Object)$demandTypeList).hashCode());
        return result;
    }

    public String toString() {
        return "DemandListTypeVo(demandTypeList=" + this.getDemandTypeList() + ")";
    }
}

