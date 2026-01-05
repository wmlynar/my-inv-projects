/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.config.DutyConfig
 */
package com.seer.rds.config;

public class DutyConfig {
    private Boolean ifOpenDuty = false;
    private String url = "";

    public Boolean getIfOpenDuty() {
        return this.ifOpenDuty;
    }

    public String getUrl() {
        return this.url;
    }

    public void setIfOpenDuty(Boolean ifOpenDuty) {
        this.ifOpenDuty = ifOpenDuty;
    }

    public void setUrl(String url) {
        this.url = url;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof DutyConfig)) {
            return false;
        }
        DutyConfig other = (DutyConfig)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        Boolean this$ifOpenDuty = this.getIfOpenDuty();
        Boolean other$ifOpenDuty = other.getIfOpenDuty();
        if (this$ifOpenDuty == null ? other$ifOpenDuty != null : !((Object)this$ifOpenDuty).equals(other$ifOpenDuty)) {
            return false;
        }
        String this$url = this.getUrl();
        String other$url = other.getUrl();
        return !(this$url == null ? other$url != null : !this$url.equals(other$url));
    }

    protected boolean canEqual(Object other) {
        return other instanceof DutyConfig;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        Boolean $ifOpenDuty = this.getIfOpenDuty();
        result = result * 59 + ($ifOpenDuty == null ? 43 : ((Object)$ifOpenDuty).hashCode());
        String $url = this.getUrl();
        result = result * 59 + ($url == null ? 43 : $url.hashCode());
        return result;
    }

    public String toString() {
        return "DutyConfig(ifOpenDuty=" + this.getIfOpenDuty() + ", url=" + this.getUrl() + ")";
    }
}

