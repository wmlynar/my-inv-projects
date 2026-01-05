/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.model.wind.EventDef
 *  com.seer.rds.model.wind.EventDef$EventDefBuilder
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

import com.seer.rds.model.wind.EventDef;
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
@Table(name="t_eventdef", uniqueConstraints={@UniqueConstraint(name="uniq", columnNames={"label", "version"})})
public class EventDef {
    @Id
    @GenericGenerator(name="idGenerator", strategy="uuid")
    @GeneratedValue(generator="idGenerator")
    private String id;
    private String projectId;
    @CreationTimestamp
    @Temporal(value=TemporalType.TIMESTAMP)
    private Date createDate;
    private String label;
    private Boolean ifEnable = false;
    private String msg;
    @Column(nullable=true)
    @Lob
    private String detail;
    private Integer version;

    public static EventDefBuilder builder() {
        return new EventDefBuilder();
    }

    public String getId() {
        return this.id;
    }

    public String getProjectId() {
        return this.projectId;
    }

    public Date getCreateDate() {
        return this.createDate;
    }

    public String getLabel() {
        return this.label;
    }

    public Boolean getIfEnable() {
        return this.ifEnable;
    }

    public String getMsg() {
        return this.msg;
    }

    public String getDetail() {
        return this.detail;
    }

    public Integer getVersion() {
        return this.version;
    }

    public void setId(String id) {
        this.id = id;
    }

    public void setProjectId(String projectId) {
        this.projectId = projectId;
    }

    public void setCreateDate(Date createDate) {
        this.createDate = createDate;
    }

    public void setLabel(String label) {
        this.label = label;
    }

    public void setIfEnable(Boolean ifEnable) {
        this.ifEnable = ifEnable;
    }

    public void setMsg(String msg) {
        this.msg = msg;
    }

    public void setDetail(String detail) {
        this.detail = detail;
    }

    public void setVersion(Integer version) {
        this.version = version;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof EventDef)) {
            return false;
        }
        EventDef other = (EventDef)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        Boolean this$ifEnable = this.getIfEnable();
        Boolean other$ifEnable = other.getIfEnable();
        if (this$ifEnable == null ? other$ifEnable != null : !((Object)this$ifEnable).equals(other$ifEnable)) {
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
        Date this$createDate = this.getCreateDate();
        Date other$createDate = other.getCreateDate();
        if (this$createDate == null ? other$createDate != null : !((Object)this$createDate).equals(other$createDate)) {
            return false;
        }
        String this$label = this.getLabel();
        String other$label = other.getLabel();
        if (this$label == null ? other$label != null : !this$label.equals(other$label)) {
            return false;
        }
        String this$msg = this.getMsg();
        String other$msg = other.getMsg();
        if (this$msg == null ? other$msg != null : !this$msg.equals(other$msg)) {
            return false;
        }
        String this$detail = this.getDetail();
        String other$detail = other.getDetail();
        return !(this$detail == null ? other$detail != null : !this$detail.equals(other$detail));
    }

    protected boolean canEqual(Object other) {
        return other instanceof EventDef;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        Boolean $ifEnable = this.getIfEnable();
        result = result * 59 + ($ifEnable == null ? 43 : ((Object)$ifEnable).hashCode());
        Integer $version = this.getVersion();
        result = result * 59 + ($version == null ? 43 : ((Object)$version).hashCode());
        String $id = this.getId();
        result = result * 59 + ($id == null ? 43 : $id.hashCode());
        String $projectId = this.getProjectId();
        result = result * 59 + ($projectId == null ? 43 : $projectId.hashCode());
        Date $createDate = this.getCreateDate();
        result = result * 59 + ($createDate == null ? 43 : ((Object)$createDate).hashCode());
        String $label = this.getLabel();
        result = result * 59 + ($label == null ? 43 : $label.hashCode());
        String $msg = this.getMsg();
        result = result * 59 + ($msg == null ? 43 : $msg.hashCode());
        String $detail = this.getDetail();
        result = result * 59 + ($detail == null ? 43 : $detail.hashCode());
        return result;
    }

    public String toString() {
        return "EventDef(id=" + this.getId() + ", projectId=" + this.getProjectId() + ", createDate=" + this.getCreateDate() + ", label=" + this.getLabel() + ", ifEnable=" + this.getIfEnable() + ", msg=" + this.getMsg() + ", detail=" + this.getDetail() + ", version=" + this.getVersion() + ")";
    }

    public EventDef() {
    }

    public EventDef(String id, String projectId, Date createDate, String label, Boolean ifEnable, String msg, String detail, Integer version) {
        this.id = id;
        this.projectId = projectId;
        this.createDate = createDate;
        this.label = label;
        this.ifEnable = ifEnable;
        this.msg = msg;
        this.detail = detail;
        this.version = version;
    }
}

