/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.vo.general.VehicleVo
 *  com.seer.rds.vo.general.VehicleVo$VehicleVoBuilder
 */
package com.seer.rds.vo.general;

import com.seer.rds.vo.general.VehicleVo;

public class VehicleVo {
    private String name;
    private String group;
    private String tag;
    private String keyRoute;

    public static VehicleVoBuilder builder() {
        return new VehicleVoBuilder();
    }

    public String getName() {
        return this.name;
    }

    public String getGroup() {
        return this.group;
    }

    public String getTag() {
        return this.tag;
    }

    public String getKeyRoute() {
        return this.keyRoute;
    }

    public void setName(String name) {
        this.name = name;
    }

    public void setGroup(String group) {
        this.group = group;
    }

    public void setTag(String tag) {
        this.tag = tag;
    }

    public void setKeyRoute(String keyRoute) {
        this.keyRoute = keyRoute;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof VehicleVo)) {
            return false;
        }
        VehicleVo other = (VehicleVo)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        String this$name = this.getName();
        String other$name = other.getName();
        if (this$name == null ? other$name != null : !this$name.equals(other$name)) {
            return false;
        }
        String this$group = this.getGroup();
        String other$group = other.getGroup();
        if (this$group == null ? other$group != null : !this$group.equals(other$group)) {
            return false;
        }
        String this$tag = this.getTag();
        String other$tag = other.getTag();
        if (this$tag == null ? other$tag != null : !this$tag.equals(other$tag)) {
            return false;
        }
        String this$keyRoute = this.getKeyRoute();
        String other$keyRoute = other.getKeyRoute();
        return !(this$keyRoute == null ? other$keyRoute != null : !this$keyRoute.equals(other$keyRoute));
    }

    protected boolean canEqual(Object other) {
        return other instanceof VehicleVo;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        String $name = this.getName();
        result = result * 59 + ($name == null ? 43 : $name.hashCode());
        String $group = this.getGroup();
        result = result * 59 + ($group == null ? 43 : $group.hashCode());
        String $tag = this.getTag();
        result = result * 59 + ($tag == null ? 43 : $tag.hashCode());
        String $keyRoute = this.getKeyRoute();
        result = result * 59 + ($keyRoute == null ? 43 : $keyRoute.hashCode());
        return result;
    }

    public String toString() {
        return "VehicleVo(name=" + this.getName() + ", group=" + this.getGroup() + ", tag=" + this.getTag() + ", keyRoute=" + this.getKeyRoute() + ")";
    }

    public VehicleVo() {
    }

    public VehicleVo(String name, String group, String tag, String keyRoute) {
        this.name = name;
        this.group = group;
        this.tag = tag;
        this.keyRoute = keyRoute;
    }
}

