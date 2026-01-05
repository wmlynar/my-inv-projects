/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.model.admin.Role
 *  com.seer.rds.model.admin.Role$RoleBuilder
 *  javax.persistence.Column
 *  javax.persistence.Entity
 *  javax.persistence.EntityListeners
 *  javax.persistence.GeneratedValue
 *  javax.persistence.Id
 *  javax.persistence.Lob
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

import com.seer.rds.model.admin.Role;
import java.util.Date;
import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.EntityListeners;
import javax.persistence.GeneratedValue;
import javax.persistence.Id;
import javax.persistence.Lob;
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
@Table(name="t_role")
public class Role {
    @Id
    @GenericGenerator(name="idGenerator", strategy="uuid")
    @GeneratedValue(generator="idGenerator")
    private String id;
    private String name;
    private String code;
    private Integer status;
    @Lob
    @Column(nullable=true)
    private String permissions;
    @CreatedDate
    @Temporal(value=TemporalType.TIMESTAMP)
    @CreationTimestamp
    private Date createTime;
    @Column(nullable=true, columnDefinition="varchar(255)")
    private String workStations;
    @Column(nullable=true, columnDefinition="varchar(255)")
    private String workTypes;
    @LastModifiedDate
    @Temporal(value=TemporalType.TIMESTAMP)
    @UpdateTimestamp
    private Date modifyTime;

    public Role(String id, String name) {
        this.id = id;
        this.name = name;
    }

    public Role(String id, String name, String permissions) {
        this.id = id;
        this.name = name;
        this.permissions = permissions;
    }

    public Role(String id, String name, String permissions, String workStations, String workTypes) {
        this.id = id;
        this.name = name;
        this.permissions = permissions;
        this.workStations = workStations;
        this.workTypes = workTypes;
    }

    public static RoleBuilder builder() {
        return new RoleBuilder();
    }

    public String getId() {
        return this.id;
    }

    public String getName() {
        return this.name;
    }

    public String getCode() {
        return this.code;
    }

    public Integer getStatus() {
        return this.status;
    }

    public String getPermissions() {
        return this.permissions;
    }

    public Date getCreateTime() {
        return this.createTime;
    }

    public String getWorkStations() {
        return this.workStations;
    }

    public String getWorkTypes() {
        return this.workTypes;
    }

    public Date getModifyTime() {
        return this.modifyTime;
    }

    public void setId(String id) {
        this.id = id;
    }

    public void setName(String name) {
        this.name = name;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public void setStatus(Integer status) {
        this.status = status;
    }

    public void setPermissions(String permissions) {
        this.permissions = permissions;
    }

    public void setCreateTime(Date createTime) {
        this.createTime = createTime;
    }

    public void setWorkStations(String workStations) {
        this.workStations = workStations;
    }

    public void setWorkTypes(String workTypes) {
        this.workTypes = workTypes;
    }

    public void setModifyTime(Date modifyTime) {
        this.modifyTime = modifyTime;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof Role)) {
            return false;
        }
        Role other = (Role)o;
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
        String this$name = this.getName();
        String other$name = other.getName();
        if (this$name == null ? other$name != null : !this$name.equals(other$name)) {
            return false;
        }
        String this$code = this.getCode();
        String other$code = other.getCode();
        if (this$code == null ? other$code != null : !this$code.equals(other$code)) {
            return false;
        }
        String this$permissions = this.getPermissions();
        String other$permissions = other.getPermissions();
        if (this$permissions == null ? other$permissions != null : !this$permissions.equals(other$permissions)) {
            return false;
        }
        Date this$createTime = this.getCreateTime();
        Date other$createTime = other.getCreateTime();
        if (this$createTime == null ? other$createTime != null : !((Object)this$createTime).equals(other$createTime)) {
            return false;
        }
        String this$workStations = this.getWorkStations();
        String other$workStations = other.getWorkStations();
        if (this$workStations == null ? other$workStations != null : !this$workStations.equals(other$workStations)) {
            return false;
        }
        String this$workTypes = this.getWorkTypes();
        String other$workTypes = other.getWorkTypes();
        if (this$workTypes == null ? other$workTypes != null : !this$workTypes.equals(other$workTypes)) {
            return false;
        }
        Date this$modifyTime = this.getModifyTime();
        Date other$modifyTime = other.getModifyTime();
        return !(this$modifyTime == null ? other$modifyTime != null : !((Object)this$modifyTime).equals(other$modifyTime));
    }

    protected boolean canEqual(Object other) {
        return other instanceof Role;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        Integer $status = this.getStatus();
        result = result * 59 + ($status == null ? 43 : ((Object)$status).hashCode());
        String $id = this.getId();
        result = result * 59 + ($id == null ? 43 : $id.hashCode());
        String $name = this.getName();
        result = result * 59 + ($name == null ? 43 : $name.hashCode());
        String $code = this.getCode();
        result = result * 59 + ($code == null ? 43 : $code.hashCode());
        String $permissions = this.getPermissions();
        result = result * 59 + ($permissions == null ? 43 : $permissions.hashCode());
        Date $createTime = this.getCreateTime();
        result = result * 59 + ($createTime == null ? 43 : ((Object)$createTime).hashCode());
        String $workStations = this.getWorkStations();
        result = result * 59 + ($workStations == null ? 43 : $workStations.hashCode());
        String $workTypes = this.getWorkTypes();
        result = result * 59 + ($workTypes == null ? 43 : $workTypes.hashCode());
        Date $modifyTime = this.getModifyTime();
        result = result * 59 + ($modifyTime == null ? 43 : ((Object)$modifyTime).hashCode());
        return result;
    }

    public String toString() {
        return "Role(id=" + this.getId() + ", name=" + this.getName() + ", code=" + this.getCode() + ", status=" + this.getStatus() + ", permissions=" + this.getPermissions() + ", createTime=" + this.getCreateTime() + ", workStations=" + this.getWorkStations() + ", workTypes=" + this.getWorkTypes() + ", modifyTime=" + this.getModifyTime() + ")";
    }

    public Role() {
    }

    public Role(String id, String name, String code, Integer status, String permissions, Date createTime, String workStations, String workTypes, Date modifyTime) {
        this.id = id;
        this.name = name;
        this.code = code;
        this.status = status;
        this.permissions = permissions;
        this.createTime = createTime;
        this.workStations = workStations;
        this.workTypes = workTypes;
        this.modifyTime = modifyTime;
    }
}

