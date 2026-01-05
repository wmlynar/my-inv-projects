/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.config.configview.RestartRecoverConfigOfView
 */
package com.seer.rds.config.configview;

public class RestartRecoverConfigOfView {
    private Boolean restartRecover = false;
    private int keepDays = -1;

    public Boolean getRestartRecover() {
        return this.restartRecover;
    }

    public int getKeepDays() {
        return this.keepDays;
    }

    public void setRestartRecover(Boolean restartRecover) {
        this.restartRecover = restartRecover;
    }

    public void setKeepDays(int keepDays) {
        this.keepDays = keepDays;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof RestartRecoverConfigOfView)) {
            return false;
        }
        RestartRecoverConfigOfView other = (RestartRecoverConfigOfView)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        if (this.getKeepDays() != other.getKeepDays()) {
            return false;
        }
        Boolean this$restartRecover = this.getRestartRecover();
        Boolean other$restartRecover = other.getRestartRecover();
        return !(this$restartRecover == null ? other$restartRecover != null : !((Object)this$restartRecover).equals(other$restartRecover));
    }

    protected boolean canEqual(Object other) {
        return other instanceof RestartRecoverConfigOfView;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        result = result * 59 + this.getKeepDays();
        Boolean $restartRecover = this.getRestartRecover();
        result = result * 59 + ($restartRecover == null ? 43 : ((Object)$restartRecover).hashCode());
        return result;
    }

    public String toString() {
        return "RestartRecoverConfigOfView(restartRecover=" + this.getRestartRecover() + ", keepDays=" + this.getKeepDays() + ")";
    }
}

