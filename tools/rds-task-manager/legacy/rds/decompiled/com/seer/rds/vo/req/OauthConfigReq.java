/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.vo.req.OauthConfigReq
 *  io.swagger.annotations.ApiModel
 *  io.swagger.annotations.ApiModelProperty
 *  org.springframework.stereotype.Component
 */
package com.seer.rds.vo.req;

import io.swagger.annotations.ApiModel;
import io.swagger.annotations.ApiModelProperty;
import org.springframework.stereotype.Component;

@ApiModel(value="\u66f4\u6539\u914d\u7f6e\u6587\u4ef6\u4e2d\u5355\u70b9\u767b\u5f55\u7684\u76f8\u5173\u53c2\u6570")
@Component
public class OauthConfigReq {
    @ApiModelProperty(value="\u914d\u7f6e\u7c7b\u578b", name="type", required=false)
    private String type;
    @ApiModelProperty(value="\u662f\u5426\u5f00\u542f\u5355\u70b9\u767b\u5f55", name="oauthEnable", required=false)
    private boolean oauthEnable;
    @ApiModelProperty(value="\u6388\u6743\u4e2d\u5fc3\u7684\u5730\u5740", name="authorizationUri", required=false)
    private String authorizationUri;
    @ApiModelProperty(value="\u83b7\u53d6 token \u7684\u5730\u5740", name="tokenUri", required=false)
    private String tokenUri;
    @ApiModelProperty(value="\u83b7\u53d6\u7528\u6237\u4fe1\u606f\u7684\u5730\u5740", name="userInfoUri", required=false)
    private String userInfoUri;
    @ApiModelProperty(value="\u83b7\u53d6\u7528\u6237\u4fe1\u606fJSON\u540e\uff0c\u53d6\u7528\u6237\u540d\u7684\u952e\u540d", name="userAttributeName", required=false)
    private String userAttributeName;
    @ApiModelProperty(value="\u6388\u6743\u7801\u6a21\u5f0f\u8981\u4f7f\u7528\u7684clientId", name="clientId", required=false)
    private String clientId;
    @ApiModelProperty(value="\u6388\u6743\u7801\u6a21\u5f0f\u8981\u4f7f\u7528\u7684clientSecret", name="clientSecret", required=false)
    private String clientSecret;
    @ApiModelProperty(value="\u83b7\u53d6\u7528\u6237\u4fe1\u606f\u7684\u8303\u56f4", name="scope", required=false)
    private String scope;
    @ApiModelProperty(value="\u6388\u6743\u6a21\u5f0f", name="grantType", required=false)
    private String grantType;
    @ApiModelProperty(value="\u56de\u8c03\u5730\u5740\u7684\u57df\u540d\u6216IP\u548c\u7aef\u53e3", name="redirectBaseUri", required=false)
    private String redirectBaseUri;
    @ApiModelProperty(value="\u56de\u8c03\u5730\u5740\u7684endpoint", name="redirectEndpoint", required=false)
    private String redirectEndpoint;
    @ApiModelProperty(value="\u83b7\u53d6\u7528\u6237\u4fe1\u606f\u540e\uff0c\u53ef\u4ee5\u76f4\u63a5\u767b\u5f55\u5230RDS\u7684\u7528\u6237\u540d", name="admins", required=false)
    private String admins;
    @ApiModelProperty(value="\u6388\u6743\u901a\u8fc7\u540e\u7684RDS\u4e3b\u9875", name="homeUrl", required=false)
    private String homeUrl;
    @ApiModelProperty(value="\u6388\u6743\u901a\u8fc7\u540e\u7684PDA\u4e3b\u9875", name="pdaHomeUrl", required=false)
    private String pdaHomeUrl;
    @ApiModelProperty(value="\u9000\u51fa\u6388\u6743\u4e2d\u5fc3\u7684\u5730\u5740", name="logoutUrl", required=false)
    private String logoutUrl;
    @ApiModelProperty(value="\u6388\u6743\u5931\u8d25\u7684\u8df3\u8f6c\u5730\u5740", name="errorUrl", required=false)
    private String errorUrl;
    @ApiModelProperty(value="\u662f\u5426\u5141\u8bb8\u6240\u6709\u4eba\u767b\u5f55", name="loginWithUserEnable", required=false)
    private Boolean loginWithUserEnable;
    @ApiModelProperty(value="\u662f\u5426\u5f00\u542fRDS\u767b\u5f55\u9875\u9762", name="enableLoginPage", required=false)
    private Boolean enableLoginPage;
    @ApiModelProperty(value="\u9996\u9875\u5355\u70b9\u767b\u5f55\u6309\u94ae\u7684\u663e\u793a\u6587\u5b57", name="ssoButtonText", required=false)
    private String ssoButtonText;

    public String getType() {
        return this.type;
    }

    public boolean isOauthEnable() {
        return this.oauthEnable;
    }

    public String getAuthorizationUri() {
        return this.authorizationUri;
    }

    public String getTokenUri() {
        return this.tokenUri;
    }

    public String getUserInfoUri() {
        return this.userInfoUri;
    }

    public String getUserAttributeName() {
        return this.userAttributeName;
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

    public String getGrantType() {
        return this.grantType;
    }

    public String getRedirectBaseUri() {
        return this.redirectBaseUri;
    }

    public String getRedirectEndpoint() {
        return this.redirectEndpoint;
    }

    public String getAdmins() {
        return this.admins;
    }

    public String getHomeUrl() {
        return this.homeUrl;
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

    public Boolean getLoginWithUserEnable() {
        return this.loginWithUserEnable;
    }

    public Boolean getEnableLoginPage() {
        return this.enableLoginPage;
    }

    public String getSsoButtonText() {
        return this.ssoButtonText;
    }

    public void setType(String type) {
        this.type = type;
    }

    public void setOauthEnable(boolean oauthEnable) {
        this.oauthEnable = oauthEnable;
    }

    public void setAuthorizationUri(String authorizationUri) {
        this.authorizationUri = authorizationUri;
    }

    public void setTokenUri(String tokenUri) {
        this.tokenUri = tokenUri;
    }

    public void setUserInfoUri(String userInfoUri) {
        this.userInfoUri = userInfoUri;
    }

    public void setUserAttributeName(String userAttributeName) {
        this.userAttributeName = userAttributeName;
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

    public void setGrantType(String grantType) {
        this.grantType = grantType;
    }

    public void setRedirectBaseUri(String redirectBaseUri) {
        this.redirectBaseUri = redirectBaseUri;
    }

    public void setRedirectEndpoint(String redirectEndpoint) {
        this.redirectEndpoint = redirectEndpoint;
    }

    public void setAdmins(String admins) {
        this.admins = admins;
    }

    public void setHomeUrl(String homeUrl) {
        this.homeUrl = homeUrl;
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

    public void setLoginWithUserEnable(Boolean loginWithUserEnable) {
        this.loginWithUserEnable = loginWithUserEnable;
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
        if (!(o instanceof OauthConfigReq)) {
            return false;
        }
        OauthConfigReq other = (OauthConfigReq)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        if (this.isOauthEnable() != other.isOauthEnable()) {
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
        String this$type = this.getType();
        String other$type = other.getType();
        if (this$type == null ? other$type != null : !this$type.equals(other$type)) {
            return false;
        }
        String this$authorizationUri = this.getAuthorizationUri();
        String other$authorizationUri = other.getAuthorizationUri();
        if (this$authorizationUri == null ? other$authorizationUri != null : !this$authorizationUri.equals(other$authorizationUri)) {
            return false;
        }
        String this$tokenUri = this.getTokenUri();
        String other$tokenUri = other.getTokenUri();
        if (this$tokenUri == null ? other$tokenUri != null : !this$tokenUri.equals(other$tokenUri)) {
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
        String this$grantType = this.getGrantType();
        String other$grantType = other.getGrantType();
        if (this$grantType == null ? other$grantType != null : !this$grantType.equals(other$grantType)) {
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
        String this$admins = this.getAdmins();
        String other$admins = other.getAdmins();
        if (this$admins == null ? other$admins != null : !this$admins.equals(other$admins)) {
            return false;
        }
        String this$homeUrl = this.getHomeUrl();
        String other$homeUrl = other.getHomeUrl();
        if (this$homeUrl == null ? other$homeUrl != null : !this$homeUrl.equals(other$homeUrl)) {
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
        String this$ssoButtonText = this.getSsoButtonText();
        String other$ssoButtonText = other.getSsoButtonText();
        return !(this$ssoButtonText == null ? other$ssoButtonText != null : !this$ssoButtonText.equals(other$ssoButtonText));
    }

    protected boolean canEqual(Object other) {
        return other instanceof OauthConfigReq;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        result = result * 59 + (this.isOauthEnable() ? 79 : 97);
        Boolean $loginWithUserEnable = this.getLoginWithUserEnable();
        result = result * 59 + ($loginWithUserEnable == null ? 43 : ((Object)$loginWithUserEnable).hashCode());
        Boolean $enableLoginPage = this.getEnableLoginPage();
        result = result * 59 + ($enableLoginPage == null ? 43 : ((Object)$enableLoginPage).hashCode());
        String $type = this.getType();
        result = result * 59 + ($type == null ? 43 : $type.hashCode());
        String $authorizationUri = this.getAuthorizationUri();
        result = result * 59 + ($authorizationUri == null ? 43 : $authorizationUri.hashCode());
        String $tokenUri = this.getTokenUri();
        result = result * 59 + ($tokenUri == null ? 43 : $tokenUri.hashCode());
        String $userInfoUri = this.getUserInfoUri();
        result = result * 59 + ($userInfoUri == null ? 43 : $userInfoUri.hashCode());
        String $userAttributeName = this.getUserAttributeName();
        result = result * 59 + ($userAttributeName == null ? 43 : $userAttributeName.hashCode());
        String $clientId = this.getClientId();
        result = result * 59 + ($clientId == null ? 43 : $clientId.hashCode());
        String $clientSecret = this.getClientSecret();
        result = result * 59 + ($clientSecret == null ? 43 : $clientSecret.hashCode());
        String $scope = this.getScope();
        result = result * 59 + ($scope == null ? 43 : $scope.hashCode());
        String $grantType = this.getGrantType();
        result = result * 59 + ($grantType == null ? 43 : $grantType.hashCode());
        String $redirectBaseUri = this.getRedirectBaseUri();
        result = result * 59 + ($redirectBaseUri == null ? 43 : $redirectBaseUri.hashCode());
        String $redirectEndpoint = this.getRedirectEndpoint();
        result = result * 59 + ($redirectEndpoint == null ? 43 : $redirectEndpoint.hashCode());
        String $admins = this.getAdmins();
        result = result * 59 + ($admins == null ? 43 : $admins.hashCode());
        String $homeUrl = this.getHomeUrl();
        result = result * 59 + ($homeUrl == null ? 43 : $homeUrl.hashCode());
        String $pdaHomeUrl = this.getPdaHomeUrl();
        result = result * 59 + ($pdaHomeUrl == null ? 43 : $pdaHomeUrl.hashCode());
        String $logoutUrl = this.getLogoutUrl();
        result = result * 59 + ($logoutUrl == null ? 43 : $logoutUrl.hashCode());
        String $errorUrl = this.getErrorUrl();
        result = result * 59 + ($errorUrl == null ? 43 : $errorUrl.hashCode());
        String $ssoButtonText = this.getSsoButtonText();
        result = result * 59 + ($ssoButtonText == null ? 43 : $ssoButtonText.hashCode());
        return result;
    }

    public String toString() {
        return "OauthConfigReq(type=" + this.getType() + ", oauthEnable=" + this.isOauthEnable() + ", authorizationUri=" + this.getAuthorizationUri() + ", tokenUri=" + this.getTokenUri() + ", userInfoUri=" + this.getUserInfoUri() + ", userAttributeName=" + this.getUserAttributeName() + ", clientId=" + this.getClientId() + ", clientSecret=" + this.getClientSecret() + ", scope=" + this.getScope() + ", grantType=" + this.getGrantType() + ", redirectBaseUri=" + this.getRedirectBaseUri() + ", redirectEndpoint=" + this.getRedirectEndpoint() + ", admins=" + this.getAdmins() + ", homeUrl=" + this.getHomeUrl() + ", pdaHomeUrl=" + this.getPdaHomeUrl() + ", logoutUrl=" + this.getLogoutUrl() + ", errorUrl=" + this.getErrorUrl() + ", loginWithUserEnable=" + this.getLoginWithUserEnable() + ", enableLoginPage=" + this.getEnableLoginPage() + ", ssoButtonText=" + this.getSsoButtonText() + ")";
    }
}

