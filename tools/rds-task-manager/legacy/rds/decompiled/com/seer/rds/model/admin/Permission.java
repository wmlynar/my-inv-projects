/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.model.admin.Permission
 *  com.seer.rds.model.admin.Permission$PermissionBuilder
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

import com.seer.rds.model.admin.Permission;
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
@Table(name="t_permission")
public class Permission {
    @Id
    @GenericGenerator(name="idGenerator", strategy="uuid")
    @GeneratedValue(generator="idGenerator")
    private String id;
    private String name;
    private String description;
    @CreatedDate
    @Temporal(value=TemporalType.TIMESTAMP)
    @CreationTimestamp
    private Date createTime;
    @LastModifiedDate
    @Temporal(value=TemporalType.TIMESTAMP)
    @UpdateTimestamp
    private Date modifyTime;
    private Integer type;

    public static PermissionBuilder builder() {
        return new PermissionBuilder();
    }

    public String getId() {
        return this.id;
    }

    public String getName() {
        return this.name;
    }

    public String getDescription() {
        return this.description;
    }

    public Date getCreateTime() {
        return this.createTime;
    }

    public Date getModifyTime() {
        return this.modifyTime;
    }

    public Integer getType() {
        return this.type;
    }

    public void setId(String id) {
        this.id = id;
    }

    public void setName(String name) {
        this.name = name;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public void setCreateTime(Date createTime) {
        this.createTime = createTime;
    }

    public void setModifyTime(Date modifyTime) {
        this.modifyTime = modifyTime;
    }

    public void setType(Integer type) {
        this.type = type;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof Permission)) {
            return false;
        }
        Permission other = (Permission)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        Integer this$type = this.getType();
        Integer other$type = other.getType();
        if (this$type == null ? other$type != null : !((Object)this$type).equals(other$type)) {
            return false;
        }
        String this$id = this.getId();
        String other$id = other.getId();
        if (this$id == null ? other$id != null : !this$id.equals(other$id)) {
            return false;
        }
        String this$name = this.getName();
        String other$name = other.getName();
        if (this$name == null ? other$name != null : !this$name.equals(other$name)) {
            return false;
        }
        String this$description = this.getDescription();
        String other$description = other.getDescription();
        if (this$description == null ? other$description != null : !this$description.equals(other$description)) {
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
        return other instanceof Permission;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        Integer $type = this.getType();
        result = result * 59 + ($type == null ? 43 : ((Object)$type).hashCode());
        String $id = this.getId();
        result = result * 59 + ($id == null ? 43 : $id.hashCode());
        String $name = this.getName();
        result = result * 59 + ($name == null ? 43 : $name.hashCode());
        String $description = this.getDescription();
        result = result * 59 + ($description == null ? 43 : $description.hashCode());
        Date $createTime = this.getCreateTime();
        result = result * 59 + ($createTime == null ? 43 : ((Object)$createTime).hashCode());
        Date $modifyTime = this.getModifyTime();
        result = result * 59 + ($modifyTime == null ? 43 : ((Object)$modifyTime).hashCode());
        return result;
    }

    public String toString() {
        return "Permission(id=" + this.getId() + ", name=" + this.getName() + ", description=" + this.getDescription() + ", createTime=" + this.getCreateTime() + ", modifyTime=" + this.getModifyTime() + ", type=" + this.getType() + ")";
    }

    public Permission() {
    }

    public Permission(String id, String name, String description, Date createTime, Date modifyTime, Integer type) {
        this.id = id;
        this.name = name;
        this.description = description;
        this.createTime = createTime;
        this.modifyTime = modifyTime;
        this.type = type;
    }
}

