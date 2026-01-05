/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.config.configview.ReplayConfig
 */
package com.seer.rds.config.configview;

public class ReplayConfig {
    private Boolean enable = true;

    public Boolean getEnable() {
        return this.enable;
    }

    public void setEnable(Boolean enable) {
        this.enable = enable;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof ReplayConfig)) {
            return false;
        }
        ReplayConfig other = (ReplayConfig)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        Boolean this$enable = this.getEnable();
        Boolean other$enable = other.getEnable();
        return !(this$enable == null ? other$enable != null : !((Object)this$enable).equals(other$enable));
    }

    protected boolean canEqual(Object other) {
        return other instanceof ReplayConfig;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        Boolean $enable = this.getEnable();
        result = result * 59 + ($enable == null ? 43 : ((Object)$enable).hashCode());
        return result;
    }

    public String toString() {
        return "ReplayConfig(enable=" + this.getEnable() + ")";
    }
}

