/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.vo.req.RelocStartBody
 */
package com.seer.rds.vo.req;

import java.io.Serializable;

public class RelocStartBody
implements Serializable {
    private static final long serialVersionUID = 1L;
    private Double x;
    private Double y;
    private Double angle;
    private Double length;

    public Double getX() {
        return this.x;
    }

    public Double getY() {
        return this.y;
    }

    public Double getAngle() {
        return this.angle;
    }

    public Double getLength() {
        return this.length;
    }

    public void setX(Double x) {
        this.x = x;
    }

    public void setY(Double y) {
        this.y = y;
    }

    public void setAngle(Double angle) {
        this.angle = angle;
    }

    public void setLength(Double length) {
        this.length = length;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof RelocStartBody)) {
            return false;
        }
        RelocStartBody other = (RelocStartBody)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        Double this$x = this.getX();
        Double other$x = other.getX();
        if (this$x == null ? other$x != null : !((Object)this$x).equals(other$x)) {
            return false;
        }
        Double this$y = this.getY();
        Double other$y = other.getY();
        if (this$y == null ? other$y != null : !((Object)this$y).equals(other$y)) {
            return false;
        }
        Double this$angle = this.getAngle();
        Double other$angle = other.getAngle();
        if (this$angle == null ? other$angle != null : !((Object)this$angle).equals(other$angle)) {
            return false;
        }
        Double this$length = this.getLength();
        Double other$length = other.getLength();
        return !(this$length == null ? other$length != null : !((Object)this$length).equals(other$length));
    }

    protected boolean canEqual(Object other) {
        return other instanceof RelocStartBody;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        Double $x = this.getX();
        result = result * 59 + ($x == null ? 43 : ((Object)$x).hashCode());
        Double $y = this.getY();
        result = result * 59 + ($y == null ? 43 : ((Object)$y).hashCode());
        Double $angle = this.getAngle();
        result = result * 59 + ($angle == null ? 43 : ((Object)$angle).hashCode());
        Double $length = this.getLength();
        result = result * 59 + ($length == null ? 43 : ((Object)$length).hashCode());
        return result;
    }

    public String toString() {
        return "RelocStartBody(x=" + this.getX() + ", y=" + this.getY() + ", angle=" + this.getAngle() + ", length=" + this.getLength() + ")";
    }
}

