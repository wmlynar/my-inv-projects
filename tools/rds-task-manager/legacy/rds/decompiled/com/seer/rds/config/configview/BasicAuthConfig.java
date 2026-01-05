/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.config.configview.BasicAuthConfig
 */
package com.seer.rds.config.configview;

public class BasicAuthConfig {
    private Boolean enable = false;
    private String basicAuthUsername = "authUser";
    private String basicAuthPassword = "rds";

    public Boolean getEnable() {
        return this.enable;
    }

    public String getBasicAuthUsername() {
        return this.basicAuthUsername;
    }

    public String getBasicAuthPassword() {
        return this.basicAuthPassword;
    }

    public void setEnable(Boolean enable) {
        this.enable = enable;
    }

    public void setBasicAuthUsername(String basicAuthUsername) {
        this.basicAuthUsername = basicAuthUsername;
    }

    public void setBasicAuthPassword(String basicAuthPassword) {
        this.basicAuthPassword = basicAuthPassword;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof BasicAuthConfig)) {
            return false;
        }
        BasicAuthConfig other = (BasicAuthConfig)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        Boolean this$enable = this.getEnable();
        Boolean other$enable = other.getEnable();
        if (this$enable == null ? other$enable != null : !((Object)this$enable).equals(other$enable)) {
            return false;
        }
        String this$basicAuthUsername = this.getBasicAuthUsername();
        String other$basicAuthUsername = other.getBasicAuthUsername();
        if (this$basicAuthUsername == null ? other$basicAuthUsername != null : !this$basicAuthUsername.equals(other$basicAuthUsername)) {
            return false;
        }
        String this$basicAuthPassword = this.getBasicAuthPassword();
        String other$basicAuthPassword = other.getBasicAuthPassword();
        return !(this$basicAuthPassword == null ? other$basicAuthPassword != null : !this$basicAuthPassword.equals(other$basicAuthPassword));
    }

    protected boolean canEqual(Object other) {
        return other instanceof BasicAuthConfig;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        Boolean $enable = this.getEnable();
        result = result * 59 + ($enable == null ? 43 : ((Object)$enable).hashCode());
        String $basicAuthUsername = this.getBasicAuthUsername();
        result = result * 59 + ($basicAuthUsername == null ? 43 : $basicAuthUsername.hashCode());
        String $basicAuthPassword = this.getBasicAuthPassword();
        result = result * 59 + ($basicAuthPassword == null ? 43 : $basicAuthPassword.hashCode());
        return result;
    }

    public String toString() {
        return "BasicAuthConfig(enable=" + this.getEnable() + ", basicAuthUsername=" + this.getBasicAuthUsername() + ", basicAuthPassword=" + this.getBasicAuthPassword() + ")";
    }
}

