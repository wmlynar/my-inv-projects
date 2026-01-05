/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.vo.XyVo
 *  com.seer.rds.vo.XyVo$XyVoBuilder
 */
package com.seer.rds.vo;

import com.seer.rds.vo.XyVo;

public class XyVo {
    private String x;
    private String y;

    public static XyVoBuilder builder() {
        return new XyVoBuilder();
    }

    public String getX() {
        return this.x;
    }

    public String getY() {
        return this.y;
    }

    public void setX(String x) {
        this.x = x;
    }

    public void setY(String y) {
        this.y = y;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof XyVo)) {
            return false;
        }
        XyVo other = (XyVo)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        String this$x = this.getX();
        String other$x = other.getX();
        if (this$x == null ? other$x != null : !this$x.equals(other$x)) {
            return false;
        }
        String this$y = this.getY();
        String other$y = other.getY();
        return !(this$y == null ? other$y != null : !this$y.equals(other$y));
    }

    protected boolean canEqual(Object other) {
        return other instanceof XyVo;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        String $x = this.getX();
        result = result * 59 + ($x == null ? 43 : $x.hashCode());
        String $y = this.getY();
        result = result * 59 + ($y == null ? 43 : $y.hashCode());
        return result;
    }

    public String toString() {
        return "XyVo(x=" + this.getX() + ", y=" + this.getY() + ")";
    }

    public XyVo() {
    }

    public XyVo(String x, String y) {
        this.x = x;
        this.y = y;
    }
}

