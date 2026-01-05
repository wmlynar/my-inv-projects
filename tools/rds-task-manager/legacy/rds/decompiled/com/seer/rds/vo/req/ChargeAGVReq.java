/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.vo.req.ChargeAGVReq
 *  com.seer.rds.vo.req.Params
 */
package com.seer.rds.vo.req;

import com.seer.rds.vo.req.Params;
import java.util.List;

public class ChargeAGVReq {
    private List<String> vehicles;
    private Params params;

    public List<String> getVehicles() {
        return this.vehicles;
    }

    public Params getParams() {
        return this.params;
    }

    public void setVehicles(List<String> vehicles) {
        this.vehicles = vehicles;
    }

    public void setParams(Params params) {
        this.params = params;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof ChargeAGVReq)) {
            return false;
        }
        ChargeAGVReq other = (ChargeAGVReq)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        List this$vehicles = this.getVehicles();
        List other$vehicles = other.getVehicles();
        if (this$vehicles == null ? other$vehicles != null : !((Object)this$vehicles).equals(other$vehicles)) {
            return false;
        }
        Params this$params = this.getParams();
        Params other$params = other.getParams();
        return !(this$params == null ? other$params != null : !this$params.equals(other$params));
    }

    protected boolean canEqual(Object other) {
        return other instanceof ChargeAGVReq;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        List $vehicles = this.getVehicles();
        result = result * 59 + ($vehicles == null ? 43 : ((Object)$vehicles).hashCode());
        Params $params = this.getParams();
        result = result * 59 + ($params == null ? 43 : $params.hashCode());
        return result;
    }

    public String toString() {
        return "ChargeAGVReq(vehicles=" + this.getVehicles() + ", params=" + this.getParams() + ")";
    }
}

