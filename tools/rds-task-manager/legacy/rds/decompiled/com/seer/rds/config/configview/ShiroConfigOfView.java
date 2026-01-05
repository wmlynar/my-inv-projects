/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.config.configview.ShiroConfigOfView
 */
package com.seer.rds.config.configview;

public class ShiroConfigOfView {
    private Boolean ifEnableShiro = false;

    public Boolean getIfEnableShiro() {
        return this.ifEnableShiro;
    }

    public void setIfEnableShiro(Boolean ifEnableShiro) {
        this.ifEnableShiro = ifEnableShiro;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof ShiroConfigOfView)) {
            return false;
        }
        ShiroConfigOfView other = (ShiroConfigOfView)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        Boolean this$ifEnableShiro = this.getIfEnableShiro();
        Boolean other$ifEnableShiro = other.getIfEnableShiro();
        return !(this$ifEnableShiro == null ? other$ifEnableShiro != null : !((Object)this$ifEnableShiro).equals(other$ifEnableShiro));
    }

    protected boolean canEqual(Object other) {
        return other instanceof ShiroConfigOfView;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        Boolean $ifEnableShiro = this.getIfEnableShiro();
        result = result * 59 + ($ifEnableShiro == null ? 43 : ((Object)$ifEnableShiro).hashCode());
        return result;
    }

    public String toString() {
        return "ShiroConfigOfView(ifEnableShiro=" + this.getIfEnableShiro() + ")";
    }
}

