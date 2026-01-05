/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.vo.response.DemandListVo
 *  com.seer.rds.vo.response.DemandVo
 */
package com.seer.rds.vo.response;

import com.seer.rds.vo.response.DemandVo;
import java.util.List;

public class DemandListVo {
    private List<DemandVo> demandList;

    public List<DemandVo> getDemandList() {
        return this.demandList;
    }

    public void setDemandList(List<DemandVo> demandList) {
        this.demandList = demandList;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof DemandListVo)) {
            return false;
        }
        DemandListVo other = (DemandListVo)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        List this$demandList = this.getDemandList();
        List other$demandList = other.getDemandList();
        return !(this$demandList == null ? other$demandList != null : !((Object)this$demandList).equals(other$demandList));
    }

    protected boolean canEqual(Object other) {
        return other instanceof DemandListVo;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        List $demandList = this.getDemandList();
        result = result * 59 + ($demandList == null ? 43 : ((Object)$demandList).hashCode());
        return result;
    }

    public String toString() {
        return "DemandListVo(demandList=" + this.getDemandList() + ")";
    }
}

