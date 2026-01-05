/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.vo.req.LoopSpeedBody
 */
package com.seer.rds.vo.req;

import java.io.Serializable;

public class LoopSpeedBody
implements Serializable {
    private static final long serialVersionUID = 1L;
    private Double vx;
    private Double vy;
    private Double w;
    private Double steer;
    private Double realSteer;

    public Double getVx() {
        return this.vx;
    }

    public Double getVy() {
        return this.vy;
    }

    public Double getW() {
        return this.w;
    }

    public Double getSteer() {
        return this.steer;
    }

    public Double getRealSteer() {
        return this.realSteer;
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

    public void setSteer(Double steer) {
        this.steer = steer;
    }

    public void setRealSteer(Double realSteer) {
        this.realSteer = realSteer;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof LoopSpeedBody)) {
            return false;
        }
        LoopSpeedBody other = (LoopSpeedBody)o;
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
        Double this$steer = this.getSteer();
        Double other$steer = other.getSteer();
        if (this$steer == null ? other$steer != null : !((Object)this$steer).equals(other$steer)) {
            return false;
        }
        Double this$realSteer = this.getRealSteer();
        Double other$realSteer = other.getRealSteer();
        return !(this$realSteer == null ? other$realSteer != null : !((Object)this$realSteer).equals(other$realSteer));
    }

    protected boolean canEqual(Object other) {
        return other instanceof LoopSpeedBody;
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
        Double $steer = this.getSteer();
        result = result * 59 + ($steer == null ? 43 : ((Object)$steer).hashCode());
        Double $realSteer = this.getRealSteer();
        result = result * 59 + ($realSteer == null ? 43 : ((Object)$realSteer).hashCode());
        return result;
    }

    public String toString() {
        return "LoopSpeedBody(vx=" + this.getVx() + ", vy=" + this.getVy() + ", w=" + this.getW() + ", steer=" + this.getSteer() + ", realSteer=" + this.getRealSteer() + ")";
    }
}

