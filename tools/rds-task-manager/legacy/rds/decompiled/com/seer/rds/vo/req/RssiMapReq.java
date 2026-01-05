/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.vo.req.RssiMapReq
 *  com.seer.rds.vo.req.RssiMapReq$RssiMapReqBuilder
 */
package com.seer.rds.vo.req;

import com.seer.rds.vo.req.RssiMapReq;
import java.util.List;

public class RssiMapReq {
    private List<String> mapNames;

    public static RssiMapReqBuilder builder() {
        return new RssiMapReqBuilder();
    }

    public List<String> getMapNames() {
        return this.mapNames;
    }

    public void setMapNames(List<String> mapNames) {
        this.mapNames = mapNames;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof RssiMapReq)) {
            return false;
        }
        RssiMapReq other = (RssiMapReq)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        List this$mapNames = this.getMapNames();
        List other$mapNames = other.getMapNames();
        return !(this$mapNames == null ? other$mapNames != null : !((Object)this$mapNames).equals(other$mapNames));
    }

    protected boolean canEqual(Object other) {
        return other instanceof RssiMapReq;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        List $mapNames = this.getMapNames();
        result = result * 59 + ($mapNames == null ? 43 : ((Object)$mapNames).hashCode());
        return result;
    }

    public String toString() {
        return "RssiMapReq(mapNames=" + this.getMapNames() + ")";
    }

    public RssiMapReq() {
    }

    public RssiMapReq(List<String> mapNames) {
        this.mapNames = mapNames;
    }
}

