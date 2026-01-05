/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.model.worksite.WorkSiteAttrData
 *  com.seer.rds.model.worksite.WorkSiteAttrData$WorkSiteAttrDataBuilder
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

import com.seer.rds.model.worksite.WorkSiteAttrData;
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
@Table(name="t_worksite_attr_data", indexes={@Index(name="worksiteAttrDataSiteIdIndex", columnList="siteId"), @Index(name="worksiteAttrDataAttributeIdIndex", columnList="attributeId")})
public class WorkSiteAttrData {
    @Id
    @GenericGenerator(name="idGenerator", strategy="uuid")
    @GeneratedValue(generator="idGenerator")
    private String id;
    private String siteId;
    private String attributeId;
    @Column(columnDefinition="varchar(1000)")
    private String attributeValue;
    @CreationTimestamp
    @Temporal(value=TemporalType.TIMESTAMP)
    private Date createTime;
    private String creator;
    @UpdateTimestamp
    @Temporal(value=TemporalType.TIMESTAMP)
    private Date modifyTime;
    private String modifyUser;

    public static WorkSiteAttrDataBuilder builder() {
        return new WorkSiteAttrDataBuilder();
    }

    public String getId() {
        return this.id;
    }

    public String getSiteId() {
        return this.siteId;
    }

    public String getAttributeId() {
        return this.attributeId;
    }

    public String getAttributeValue() {
        return this.attributeValue;
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

    public void setSiteId(String siteId) {
        this.siteId = siteId;
    }

    public void setAttributeId(String attributeId) {
        this.attributeId = attributeId;
    }

    public void setAttributeValue(String attributeValue) {
        this.attributeValue = attributeValue;
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
        if (!(o instanceof WorkSiteAttrData)) {
            return false;
        }
        WorkSiteAttrData other = (WorkSiteAttrData)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        String this$id = this.getId();
        String other$id = other.getId();
        if (this$id == null ? other$id != null : !this$id.equals(other$id)) {
            return false;
        }
        String this$siteId = this.getSiteId();
        String other$siteId = other.getSiteId();
        if (this$siteId == null ? other$siteId != null : !this$siteId.equals(other$siteId)) {
            return false;
        }
        String this$attributeId = this.getAttributeId();
        String other$attributeId = other.getAttributeId();
        if (this$attributeId == null ? other$attributeId != null : !this$attributeId.equals(other$attributeId)) {
            return false;
        }
        String this$attributeValue = this.getAttributeValue();
        String other$attributeValue = other.getAttributeValue();
        if (this$attributeValue == null ? other$attributeValue != null : !this$attributeValue.equals(other$attributeValue)) {
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
        return other instanceof WorkSiteAttrData;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        String $id = this.getId();
        result = result * 59 + ($id == null ? 43 : $id.hashCode());
        String $siteId = this.getSiteId();
        result = result * 59 + ($siteId == null ? 43 : $siteId.hashCode());
        String $attributeId = this.getAttributeId();
        result = result * 59 + ($attributeId == null ? 43 : $attributeId.hashCode());
        String $attributeValue = this.getAttributeValue();
        result = result * 59 + ($attributeValue == null ? 43 : $attributeValue.hashCode());
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
        return "WorkSiteAttrData(id=" + this.getId() + ", siteId=" + this.getSiteId() + ", attributeId=" + this.getAttributeId() + ", attributeValue=" + this.getAttributeValue() + ", createTime=" + this.getCreateTime() + ", creator=" + this.getCreator() + ", modifyTime=" + this.getModifyTime() + ", modifyUser=" + this.getModifyUser() + ")";
    }

    public WorkSiteAttrData() {
    }

    public WorkSiteAttrData(String id, String siteId, String attributeId, String attributeValue, Date createTime, String creator, Date modifyTime, String modifyUser) {
        this.id = id;
        this.siteId = siteId;
        this.attributeId = attributeId;
        this.attributeValue = attributeValue;
        this.createTime = createTime;
        this.creator = creator;
        this.modifyTime = modifyTime;
        this.modifyUser = modifyUser;
    }
}

