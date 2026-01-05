/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.config.configview.operator.Distributes
 *  com.seer.rds.config.configview.operator.Visibility
 */
package com.seer.rds.config.configview.operator;

import com.seer.rds.config.configview.operator.Visibility;
import java.util.ArrayList;
import java.util.List;

public class Distributes {
    private Boolean enable = false;
    private List<Visibility> visibility = new ArrayList();

    public Boolean getEnable() {
        return this.enable;
    }

    public List<Visibility> getVisibility() {
        return this.visibility;
    }

    public void setEnable(Boolean enable) {
        this.enable = enable;
    }

    public void setVisibility(List<Visibility> visibility) {
        this.visibility = visibility;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof Distributes)) {
            return false;
        }
        Distributes other = (Distributes)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        Boolean this$enable = this.getEnable();
        Boolean other$enable = other.getEnable();
        if (this$enable == null ? other$enable != null : !((Object)this$enable).equals(other$enable)) {
            return false;
        }
        List this$visibility = this.getVisibility();
        List other$visibility = other.getVisibility();
        return !(this$visibility == null ? other$visibility != null : !((Object)this$visibility).equals(other$visibility));
    }

    protected boolean canEqual(Object other) {
        return other instanceof Distributes;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        Boolean $enable = this.getEnable();
        result = result * 59 + ($enable == null ? 43 : ((Object)$enable).hashCode());
        List $visibility = this.getVisibility();
        result = result * 59 + ($visibility == null ? 43 : ((Object)$visibility).hashCode());
        return result;
    }

    public String toString() {
        return "Distributes(enable=" + this.getEnable() + ", visibility=" + this.getVisibility() + ")";
    }
}

