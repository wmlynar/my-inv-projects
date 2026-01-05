/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.model.device.AgvAttr
 *  com.seer.rds.model.device.AgvAttr$AgvAttrBuilder
 *  javax.persistence.Entity
 *  javax.persistence.GeneratedValue
 *  javax.persistence.Id
 *  javax.persistence.Index
 *  javax.persistence.Table
 *  javax.persistence.Temporal
 *  javax.persistence.TemporalType
 *  org.hibernate.annotations.CreationTimestamp
 *  org.hibernate.annotations.GenericGenerator
 *  org.hibernate.annotations.UpdateTimestamp
 */
package com.seer.rds.model.device;

import com.seer.rds.model.device.AgvAttr;
import java.util.Date;
import javax.persistence.Entity;
import javax.persistence.GeneratedValue;
import javax.persistence.Id;
import javax.persistence.Index;
import javax.persistence.Table;
import javax.persistence.Temporal;
import javax.persistence.TemporalType;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.GenericGenerator;
import org.hibernate.annotations.UpdateTimestamp;

@Entity
@Table(name="t_agv_attr", indexes={@Index(name="agvNameIndex", columnList="agvName", unique=true)})
public class AgvAttr {
    @Id
    @GenericGenerator(name="idGenerator", strategy="uuid")
    @GeneratedValue(generator="idGenerator")
    private String id;
    private String agvName;
    @CreationTimestamp
    @Temporal(value=TemporalType.TIMESTAMP)
    private Date createTime;
    private String creator;
    @UpdateTimestamp
    @Temporal(value=TemporalType.TIMESTAMP)
    private Date modifyTime;
    private String modifyUser;

    public AgvAttr(String id, String agvName) {
        this.id = id;
        this.agvName = agvName;
    }

    public static AgvAttrBuilder builder() {
        return new AgvAttrBuilder();
    }

    public String getId() {
        return this.id;
    }

    public String getAgvName() {
        return this.agvName;
    }

    public Date getCreateTime() {
        return this.createTime;
    }

    public String getCreator() {
        return this.creator;
    }

    public Date getModifyTime() {
        return this.modifyTime;
    }

    public String getModifyUser() {
        return this.modifyUser;
    }

    public void setId(String id) {
        this.id = id;
    }

    public void setAgvName(String agvName) {
        this.agvName = agvName;
    }

    public void setCreateTime(Date createTime) {
        this.createTime = createTime;
    }

    public void setCreator(String creator) {
        this.creator = creator;
    }

    public void setModifyTime(Date modifyTime) {
        this.modifyTime = modifyTime;
    }

    public void setModifyUser(String modifyUser) {
        this.modifyUser = modifyUser;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof AgvAttr)) {
            return false;
        }
        AgvAttr other = (AgvAttr)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        String this$id = this.getId();
        String other$id = other.getId();
        if (this$id == null ? other$id != null : !this$id.equals(other$id)) {
            return false;
        }
        String this$agvName = this.getAgvName();
        String other$agvName = other.getAgvName();
        if (this$agvName == null ? other$agvName != null : !this$agvName.equals(other$agvName)) {
            return false;
        }
        Date this$createTime = this.getCreateTime();
        Date other$createTime = other.getCreateTime();
        if (this$createTime == null ? other$createTime != null : !((Object)this$createTime).equals(other$createTime)) {
            return false;
        }
        String this$creator = this.getCreator();
        String other$creator = other.getCreator();
        if (this$creator == null ? other$creator != null : !this$creator.equals(other$creator)) {
            return false;
        }
        Date this$modifyTime = this.getModifyTime();
        Date other$modifyTime = other.getModifyTime();
        if (this$modifyTime == null ? other$modifyTime != null : !((Object)this$modifyTime).equals(other$modifyTime)) {
            return false;
        }
        String this$modifyUser = this.getModifyUser();
        String other$modifyUser = other.getModifyUser();
        return !(this$modifyUser == null ? other$modifyUser != null : !this$modifyUser.equals(other$modifyUser));
    }

    protected boolean canEqual(Object other) {
        return other instanceof AgvAttr;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        String $id = this.getId();
        result = result * 59 + ($id == null ? 43 : $id.hashCode());
        String $agvName = this.getAgvName();
        result = result * 59 + ($agvName == null ? 43 : $agvName.hashCode());
        Date $createTime = this.getCreateTime();
        result = result * 59 + ($createTime == null ? 43 : ((Object)$createTime).hashCode());
        String $creator = this.getCreator();
        result = result * 59 + ($creator == null ? 43 : $creator.hashCode());
        Date $modifyTime = this.getModifyTime();
        result = result * 59 + ($modifyTime == null ? 43 : ((Object)$modifyTime).hashCode());
        String $modifyUser = this.getModifyUser();
        result = result * 59 + ($modifyUser == null ? 43 : $modifyUser.hashCode());
        return result;
    }

    public String toString() {
        return "AgvAttr(id=" + this.getId() + ", agvName=" + this.getAgvName() + ", createTime=" + this.getCreateTime() + ", creator=" + this.getCreator() + ", modifyTime=" + this.getModifyTime() + ", modifyUser=" + this.getModifyUser() + ")";
    }

    public AgvAttr() {
    }

    public AgvAttr(String id, String agvName, Date createTime, String creator, Date modifyTime, String modifyUser) {
        this.id = id;
        this.agvName = agvName;
        this.createTime = createTime;
        this.creator = creator;
        this.modifyTime = modifyTime;
        this.modifyUser = modifyUser;
    }
}

