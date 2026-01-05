/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.config.configview.UpLink
 */
package com.seer.rds.config.configview;

public class UpLink {
    private String url = "";

    public String getUrl() {
        return this.url;
    }

    public void setUrl(String url) {
        this.url = url;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof UpLink)) {
            return false;
        }
        UpLink other = (UpLink)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        String this$url = this.getUrl();
        String other$url = other.getUrl();
        return !(this$url == null ? other$url != null : !this$url.equals(other$url));
    }

    protected boolean canEqual(Object other) {
        return other instanceof UpLink;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        String $url = this.getUrl();
        result = result * 59 + ($url == null ? 43 : $url.hashCode());
        return result;
    }

    public String toString() {
        return "UpLink(url=" + this.getUrl() + ")";
    }
}

