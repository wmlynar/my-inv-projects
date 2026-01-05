/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.vo.req.UpdateHttpsConfigReq
 *  io.swagger.annotations.ApiModel
 *  io.swagger.annotations.ApiModelProperty
 *  org.springframework.stereotype.Component
 */
package com.seer.rds.vo.req;

import io.swagger.annotations.ApiModel;
import io.swagger.annotations.ApiModelProperty;
import org.springframework.stereotype.Component;

@ApiModel(value="\u66f4\u6539\u914d\u7f6e\u6587\u4ef6\u4e2dhttps\u534f\u8bae\u7684\u76f8\u5173\u53c2\u6570")
@Component
public class UpdateHttpsConfigReq {
    @ApiModelProperty(value="\u662f\u5426\u5f00\u542fhttps")
    private boolean httpsEnable;
    @ApiModelProperty(value="\u81ea\u5b9a\u4e49\u7684keyStore \u9ed8\u8ba4\u4e3a\u73b0\u6709\u7684keyStore")
    private String keyStorePath;
    @ApiModelProperty(value="\u8bbf\u95eekeyStore\u7684\u5bc6\u7801 \u9ed8\u8ba4\u4e3a\u73b0\u6709key-store-password")
    private String keyStorePassword;
    @ApiModelProperty(value="\u8bbf\u95eekeyStore\u4e2d\u7684\u79c1\u94a5\u5bc6\u7801 \u9ed8\u8ba4\u4e3a\u73b0\u6709key-password")
    private String keyPassword;
    @ApiModelProperty(value="\u8bc1\u4e66\u522b\u540d \u9ed8\u8ba4\u4e3ards_https")
    private String keyAlias;
    @ApiModelProperty(value="keyStore\u7684\u7c7b\u578b \u9ed8\u8ba4\u4e3aJKS")
    private String keyStoreType;
    @ApiModelProperty(value="\u6307\u5b9aSSL\u4f7f\u7528\u7684\u534f\u8bae \u9ed8\u8ba4\u4e3aTLSv1.2")
    private String enableProtocols;
    @ApiModelProperty(value="\u6307\u5b9ahttps\u7684\u7aef\u53e3\u53f7 \u9ed8\u8ba4\u4e3a80")
    private String port;

    public boolean isHttpsEnable() {
        return this.httpsEnable;
    }

    public String getKeyStorePath() {
        return this.keyStorePath;
    }

    public String getKeyStorePassword() {
        return this.keyStorePassword;
    }

    public String getKeyPassword() {
        return this.keyPassword;
    }

    public String getKeyAlias() {
        return this.keyAlias;
    }

    public String getKeyStoreType() {
        return this.keyStoreType;
    }

    public String getEnableProtocols() {
        return this.enableProtocols;
    }

    public String getPort() {
        return this.port;
    }

    public void setHttpsEnable(boolean httpsEnable) {
        this.httpsEnable = httpsEnable;
    }

    public void setKeyStorePath(String keyStorePath) {
        this.keyStorePath = keyStorePath;
    }

    public void setKeyStorePassword(String keyStorePassword) {
        this.keyStorePassword = keyStorePassword;
    }

    public void setKeyPassword(String keyPassword) {
        this.keyPassword = keyPassword;
    }

    public void setKeyAlias(String keyAlias) {
        this.keyAlias = keyAlias;
    }

    public void setKeyStoreType(String keyStoreType) {
        this.keyStoreType = keyStoreType;
    }

    public void setEnableProtocols(String enableProtocols) {
        this.enableProtocols = enableProtocols;
    }

    public void setPort(String port) {
        this.port = port;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof UpdateHttpsConfigReq)) {
            return false;
        }
        UpdateHttpsConfigReq other = (UpdateHttpsConfigReq)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        if (this.isHttpsEnable() != other.isHttpsEnable()) {
            return false;
        }
        String this$keyStorePath = this.getKeyStorePath();
        String other$keyStorePath = other.getKeyStorePath();
        if (this$keyStorePath == null ? other$keyStorePath != null : !this$keyStorePath.equals(other$keyStorePath)) {
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
        String this$keyAlias = this.getKeyAlias();
        String other$keyAlias = other.getKeyAlias();
        if (this$keyAlias == null ? other$keyAlias != null : !this$keyAlias.equals(other$keyAlias)) {
            return false;
        }
        String this$keyStoreType = this.getKeyStoreType();
        String other$keyStoreType = other.getKeyStoreType();
        if (this$keyStoreType == null ? other$keyStoreType != null : !this$keyStoreType.equals(other$keyStoreType)) {
            return false;
        }
        String this$enableProtocols = this.getEnableProtocols();
        String other$enableProtocols = other.getEnableProtocols();
        if (this$enableProtocols == null ? other$enableProtocols != null : !this$enableProtocols.equals(other$enableProtocols)) {
            return false;
        }
        String this$port = this.getPort();
        String other$port = other.getPort();
        return !(this$port == null ? other$port != null : !this$port.equals(other$port));
    }

    protected boolean canEqual(Object other) {
        return other instanceof UpdateHttpsConfigReq;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        result = result * 59 + (this.isHttpsEnable() ? 79 : 97);
        String $keyStorePath = this.getKeyStorePath();
        result = result * 59 + ($keyStorePath == null ? 43 : $keyStorePath.hashCode());
        String $keyStorePassword = this.getKeyStorePassword();
        result = result * 59 + ($keyStorePassword == null ? 43 : $keyStorePassword.hashCode());
        String $keyPassword = this.getKeyPassword();
        result = result * 59 + ($keyPassword == null ? 43 : $keyPassword.hashCode());
        String $keyAlias = this.getKeyAlias();
        result = result * 59 + ($keyAlias == null ? 43 : $keyAlias.hashCode());
        String $keyStoreType = this.getKeyStoreType();
        result = result * 59 + ($keyStoreType == null ? 43 : $keyStoreType.hashCode());
        String $enableProtocols = this.getEnableProtocols();
        result = result * 59 + ($enableProtocols == null ? 43 : $enableProtocols.hashCode());
        String $port = this.getPort();
        result = result * 59 + ($port == null ? 43 : $port.hashCode());
        return result;
    }

    public String toString() {
        return "UpdateHttpsConfigReq(httpsEnable=" + this.isHttpsEnable() + ", keyStorePath=" + this.getKeyStorePath() + ", keyStorePassword=" + this.getKeyStorePassword() + ", keyPassword=" + this.getKeyPassword() + ", keyAlias=" + this.getKeyAlias() + ", keyStoreType=" + this.getKeyStoreType() + ", enableProtocols=" + this.getEnableProtocols() + ", port=" + this.getPort() + ")";
    }
}

