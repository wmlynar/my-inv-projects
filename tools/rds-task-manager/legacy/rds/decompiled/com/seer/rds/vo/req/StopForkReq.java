/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.vo.req.StopForkReq
 */
package com.seer.rds.vo.req;

public class StopForkReq {
    private String vehicle;

    public String getVehicle() {
        return this.vehicle;
    }

    public void setVehicle(String vehicle) {
        this.vehicle = vehicle;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof StopForkReq)) {
            return false;
        }
        StopForkReq other = (StopForkReq)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        String this$vehicle = this.getVehicle();
        String other$vehicle = other.getVehicle();
        return !(this$vehicle == null ? other$vehicle != null : !this$vehicle.equals(other$vehicle));
    }

    protected boolean canEqual(Object other) {
        return other instanceof StopForkReq;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        String $vehicle = this.getVehicle();
        result = result * 59 + ($vehicle == null ? 43 : $vehicle.hashCode());
        return result;
    }

    public String toString() {
        return "StopForkReq(vehicle=" + this.getVehicle() + ")";
    }
}

