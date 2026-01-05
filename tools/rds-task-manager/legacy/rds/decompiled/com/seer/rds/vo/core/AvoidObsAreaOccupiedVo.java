/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.vo.core.AvoidObsAreaOccupiedVo
 *  io.swagger.annotations.ApiModel
 */
package com.seer.rds.vo.core;

import io.swagger.annotations.ApiModel;

@ApiModel(value="\u6bcf\u4e2a\u533a\u57df\u5185\u673a\u5668\u4eba\u5360\u7528\u8d44\u6e90")
public class AvoidObsAreaOccupiedVo {
    private Integer radius;
    private Integer x;
    private Integer y;

    public Integer getRadius() {
        return this.radius;
    }

    public Integer getX() {
        return this.x;
    }

    public Integer getY() {
        return this.y;
    }

    public void setRadius(Integer radius) {
        this.radius = radius;
    }

    public void setX(Integer x) {
        this.x = x;
    }

    public void setY(Integer y) {
        this.y = y;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof AvoidObsAreaOccupiedVo)) {
            return false;
        }
        AvoidObsAreaOccupiedVo other = (AvoidObsAreaOccupiedVo)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        Integer this$radius = this.getRadius();
        Integer other$radius = other.getRadius();
        if (this$radius == null ? other$radius != null : !((Object)this$radius).equals(other$radius)) {
            return false;
        }
        Integer this$x = this.getX();
        Integer other$x = other.getX();
        if (this$x == null ? other$x != null : !((Object)this$x).equals(other$x)) {
            return false;
        }
        Integer this$y = this.getY();
        Integer other$y = other.getY();
        return !(this$y == null ? other$y != null : !((Object)this$y).equals(other$y));
    }

    protected boolean canEqual(Object other) {
        return other instanceof AvoidObsAreaOccupiedVo;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        Integer $radius = this.getRadius();
        result = result * 59 + ($radius == null ? 43 : ((Object)$radius).hashCode());
        Integer $x = this.getX();
        result = result * 59 + ($x == null ? 43 : ((Object)$x).hashCode());
        Integer $y = this.getY();
        result = result * 59 + ($y == null ? 43 : ((Object)$y).hashCode());
        return result;
    }

    public String toString() {
        return "AvoidObsAreaOccupiedVo(radius=" + this.getRadius() + ", x=" + this.getX() + ", y=" + this.getY() + ")";
    }

    public AvoidObsAreaOccupiedVo(Integer radius, Integer x, Integer y) {
        this.radius = radius;
        this.x = x;
        this.y = y;
    }

    public AvoidObsAreaOccupiedVo() {
    }
}

