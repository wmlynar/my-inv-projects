/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.model.wind.WindTaskDefHistory
 *  com.seer.rds.model.wind.WindTaskDefHistory$WindTaskDefHistoryBuilder
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

import com.seer.rds.model.wind.WindTaskDefHistory;
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
@Table(name="t_taskdefhistory", uniqueConstraints={@UniqueConstraint(name="uniqLabel", columnNames={"label", "version"})})
public class WindTaskDefHistory {
    @Id
    @GenericGenerator(name="idGenerator", strategy="uuid")
    @GeneratedValue(generator="idGenerator")
    private String id;
    private String projectId;
    private Integer version;
    private String label;
    @Lob
    @Column(nullable=true)
    private String detail;
    @CreationTimestamp
    @Temporal(value=TemporalType.TIMESTAMP)
    private Date createDate;

    public static WindTaskDefHistoryBuilder builder() {
        return new WindTaskDefHistoryBuilder();
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

    public String getLabel() {
        return this.label;
    }

    public String getDetail() {
        return this.detail;
    }

    public Date getCreateDate() {
        return this.createDate;
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

    public void setLabel(String label) {
        this.label = label;
    }

    public void setDetail(String detail) {
        this.detail = detail;
    }

    public void setCreateDate(Date createDate) {
        this.createDate = createDate;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof WindTaskDefHistory)) {
            return false;
        }
        WindTaskDefHistory other = (WindTaskDefHistory)o;
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
        String this$label = this.getLabel();
        String other$label = other.getLabel();
        if (this$label == null ? other$label != null : !this$label.equals(other$label)) {
            return false;
        }
        String this$detail = this.getDetail();
        String other$detail = other.getDetail();
        if (this$detail == null ? other$detail != null : !this$detail.equals(other$detail)) {
            return false;
        }
        Date this$createDate = this.getCreateDate();
        Date other$createDate = other.getCreateDate();
        return !(this$createDate == null ? other$createDate != null : !((Object)this$createDate).equals(other$createDate));
    }

    protected boolean canEqual(Object other) {
        return other instanceof WindTaskDefHistory;
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
        String $label = this.getLabel();
        result = result * 59 + ($label == null ? 43 : $label.hashCode());
        String $detail = this.getDetail();
        result = result * 59 + ($detail == null ? 43 : $detail.hashCode());
        Date $createDate = this.getCreateDate();
        result = result * 59 + ($createDate == null ? 43 : ((Object)$createDate).hashCode());
        return result;
    }

    public String toString() {
        return "WindTaskDefHistory(id=" + this.getId() + ", projectId=" + this.getProjectId() + ", version=" + this.getVersion() + ", label=" + this.getLabel() + ", detail=" + this.getDetail() + ", createDate=" + this.getCreateDate() + ")";
    }

    public WindTaskDefHistory() {
    }

    public WindTaskDefHistory(String id, String projectId, Integer version, String label, String detail, Date createDate) {
        this.id = id;
        this.projectId = projectId;
        this.version = version;
        this.label = label;
        this.detail = detail;
        this.createDate = createDate;
    }
}

