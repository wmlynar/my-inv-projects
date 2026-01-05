/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.config.configview.RdsConfigOfView
 */
package com.seer.rds.config.configview;

public class RdsConfigOfView {
    private String env;
    private String staticDir;
    private String scriptDir;
    private String configDir;
    private String modbusMasterIp;
    private String modbusMasterPort;
    private Integer retryQueryTimes;
    private Long retryQueryInterval;
    private String thirdCallBackUrl;

    public String getEnv() {
        return this.env;
    }

    public String getStaticDir() {
        return this.staticDir;
    }

    public String getScriptDir() {
        return this.scriptDir;
    }

    public String getConfigDir() {
        return this.configDir;
    }

    public String getModbusMasterIp() {
        return this.modbusMasterIp;
    }

    public String getModbusMasterPort() {
        return this.modbusMasterPort;
    }

    public Integer getRetryQueryTimes() {
        return this.retryQueryTimes;
    }

    public Long getRetryQueryInterval() {
        return this.retryQueryInterval;
    }

    public String getThirdCallBackUrl() {
        return this.thirdCallBackUrl;
    }

    public void setEnv(String env) {
        this.env = env;
    }

    public void setStaticDir(String staticDir) {
        this.staticDir = staticDir;
    }

    public void setScriptDir(String scriptDir) {
        this.scriptDir = scriptDir;
    }

    public void setConfigDir(String configDir) {
        this.configDir = configDir;
    }

    public void setModbusMasterIp(String modbusMasterIp) {
        this.modbusMasterIp = modbusMasterIp;
    }

    public void setModbusMasterPort(String modbusMasterPort) {
        this.modbusMasterPort = modbusMasterPort;
    }

    public void setRetryQueryTimes(Integer retryQueryTimes) {
        this.retryQueryTimes = retryQueryTimes;
    }

    public void setRetryQueryInterval(Long retryQueryInterval) {
        this.retryQueryInterval = retryQueryInterval;
    }

    public void setThirdCallBackUrl(String thirdCallBackUrl) {
        this.thirdCallBackUrl = thirdCallBackUrl;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof RdsConfigOfView)) {
            return false;
        }
        RdsConfigOfView other = (RdsConfigOfView)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        Integer this$retryQueryTimes = this.getRetryQueryTimes();
        Integer other$retryQueryTimes = other.getRetryQueryTimes();
        if (this$retryQueryTimes == null ? other$retryQueryTimes != null : !((Object)this$retryQueryTimes).equals(other$retryQueryTimes)) {
            return false;
        }
        Long this$retryQueryInterval = this.getRetryQueryInterval();
        Long other$retryQueryInterval = other.getRetryQueryInterval();
        if (this$retryQueryInterval == null ? other$retryQueryInterval != null : !((Object)this$retryQueryInterval).equals(other$retryQueryInterval)) {
            return false;
        }
        String this$env = this.getEnv();
        String other$env = other.getEnv();
        if (this$env == null ? other$env != null : !this$env.equals(other$env)) {
            return false;
        }
        String this$staticDir = this.getStaticDir();
        String other$staticDir = other.getStaticDir();
        if (this$staticDir == null ? other$staticDir != null : !this$staticDir.equals(other$staticDir)) {
            return false;
        }
        String this$scriptDir = this.getScriptDir();
        String other$scriptDir = other.getScriptDir();
        if (this$scriptDir == null ? other$scriptDir != null : !this$scriptDir.equals(other$scriptDir)) {
            return false;
        }
        String this$configDir = this.getConfigDir();
        String other$configDir = other.getConfigDir();
        if (this$configDir == null ? other$configDir != null : !this$configDir.equals(other$configDir)) {
            return false;
        }
        String this$modbusMasterIp = this.getModbusMasterIp();
        String other$modbusMasterIp = other.getModbusMasterIp();
        if (this$modbusMasterIp == null ? other$modbusMasterIp != null : !this$modbusMasterIp.equals(other$modbusMasterIp)) {
            return false;
        }
        String this$modbusMasterPort = this.getModbusMasterPort();
        String other$modbusMasterPort = other.getModbusMasterPort();
        if (this$modbusMasterPort == null ? other$modbusMasterPort != null : !this$modbusMasterPort.equals(other$modbusMasterPort)) {
            return false;
        }
        String this$thirdCallBackUrl = this.getThirdCallBackUrl();
        String other$thirdCallBackUrl = other.getThirdCallBackUrl();
        return !(this$thirdCallBackUrl == null ? other$thirdCallBackUrl != null : !this$thirdCallBackUrl.equals(other$thirdCallBackUrl));
    }

    protected boolean canEqual(Object other) {
        return other instanceof RdsConfigOfView;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        Integer $retryQueryTimes = this.getRetryQueryTimes();
        result = result * 59 + ($retryQueryTimes == null ? 43 : ((Object)$retryQueryTimes).hashCode());
        Long $retryQueryInterval = this.getRetryQueryInterval();
        result = result * 59 + ($retryQueryInterval == null ? 43 : ((Object)$retryQueryInterval).hashCode());
        String $env = this.getEnv();
        result = result * 59 + ($env == null ? 43 : $env.hashCode());
        String $staticDir = this.getStaticDir();
        result = result * 59 + ($staticDir == null ? 43 : $staticDir.hashCode());
        String $scriptDir = this.getScriptDir();
        result = result * 59 + ($scriptDir == null ? 43 : $scriptDir.hashCode());
        String $configDir = this.getConfigDir();
        result = result * 59 + ($configDir == null ? 43 : $configDir.hashCode());
        String $modbusMasterIp = this.getModbusMasterIp();
        result = result * 59 + ($modbusMasterIp == null ? 43 : $modbusMasterIp.hashCode());
        String $modbusMasterPort = this.getModbusMasterPort();
        result = result * 59 + ($modbusMasterPort == null ? 43 : $modbusMasterPort.hashCode());
        String $thirdCallBackUrl = this.getThirdCallBackUrl();
        result = result * 59 + ($thirdCallBackUrl == null ? 43 : $thirdCallBackUrl.hashCode());
        return result;
    }

    public String toString() {
        return "RdsConfigOfView(env=" + this.getEnv() + ", staticDir=" + this.getStaticDir() + ", scriptDir=" + this.getScriptDir() + ", configDir=" + this.getConfigDir() + ", modbusMasterIp=" + this.getModbusMasterIp() + ", modbusMasterPort=" + this.getModbusMasterPort() + ", retryQueryTimes=" + this.getRetryQueryTimes() + ", retryQueryInterval=" + this.getRetryQueryInterval() + ", thirdCallBackUrl=" + this.getThirdCallBackUrl() + ")";
    }
}

