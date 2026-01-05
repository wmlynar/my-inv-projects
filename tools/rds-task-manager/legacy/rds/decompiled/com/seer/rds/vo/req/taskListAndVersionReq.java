/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.vo.req.taskListAndVersionReq
 */
package com.seer.rds.vo.req;

public class taskListAndVersionReq {
    private String url;
    private String method;
    private Integer version;
    private String defLabel;

    public String getUrl() {
        return this.url;
    }

    public String getMethod() {
        return this.method;
    }

    public Integer getVersion() {
        return this.version;
    }

    public String getDefLabel() {
        return this.defLabel;
    }

    public void setUrl(String url) {
        this.url = url;
    }

    public void setMethod(String method) {
        this.method = method;
    }

    public void setVersion(Integer version) {
        this.version = version;
    }

    public void setDefLabel(String defLabel) {
        this.defLabel = defLabel;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof taskListAndVersionReq)) {
            return false;
        }
        taskListAndVersionReq other = (taskListAndVersionReq)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        Integer this$version = this.getVersion();
        Integer other$version = other.getVersion();
        if (this$version == null ? other$version != null : !((Object)this$version).equals(other$version)) {
            return false;
        }
        String this$url = this.getUrl();
        String other$url = other.getUrl();
        if (this$url == null ? other$url != null : !this$url.equals(other$url)) {
            return false;
        }
        String this$method = this.getMethod();
        String other$method = other.getMethod();
        if (this$method == null ? other$method != null : !this$method.equals(other$method)) {
            return false;
        }
        String this$defLabel = this.getDefLabel();
        String other$defLabel = other.getDefLabel();
        return !(this$defLabel == null ? other$defLabel != null : !this$defLabel.equals(other$defLabel));
    }

    protected boolean canEqual(Object other) {
        return other instanceof taskListAndVersionReq;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        Integer $version = this.getVersion();
        result = result * 59 + ($version == null ? 43 : ((Object)$version).hashCode());
        String $url = this.getUrl();
        result = result * 59 + ($url == null ? 43 : $url.hashCode());
        String $method = this.getMethod();
        result = result * 59 + ($method == null ? 43 : $method.hashCode());
        String $defLabel = this.getDefLabel();
        result = result * 59 + ($defLabel == null ? 43 : $defLabel.hashCode());
        return result;
    }

    public String toString() {
        return "taskListAndVersionReq(url=" + this.getUrl() + ", method=" + this.getMethod() + ", version=" + this.getVersion() + ", defLabel=" + this.getDefLabel() + ")";
    }
}

