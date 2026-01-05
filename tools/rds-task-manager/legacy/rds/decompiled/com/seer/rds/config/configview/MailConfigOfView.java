/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.config.configview.MailConfigOfView
 */
package com.seer.rds.config.configview;

public class MailConfigOfView {
    private String host = "smtp.qq.com";
    private String username = "username";
    private String password = "password";
    private Integer port = 465;
    private String protocol = "smtp";
    private String auth = "true";
    private String sslEnable = "true";
    private String tlsEnable = "false";
    private String tlsRequired = "false";
    private String debug = "false";
    private String encoding = "UTF-8";
    private String timeout = "5000";
    private String connTimeout = "5000";

    public String getHost() {
        return this.host;
    }

    public String getUsername() {
        return this.username;
    }

    public String getPassword() {
        return this.password;
    }

    public Integer getPort() {
        return this.port;
    }

    public String getProtocol() {
        return this.protocol;
    }

    public String getAuth() {
        return this.auth;
    }

    public String getSslEnable() {
        return this.sslEnable;
    }

    public String getTlsEnable() {
        return this.tlsEnable;
    }

    public String getTlsRequired() {
        return this.tlsRequired;
    }

    public String getDebug() {
        return this.debug;
    }

    public String getEncoding() {
        return this.encoding;
    }

    public String getTimeout() {
        return this.timeout;
    }

    public String getConnTimeout() {
        return this.connTimeout;
    }

    public void setHost(String host) {
        this.host = host;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public void setPassword(String password) {
        this.password = password;
    }

    public void setPort(Integer port) {
        this.port = port;
    }

    public void setProtocol(String protocol) {
        this.protocol = protocol;
    }

    public void setAuth(String auth) {
        this.auth = auth;
    }

    public void setSslEnable(String sslEnable) {
        this.sslEnable = sslEnable;
    }

    public void setTlsEnable(String tlsEnable) {
        this.tlsEnable = tlsEnable;
    }

    public void setTlsRequired(String tlsRequired) {
        this.tlsRequired = tlsRequired;
    }

    public void setDebug(String debug) {
        this.debug = debug;
    }

    public void setEncoding(String encoding) {
        this.encoding = encoding;
    }

    public void setTimeout(String timeout) {
        this.timeout = timeout;
    }

    public void setConnTimeout(String connTimeout) {
        this.connTimeout = connTimeout;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof MailConfigOfView)) {
            return false;
        }
        MailConfigOfView other = (MailConfigOfView)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        Integer this$port = this.getPort();
        Integer other$port = other.getPort();
        if (this$port == null ? other$port != null : !((Object)this$port).equals(other$port)) {
            return false;
        }
        String this$host = this.getHost();
        String other$host = other.getHost();
        if (this$host == null ? other$host != null : !this$host.equals(other$host)) {
            return false;
        }
        String this$username = this.getUsername();
        String other$username = other.getUsername();
        if (this$username == null ? other$username != null : !this$username.equals(other$username)) {
            return false;
        }
        String this$password = this.getPassword();
        String other$password = other.getPassword();
        if (this$password == null ? other$password != null : !this$password.equals(other$password)) {
            return false;
        }
        String this$protocol = this.getProtocol();
        String other$protocol = other.getProtocol();
        if (this$protocol == null ? other$protocol != null : !this$protocol.equals(other$protocol)) {
            return false;
        }
        String this$auth = this.getAuth();
        String other$auth = other.getAuth();
        if (this$auth == null ? other$auth != null : !this$auth.equals(other$auth)) {
            return false;
        }
        String this$sslEnable = this.getSslEnable();
        String other$sslEnable = other.getSslEnable();
        if (this$sslEnable == null ? other$sslEnable != null : !this$sslEnable.equals(other$sslEnable)) {
            return false;
        }
        String this$tlsEnable = this.getTlsEnable();
        String other$tlsEnable = other.getTlsEnable();
        if (this$tlsEnable == null ? other$tlsEnable != null : !this$tlsEnable.equals(other$tlsEnable)) {
            return false;
        }
        String this$tlsRequired = this.getTlsRequired();
        String other$tlsRequired = other.getTlsRequired();
        if (this$tlsRequired == null ? other$tlsRequired != null : !this$tlsRequired.equals(other$tlsRequired)) {
            return false;
        }
        String this$debug = this.getDebug();
        String other$debug = other.getDebug();
        if (this$debug == null ? other$debug != null : !this$debug.equals(other$debug)) {
            return false;
        }
        String this$encoding = this.getEncoding();
        String other$encoding = other.getEncoding();
        if (this$encoding == null ? other$encoding != null : !this$encoding.equals(other$encoding)) {
            return false;
        }
        String this$timeout = this.getTimeout();
        String other$timeout = other.getTimeout();
        if (this$timeout == null ? other$timeout != null : !this$timeout.equals(other$timeout)) {
            return false;
        }
        String this$connTimeout = this.getConnTimeout();
        String other$connTimeout = other.getConnTimeout();
        return !(this$connTimeout == null ? other$connTimeout != null : !this$connTimeout.equals(other$connTimeout));
    }

    protected boolean canEqual(Object other) {
        return other instanceof MailConfigOfView;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        Integer $port = this.getPort();
        result = result * 59 + ($port == null ? 43 : ((Object)$port).hashCode());
        String $host = this.getHost();
        result = result * 59 + ($host == null ? 43 : $host.hashCode());
        String $username = this.getUsername();
        result = result * 59 + ($username == null ? 43 : $username.hashCode());
        String $password = this.getPassword();
        result = result * 59 + ($password == null ? 43 : $password.hashCode());
        String $protocol = this.getProtocol();
        result = result * 59 + ($protocol == null ? 43 : $protocol.hashCode());
        String $auth = this.getAuth();
        result = result * 59 + ($auth == null ? 43 : $auth.hashCode());
        String $sslEnable = this.getSslEnable();
        result = result * 59 + ($sslEnable == null ? 43 : $sslEnable.hashCode());
        String $tlsEnable = this.getTlsEnable();
        result = result * 59 + ($tlsEnable == null ? 43 : $tlsEnable.hashCode());
        String $tlsRequired = this.getTlsRequired();
        result = result * 59 + ($tlsRequired == null ? 43 : $tlsRequired.hashCode());
        String $debug = this.getDebug();
        result = result * 59 + ($debug == null ? 43 : $debug.hashCode());
        String $encoding = this.getEncoding();
        result = result * 59 + ($encoding == null ? 43 : $encoding.hashCode());
        String $timeout = this.getTimeout();
        result = result * 59 + ($timeout == null ? 43 : $timeout.hashCode());
        String $connTimeout = this.getConnTimeout();
        result = result * 59 + ($connTimeout == null ? 43 : $connTimeout.hashCode());
        return result;
    }

    public String toString() {
        return "MailConfigOfView(host=" + this.getHost() + ", username=" + this.getUsername() + ", password=" + this.getPassword() + ", port=" + this.getPort() + ", protocol=" + this.getProtocol() + ", auth=" + this.getAuth() + ", sslEnable=" + this.getSslEnable() + ", tlsEnable=" + this.getTlsEnable() + ", tlsRequired=" + this.getTlsRequired() + ", debug=" + this.getDebug() + ", encoding=" + this.getEncoding() + ", timeout=" + this.getTimeout() + ", connTimeout=" + this.getConnTimeout() + ")";
    }
}

