/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.vo.req.ControlMotionReq
 */
package com.seer.rds.vo.req;

public class ControlMotionReq {
    private String vehicle;
    private Double vx;
    private Double vy;
    private Double w;
    private Double real_steer;
    private Double steer;
    private Integer duration;

    public String getVehicle() {
        return this.vehicle;
    }

    public Double getVx() {
        return this.vx;
    }

    public Double getVy() {
        return this.vy;
    }

    public Double getW() {
        return this.w;
    }

    public Double getReal_steer() {
        return this.real_steer;
    }

    public Double getSteer() {
        return this.steer;
    }

    public Integer getDuration() {
        return this.duration;
    }

    public void setVehicle(String vehicle) {
        this.vehicle = vehicle;
    }

    public void setVx(Double vx) {
        this.vx = vx;
    }

    public void setVy(Double vy) {
        this.vy = vy;
    }

    public void setW(Double w) {
        this.w = w;
    }

    public void setReal_steer(Double real_steer) {
        this.real_steer = real_steer;
    }

    public void setSteer(Double steer) {
        this.steer = steer;
    }

    public void setDuration(Integer duration) {
        this.duration = duration;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof ControlMotionReq)) {
            return false;
        }
        ControlMotionReq other = (ControlMotionReq)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        Double this$vx = this.getVx();
        Double other$vx = other.getVx();
        if (this$vx == null ? other$vx != null : !((Object)this$vx).equals(other$vx)) {
            return false;
        }
        Double this$vy = this.getVy();
        Double other$vy = other.getVy();
        if (this$vy == null ? other$vy != null : !((Object)this$vy).equals(other$vy)) {
            return false;
        }
        Double this$w = this.getW();
        Double other$w = other.getW();
        if (this$w == null ? other$w != null : !((Object)this$w).equals(other$w)) {
            return false;
        }
        Double this$real_steer = this.getReal_steer();
        Double other$real_steer = other.getReal_steer();
        if (this$real_steer == null ? other$real_steer != null : !((Object)this$real_steer).equals(other$real_steer)) {
            return false;
        }
        Double this$steer = this.getSteer();
        Double other$steer = other.getSteer();
        if (this$steer == null ? other$steer != null : !((Object)this$steer).equals(other$steer)) {
            return false;
        }
        Integer this$duration = this.getDuration();
        Integer other$duration = other.getDuration();
        if (this$duration == null ? other$duration != null : !((Object)this$duration).equals(other$duration)) {
            return false;
        }
        String this$vehicle = this.getVehicle();
        String other$vehicle = other.getVehicle();
        return !(this$vehicle == null ? other$vehicle != null : !this$vehicle.equals(other$vehicle));
    }

    protected boolean canEqual(Object other) {
        return other instanceof ControlMotionReq;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        Double $vx = this.getVx();
        result = result * 59 + ($vx == null ? 43 : ((Object)$vx).hashCode());
        Double $vy = this.getVy();
        result = result * 59 + ($vy == null ? 43 : ((Object)$vy).hashCode());
        Double $w = this.getW();
        result = result * 59 + ($w == null ? 43 : ((Object)$w).hashCode());
        Double $real_steer = this.getReal_steer();
        result = result * 59 + ($real_steer == null ? 43 : ((Object)$real_steer).hashCode());
        Double $steer = this.getSteer();
        result = result * 59 + ($steer == null ? 43 : ((Object)$steer).hashCode());
        Integer $duration = this.getDuration();
        result = result * 59 + ($duration == null ? 43 : ((Object)$duration).hashCode());
        String $vehicle = this.getVehicle();
        result = result * 59 + ($vehicle == null ? 43 : $vehicle.hashCode());
        return result;
    }

    public String toString() {
        return "ControlMotionReq(vehicle=" + this.getVehicle() + ", vx=" + this.getVx() + ", vy=" + this.getVy() + ", w=" + this.getW() + ", real_steer=" + this.getReal_steer() + ", steer=" + this.getSteer() + ", duration=" + this.getDuration() + ")";
    }
}

