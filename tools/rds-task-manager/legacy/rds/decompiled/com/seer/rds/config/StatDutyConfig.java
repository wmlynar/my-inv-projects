/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.config.StatDutyConfig
 */
package com.seer.rds.config;

public class StatDutyConfig {
    private String onWorkTime;
    private String offWorkTime;

    public String getOnWorkTime() {
        return this.onWorkTime;
    }

    public String getOffWorkTime() {
        return this.offWorkTime;
    }

    public void setOnWorkTime(String onWorkTime) {
        this.onWorkTime = onWorkTime;
    }

    public void setOffWorkTime(String offWorkTime) {
        this.offWorkTime = offWorkTime;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof StatDutyConfig)) {
            return false;
        }
        StatDutyConfig other = (StatDutyConfig)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        String this$onWorkTime = this.getOnWorkTime();
        String other$onWorkTime = other.getOnWorkTime();
        if (this$onWorkTime == null ? other$onWorkTime != null : !this$onWorkTime.equals(other$onWorkTime)) {
            return false;
        }
        String this$offWorkTime = this.getOffWorkTime();
        String other$offWorkTime = other.getOffWorkTime();
        return !(this$offWorkTime == null ? other$offWorkTime != null : !this$offWorkTime.equals(other$offWorkTime));
    }

    protected boolean canEqual(Object other) {
        return other instanceof StatDutyConfig;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        String $onWorkTime = this.getOnWorkTime();
        result = result * 59 + ($onWorkTime == null ? 43 : $onWorkTime.hashCode());
        String $offWorkTime = this.getOffWorkTime();
        result = result * 59 + ($offWorkTime == null ? 43 : $offWorkTime.hashCode());
        return result;
    }

    public String toString() {
        return "StatDutyConfig(onWorkTime=" + this.getOnWorkTime() + ", offWorkTime=" + this.getOffWorkTime() + ")";
    }
}

