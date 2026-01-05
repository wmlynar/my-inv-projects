/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.vo.XyVo
 *  com.seer.rds.vo.req.AgvNormalAndRssiPositionListVo
 *  com.seer.rds.vo.req.AgvNormalAndRssiPositionListVo$AgvNormalAndRssiPositionListVoBuilder
 */
package com.seer.rds.vo.req;

import com.seer.rds.vo.XyVo;
import com.seer.rds.vo.req.AgvNormalAndRssiPositionListVo;
import java.util.List;

public class AgvNormalAndRssiPositionListVo {
    private String agv;
    private List<XyVo> normalPosList;
    private List<XyVo> rssiPosList;

    public static AgvNormalAndRssiPositionListVoBuilder builder() {
        return new AgvNormalAndRssiPositionListVoBuilder();
    }

    public String getAgv() {
        return this.agv;
    }

    public List<XyVo> getNormalPosList() {
        return this.normalPosList;
    }

    public List<XyVo> getRssiPosList() {
        return this.rssiPosList;
    }

    public void setAgv(String agv) {
        this.agv = agv;
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
        if (!(o instanceof AgvNormalAndRssiPositionListVo)) {
            return false;
        }
        AgvNormalAndRssiPositionListVo other = (AgvNormalAndRssiPositionListVo)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        String this$agv = this.getAgv();
        String other$agv = other.getAgv();
        if (this$agv == null ? other$agv != null : !this$agv.equals(other$agv)) {
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
        return other instanceof AgvNormalAndRssiPositionListVo;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        String $agv = this.getAgv();
        result = result * 59 + ($agv == null ? 43 : $agv.hashCode());
        List $normalPosList = this.getNormalPosList();
        result = result * 59 + ($normalPosList == null ? 43 : ((Object)$normalPosList).hashCode());
        List $rssiPosList = this.getRssiPosList();
        result = result * 59 + ($rssiPosList == null ? 43 : ((Object)$rssiPosList).hashCode());
        return result;
    }

    public String toString() {
        return "AgvNormalAndRssiPositionListVo(agv=" + this.getAgv() + ", normalPosList=" + this.getNormalPosList() + ", rssiPosList=" + this.getRssiPosList() + ")";
    }

    public AgvNormalAndRssiPositionListVo() {
    }

    public AgvNormalAndRssiPositionListVo(String agv, List<XyVo> normalPosList, List<XyVo> rssiPosList) {
        this.agv = agv;
        this.normalPosList = normalPosList;
        this.rssiPosList = rssiPosList;
    }
}

