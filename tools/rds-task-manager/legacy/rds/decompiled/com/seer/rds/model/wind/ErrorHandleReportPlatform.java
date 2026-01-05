/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.model.wind.ErrorHandleReportPlatform
 *  com.seer.rds.model.wind.ErrorHandleReportPlatform$ErrorHandleReportPlatformBuilder
 *  javax.persistence.Column
 *  javax.persistence.Entity
 *  javax.persistence.GeneratedValue
 *  javax.persistence.Id
 *  javax.persistence.Table
 *  org.hibernate.annotations.GenericGenerator
 */
package com.seer.rds.model.wind;

import com.seer.rds.model.wind.ErrorHandleReportPlatform;
import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.GeneratedValue;
import javax.persistence.Id;
import javax.persistence.Table;
import org.hibernate.annotations.GenericGenerator;

@Entity
@Table(name="t_ErrorHandleReportPlatform")
public class ErrorHandleReportPlatform {
    @Id
    @GenericGenerator(name="idGenerator", strategy="uuid")
    @GeneratedValue(generator="idGenerator")
    private String id;
    @Column(unique=true)
    private Integer platformType;
    private String platformName;
    private Boolean ifEnable;
    private Integer attempts = 3;

    public static ErrorHandleReportPlatformBuilder builder() {
        return new ErrorHandleReportPlatformBuilder();
    }

    public String getId() {
        return this.id;
    }

    public Integer getPlatformType() {
        return this.platformType;
    }

    public String getPlatformName() {
        return this.platformName;
    }

    public Boolean getIfEnable() {
        return this.ifEnable;
    }

    public Integer getAttempts() {
        return this.attempts;
    }

    public void setId(String id) {
        this.id = id;
    }

    public void setPlatformType(Integer platformType) {
        this.platformType = platformType;
    }

    public void setPlatformName(String platformName) {
        this.platformName = platformName;
    }

    public void setIfEnable(Boolean ifEnable) {
        this.ifEnable = ifEnable;
    }

    public void setAttempts(Integer attempts) {
        this.attempts = attempts;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof ErrorHandleReportPlatform)) {
            return false;
        }
        ErrorHandleReportPlatform other = (ErrorHandleReportPlatform)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        Integer this$platformType = this.getPlatformType();
        Integer other$platformType = other.getPlatformType();
        if (this$platformType == null ? other$platformType != null : !((Object)this$platformType).equals(other$platformType)) {
            return false;
        }
        Boolean this$ifEnable = this.getIfEnable();
        Boolean other$ifEnable = other.getIfEnable();
        if (this$ifEnable == null ? other$ifEnable != null : !((Object)this$ifEnable).equals(other$ifEnable)) {
            return false;
        }
        Integer this$attempts = this.getAttempts();
        Integer other$attempts = other.getAttempts();
        if (this$attempts == null ? other$attempts != null : !((Object)this$attempts).equals(other$attempts)) {
            return false;
        }
        String this$id = this.getId();
        String other$id = other.getId();
        if (this$id == null ? other$id != null : !this$id.equals(other$id)) {
            return false;
        }
        String this$platformName = this.getPlatformName();
        String other$platformName = other.getPlatformName();
        return !(this$platformName == null ? other$platformName != null : !this$platformName.equals(other$platformName));
    }

    protected boolean canEqual(Object other) {
        return other instanceof ErrorHandleReportPlatform;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        Integer $platformType = this.getPlatformType();
        result = result * 59 + ($platformType == null ? 43 : ((Object)$platformType).hashCode());
        Boolean $ifEnable = this.getIfEnable();
        result = result * 59 + ($ifEnable == null ? 43 : ((Object)$ifEnable).hashCode());
        Integer $attempts = this.getAttempts();
        result = result * 59 + ($attempts == null ? 43 : ((Object)$attempts).hashCode());
        String $id = this.getId();
        result = result * 59 + ($id == null ? 43 : $id.hashCode());
        String $platformName = this.getPlatformName();
        result = result * 59 + ($platformName == null ? 43 : $platformName.hashCode());
        return result;
    }

    public String toString() {
        return "ErrorHandleReportPlatform(id=" + this.getId() + ", platformType=" + this.getPlatformType() + ", platformName=" + this.getPlatformName() + ", ifEnable=" + this.getIfEnable() + ", attempts=" + this.getAttempts() + ")";
    }

    public ErrorHandleReportPlatform() {
    }

    public ErrorHandleReportPlatform(String id, Integer platformType, String platformName, Boolean ifEnable, Integer attempts) {
        this.id = id;
        this.platformType = platformType;
        this.platformName = platformName;
        this.ifEnable = ifEnable;
        this.attempts = attempts;
    }
}

