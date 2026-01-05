/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.vo.MapRssiPosVo
 *  com.seer.rds.vo.response.MapRssiPosAllVo
 *  com.seer.rds.vo.response.MapRssiPosAllVo$MapRssiPosAllVoBuilder
 */
package com.seer.rds.vo.response;

import com.seer.rds.vo.MapRssiPosVo;
import com.seer.rds.vo.response.MapRssiPosAllVo;

public class MapRssiPosAllVo {
    String mapName;
    MapRssiPosVo mapRssiPosDetail;

    public static MapRssiPosAllVoBuilder builder() {
        return new MapRssiPosAllVoBuilder();
    }

    public String getMapName() {
        return this.mapName;
    }

    public MapRssiPosVo getMapRssiPosDetail() {
        return this.mapRssiPosDetail;
    }

    public void setMapName(String mapName) {
        this.mapName = mapName;
    }

    public void setMapRssiPosDetail(MapRssiPosVo mapRssiPosDetail) {
        this.mapRssiPosDetail = mapRssiPosDetail;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof MapRssiPosAllVo)) {
            return false;
        }
        MapRssiPosAllVo other = (MapRssiPosAllVo)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        String this$mapName = this.getMapName();
        String other$mapName = other.getMapName();
        if (this$mapName == null ? other$mapName != null : !this$mapName.equals(other$mapName)) {
            return false;
        }
        MapRssiPosVo this$mapRssiPosDetail = this.getMapRssiPosDetail();
        MapRssiPosVo other$mapRssiPosDetail = other.getMapRssiPosDetail();
        return !(this$mapRssiPosDetail == null ? other$mapRssiPosDetail != null : !this$mapRssiPosDetail.equals(other$mapRssiPosDetail));
    }

    protected boolean canEqual(Object other) {
        return other instanceof MapRssiPosAllVo;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        String $mapName = this.getMapName();
        result = result * 59 + ($mapName == null ? 43 : $mapName.hashCode());
        MapRssiPosVo $mapRssiPosDetail = this.getMapRssiPosDetail();
        result = result * 59 + ($mapRssiPosDetail == null ? 43 : $mapRssiPosDetail.hashCode());
        return result;
    }

    public String toString() {
        return "MapRssiPosAllVo(mapName=" + this.getMapName() + ", mapRssiPosDetail=" + this.getMapRssiPosDetail() + ")";
    }

    public MapRssiPosAllVo() {
    }

    public MapRssiPosAllVo(String mapName, MapRssiPosVo mapRssiPosDetail) {
        this.mapName = mapName;
        this.mapRssiPosDetail = mapRssiPosDetail;
    }
}

