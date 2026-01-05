/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.vo.core.GoodsRegion
 */
package com.seer.rds.vo.core;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

public class GoodsRegion {
    private String name;
    private List<Map<String, BigDecimal>> point;

    public String getName() {
        return this.name;
    }

    public List<Map<String, BigDecimal>> getPoint() {
        return this.point;
    }

    public void setName(String name) {
        this.name = name;
    }

    public void setPoint(List<Map<String, BigDecimal>> point) {
        this.point = point;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof GoodsRegion)) {
            return false;
        }
        GoodsRegion other = (GoodsRegion)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        String this$name = this.getName();
        String other$name = other.getName();
        if (this$name == null ? other$name != null : !this$name.equals(other$name)) {
            return false;
        }
        List this$point = this.getPoint();
        List other$point = other.getPoint();
        return !(this$point == null ? other$point != null : !((Object)this$point).equals(other$point));
    }

    protected boolean canEqual(Object other) {
        return other instanceof GoodsRegion;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        String $name = this.getName();
        result = result * 59 + ($name == null ? 43 : $name.hashCode());
        List $point = this.getPoint();
        result = result * 59 + ($point == null ? 43 : ((Object)$point).hashCode());
        return result;
    }

    public String toString() {
        return "GoodsRegion(name=" + this.getName() + ", point=" + this.getPoint() + ")";
    }

    public GoodsRegion(String name, List<Map<String, BigDecimal>> point) {
        this.name = name;
        this.point = point;
    }

    public GoodsRegion() {
    }
}

