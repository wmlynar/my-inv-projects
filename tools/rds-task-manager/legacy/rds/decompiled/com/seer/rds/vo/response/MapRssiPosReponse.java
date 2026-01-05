/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.vo.response.MapRssiPosAllVo
 *  com.seer.rds.vo.response.MapRssiPosReponse
 *  com.seer.rds.vo.response.MapRssiPosReponse$MapRssiPosReponseBuilder
 */
package com.seer.rds.vo.response;

import com.seer.rds.vo.response.MapRssiPosAllVo;
import com.seer.rds.vo.response.MapRssiPosReponse;
import java.util.List;

public class MapRssiPosReponse {
    private List<MapRssiPosAllVo> RssiInfos;

    public static MapRssiPosReponseBuilder builder() {
        return new MapRssiPosReponseBuilder();
    }

    public List<MapRssiPosAllVo> getRssiInfos() {
        return this.RssiInfos;
    }

    public void setRssiInfos(List<MapRssiPosAllVo> RssiInfos) {
        this.RssiInfos = RssiInfos;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof MapRssiPosReponse)) {
            return false;
        }
        MapRssiPosReponse other = (MapRssiPosReponse)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        List this$RssiInfos = this.getRssiInfos();
        List other$RssiInfos = other.getRssiInfos();
        return !(this$RssiInfos == null ? other$RssiInfos != null : !((Object)this$RssiInfos).equals(other$RssiInfos));
    }

    protected boolean canEqual(Object other) {
        return other instanceof MapRssiPosReponse;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        List $RssiInfos = this.getRssiInfos();
        result = result * 59 + ($RssiInfos == null ? 43 : ((Object)$RssiInfos).hashCode());
        return result;
    }

    public String toString() {
        return "MapRssiPosReponse(RssiInfos=" + this.getRssiInfos() + ")";
    }

    public MapRssiPosReponse() {
    }

    public MapRssiPosReponse(List<MapRssiPosAllVo> RssiInfos) {
        this.RssiInfos = RssiInfos;
    }
}

