/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.config.configview.OpcuaConfigOfView
 */
package com.seer.rds.config.configview;

public class OpcuaConfigOfView {
    private String opcuaEndpointIp;
    private Integer opcuaEndpointPort;
    private String opcuaEndpointPath;
    private String opcuaEndpointUrl;
    private Double opcuaEndpointSubInterval;

    public String getOpcuaEndpointIp() {
        return this.opcuaEndpointIp;
    }

    public Integer getOpcuaEndpointPort() {
        return this.opcuaEndpointPort;
    }

    public String getOpcuaEndpointPath() {
        return this.opcuaEndpointPath;
    }

    public String getOpcuaEndpointUrl() {
        return this.opcuaEndpointUrl;
    }

    public Double getOpcuaEndpointSubInterval() {
        return this.opcuaEndpointSubInterval;
    }

    public void setOpcuaEndpointIp(String opcuaEndpointIp) {
        this.opcuaEndpointIp = opcuaEndpointIp;
    }

    public void setOpcuaEndpointPort(Integer opcuaEndpointPort) {
        this.opcuaEndpointPort = opcuaEndpointPort;
    }

    public void setOpcuaEndpointPath(String opcuaEndpointPath) {
        this.opcuaEndpointPath = opcuaEndpointPath;
    }

    public void setOpcuaEndpointUrl(String opcuaEndpointUrl) {
        this.opcuaEndpointUrl = opcuaEndpointUrl;
    }

    public void setOpcuaEndpointSubInterval(Double opcuaEndpointSubInterval) {
        this.opcuaEndpointSubInterval = opcuaEndpointSubInterval;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof OpcuaConfigOfView)) {
            return false;
        }
        OpcuaConfigOfView other = (OpcuaConfigOfView)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        Integer this$opcuaEndpointPort = this.getOpcuaEndpointPort();
        Integer other$opcuaEndpointPort = other.getOpcuaEndpointPort();
        if (this$opcuaEndpointPort == null ? other$opcuaEndpointPort != null : !((Object)this$opcuaEndpointPort).equals(other$opcuaEndpointPort)) {
            return false;
        }
        Double this$opcuaEndpointSubInterval = this.getOpcuaEndpointSubInterval();
        Double other$opcuaEndpointSubInterval = other.getOpcuaEndpointSubInterval();
        if (this$opcuaEndpointSubInterval == null ? other$opcuaEndpointSubInterval != null : !((Object)this$opcuaEndpointSubInterval).equals(other$opcuaEndpointSubInterval)) {
            return false;
        }
        String this$opcuaEndpointIp = this.getOpcuaEndpointIp();
        String other$opcuaEndpointIp = other.getOpcuaEndpointIp();
        if (this$opcuaEndpointIp == null ? other$opcuaEndpointIp != null : !this$opcuaEndpointIp.equals(other$opcuaEndpointIp)) {
            return false;
        }
        String this$opcuaEndpointPath = this.getOpcuaEndpointPath();
        String other$opcuaEndpointPath = other.getOpcuaEndpointPath();
        if (this$opcuaEndpointPath == null ? other$opcuaEndpointPath != null : !this$opcuaEndpointPath.equals(other$opcuaEndpointPath)) {
            return false;
        }
        String this$opcuaEndpointUrl = this.getOpcuaEndpointUrl();
        String other$opcuaEndpointUrl = other.getOpcuaEndpointUrl();
        return !(this$opcuaEndpointUrl == null ? other$opcuaEndpointUrl != null : !this$opcuaEndpointUrl.equals(other$opcuaEndpointUrl));
    }

    protected boolean canEqual(Object other) {
        return other instanceof OpcuaConfigOfView;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        Integer $opcuaEndpointPort = this.getOpcuaEndpointPort();
        result = result * 59 + ($opcuaEndpointPort == null ? 43 : ((Object)$opcuaEndpointPort).hashCode());
        Double $opcuaEndpointSubInterval = this.getOpcuaEndpointSubInterval();
        result = result * 59 + ($opcuaEndpointSubInterval == null ? 43 : ((Object)$opcuaEndpointSubInterval).hashCode());
        String $opcuaEndpointIp = this.getOpcuaEndpointIp();
        result = result * 59 + ($opcuaEndpointIp == null ? 43 : $opcuaEndpointIp.hashCode());
        String $opcuaEndpointPath = this.getOpcuaEndpointPath();
        result = result * 59 + ($opcuaEndpointPath == null ? 43 : $opcuaEndpointPath.hashCode());
        String $opcuaEndpointUrl = this.getOpcuaEndpointUrl();
        result = result * 59 + ($opcuaEndpointUrl == null ? 43 : $opcuaEndpointUrl.hashCode());
        return result;
    }

    public String toString() {
        return "OpcuaConfigOfView(opcuaEndpointIp=" + this.getOpcuaEndpointIp() + ", opcuaEndpointPort=" + this.getOpcuaEndpointPort() + ", opcuaEndpointPath=" + this.getOpcuaEndpointPath() + ", opcuaEndpointUrl=" + this.getOpcuaEndpointUrl() + ", opcuaEndpointSubInterval=" + this.getOpcuaEndpointSubInterval() + ")";
    }
}

