/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.config.configview.ProxyWebPageConfig
 */
package com.seer.rds.config.configview;

public class ProxyWebPageConfig {
    private Boolean ifEnableProxy = false;
    private String proxyIp = "";

    public Boolean getIfEnableProxy() {
        return this.ifEnableProxy;
    }

    public String getProxyIp() {
        return this.proxyIp;
    }

    public void setIfEnableProxy(Boolean ifEnableProxy) {
        this.ifEnableProxy = ifEnableProxy;
    }

    public void setProxyIp(String proxyIp) {
        this.proxyIp = proxyIp;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof ProxyWebPageConfig)) {
            return false;
        }
        ProxyWebPageConfig other = (ProxyWebPageConfig)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        Boolean this$ifEnableProxy = this.getIfEnableProxy();
        Boolean other$ifEnableProxy = other.getIfEnableProxy();
        if (this$ifEnableProxy == null ? other$ifEnableProxy != null : !((Object)this$ifEnableProxy).equals(other$ifEnableProxy)) {
            return false;
        }
        String this$proxyIp = this.getProxyIp();
        String other$proxyIp = other.getProxyIp();
        return !(this$proxyIp == null ? other$proxyIp != null : !this$proxyIp.equals(other$proxyIp));
    }

    protected boolean canEqual(Object other) {
        return other instanceof ProxyWebPageConfig;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        Boolean $ifEnableProxy = this.getIfEnableProxy();
        result = result * 59 + ($ifEnableProxy == null ? 43 : ((Object)$ifEnableProxy).hashCode());
        String $proxyIp = this.getProxyIp();
        result = result * 59 + ($proxyIp == null ? 43 : $proxyIp.hashCode());
        return result;
    }

    public String toString() {
        return "ProxyWebPageConfig(ifEnableProxy=" + this.getIfEnableProxy() + ", proxyIp=" + this.getProxyIp() + ")";
    }
}

