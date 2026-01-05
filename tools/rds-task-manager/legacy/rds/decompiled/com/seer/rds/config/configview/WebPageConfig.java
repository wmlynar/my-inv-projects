/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.config.configview.WebPageConfig
 */
package com.seer.rds.config.configview;

public class WebPageConfig {
    private String pageName;
    private String pageUrl;

    public String getPageName() {
        return this.pageName;
    }

    public String getPageUrl() {
        return this.pageUrl;
    }

    public void setPageName(String pageName) {
        this.pageName = pageName;
    }

    public void setPageUrl(String pageUrl) {
        this.pageUrl = pageUrl;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof WebPageConfig)) {
            return false;
        }
        WebPageConfig other = (WebPageConfig)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        String this$pageName = this.getPageName();
        String other$pageName = other.getPageName();
        if (this$pageName == null ? other$pageName != null : !this$pageName.equals(other$pageName)) {
            return false;
        }
        String this$pageUrl = this.getPageUrl();
        String other$pageUrl = other.getPageUrl();
        return !(this$pageUrl == null ? other$pageUrl != null : !this$pageUrl.equals(other$pageUrl));
    }

    protected boolean canEqual(Object other) {
        return other instanceof WebPageConfig;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        String $pageName = this.getPageName();
        result = result * 59 + ($pageName == null ? 43 : $pageName.hashCode());
        String $pageUrl = this.getPageUrl();
        result = result * 59 + ($pageUrl == null ? 43 : $pageUrl.hashCode());
        return result;
    }

    public String toString() {
        return "WebPageConfig(pageName=" + this.getPageName() + ", pageUrl=" + this.getPageUrl() + ")";
    }
}

