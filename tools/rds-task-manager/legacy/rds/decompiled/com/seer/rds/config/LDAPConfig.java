/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.config.LDAPConfig
 *  org.springframework.beans.factory.annotation.Value
 *  org.springframework.context.annotation.Configuration
 */
package com.seer.rds.config;

import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;

@Configuration
public class LDAPConfig {
    @Value(value="${ldap.enable:false}")
    private Boolean enable;
    @Value(value="${ldap.url:ldap://127.0.0.1}")
    private String ldapUrl;
    @Value(value="${ldap.port:389}")
    private Integer port;
    @Value(value="${ldap.principal:cn=test,ou=test unit,dc=test,dc=com}")
    private String securityPrincipal;
    @Value(value="${ldap.credentials:test}")
    private String securityCredentials;
    @Value(value="${ldap.protocol:none}")
    private String securityProtocol;
    @Value(value="${ldap.authentication:simple}")
    private String securityAuthentication;
    @Value(value="${ldap.searchFilter:sAMAccountName}")
    private String searchFilterName;
    @Value(value="${ldap.searchBase:ou=test unit,dc=test,dc=com}")
    private String searchBase;
    @Value(value="${ldap.distinguishedName:distinguishedName}")
    private String distinguishedName;
    @Value(value="${ldap.skipUsernames:admin}")
    private List<String> skipUsernames;

    public Boolean getEnable() {
        return this.enable;
    }

    public String getLdapUrl() {
        return this.ldapUrl;
    }

    public Integer getPort() {
        return this.port;
    }

    public String getSecurityPrincipal() {
        return this.securityPrincipal;
    }

    public String getSecurityCredentials() {
        return this.securityCredentials;
    }

    public String getSecurityProtocol() {
        return this.securityProtocol;
    }

    public String getSecurityAuthentication() {
        return this.securityAuthentication;
    }

    public String getSearchFilterName() {
        return this.searchFilterName;
    }

    public String getSearchBase() {
        return this.searchBase;
    }

    public String getDistinguishedName() {
        return this.distinguishedName;
    }

    public List<String> getSkipUsernames() {
        return this.skipUsernames;
    }

    public void setEnable(Boolean enable) {
        this.enable = enable;
    }

    public void setLdapUrl(String ldapUrl) {
        this.ldapUrl = ldapUrl;
    }

    public void setPort(Integer port) {
        this.port = port;
    }

    public void setSecurityPrincipal(String securityPrincipal) {
        this.securityPrincipal = securityPrincipal;
    }

    public void setSecurityCredentials(String securityCredentials) {
        this.securityCredentials = securityCredentials;
    }

    public void setSecurityProtocol(String securityProtocol) {
        this.securityProtocol = securityProtocol;
    }

    public void setSecurityAuthentication(String securityAuthentication) {
        this.securityAuthentication = securityAuthentication;
    }

    public void setSearchFilterName(String searchFilterName) {
        this.searchFilterName = searchFilterName;
    }

    public void setSearchBase(String searchBase) {
        this.searchBase = searchBase;
    }

    public void setDistinguishedName(String distinguishedName) {
        this.distinguishedName = distinguishedName;
    }

    public void setSkipUsernames(List<String> skipUsernames) {
        this.skipUsernames = skipUsernames;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof LDAPConfig)) {
            return false;
        }
        LDAPConfig other = (LDAPConfig)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        Boolean this$enable = this.getEnable();
        Boolean other$enable = other.getEnable();
        if (this$enable == null ? other$enable != null : !((Object)this$enable).equals(other$enable)) {
            return false;
        }
        Integer this$port = this.getPort();
        Integer other$port = other.getPort();
        if (this$port == null ? other$port != null : !((Object)this$port).equals(other$port)) {
            return false;
        }
        String this$ldapUrl = this.getLdapUrl();
        String other$ldapUrl = other.getLdapUrl();
        if (this$ldapUrl == null ? other$ldapUrl != null : !this$ldapUrl.equals(other$ldapUrl)) {
            return false;
        }
        String this$securityPrincipal = this.getSecurityPrincipal();
        String other$securityPrincipal = other.getSecurityPrincipal();
        if (this$securityPrincipal == null ? other$securityPrincipal != null : !this$securityPrincipal.equals(other$securityPrincipal)) {
            return false;
        }
        String this$securityCredentials = this.getSecurityCredentials();
        String other$securityCredentials = other.getSecurityCredentials();
        if (this$securityCredentials == null ? other$securityCredentials != null : !this$securityCredentials.equals(other$securityCredentials)) {
            return false;
        }
        String this$securityProtocol = this.getSecurityProtocol();
        String other$securityProtocol = other.getSecurityProtocol();
        if (this$securityProtocol == null ? other$securityProtocol != null : !this$securityProtocol.equals(other$securityProtocol)) {
            return false;
        }
        String this$securityAuthentication = this.getSecurityAuthentication();
        String other$securityAuthentication = other.getSecurityAuthentication();
        if (this$securityAuthentication == null ? other$securityAuthentication != null : !this$securityAuthentication.equals(other$securityAuthentication)) {
            return false;
        }
        String this$searchFilterName = this.getSearchFilterName();
        String other$searchFilterName = other.getSearchFilterName();
        if (this$searchFilterName == null ? other$searchFilterName != null : !this$searchFilterName.equals(other$searchFilterName)) {
            return false;
        }
        String this$searchBase = this.getSearchBase();
        String other$searchBase = other.getSearchBase();
        if (this$searchBase == null ? other$searchBase != null : !this$searchBase.equals(other$searchBase)) {
            return false;
        }
        String this$distinguishedName = this.getDistinguishedName();
        String other$distinguishedName = other.getDistinguishedName();
        if (this$distinguishedName == null ? other$distinguishedName != null : !this$distinguishedName.equals(other$distinguishedName)) {
            return false;
        }
        List this$skipUsernames = this.getSkipUsernames();
        List other$skipUsernames = other.getSkipUsernames();
        return !(this$skipUsernames == null ? other$skipUsernames != null : !((Object)this$skipUsernames).equals(other$skipUsernames));
    }

    protected boolean canEqual(Object other) {
        return other instanceof LDAPConfig;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        Boolean $enable = this.getEnable();
        result = result * 59 + ($enable == null ? 43 : ((Object)$enable).hashCode());
        Integer $port = this.getPort();
        result = result * 59 + ($port == null ? 43 : ((Object)$port).hashCode());
        String $ldapUrl = this.getLdapUrl();
        result = result * 59 + ($ldapUrl == null ? 43 : $ldapUrl.hashCode());
        String $securityPrincipal = this.getSecurityPrincipal();
        result = result * 59 + ($securityPrincipal == null ? 43 : $securityPrincipal.hashCode());
        String $securityCredentials = this.getSecurityCredentials();
        result = result * 59 + ($securityCredentials == null ? 43 : $securityCredentials.hashCode());
        String $securityProtocol = this.getSecurityProtocol();
        result = result * 59 + ($securityProtocol == null ? 43 : $securityProtocol.hashCode());
        String $securityAuthentication = this.getSecurityAuthentication();
        result = result * 59 + ($securityAuthentication == null ? 43 : $securityAuthentication.hashCode());
        String $searchFilterName = this.getSearchFilterName();
        result = result * 59 + ($searchFilterName == null ? 43 : $searchFilterName.hashCode());
        String $searchBase = this.getSearchBase();
        result = result * 59 + ($searchBase == null ? 43 : $searchBase.hashCode());
        String $distinguishedName = this.getDistinguishedName();
        result = result * 59 + ($distinguishedName == null ? 43 : $distinguishedName.hashCode());
        List $skipUsernames = this.getSkipUsernames();
        result = result * 59 + ($skipUsernames == null ? 43 : ((Object)$skipUsernames).hashCode());
        return result;
    }

    public String toString() {
        return "LDAPConfig(enable=" + this.getEnable() + ", ldapUrl=" + this.getLdapUrl() + ", port=" + this.getPort() + ", securityPrincipal=" + this.getSecurityPrincipal() + ", securityCredentials=" + this.getSecurityCredentials() + ", securityProtocol=" + this.getSecurityProtocol() + ", securityAuthentication=" + this.getSecurityAuthentication() + ", searchFilterName=" + this.getSearchFilterName() + ", searchBase=" + this.getSearchBase() + ", distinguishedName=" + this.getDistinguishedName() + ", skipUsernames=" + this.getSkipUsernames() + ")";
    }
}

