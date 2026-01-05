/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.model.wind.BaseRecord
 *  com.seer.rds.model.wind.InterfaceHandleRecord
 *  com.seer.rds.model.wind.InterfaceHandleRecord$InterfaceHandleRecordBuilder
 *  javax.persistence.Column
 *  javax.persistence.Entity
 *  javax.persistence.Index
 *  javax.persistence.Lob
 *  javax.persistence.Table
 */
package com.seer.rds.model.wind;

import com.seer.rds.model.wind.BaseRecord;
import com.seer.rds.model.wind.InterfaceHandleRecord;
import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.Index;
import javax.persistence.Lob;
import javax.persistence.Table;

@Entity
@Table(name="t_preinterfacecallrecord", indexes={@Index(name="statusCreatedOnIndex", columnList="status,createdOn"), @Index(name="taskDefLabelCreatedOnIndex", columnList="defLabel,createdOn"), @Index(name="methodCreatedOnIndex", columnList="method,createdOn"), @Index(name="urlCreatedOnIndex", columnList="url,createdOn"), @Index(name="CreatedOnIndex", columnList="createdOn")})
public class InterfaceHandleRecord
extends BaseRecord {
    @Lob
    @Column(nullable=true)
    private String responseBody;
    private String url;
    private String method;
    @Column(nullable=true)
    private String code;
    protected String taskRecordId;

    public static InterfaceHandleRecordBuilder builder() {
        return new InterfaceHandleRecordBuilder();
    }

    public String getResponseBody() {
        return this.responseBody;
    }

    public String getUrl() {
        return this.url;
    }

    public String getMethod() {
        return this.method;
    }

    public String getCode() {
        return this.code;
    }

    public String getTaskRecordId() {
        return this.taskRecordId;
    }

    public void setResponseBody(String responseBody) {
        this.responseBody = responseBody;
    }

    public void setUrl(String url) {
        this.url = url;
    }

    public void setMethod(String method) {
        this.method = method;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public void setTaskRecordId(String taskRecordId) {
        this.taskRecordId = taskRecordId;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof InterfaceHandleRecord)) {
            return false;
        }
        InterfaceHandleRecord other = (InterfaceHandleRecord)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        String this$responseBody = this.getResponseBody();
        String other$responseBody = other.getResponseBody();
        if (this$responseBody == null ? other$responseBody != null : !this$responseBody.equals(other$responseBody)) {
            return false;
        }
        String this$url = this.getUrl();
        String other$url = other.getUrl();
        if (this$url == null ? other$url != null : !this$url.equals(other$url)) {
            return false;
        }
        String this$method = this.getMethod();
        String other$method = other.getMethod();
        if (this$method == null ? other$method != null : !this$method.equals(other$method)) {
            return false;
        }
        String this$code = this.getCode();
        String other$code = other.getCode();
        if (this$code == null ? other$code != null : !this$code.equals(other$code)) {
            return false;
        }
        String this$taskRecordId = this.getTaskRecordId();
        String other$taskRecordId = other.getTaskRecordId();
        return !(this$taskRecordId == null ? other$taskRecordId != null : !this$taskRecordId.equals(other$taskRecordId));
    }

    protected boolean canEqual(Object other) {
        return other instanceof InterfaceHandleRecord;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        String $responseBody = this.getResponseBody();
        result = result * 59 + ($responseBody == null ? 43 : $responseBody.hashCode());
        String $url = this.getUrl();
        result = result * 59 + ($url == null ? 43 : $url.hashCode());
        String $method = this.getMethod();
        result = result * 59 + ($method == null ? 43 : $method.hashCode());
        String $code = this.getCode();
        result = result * 59 + ($code == null ? 43 : $code.hashCode());
        String $taskRecordId = this.getTaskRecordId();
        result = result * 59 + ($taskRecordId == null ? 43 : $taskRecordId.hashCode());
        return result;
    }

    public String toString() {
        return "InterfaceHandleRecord(responseBody=" + this.getResponseBody() + ", url=" + this.getUrl() + ", method=" + this.getMethod() + ", code=" + this.getCode() + ", taskRecordId=" + this.getTaskRecordId() + ")";
    }

    public InterfaceHandleRecord() {
    }

    public InterfaceHandleRecord(String responseBody, String url, String method, String code, String taskRecordId) {
        this.responseBody = responseBody;
        this.url = url;
        this.method = method;
        this.code = code;
        this.taskRecordId = taskRecordId;
    }
}

