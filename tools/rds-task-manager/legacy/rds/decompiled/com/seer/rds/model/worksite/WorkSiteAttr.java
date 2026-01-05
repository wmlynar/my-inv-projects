/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.model.worksite.WorkSiteAttr
 *  com.seer.rds.model.worksite.WorkSiteAttr$WorkSiteAttrBuilder
 *  javax.persistence.Column
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
package com.seer.rds.model.worksite;

import com.seer.rds.model.worksite.WorkSiteAttr;
import java.util.Date;
import javax.persistence.Column;
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
@Table(name="t_worksite_attr", indexes={@Index(name="attributeNameIndex", columnList="attributeName", unique=true), @Index(name="isDelIndex", columnList="isDel")})
public class WorkSiteAttr {
    @Id
    @GenericGenerator(name="idGenerator", strategy="uuid")
    @GeneratedValue(generator="idGenerator")
    private String id;
    private String attributeName;
    private String attributeType;
    @CreationTimestamp
    @Temporal(value=TemporalType.TIMESTAMP)
    private Date createTime;
    private String creator;
    @Column(name="isDel", columnDefinition="int default 0")
    private Integer isDel;
    @UpdateTimestamp
    @Temporal(value=TemporalType.TIMESTAMP)
    private Date modifyTime;
    private String modifyUser;

    public WorkSiteAttr(String id, String attributeName) {
        this.id = id;
        this.attributeName = attributeName;
    }

    public static WorkSiteAttrBuilder builder() {
        return new WorkSiteAttrBuilder();
    }

    public String getId() {
        return this.id;
    }

    public String getAttributeName() {
        return this.attributeName;
    }

    public String getAttributeType() {
        return this.attributeType;
    }

    public Date getCreateTime() {
        return this.createTime;
    }

    public String getCreator() {
        return this.creator;
    }

    public Integer getIsDel() {
        return this.isDel;
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

    public void setAttributeName(String attributeName) {
        this.attributeName = attributeName;
    }

    public void setAttributeType(String attributeType) {
        this.attributeType = attributeType;
    }

    public void setCreateTime(Date createTime) {
        this.createTime = createTime;
    }

    public void setCreator(String creator) {
        this.creator = creator;
    }

    public void setIsDel(Integer isDel) {
        this.isDel = isDel;
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
        if (!(o instanceof WorkSiteAttr)) {
            return false;
        }
        WorkSiteAttr other = (WorkSiteAttr)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        Integer this$isDel = this.getIsDel();
        Integer other$isDel = other.getIsDel();
        if (this$isDel == null ? other$isDel != null : !((Object)this$isDel).equals(other$isDel)) {
            return false;
        }
        String this$id = this.getId();
        String other$id = other.getId();
        if (this$id == null ? other$id != null : !this$id.equals(other$id)) {
            return false;
        }
        String this$attributeName = this.getAttributeName();
        String other$attributeName = other.getAttributeName();
        if (this$attributeName == null ? other$attributeName != null : !this$attributeName.equals(other$attributeName)) {
            return false;
        }
        String this$attributeType = this.getAttributeType();
        String other$attributeType = other.getAttributeType();
        if (this$attributeType == null ? other$attributeType != null : !this$attributeType.equals(other$attributeType)) {
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
        return other instanceof WorkSiteAttr;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        Integer $isDel = this.getIsDel();
        result = result * 59 + ($isDel == null ? 43 : ((Object)$isDel).hashCode());
        String $id = this.getId();
        result = result * 59 + ($id == null ? 43 : $id.hashCode());
        String $attributeName = this.getAttributeName();
        result = result * 59 + ($attributeName == null ? 43 : $attributeName.hashCode());
        String $attributeType = this.getAttributeType();
        result = result * 59 + ($attributeType == null ? 43 : $attributeType.hashCode());
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
        return "WorkSiteAttr(id=" + this.getId() + ", attributeName=" + this.getAttributeName() + ", attributeType=" + this.getAttributeType() + ", createTime=" + this.getCreateTime() + ", creator=" + this.getCreator() + ", isDel=" + this.getIsDel() + ", modifyTime=" + this.getModifyTime() + ", modifyUser=" + this.getModifyUser() + ")";
    }

    public WorkSiteAttr() {
    }

    public WorkSiteAttr(String id, String attributeName, String attributeType, Date createTime, String creator, Integer isDel, Date modifyTime, String modifyUser) {
        this.id = id;
        this.attributeName = attributeName;
        this.attributeType = attributeType;
        this.createTime = createTime;
        this.creator = creator;
        this.isDel = isDel;
        this.modifyTime = modifyTime;
        this.modifyUser = modifyUser;
    }
}

