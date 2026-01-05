/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.vo.DatabaseConfigVo
 *  io.swagger.annotations.ApiModel
 *  io.swagger.annotations.ApiModelProperty
 */
package com.seer.rds.vo;

import io.swagger.annotations.ApiModel;
import io.swagger.annotations.ApiModelProperty;

@ApiModel(value="\u6570\u636e\u5e93\u53c2\u6570\u914d\u7f6e\u5bf9\u8c61")
public class DatabaseConfigVo {
    @ApiModelProperty(value="\u6570\u636e\u5e93\u7c7b\u578b\uff08MYSQL, SQLSERVER\uff09", name="databaseType", required=true)
    private String databaseType;
    @ApiModelProperty(value="URL", name="databaseUrl", required=true)
    private String databaseUrl;
    @ApiModelProperty(value="\u7528\u6237\u540d", name="databaseUsername", required=true)
    private String databaseUsername;
    @ApiModelProperty(value="\u5bc6\u7801", name="databasePassword", required=true)
    private String databasePassword;

    public String getDatabaseType() {
        return this.databaseType;
    }

    public String getDatabaseUrl() {
        return this.databaseUrl;
    }

    public String getDatabaseUsername() {
        return this.databaseUsername;
    }

    public String getDatabasePassword() {
        return this.databasePassword;
    }

    public void setDatabaseType(String databaseType) {
        this.databaseType = databaseType;
    }

    public void setDatabaseUrl(String databaseUrl) {
        this.databaseUrl = databaseUrl;
    }

    public void setDatabaseUsername(String databaseUsername) {
        this.databaseUsername = databaseUsername;
    }

    public void setDatabasePassword(String databasePassword) {
        this.databasePassword = databasePassword;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof DatabaseConfigVo)) {
            return false;
        }
        DatabaseConfigVo other = (DatabaseConfigVo)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        String this$databaseType = this.getDatabaseType();
        String other$databaseType = other.getDatabaseType();
        if (this$databaseType == null ? other$databaseType != null : !this$databaseType.equals(other$databaseType)) {
            return false;
        }
        String this$databaseUrl = this.getDatabaseUrl();
        String other$databaseUrl = other.getDatabaseUrl();
        if (this$databaseUrl == null ? other$databaseUrl != null : !this$databaseUrl.equals(other$databaseUrl)) {
            return false;
        }
        String this$databaseUsername = this.getDatabaseUsername();
        String other$databaseUsername = other.getDatabaseUsername();
        if (this$databaseUsername == null ? other$databaseUsername != null : !this$databaseUsername.equals(other$databaseUsername)) {
            return false;
        }
        String this$databasePassword = this.getDatabasePassword();
        String other$databasePassword = other.getDatabasePassword();
        return !(this$databasePassword == null ? other$databasePassword != null : !this$databasePassword.equals(other$databasePassword));
    }

    protected boolean canEqual(Object other) {
        return other instanceof DatabaseConfigVo;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        String $databaseType = this.getDatabaseType();
        result = result * 59 + ($databaseType == null ? 43 : $databaseType.hashCode());
        String $databaseUrl = this.getDatabaseUrl();
        result = result * 59 + ($databaseUrl == null ? 43 : $databaseUrl.hashCode());
        String $databaseUsername = this.getDatabaseUsername();
        result = result * 59 + ($databaseUsername == null ? 43 : $databaseUsername.hashCode());
        String $databasePassword = this.getDatabasePassword();
        result = result * 59 + ($databasePassword == null ? 43 : $databasePassword.hashCode());
        return result;
    }

    public String toString() {
        return "DatabaseConfigVo(databaseType=" + this.getDatabaseType() + ", databaseUrl=" + this.getDatabaseUrl() + ", databaseUsername=" + this.getDatabaseUsername() + ", databasePassword=" + this.getDatabasePassword() + ")";
    }

    public DatabaseConfigVo() {
    }

    public DatabaseConfigVo(String databaseType, String databaseUrl, String databaseUsername, String databasePassword) {
        this.databaseType = databaseType;
        this.databaseUrl = databaseUrl;
        this.databaseUsername = databaseUsername;
        this.databasePassword = databasePassword;
    }
}

