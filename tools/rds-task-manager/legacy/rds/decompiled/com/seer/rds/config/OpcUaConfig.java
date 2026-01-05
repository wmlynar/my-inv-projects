/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.config.OpcUaConfig
 *  org.springframework.boot.context.properties.ConfigurationProperties
 *  org.springframework.context.annotation.Configuration
 */
package com.seer.rds.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Configuration
@ConfigurationProperties(prefix="opc")
public class OpcUaConfig {
    private Boolean enable;
    private String opcuaEndpointUrl;
    private long retryInterval;
    private Double opcuaEndpointSubInterval;
    private long retry;
    private Boolean isAnonymousConnect = true;
    private String serverUsername;
    private String serverPassword;
    private Boolean useSecurityPolicy = false;
    private String keyStore;
    private String keyStoreType = "PKCS12";
    private String alias;
    private String keyStorePassword = "SeerRdsKeyXYZ";
    private String keyPassword;
    private String securityPolicy;
    private String applicationUri = "urn:seer:rds:client";

    public Boolean getEnable() {
        return this.enable;
    }

    public String getOpcuaEndpointUrl() {
        return this.opcuaEndpointUrl;
    }

    public long getRetryInterval() {
        return this.retryInterval;
    }

    public Double getOpcuaEndpointSubInterval() {
        return this.opcuaEndpointSubInterval;
    }

    public long getRetry() {
        return this.retry;
    }

    public Boolean getIsAnonymousConnect() {
        return this.isAnonymousConnect;
    }

    public String getServerUsername() {
        return this.serverUsername;
    }

    public String getServerPassword() {
        return this.serverPassword;
    }

    public Boolean getUseSecurityPolicy() {
        return this.useSecurityPolicy;
    }

    public String getKeyStore() {
        return this.keyStore;
    }

    public String getKeyStoreType() {
        return this.keyStoreType;
    }

    public String getAlias() {
        return this.alias;
    }

    public String getKeyStorePassword() {
        return this.keyStorePassword;
    }

    public String getKeyPassword() {
        return this.keyPassword;
    }

    public String getSecurityPolicy() {
        return this.securityPolicy;
    }

    public String getApplicationUri() {
        return this.applicationUri;
    }

    public void setEnable(Boolean enable) {
        this.enable = enable;
    }

    public void setOpcuaEndpointUrl(String opcuaEndpointUrl) {
        this.opcuaEndpointUrl = opcuaEndpointUrl;
    }

    public void setRetryInterval(long retryInterval) {
        this.retryInterval = retryInterval;
    }

    public void setOpcuaEndpointSubInterval(Double opcuaEndpointSubInterval) {
        this.opcuaEndpointSubInterval = opcuaEndpointSubInterval;
    }

    public void setRetry(long retry) {
        this.retry = retry;
    }

    public void setIsAnonymousConnect(Boolean isAnonymousConnect) {
        this.isAnonymousConnect = isAnonymousConnect;
    }

    public void setServerUsername(String serverUsername) {
        this.serverUsername = serverUsername;
    }

    public void setServerPassword(String serverPassword) {
        this.serverPassword = serverPassword;
    }

    public void setUseSecurityPolicy(Boolean useSecurityPolicy) {
        this.useSecurityPolicy = useSecurityPolicy;
    }

    public void setKeyStore(String keyStore) {
        this.keyStore = keyStore;
    }

    public void setKeyStoreType(String keyStoreType) {
        this.keyStoreType = keyStoreType;
    }

    public void setAlias(String alias) {
        this.alias = alias;
    }

    public void setKeyStorePassword(String keyStorePassword) {
        this.keyStorePassword = keyStorePassword;
    }

    public void setKeyPassword(String keyPassword) {
        this.keyPassword = keyPassword;
    }

    public void setSecurityPolicy(String securityPolicy) {
        this.securityPolicy = securityPolicy;
    }

    public void setApplicationUri(String applicationUri) {
        this.applicationUri = applicationUri;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof OpcUaConfig)) {
            return false;
        }
        OpcUaConfig other = (OpcUaConfig)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        if (this.getRetryInterval() != other.getRetryInterval()) {
            return false;
        }
        if (this.getRetry() != other.getRetry()) {
            return false;
        }
        Boolean this$enable = this.getEnable();
        Boolean other$enable = other.getEnable();
        if (this$enable == null ? other$enable != null : !((Object)this$enable).equals(other$enable)) {
            return false;
        }
        Double this$opcuaEndpointSubInterval = this.getOpcuaEndpointSubInterval();
        Double other$opcuaEndpointSubInterval = other.getOpcuaEndpointSubInterval();
        if (this$opcuaEndpointSubInterval == null ? other$opcuaEndpointSubInterval != null : !((Object)this$opcuaEndpointSubInterval).equals(other$opcuaEndpointSubInterval)) {
            return false;
        }
        Boolean this$isAnonymousConnect = this.getIsAnonymousConnect();
        Boolean other$isAnonymousConnect = other.getIsAnonymousConnect();
        if (this$isAnonymousConnect == null ? other$isAnonymousConnect != null : !((Object)this$isAnonymousConnect).equals(other$isAnonymousConnect)) {
            return false;
        }
        Boolean this$useSecurityPolicy = this.getUseSecurityPolicy();
        Boolean other$useSecurityPolicy = other.getUseSecurityPolicy();
        if (this$useSecurityPolicy == null ? other$useSecurityPolicy != null : !((Object)this$useSecurityPolicy).equals(other$useSecurityPolicy)) {
            return false;
        }
        String this$opcuaEndpointUrl = this.getOpcuaEndpointUrl();
        String other$opcuaEndpointUrl = other.getOpcuaEndpointUrl();
        if (this$opcuaEndpointUrl == null ? other$opcuaEndpointUrl != null : !this$opcuaEndpointUrl.equals(other$opcuaEndpointUrl)) {
            return false;
        }
        String this$serverUsername = this.getServerUsername();
        String other$serverUsername = other.getServerUsername();
        if (this$serverUsername == null ? other$serverUsername != null : !this$serverUsername.equals(other$serverUsername)) {
            return false;
        }
        String this$serverPassword = this.getServerPassword();
        String other$serverPassword = other.getServerPassword();
        if (this$serverPassword == null ? other$serverPassword != null : !this$serverPassword.equals(other$serverPassword)) {
            return false;
        }
        String this$keyStore = this.getKeyStore();
        String other$keyStore = other.getKeyStore();
        if (this$keyStore == null ? other$keyStore != null : !this$keyStore.equals(other$keyStore)) {
            return false;
        }
        String this$keyStoreType = this.getKeyStoreType();
        String other$keyStoreType = other.getKeyStoreType();
        if (this$keyStoreType == null ? other$keyStoreType != null : !this$keyStoreType.equals(other$keyStoreType)) {
            return false;
        }
        String this$alias = this.getAlias();
        String other$alias = other.getAlias();
        if (this$alias == null ? other$alias != null : !this$alias.equals(other$alias)) {
            return false;
        }
        String this$keyStorePassword = this.getKeyStorePassword();
        String other$keyStorePassword = other.getKeyStorePassword();
        if (this$keyStorePassword == null ? other$keyStorePassword != null : !this$keyStorePassword.equals(other$keyStorePassword)) {
            return false;
        }
        String this$keyPassword = this.getKeyPassword();
        String other$keyPassword = other.getKeyPassword();
        if (this$keyPassword == null ? other$keyPassword != null : !this$keyPassword.equals(other$keyPassword)) {
            return false;
        }
        String this$securityPolicy = this.getSecurityPolicy();
        String other$securityPolicy = other.getSecurityPolicy();
        if (this$securityPolicy == null ? other$securityPolicy != null : !this$securityPolicy.equals(other$securityPolicy)) {
            return false;
        }
        String this$applicationUri = this.getApplicationUri();
        String other$applicationUri = other.getApplicationUri();
        return !(this$applicationUri == null ? other$applicationUri != null : !this$applicationUri.equals(other$applicationUri));
    }

    protected boolean canEqual(Object other) {
        return other instanceof OpcUaConfig;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        long $retryInterval = this.getRetryInterval();
        result = result * 59 + (int)($retryInterval >>> 32 ^ $retryInterval);
        long $retry = this.getRetry();
        result = result * 59 + (int)($retry >>> 32 ^ $retry);
        Boolean $enable = this.getEnable();
        result = result * 59 + ($enable == null ? 43 : ((Object)$enable).hashCode());
        Double $opcuaEndpointSubInterval = this.getOpcuaEndpointSubInterval();
        result = result * 59 + ($opcuaEndpointSubInterval == null ? 43 : ((Object)$opcuaEndpointSubInterval).hashCode());
        Boolean $isAnonymousConnect = this.getIsAnonymousConnect();
        result = result * 59 + ($isAnonymousConnect == null ? 43 : ((Object)$isAnonymousConnect).hashCode());
        Boolean $useSecurityPolicy = this.getUseSecurityPolicy();
        result = result * 59 + ($useSecurityPolicy == null ? 43 : ((Object)$useSecurityPolicy).hashCode());
        String $opcuaEndpointUrl = this.getOpcuaEndpointUrl();
        result = result * 59 + ($opcuaEndpointUrl == null ? 43 : $opcuaEndpointUrl.hashCode());
        String $serverUsername = this.getServerUsername();
        result = result * 59 + ($serverUsername == null ? 43 : $serverUsername.hashCode());
        String $serverPassword = this.getServerPassword();
        result = result * 59 + ($serverPassword == null ? 43 : $serverPassword.hashCode());
        String $keyStore = this.getKeyStore();
        result = result * 59 + ($keyStore == null ? 43 : $keyStore.hashCode());
        String $keyStoreType = this.getKeyStoreType();
        result = result * 59 + ($keyStoreType == null ? 43 : $keyStoreType.hashCode());
        String $alias = this.getAlias();
        result = result * 59 + ($alias == null ? 43 : $alias.hashCode());
        String $keyStorePassword = this.getKeyStorePassword();
        result = result * 59 + ($keyStorePassword == null ? 43 : $keyStorePassword.hashCode());
        String $keyPassword = this.getKeyPassword();
        result = result * 59 + ($keyPassword == null ? 43 : $keyPassword.hashCode());
        String $securityPolicy = this.getSecurityPolicy();
        result = result * 59 + ($securityPolicy == null ? 43 : $securityPolicy.hashCode());
        String $applicationUri = this.getApplicationUri();
        result = result * 59 + ($applicationUri == null ? 43 : $applicationUri.hashCode());
        return result;
    }

    public String toString() {
        return "OpcUaConfig(enable=" + this.getEnable() + ", opcuaEndpointUrl=" + this.getOpcuaEndpointUrl() + ", retryInterval=" + this.getRetryInterval() + ", opcuaEndpointSubInterval=" + this.getOpcuaEndpointSubInterval() + ", retry=" + this.getRetry() + ", isAnonymousConnect=" + this.getIsAnonymousConnect() + ", serverUsername=" + this.getServerUsername() + ", serverPassword=" + this.getServerPassword() + ", useSecurityPolicy=" + this.getUseSecurityPolicy() + ", keyStore=" + this.getKeyStore() + ", keyStoreType=" + this.getKeyStoreType() + ", alias=" + this.getAlias() + ", keyStorePassword=" + this.getKeyStorePassword() + ", keyPassword=" + this.getKeyPassword() + ", securityPolicy=" + this.getSecurityPolicy() + ", applicationUri=" + this.getApplicationUri() + ")";
    }
}

