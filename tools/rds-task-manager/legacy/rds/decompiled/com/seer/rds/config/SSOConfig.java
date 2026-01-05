/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.config.SSOConfig
 *  org.springframework.beans.factory.annotation.Value
 *  org.springframework.boot.context.properties.ConfigurationProperties
 *  org.springframework.context.annotation.Configuration
 */
package com.seer.rds.config;

import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Configuration
@ConfigurationProperties(prefix="oauth")
public class SSOConfig {
    @Value(value="${oauth.enable:}")
    private Boolean enable = false;
    @Value(value="${oauth.enableTls:false}")
    private Boolean enableTls;
    @Value(value="${oauth.clientId:}")
    private String clientId;
    @Value(value="${oauth.clientSecret:}")
    private String clientSecret;
    @Value(value="${oauth.scope:}")
    private String scope;
    @Value(value="${oauth.state:}")
    private String state;
    @Value(value="${oauth.grantType:}")
    private String grantType;
    @Value(value="${oauth.resType:code}")
    private String resType;
    @Value(value="${oauth.pfidpadapterid:}")
    private String pfidpadapterid;
    @Value(value="${oauth.tokenUri:}")
    private String tokenUri;
    @Value(value="${oauth.authorizationUri:}")
    private String authorizationUri;
    @Value(value="${oauth.userInfoUri:}")
    private String userInfoUri;
    @Value(value="${oauth.userAttributeName:}")
    private String userAttributeName;
    @Value(value="${oauth.secondAttribute:sub}")
    private String secondAttribute;
    @Value(value="${oauth.userAttributeNameFlag:false}")
    private Boolean userAttributeNameFlag;
    @Value(value="${oauth.redirectBaseUri:}")
    private String redirectBaseUri;
    @Value(value="${oauth.redirectEndpoint:/oath/authorize}")
    private String redirectEndpoint;
    @Value(value="${oauth.loginWithUserEnable:false}")
    private Boolean loginWithUserEnable;
    @Value(value="${oauth.admins:}")
    private List<String> admins;
    @Value(value="${oauth.rdsHomeUrl:/#/view}")
    private String rdsHomeUrl;
    @Value(value="${oauth.pdaHomeUrl:/pda/}")
    private String pdaHomeUrl;
    @Value(value="${oauth.logoutUrl:}")
    private String logoutUrl;
    @Value(value="${oauth.errorUrl:}")
    private String errorUrl;
    @Value(value="${oauth.userInfoUriRequestType:post}")
    private String userInfoUriRequestType;
    @Value(value="${oauth.accountKey:username}")
    private String accountKey;
    @Value(value="${oauth.passwordKey:password}")
    private String passwordKey;
    private Map<String, String> extraParams;
    @Value(value="${oauth.enableLoginPage:false}")
    private Boolean enableLoginPage;
    @Value(value="${oauth.ssoButtonText:SSO Login}")
    private String ssoButtonText;

    public Boolean getEnable() {
        return this.enable;
    }

    public Boolean getEnableTls() {
        return this.enableTls;
    }

    public String getClientId() {
        return this.clientId;
    }

    public String getClientSecret() {
        return this.clientSecret;
    }

    public String getScope() {
        return this.scope;
    }

    public String getState() {
        return this.state;
    }

    public String getGrantType() {
        return this.grantType;
    }

    public String getResType() {
        return this.resType;
    }

    public String getPfidpadapterid() {
        return this.pfidpadapterid;
    }

    public String getTokenUri() {
        return this.tokenUri;
    }

    public String getAuthorizationUri() {
        return this.authorizationUri;
    }

    public String getUserInfoUri() {
        return this.userInfoUri;
    }

    public String getUserAttributeName() {
        return this.userAttributeName;
    }

    public String getSecondAttribute() {
        return this.secondAttribute;
    }

    public Boolean getUserAttributeNameFlag() {
        return this.userAttributeNameFlag;
    }

    public String getRedirectBaseUri() {
        return this.redirectBaseUri;
    }

    public String getRedirectEndpoint() {
        return this.redirectEndpoint;
    }

    public Boolean getLoginWithUserEnable() {
        return this.loginWithUserEnable;
    }

    public List<String> getAdmins() {
        return this.admins;
    }

    public String getRdsHomeUrl() {
        return this.rdsHomeUrl;
    }

    public String getPdaHomeUrl() {
        return this.pdaHomeUrl;
    }

    public String getLogoutUrl() {
        return this.logoutUrl;
    }

    public String getErrorUrl() {
        return this.errorUrl;
    }

    public String getUserInfoUriRequestType() {
        return this.userInfoUriRequestType;
    }

    public String getAccountKey() {
        return this.accountKey;
    }

    public String getPasswordKey() {
        return this.passwordKey;
    }

    public Map<String, String> getExtraParams() {
        return this.extraParams;
    }

    public Boolean getEnableLoginPage() {
        return this.enableLoginPage;
    }

    public String getSsoButtonText() {
        return this.ssoButtonText;
    }

    public void setEnable(Boolean enable) {
        this.enable = enable;
    }

    public void setEnableTls(Boolean enableTls) {
        this.enableTls = enableTls;
    }

    public void setClientId(String clientId) {
        this.clientId = clientId;
    }

    public void setClientSecret(String clientSecret) {
        this.clientSecret = clientSecret;
    }

    public void setScope(String scope) {
        this.scope = scope;
    }

    public void setState(String state) {
        this.state = state;
    }

    public void setGrantType(String grantType) {
        this.grantType = grantType;
    }

    public void setResType(String resType) {
        this.resType = resType;
    }

    public void setPfidpadapterid(String pfidpadapterid) {
        this.pfidpadapterid = pfidpadapterid;
    }

    public void setTokenUri(String tokenUri) {
        this.tokenUri = tokenUri;
    }

    public void setAuthorizationUri(String authorizationUri) {
        this.authorizationUri = authorizationUri;
    }

    public void setUserInfoUri(String userInfoUri) {
        this.userInfoUri = userInfoUri;
    }

    public void setUserAttributeName(String userAttributeName) {
        this.userAttributeName = userAttributeName;
    }

    public void setSecondAttribute(String secondAttribute) {
        this.secondAttribute = secondAttribute;
    }

    public void setUserAttributeNameFlag(Boolean userAttributeNameFlag) {
        this.userAttributeNameFlag = userAttributeNameFlag;
    }

    public void setRedirectBaseUri(String redirectBaseUri) {
        this.redirectBaseUri = redirectBaseUri;
    }

    public void setRedirectEndpoint(String redirectEndpoint) {
        this.redirectEndpoint = redirectEndpoint;
    }

    public void setLoginWithUserEnable(Boolean loginWithUserEnable) {
        this.loginWithUserEnable = loginWithUserEnable;
    }

    public void setAdmins(List<String> admins) {
        this.admins = admins;
    }

    public void setRdsHomeUrl(String rdsHomeUrl) {
        this.rdsHomeUrl = rdsHomeUrl;
    }

    public void setPdaHomeUrl(String pdaHomeUrl) {
        this.pdaHomeUrl = pdaHomeUrl;
    }

    public void setLogoutUrl(String logoutUrl) {
        this.logoutUrl = logoutUrl;
    }

    public void setErrorUrl(String errorUrl) {
        this.errorUrl = errorUrl;
    }

    public void setUserInfoUriRequestType(String userInfoUriRequestType) {
        this.userInfoUriRequestType = userInfoUriRequestType;
    }

    public void setAccountKey(String accountKey) {
        this.accountKey = accountKey;
    }

    public void setPasswordKey(String passwordKey) {
        this.passwordKey = passwordKey;
    }

    public void setExtraParams(Map<String, String> extraParams) {
        this.extraParams = extraParams;
    }

    public void setEnableLoginPage(Boolean enableLoginPage) {
        this.enableLoginPage = enableLoginPage;
    }

    public void setSsoButtonText(String ssoButtonText) {
        this.ssoButtonText = ssoButtonText;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof SSOConfig)) {
            return false;
        }
        SSOConfig other = (SSOConfig)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        Boolean this$enable = this.getEnable();
        Boolean other$enable = other.getEnable();
        if (this$enable == null ? other$enable != null : !((Object)this$enable).equals(other$enable)) {
            return false;
        }
        Boolean this$enableTls = this.getEnableTls();
        Boolean other$enableTls = other.getEnableTls();
        if (this$enableTls == null ? other$enableTls != null : !((Object)this$enableTls).equals(other$enableTls)) {
            return false;
        }
        Boolean this$userAttributeNameFlag = this.getUserAttributeNameFlag();
        Boolean other$userAttributeNameFlag = other.getUserAttributeNameFlag();
        if (this$userAttributeNameFlag == null ? other$userAttributeNameFlag != null : !((Object)this$userAttributeNameFlag).equals(other$userAttributeNameFlag)) {
            return false;
        }
        Boolean this$loginWithUserEnable = this.getLoginWithUserEnable();
        Boolean other$loginWithUserEnable = other.getLoginWithUserEnable();
        if (this$loginWithUserEnable == null ? other$loginWithUserEnable != null : !((Object)this$loginWithUserEnable).equals(other$loginWithUserEnable)) {
            return false;
        }
        Boolean this$enableLoginPage = this.getEnableLoginPage();
        Boolean other$enableLoginPage = other.getEnableLoginPage();
        if (this$enableLoginPage == null ? other$enableLoginPage != null : !((Object)this$enableLoginPage).equals(other$enableLoginPage)) {
            return false;
        }
        String this$clientId = this.getClientId();
        String other$clientId = other.getClientId();
        if (this$clientId == null ? other$clientId != null : !this$clientId.equals(other$clientId)) {
            return false;
        }
        String this$clientSecret = this.getClientSecret();
        String other$clientSecret = other.getClientSecret();
        if (this$clientSecret == null ? other$clientSecret != null : !this$clientSecret.equals(other$clientSecret)) {
            return false;
        }
        String this$scope = this.getScope();
        String other$scope = other.getScope();
        if (this$scope == null ? other$scope != null : !this$scope.equals(other$scope)) {
            return false;
        }
        String this$state = this.getState();
        String other$state = other.getState();
        if (this$state == null ? other$state != null : !this$state.equals(other$state)) {
            return false;
        }
        String this$grantType = this.getGrantType();
        String other$grantType = other.getGrantType();
        if (this$grantType == null ? other$grantType != null : !this$grantType.equals(other$grantType)) {
            return false;
        }
        String this$resType = this.getResType();
        String other$resType = other.getResType();
        if (this$resType == null ? other$resType != null : !this$resType.equals(other$resType)) {
            return false;
        }
        String this$pfidpadapterid = this.getPfidpadapterid();
        String other$pfidpadapterid = other.getPfidpadapterid();
        if (this$pfidpadapterid == null ? other$pfidpadapterid != null : !this$pfidpadapterid.equals(other$pfidpadapterid)) {
            return false;
        }
        String this$tokenUri = this.getTokenUri();
        String other$tokenUri = other.getTokenUri();
        if (this$tokenUri == null ? other$tokenUri != null : !this$tokenUri.equals(other$tokenUri)) {
            return false;
        }
        String this$authorizationUri = this.getAuthorizationUri();
        String other$authorizationUri = other.getAuthorizationUri();
        if (this$authorizationUri == null ? other$authorizationUri != null : !this$authorizationUri.equals(other$authorizationUri)) {
            return false;
        }
        String this$userInfoUri = this.getUserInfoUri();
        String other$userInfoUri = other.getUserInfoUri();
        if (this$userInfoUri == null ? other$userInfoUri != null : !this$userInfoUri.equals(other$userInfoUri)) {
            return false;
        }
        String this$userAttributeName = this.getUserAttributeName();
        String other$userAttributeName = other.getUserAttributeName();
        if (this$userAttributeName == null ? other$userAttributeName != null : !this$userAttributeName.equals(other$userAttributeName)) {
            return false;
        }
        String this$secondAttribute = this.getSecondAttribute();
        String other$secondAttribute = other.getSecondAttribute();
        if (this$secondAttribute == null ? other$secondAttribute != null : !this$secondAttribute.equals(other$secondAttribute)) {
            return false;
        }
        String this$redirectBaseUri = this.getRedirectBaseUri();
        String other$redirectBaseUri = other.getRedirectBaseUri();
        if (this$redirectBaseUri == null ? other$redirectBaseUri != null : !this$redirectBaseUri.equals(other$redirectBaseUri)) {
            return false;
        }
        String this$redirectEndpoint = this.getRedirectEndpoint();
        String other$redirectEndpoint = other.getRedirectEndpoint();
        if (this$redirectEndpoint == null ? other$redirectEndpoint != null : !this$redirectEndpoint.equals(other$redirectEndpoint)) {
            return false;
        }
        List this$admins = this.getAdmins();
        List other$admins = other.getAdmins();
        if (this$admins == null ? other$admins != null : !((Object)this$admins).equals(other$admins)) {
            return false;
        }
        String this$rdsHomeUrl = this.getRdsHomeUrl();
        String other$rdsHomeUrl = other.getRdsHomeUrl();
        if (this$rdsHomeUrl == null ? other$rdsHomeUrl != null : !this$rdsHomeUrl.equals(other$rdsHomeUrl)) {
            return false;
        }
        String this$pdaHomeUrl = this.getPdaHomeUrl();
        String other$pdaHomeUrl = other.getPdaHomeUrl();
        if (this$pdaHomeUrl == null ? other$pdaHomeUrl != null : !this$pdaHomeUrl.equals(other$pdaHomeUrl)) {
            return false;
        }
        String this$logoutUrl = this.getLogoutUrl();
        String other$logoutUrl = other.getLogoutUrl();
        if (this$logoutUrl == null ? other$logoutUrl != null : !this$logoutUrl.equals(other$logoutUrl)) {
            return false;
        }
        String this$errorUrl = this.getErrorUrl();
        String other$errorUrl = other.getErrorUrl();
        if (this$errorUrl == null ? other$errorUrl != null : !this$errorUrl.equals(other$errorUrl)) {
            return false;
        }
        String this$userInfoUriRequestType = this.getUserInfoUriRequestType();
        String other$userInfoUriRequestType = other.getUserInfoUriRequestType();
        if (this$userInfoUriRequestType == null ? other$userInfoUriRequestType != null : !this$userInfoUriRequestType.equals(other$userInfoUriRequestType)) {
            return false;
        }
        String this$accountKey = this.getAccountKey();
        String other$accountKey = other.getAccountKey();
        if (this$accountKey == null ? other$accountKey != null : !this$accountKey.equals(other$accountKey)) {
            return false;
        }
        String this$passwordKey = this.getPasswordKey();
        String other$passwordKey = other.getPasswordKey();
        if (this$passwordKey == null ? other$passwordKey != null : !this$passwordKey.equals(other$passwordKey)) {
            return false;
        }
        Map this$extraParams = this.getExtraParams();
        Map other$extraParams = other.getExtraParams();
        if (this$extraParams == null ? other$extraParams != null : !((Object)this$extraParams).equals(other$extraParams)) {
            return false;
        }
        String this$ssoButtonText = this.getSsoButtonText();
        String other$ssoButtonText = other.getSsoButtonText();
        return !(this$ssoButtonText == null ? other$ssoButtonText != null : !this$ssoButtonText.equals(other$ssoButtonText));
    }

    protected boolean canEqual(Object other) {
        return other instanceof SSOConfig;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        Boolean $enable = this.getEnable();
        result = result * 59 + ($enable == null ? 43 : ((Object)$enable).hashCode());
        Boolean $enableTls = this.getEnableTls();
        result = result * 59 + ($enableTls == null ? 43 : ((Object)$enableTls).hashCode());
        Boolean $userAttributeNameFlag = this.getUserAttributeNameFlag();
        result = result * 59 + ($userAttributeNameFlag == null ? 43 : ((Object)$userAttributeNameFlag).hashCode());
        Boolean $loginWithUserEnable = this.getLoginWithUserEnable();
        result = result * 59 + ($loginWithUserEnable == null ? 43 : ((Object)$loginWithUserEnable).hashCode());
        Boolean $enableLoginPage = this.getEnableLoginPage();
        result = result * 59 + ($enableLoginPage == null ? 43 : ((Object)$enableLoginPage).hashCode());
        String $clientId = this.getClientId();
        result = result * 59 + ($clientId == null ? 43 : $clientId.hashCode());
        String $clientSecret = this.getClientSecret();
        result = result * 59 + ($clientSecret == null ? 43 : $clientSecret.hashCode());
        String $scope = this.getScope();
        result = result * 59 + ($scope == null ? 43 : $scope.hashCode());
        String $state = this.getState();
        result = result * 59 + ($state == null ? 43 : $state.hashCode());
        String $grantType = this.getGrantType();
        result = result * 59 + ($grantType == null ? 43 : $grantType.hashCode());
        String $resType = this.getResType();
        result = result * 59 + ($resType == null ? 43 : $resType.hashCode());
        String $pfidpadapterid = this.getPfidpadapterid();
        result = result * 59 + ($pfidpadapterid == null ? 43 : $pfidpadapterid.hashCode());
        String $tokenUri = this.getTokenUri();
        result = result * 59 + ($tokenUri == null ? 43 : $tokenUri.hashCode());
        String $authorizationUri = this.getAuthorizationUri();
        result = result * 59 + ($authorizationUri == null ? 43 : $authorizationUri.hashCode());
        String $userInfoUri = this.getUserInfoUri();
        result = result * 59 + ($userInfoUri == null ? 43 : $userInfoUri.hashCode());
        String $userAttributeName = this.getUserAttributeName();
        result = result * 59 + ($userAttributeName == null ? 43 : $userAttributeName.hashCode());
        String $secondAttribute = this.getSecondAttribute();
        result = result * 59 + ($secondAttribute == null ? 43 : $secondAttribute.hashCode());
        String $redirectBaseUri = this.getRedirectBaseUri();
        result = result * 59 + ($redirectBaseUri == null ? 43 : $redirectBaseUri.hashCode());
        String $redirectEndpoint = this.getRedirectEndpoint();
        result = result * 59 + ($redirectEndpoint == null ? 43 : $redirectEndpoint.hashCode());
        List $admins = this.getAdmins();
        result = result * 59 + ($admins == null ? 43 : ((Object)$admins).hashCode());
        String $rdsHomeUrl = this.getRdsHomeUrl();
        result = result * 59 + ($rdsHomeUrl == null ? 43 : $rdsHomeUrl.hashCode());
        String $pdaHomeUrl = this.getPdaHomeUrl();
        result = result * 59 + ($pdaHomeUrl == null ? 43 : $pdaHomeUrl.hashCode());
        String $logoutUrl = this.getLogoutUrl();
        result = result * 59 + ($logoutUrl == null ? 43 : $logoutUrl.hashCode());
        String $errorUrl = this.getErrorUrl();
        result = result * 59 + ($errorUrl == null ? 43 : $errorUrl.hashCode());
        String $userInfoUriRequestType = this.getUserInfoUriRequestType();
        result = result * 59 + ($userInfoUriRequestType == null ? 43 : $userInfoUriRequestType.hashCode());
        String $accountKey = this.getAccountKey();
        result = result * 59 + ($accountKey == null ? 43 : $accountKey.hashCode());
        String $passwordKey = this.getPasswordKey();
        result = result * 59 + ($passwordKey == null ? 43 : $passwordKey.hashCode());
        Map $extraParams = this.getExtraParams();
        result = result * 59 + ($extraParams == null ? 43 : ((Object)$extraParams).hashCode());
        String $ssoButtonText = this.getSsoButtonText();
        result = result * 59 + ($ssoButtonText == null ? 43 : $ssoButtonText.hashCode());
        return result;
    }

    public String toString() {
        return "SSOConfig(enable=" + this.getEnable() + ", enableTls=" + this.getEnableTls() + ", clientId=" + this.getClientId() + ", clientSecret=" + this.getClientSecret() + ", scope=" + this.getScope() + ", state=" + this.getState() + ", grantType=" + this.getGrantType() + ", resType=" + this.getResType() + ", pfidpadapterid=" + this.getPfidpadapterid() + ", tokenUri=" + this.getTokenUri() + ", authorizationUri=" + this.getAuthorizationUri() + ", userInfoUri=" + this.getUserInfoUri() + ", userAttributeName=" + this.getUserAttributeName() + ", secondAttribute=" + this.getSecondAttribute() + ", userAttributeNameFlag=" + this.getUserAttributeNameFlag() + ", redirectBaseUri=" + this.getRedirectBaseUri() + ", redirectEndpoint=" + this.getRedirectEndpoint() + ", loginWithUserEnable=" + this.getLoginWithUserEnable() + ", admins=" + this.getAdmins() + ", rdsHomeUrl=" + this.getRdsHomeUrl() + ", pdaHomeUrl=" + this.getPdaHomeUrl() + ", logoutUrl=" + this.getLogoutUrl() + ", errorUrl=" + this.getErrorUrl() + ", userInfoUriRequestType=" + this.getUserInfoUriRequestType() + ", accountKey=" + this.getAccountKey() + ", passwordKey=" + this.getPasswordKey() + ", extraParams=" + this.getExtraParams() + ", enableLoginPage=" + this.getEnableLoginPage() + ", ssoButtonText=" + this.getSsoButtonText() + ")";
    }
}

