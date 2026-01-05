/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.model.wind.ErrorReportStatus
 *  com.seer.rds.model.wind.ErrorReportStatus$ErrorReportStatusBuilder
 *  javax.persistence.Entity
 *  javax.persistence.GeneratedValue
 *  javax.persistence.Id
 *  javax.persistence.Table
 *  org.hibernate.annotations.GenericGenerator
 */
package com.seer.rds.model.wind;

import com.seer.rds.model.wind.ErrorReportStatus;
import javax.persistence.Entity;
import javax.persistence.GeneratedValue;
import javax.persistence.Id;
import javax.persistence.Table;
import org.hibernate.annotations.GenericGenerator;

@Entity
@Table(name="t_ErrorReportStatus")
public class ErrorReportStatus {
    @Id
    @GenericGenerator(name="idGenerator", strategy="uuid")
    @GeneratedValue(generator="idGenerator")
    private String id;
    private String errorHandleId;
    private Integer platformType;
    private String status;
    private Integer attempts;
    private String failureReason;

    public static ErrorReportStatusBuilder builder() {
        return new ErrorReportStatusBuilder();
    }

    public String getId() {
        return this.id;
    }

    public String getErrorHandleId() {
        return this.errorHandleId;
    }

    public Integer getPlatformType() {
        return this.platformType;
    }

    public String getStatus() {
        return this.status;
    }

    public Integer getAttempts() {
        return this.attempts;
    }

    public String getFailureReason() {
        return this.failureReason;
    }

    public void setId(String id) {
        this.id = id;
    }

    public void setErrorHandleId(String errorHandleId) {
        this.errorHandleId = errorHandleId;
    }

    public void setPlatformType(Integer platformType) {
        this.platformType = platformType;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public void setAttempts(Integer attempts) {
        this.attempts = attempts;
    }

    public void setFailureReason(String failureReason) {
        this.failureReason = failureReason;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof ErrorReportStatus)) {
            return false;
        }
        ErrorReportStatus other = (ErrorReportStatus)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        Integer this$platformType = this.getPlatformType();
        Integer other$platformType = other.getPlatformType();
        if (this$platformType == null ? other$platformType != null : !((Object)this$platformType).equals(other$platformType)) {
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
        String this$errorHandleId = this.getErrorHandleId();
        String other$errorHandleId = other.getErrorHandleId();
        if (this$errorHandleId == null ? other$errorHandleId != null : !this$errorHandleId.equals(other$errorHandleId)) {
            return false;
        }
        String this$status = this.getStatus();
        String other$status = other.getStatus();
        if (this$status == null ? other$status != null : !this$status.equals(other$status)) {
            return false;
        }
        String this$failureReason = this.getFailureReason();
        String other$failureReason = other.getFailureReason();
        return !(this$failureReason == null ? other$failureReason != null : !this$failureReason.equals(other$failureReason));
    }

    protected boolean canEqual(Object other) {
        return other instanceof ErrorReportStatus;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        Integer $platformType = this.getPlatformType();
        result = result * 59 + ($platformType == null ? 43 : ((Object)$platformType).hashCode());
        Integer $attempts = this.getAttempts();
        result = result * 59 + ($attempts == null ? 43 : ((Object)$attempts).hashCode());
        String $id = this.getId();
        result = result * 59 + ($id == null ? 43 : $id.hashCode());
        String $errorHandleId = this.getErrorHandleId();
        result = result * 59 + ($errorHandleId == null ? 43 : $errorHandleId.hashCode());
        String $status = this.getStatus();
        result = result * 59 + ($status == null ? 43 : $status.hashCode());
        String $failureReason = this.getFailureReason();
        result = result * 59 + ($failureReason == null ? 43 : $failureReason.hashCode());
        return result;
    }

    public String toString() {
        return "ErrorReportStatus(id=" + this.getId() + ", errorHandleId=" + this.getErrorHandleId() + ", platformType=" + this.getPlatformType() + ", status=" + this.getStatus() + ", attempts=" + this.getAttempts() + ", failureReason=" + this.getFailureReason() + ")";
    }

    public ErrorReportStatus() {
    }

    public ErrorReportStatus(String id, String errorHandleId, Integer platformType, String status, Integer attempts, String failureReason) {
        this.id = id;
        this.errorHandleId = errorHandleId;
        this.platformType = platformType;
        this.status = status;
        this.attempts = attempts;
        this.failureReason = failureReason;
    }
}

