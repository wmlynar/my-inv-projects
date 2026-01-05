/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.model.wind.InterfaceDefHistory
 *  com.seer.rds.model.wind.InterfaceDefHistory$InterfaceDefHistoryBuilder
 *  javax.persistence.Column
 *  javax.persistence.Entity
 *  javax.persistence.GeneratedValue
 *  javax.persistence.Id
 *  javax.persistence.Lob
 *  javax.persistence.Table
 *  javax.persistence.Temporal
 *  javax.persistence.TemporalType
 *  javax.persistence.UniqueConstraint
 *  org.hibernate.annotations.CreationTimestamp
 *  org.hibernate.annotations.GenericGenerator
 */
package com.seer.rds.model.wind;

import com.seer.rds.model.wind.InterfaceDefHistory;
import java.util.Date;
import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.GeneratedValue;
import javax.persistence.Id;
import javax.persistence.Lob;
import javax.persistence.Table;
import javax.persistence.Temporal;
import javax.persistence.TemporalType;
import javax.persistence.UniqueConstraint;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.GenericGenerator;

@Entity
@Table(name="t_interfacedefhistory", uniqueConstraints={@UniqueConstraint(name="uniq", columnNames={"method", "url", "version"})})
public class InterfaceDefHistory {
    @Id
    @GenericGenerator(name="idGenerator", strategy="uuid")
    @GeneratedValue(generator="idGenerator")
    private String id;
    private String projectId;
    private Integer version;
    @Column(nullable=false)
    private String url;
    @Column(nullable=false)
    private String method;
    @CreationTimestamp
    @Temporal(value=TemporalType.TIMESTAMP)
    private Date createDate;
    @Lob
    @Column(nullable=true)
    private String detail;

    public static InterfaceDefHistoryBuilder builder() {
        return new InterfaceDefHistoryBuilder();
    }

    public String getId() {
        return this.id;
    }

    public String getProjectId() {
        return this.projectId;
    }

    public Integer getVersion() {
        return this.version;
    }

    public String getUrl() {
        return this.url;
    }

    public String getMethod() {
        return this.method;
    }

    public Date getCreateDate() {
        return this.createDate;
    }

    public String getDetail() {
        return this.detail;
    }

    public void setId(String id) {
        this.id = id;
    }

    public void setProjectId(String projectId) {
        this.projectId = projectId;
    }

    public void setVersion(Integer version) {
        this.version = version;
    }

    public void setUrl(String url) {
        this.url = url;
    }

    public void setMethod(String method) {
        this.method = method;
    }

    public void setCreateDate(Date createDate) {
        this.createDate = createDate;
    }

    public void setDetail(String detail) {
        this.detail = detail;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof InterfaceDefHistory)) {
            return false;
        }
        InterfaceDefHistory other = (InterfaceDefHistory)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        Integer this$version = this.getVersion();
        Integer other$version = other.getVersion();
        if (this$version == null ? other$version != null : !((Object)this$version).equals(other$version)) {
            return false;
        }
        String this$id = this.getId();
        String other$id = other.getId();
        if (this$id == null ? other$id != null : !this$id.equals(other$id)) {
            return false;
        }
        String this$projectId = this.getProjectId();
        String other$projectId = other.getProjectId();
        if (this$projectId == null ? other$projectId != null : !this$projectId.equals(other$projectId)) {
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
        Date this$createDate = this.getCreateDate();
        Date other$createDate = other.getCreateDate();
        if (this$createDate == null ? other$createDate != null : !((Object)this$createDate).equals(other$createDate)) {
            return false;
        }
        String this$detail = this.getDetail();
        String other$detail = other.getDetail();
        return !(this$detail == null ? other$detail != null : !this$detail.equals(other$detail));
    }

    protected boolean canEqual(Object other) {
        return other instanceof InterfaceDefHistory;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        Integer $version = this.getVersion();
        result = result * 59 + ($version == null ? 43 : ((Object)$version).hashCode());
        String $id = this.getId();
        result = result * 59 + ($id == null ? 43 : $id.hashCode());
        String $projectId = this.getProjectId();
        result = result * 59 + ($projectId == null ? 43 : $projectId.hashCode());
        String $url = this.getUrl();
        result = result * 59 + ($url == null ? 43 : $url.hashCode());
        String $method = this.getMethod();
        result = result * 59 + ($method == null ? 43 : $method.hashCode());
        Date $createDate = this.getCreateDate();
        result = result * 59 + ($createDate == null ? 43 : ((Object)$createDate).hashCode());
        String $detail = this.getDetail();
        result = result * 59 + ($detail == null ? 43 : $detail.hashCode());
        return result;
    }

    public String toString() {
        return "InterfaceDefHistory(id=" + this.getId() + ", projectId=" + this.getProjectId() + ", version=" + this.getVersion() + ", url=" + this.getUrl() + ", method=" + this.getMethod() + ", createDate=" + this.getCreateDate() + ", detail=" + this.getDetail() + ")";
    }

    public InterfaceDefHistory() {
    }

    public InterfaceDefHistory(String id, String projectId, Integer version, String url, String method, Date createDate, String detail) {
        this.id = id;
        this.projectId = projectId;
        this.version = version;
        this.url = url;
        this.method = method;
        this.createDate = createDate;
        this.detail = detail;
    }
}

