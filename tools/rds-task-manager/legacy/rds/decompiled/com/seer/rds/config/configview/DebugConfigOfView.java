/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.config.configview.DebugConfigOfView
 */
package com.seer.rds.config.configview;

public class DebugConfigOfView {
    private Boolean ifDebug = false;
    private String port = "9292";
    private String domainName = "";
    private String fixedIp = "";

    public Boolean getIfDebug() {
        return this.ifDebug;
    }

    public String getPort() {
        return this.port;
    }

    public String getDomainName() {
        return this.domainName;
    }

    public String getFixedIp() {
        return this.fixedIp;
    }

    public void setIfDebug(Boolean ifDebug) {
        this.ifDebug = ifDebug;
    }

    public void setPort(String port) {
        this.port = port;
    }

    public void setDomainName(String domainName) {
        this.domainName = domainName;
    }

    public void setFixedIp(String fixedIp) {
        this.fixedIp = fixedIp;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof DebugConfigOfView)) {
            return false;
        }
        DebugConfigOfView other = (DebugConfigOfView)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        Boolean this$ifDebug = this.getIfDebug();
        Boolean other$ifDebug = other.getIfDebug();
        if (this$ifDebug == null ? other$ifDebug != null : !((Object)this$ifDebug).equals(other$ifDebug)) {
            return false;
        }
        String this$port = this.getPort();
        String other$port = other.getPort();
        if (this$port == null ? other$port != null : !this$port.equals(other$port)) {
            return false;
        }
        String this$domainName = this.getDomainName();
        String other$domainName = other.getDomainName();
        if (this$domainName == null ? other$domainName != null : !this$domainName.equals(other$domainName)) {
            return false;
        }
        String this$fixedIp = this.getFixedIp();
        String other$fixedIp = other.getFixedIp();
        return !(this$fixedIp == null ? other$fixedIp != null : !this$fixedIp.equals(other$fixedIp));
    }

    protected boolean canEqual(Object other) {
        return other instanceof DebugConfigOfView;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        Boolean $ifDebug = this.getIfDebug();
        result = result * 59 + ($ifDebug == null ? 43 : ((Object)$ifDebug).hashCode());
        String $port = this.getPort();
        result = result * 59 + ($port == null ? 43 : $port.hashCode());
        String $domainName = this.getDomainName();
        result = result * 59 + ($domainName == null ? 43 : $domainName.hashCode());
        String $fixedIp = this.getFixedIp();
        result = result * 59 + ($fixedIp == null ? 43 : $fixedIp.hashCode());
        return result;
    }

    public String toString() {
        return "DebugConfigOfView(ifDebug=" + this.getIfDebug() + ", port=" + this.getPort() + ", domainName=" + this.getDomainName() + ", fixedIp=" + this.getFixedIp() + ")";
    }
}

