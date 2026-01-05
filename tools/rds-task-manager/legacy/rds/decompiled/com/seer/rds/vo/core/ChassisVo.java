/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.vo.core.ChassisVo
 *  com.seer.rds.vo.core.GoodsRegion
 */
package com.seer.rds.vo.core;

import com.seer.rds.vo.core.GoodsRegion;
import java.math.BigDecimal;

public class ChassisVo {
    private BigDecimal head;
    private BigDecimal radius;
    private Integer shape;
    private BigDecimal tail;
    private BigDecimal width;
    private GoodsRegion goods_region;

    public BigDecimal getHead() {
        return this.head;
    }

    public BigDecimal getRadius() {
        return this.radius;
    }

    public Integer getShape() {
        return this.shape;
    }

    public BigDecimal getTail() {
        return this.tail;
    }

    public BigDecimal getWidth() {
        return this.width;
    }

    public GoodsRegion getGoods_region() {
        return this.goods_region;
    }

    public void setHead(BigDecimal head) {
        this.head = head;
    }

    public void setRadius(BigDecimal radius) {
        this.radius = radius;
    }

    public void setShape(Integer shape) {
        this.shape = shape;
    }

    public void setTail(BigDecimal tail) {
        this.tail = tail;
    }

    public void setWidth(BigDecimal width) {
        this.width = width;
    }

    public void setGoods_region(GoodsRegion goods_region) {
        this.goods_region = goods_region;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof ChassisVo)) {
            return false;
        }
        ChassisVo other = (ChassisVo)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        Integer this$shape = this.getShape();
        Integer other$shape = other.getShape();
        if (this$shape == null ? other$shape != null : !((Object)this$shape).equals(other$shape)) {
            return false;
        }
        BigDecimal this$head = this.getHead();
        BigDecimal other$head = other.getHead();
        if (this$head == null ? other$head != null : !((Object)this$head).equals(other$head)) {
            return false;
        }
        BigDecimal this$radius = this.getRadius();
        BigDecimal other$radius = other.getRadius();
        if (this$radius == null ? other$radius != null : !((Object)this$radius).equals(other$radius)) {
            return false;
        }
        BigDecimal this$tail = this.getTail();
        BigDecimal other$tail = other.getTail();
        if (this$tail == null ? other$tail != null : !((Object)this$tail).equals(other$tail)) {
            return false;
        }
        BigDecimal this$width = this.getWidth();
        BigDecimal other$width = other.getWidth();
        if (this$width == null ? other$width != null : !((Object)this$width).equals(other$width)) {
            return false;
        }
        GoodsRegion this$goods_region = this.getGoods_region();
        GoodsRegion other$goods_region = other.getGoods_region();
        return !(this$goods_region == null ? other$goods_region != null : !this$goods_region.equals(other$goods_region));
    }

    protected boolean canEqual(Object other) {
        return other instanceof ChassisVo;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        Integer $shape = this.getShape();
        result = result * 59 + ($shape == null ? 43 : ((Object)$shape).hashCode());
        BigDecimal $head = this.getHead();
        result = result * 59 + ($head == null ? 43 : ((Object)$head).hashCode());
        BigDecimal $radius = this.getRadius();
        result = result * 59 + ($radius == null ? 43 : ((Object)$radius).hashCode());
        BigDecimal $tail = this.getTail();
        result = result * 59 + ($tail == null ? 43 : ((Object)$tail).hashCode());
        BigDecimal $width = this.getWidth();
        result = result * 59 + ($width == null ? 43 : ((Object)$width).hashCode());
        GoodsRegion $goods_region = this.getGoods_region();
        result = result * 59 + ($goods_region == null ? 43 : $goods_region.hashCode());
        return result;
    }

    public String toString() {
        return "ChassisVo(head=" + this.getHead() + ", radius=" + this.getRadius() + ", shape=" + this.getShape() + ", tail=" + this.getTail() + ", width=" + this.getWidth() + ", goods_region=" + this.getGoods_region() + ")";
    }

    public ChassisVo(BigDecimal head, BigDecimal radius, Integer shape, BigDecimal tail, BigDecimal width, GoodsRegion goods_region) {
        this.head = head;
        this.radius = radius;
        this.shape = shape;
        this.tail = tail;
        this.width = width;
        this.goods_region = goods_region;
    }

    public ChassisVo() {
    }
}

