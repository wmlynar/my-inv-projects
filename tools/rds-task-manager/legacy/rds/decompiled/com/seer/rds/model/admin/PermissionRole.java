/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.model.admin.PermissionRole
 *  javax.persistence.Entity
 *  javax.persistence.EntityListeners
 *  javax.persistence.GeneratedValue
 *  javax.persistence.Id
 *  javax.persistence.Table
 *  javax.persistence.Temporal
 *  javax.persistence.TemporalType
 *  org.hibernate.annotations.CreationTimestamp
 *  org.hibernate.annotations.GenericGenerator
 *  org.hibernate.annotations.UpdateTimestamp
 *  org.springframework.data.annotation.CreatedDate
 *  org.springframework.data.annotation.LastModifiedDate
 *  org.springframework.data.jpa.domain.support.AuditingEntityListener
 */
package com.seer.rds.model.admin;

import java.util.Date;
import javax.persistence.Entity;
import javax.persistence.EntityListeners;
import javax.persistence.GeneratedValue;
import javax.persistence.Id;
import javax.persistence.Table;
import javax.persistence.Temporal;
import javax.persistence.TemporalType;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.GenericGenerator;
import org.hibernate.annotations.UpdateTimestamp;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

@EntityListeners(value={AuditingEntityListener.class})
@Entity
@Table(name="t_permission_role")
public class PermissionRole {
    @Id
    @GenericGenerator(name="idGenerator", strategy="uuid")
    @GeneratedValue(generator="idGenerator")
    private String id;
    private Integer pid;
    private Integer rid;
    private Integer status;
    @CreatedDate
    @Temporal(value=TemporalType.TIMESTAMP)
    @CreationTimestamp
    private Date createTime;
    @LastModifiedDate
    @Temporal(value=TemporalType.TIMESTAMP)
    @UpdateTimestamp
    private Date modifyTime;

    public String getId() {
        return this.id;
    }

    public Integer getPid() {
        return this.pid;
    }

    public Integer getRid() {
        return this.rid;
    }

    public Integer getStatus() {
        return this.status;
    }

    public Date getCreateTime() {
        return this.createTime;
    }

    public Date getModifyTime() {
        return this.modifyTime;
    }

    public void setId(String id) {
        this.id = id;
    }

    public void setPid(Integer pid) {
        this.pid = pid;
    }

    public void setRid(Integer rid) {
        this.rid = rid;
    }

    public void setStatus(Integer status) {
        this.status = status;
    }

    public void setCreateTime(Date createTime) {
        this.createTime = createTime;
    }

    public void setModifyTime(Date modifyTime) {
        this.modifyTime = modifyTime;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof PermissionRole)) {
            return false;
        }
        PermissionRole other = (PermissionRole)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        Integer this$pid = this.getPid();
        Integer other$pid = other.getPid();
        if (this$pid == null ? other$pid != null : !((Object)this$pid).equals(other$pid)) {
            return false;
        }
        Integer this$rid = this.getRid();
        Integer other$rid = other.getRid();
        if (this$rid == null ? other$rid != null : !((Object)this$rid).equals(other$rid)) {
            return false;
        }
        Integer this$status = this.getStatus();
        Integer other$status = other.getStatus();
        if (this$status == null ? other$status != null : !((Object)this$status).equals(other$status)) {
            return false;
        }
        String this$id = this.getId();
        String other$id = other.getId();
        if (this$id == null ? other$id != null : !this$id.equals(other$id)) {
            return false;
        }
        Date this$createTime = this.getCreateTime();
        Date other$createTime = other.getCreateTime();
        if (this$createTime == null ? other$createTime != null : !((Object)this$createTime).equals(other$createTime)) {
            return false;
        }
        Date this$modifyTime = this.getModifyTime();
        Date other$modifyTime = other.getModifyTime();
        return !(this$modifyTime == null ? other$modifyTime != null : !((Object)this$modifyTime).equals(other$modifyTime));
    }

    protected boolean canEqual(Object other) {
        return other instanceof PermissionRole;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        Integer $pid = this.getPid();
        result = result * 59 + ($pid == null ? 43 : ((Object)$pid).hashCode());
        Integer $rid = this.getRid();
        result = result * 59 + ($rid == null ? 43 : ((Object)$rid).hashCode());
        Integer $status = this.getStatus();
        result = result * 59 + ($status == null ? 43 : ((Object)$status).hashCode());
        String $id = this.getId();
        result = result * 59 + ($id == null ? 43 : $id.hashCode());
        Date $createTime = this.getCreateTime();
        result = result * 59 + ($createTime == null ? 43 : ((Object)$createTime).hashCode());
        Date $modifyTime = this.getModifyTime();
        result = result * 59 + ($modifyTime == null ? 43 : ((Object)$modifyTime).hashCode());
        return result;
    }

    public String toString() {
        return "PermissionRole(id=" + this.getId() + ", pid=" + this.getPid() + ", rid=" + this.getRid() + ", status=" + this.getStatus() + ", createTime=" + this.getCreateTime() + ", modifyTime=" + this.getModifyTime() + ")";
    }

    public PermissionRole() {
    }

    public PermissionRole(String id, Integer pid, Integer rid, Integer status, Date createTime, Date modifyTime) {
        this.id = id;
        this.pid = pid;
        this.rid = rid;
        this.status = status;
        this.createTime = createTime;
        this.modifyTime = modifyTime;
    }
}

