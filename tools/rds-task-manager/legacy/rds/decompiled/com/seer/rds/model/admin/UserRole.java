/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.model.admin.UserRole
 *  com.seer.rds.model.admin.UserRole$UserRoleBuilder
 *  javax.persistence.Column
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

import com.seer.rds.model.admin.UserRole;
import java.util.Date;
import javax.persistence.Column;
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
@Table(name="t_user_role")
public class UserRole {
    @Id
    @GenericGenerator(name="idGenerator", strategy="uuid")
    @GeneratedValue(generator="idGenerator")
    private String id;
    @Column(name="\"uid\"")
    private String uid;
    private String rid;
    private Integer status;
    @CreatedDate
    @Temporal(value=TemporalType.TIMESTAMP)
    @CreationTimestamp
    private Date createTime;
    @LastModifiedDate
    @Temporal(value=TemporalType.TIMESTAMP)
    @UpdateTimestamp
    private Date modifyTime;

    public static UserRoleBuilder builder() {
        return new UserRoleBuilder();
    }

    public String getId() {
        return this.id;
    }

    public String getUid() {
        return this.uid;
    }

    public String getRid() {
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

    public void setUid(String uid) {
        this.uid = uid;
    }

    public void setRid(String rid) {
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
        if (!(o instanceof UserRole)) {
            return false;
        }
        UserRole other = (UserRole)o;
        if (!other.canEqual((Object)this)) {
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
        String this$uid = this.getUid();
        String other$uid = other.getUid();
        if (this$uid == null ? other$uid != null : !this$uid.equals(other$uid)) {
            return false;
        }
        String this$rid = this.getRid();
        String other$rid = other.getRid();
        if (this$rid == null ? other$rid != null : !this$rid.equals(other$rid)) {
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
        return other instanceof UserRole;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        Integer $status = this.getStatus();
        result = result * 59 + ($status == null ? 43 : ((Object)$status).hashCode());
        String $id = this.getId();
        result = result * 59 + ($id == null ? 43 : $id.hashCode());
        String $uid = this.getUid();
        result = result * 59 + ($uid == null ? 43 : $uid.hashCode());
        String $rid = this.getRid();
        result = result * 59 + ($rid == null ? 43 : $rid.hashCode());
        Date $createTime = this.getCreateTime();
        result = result * 59 + ($createTime == null ? 43 : ((Object)$createTime).hashCode());
        Date $modifyTime = this.getModifyTime();
        result = result * 59 + ($modifyTime == null ? 43 : ((Object)$modifyTime).hashCode());
        return result;
    }

    public String toString() {
        return "UserRole(id=" + this.getId() + ", uid=" + this.getUid() + ", rid=" + this.getRid() + ", status=" + this.getStatus() + ", createTime=" + this.getCreateTime() + ", modifyTime=" + this.getModifyTime() + ")";
    }

    public UserRole() {
    }

    public UserRole(String id, String uid, String rid, Integer status, Date createTime, Date modifyTime) {
        this.id = id;
        this.uid = uid;
        this.rid = rid;
        this.status = status;
        this.createTime = createTime;
        this.modifyTime = modifyTime;
    }
}

