/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.config.SecurityConfig
 *  org.springframework.boot.context.properties.ConfigurationProperties
 *  org.springframework.context.annotation.Configuration
 */
package com.seer.rds.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Configuration
@ConfigurationProperties(prefix="security")
public class SecurityConfig {
    private Boolean disableShowUserInfo;
    private Boolean disablePublicInterface;
    private Boolean enableSHA2;
    private String salt = "Rds123!";

    public Boolean getDisableShowUserInfo() {
        return this.disableShowUserInfo;
    }

    public Boolean getDisablePublicInterface() {
        return this.disablePublicInterface;
    }

    public Boolean getEnableSHA2() {
        return this.enableSHA2;
    }

    public String getSalt() {
        return this.salt;
    }

    public void setDisableShowUserInfo(Boolean disableShowUserInfo) {
        this.disableShowUserInfo = disableShowUserInfo;
    }

    public void setDisablePublicInterface(Boolean disablePublicInterface) {
        this.disablePublicInterface = disablePublicInterface;
    }

    public void setEnableSHA2(Boolean enableSHA2) {
        this.enableSHA2 = enableSHA2;
    }

    public void setSalt(String salt) {
        this.salt = salt;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof SecurityConfig)) {
            return false;
        }
        SecurityConfig other = (SecurityConfig)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        Boolean this$disableShowUserInfo = this.getDisableShowUserInfo();
        Boolean other$disableShowUserInfo = other.getDisableShowUserInfo();
        if (this$disableShowUserInfo == null ? other$disableShowUserInfo != null : !((Object)this$disableShowUserInfo).equals(other$disableShowUserInfo)) {
            return false;
        }
        Boolean this$disablePublicInterface = this.getDisablePublicInterface();
        Boolean other$disablePublicInterface = other.getDisablePublicInterface();
        if (this$disablePublicInterface == null ? other$disablePublicInterface != null : !((Object)this$disablePublicInterface).equals(other$disablePublicInterface)) {
            return false;
        }
        Boolean this$enableSHA2 = this.getEnableSHA2();
        Boolean other$enableSHA2 = other.getEnableSHA2();
        if (this$enableSHA2 == null ? other$enableSHA2 != null : !((Object)this$enableSHA2).equals(other$enableSHA2)) {
            return false;
        }
        String this$salt = this.getSalt();
        String other$salt = other.getSalt();
        return !(this$salt == null ? other$salt != null : !this$salt.equals(other$salt));
    }

    protected boolean canEqual(Object other) {
        return other instanceof SecurityConfig;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        Boolean $disableShowUserInfo = this.getDisableShowUserInfo();
        result = result * 59 + ($disableShowUserInfo == null ? 43 : ((Object)$disableShowUserInfo).hashCode());
        Boolean $disablePublicInterface = this.getDisablePublicInterface();
        result = result * 59 + ($disablePublicInterface == null ? 43 : ((Object)$disablePublicInterface).hashCode());
        Boolean $enableSHA2 = this.getEnableSHA2();
        result = result * 59 + ($enableSHA2 == null ? 43 : ((Object)$enableSHA2).hashCode());
        String $salt = this.getSalt();
        result = result * 59 + ($salt == null ? 43 : $salt.hashCode());
        return result;
    }

    public String toString() {
        return "SecurityConfig(disableShowUserInfo=" + this.getDisableShowUserInfo() + ", disablePublicInterface=" + this.getDisablePublicInterface() + ", enableSHA2=" + this.getEnableSHA2() + ", salt=" + this.getSalt() + ")";
    }
}

