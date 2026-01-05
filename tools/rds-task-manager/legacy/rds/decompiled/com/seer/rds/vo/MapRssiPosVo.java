/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.vo.MapRssiPosVo
 *  com.seer.rds.vo.MapRssiPosVo$MapRssiPosVoBuilder
 *  com.seer.rds.vo.XyVo
 */
package com.seer.rds.vo;

import com.seer.rds.vo.MapRssiPosVo;
import com.seer.rds.vo.XyVo;
import java.util.List;

public class MapRssiPosVo {
    private List<XyVo> normalPosList;
    private List<XyVo> rssiPosList;

    public static MapRssiPosVoBuilder builder() {
        return new MapRssiPosVoBuilder();
    }

    public List<XyVo> getNormalPosList() {
        return this.normalPosList;
    }

    public List<XyVo> getRssiPosList() {
        return this.rssiPosList;
    }

    public void setNormalPosList(List<XyVo> normalPosList) {
        this.normalPosList = normalPosList;
    }

    public void setRssiPosList(List<XyVo> rssiPosList) {
        this.rssiPosList = rssiPosList;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof MapRssiPosVo)) {
            return false;
        }
        MapRssiPosVo other = (MapRssiPosVo)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        List this$normalPosList = this.getNormalPosList();
        List other$normalPosList = other.getNormalPosList();
        if (this$normalPosList == null ? other$normalPosList != null : !((Object)this$normalPosList).equals(other$normalPosList)) {
            return false;
        }
        List this$rssiPosList = this.getRssiPosList();
        List other$rssiPosList = other.getRssiPosList();
        return !(this$rssiPosList == null ? other$rssiPosList != null : !((Object)this$rssiPosList).equals(other$rssiPosList));
    }

    protected boolean canEqual(Object other) {
        return other instanceof MapRssiPosVo;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        List $normalPosList = this.getNormalPosList();
        result = result * 59 + ($normalPosList == null ? 43 : ((Object)$normalPosList).hashCode());
        List $rssiPosList = this.getRssiPosList();
        result = result * 59 + ($rssiPosList == null ? 43 : ((Object)$rssiPosList).hashCode());
        return result;
    }

    public String toString() {
        return "MapRssiPosVo(normalPosList=" + this.getNormalPosList() + ", rssiPosList=" + this.getRssiPosList() + ")";
    }

    public MapRssiPosVo() {
    }

    public MapRssiPosVo(List<XyVo> normalPosList, List<XyVo> rssiPosList) {
        this.normalPosList = normalPosList;
        this.rssiPosList = rssiPosList;
    }
}

