/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.vo.req.SetForkHeightReq
 */
package com.seer.rds.vo.req;

public class SetForkHeightReq {
    private String vehicle;
    private Double height;

    public String getVehicle() {
        return this.vehicle;
    }

    public Double getHeight() {
        return this.height;
    }

    public void setVehicle(String vehicle) {
        this.vehicle = vehicle;
    }

    public void setHeight(Double height) {
        this.height = height;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof SetForkHeightReq)) {
            return false;
        }
        SetForkHeightReq other = (SetForkHeightReq)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        Double this$height = this.getHeight();
        Double other$height = other.getHeight();
        if (this$height == null ? other$height != null : !((Object)this$height).equals(other$height)) {
            return false;
        }
        String this$vehicle = this.getVehicle();
        String other$vehicle = other.getVehicle();
        return !(this$vehicle == null ? other$vehicle != null : !this$vehicle.equals(other$vehicle));
    }

    protected boolean canEqual(Object other) {
        return other instanceof SetForkHeightReq;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        Double $height = this.getHeight();
        result = result * 59 + ($height == null ? 43 : ((Object)$height).hashCode());
        String $vehicle = this.getVehicle();
        result = result * 59 + ($vehicle == null ? 43 : $vehicle.hashCode());
        return result;
    }

    public String toString() {
        return "SetForkHeightReq(vehicle=" + this.getVehicle() + ", height=" + this.getHeight() + ")";
    }
}

