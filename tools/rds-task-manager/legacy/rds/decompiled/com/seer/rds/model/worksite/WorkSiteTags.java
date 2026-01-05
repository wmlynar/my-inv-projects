/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.model.worksite.WorkSiteTags
 *  com.seer.rds.model.worksite.WorkSiteTags$WorkSiteTagsBuilder
 *  javax.persistence.Entity
 *  javax.persistence.GeneratedValue
 *  javax.persistence.Id
 *  javax.persistence.Table
 *  org.hibernate.annotations.GenericGenerator
 */
package com.seer.rds.model.worksite;

import com.seer.rds.model.worksite.WorkSiteTags;
import javax.persistence.Entity;
import javax.persistence.GeneratedValue;
import javax.persistence.Id;
import javax.persistence.Table;
import org.hibernate.annotations.GenericGenerator;

@Entity
@Table(name="t_worksitetags")
public class WorkSiteTags {
    @Id
    @GenericGenerator(name="idGenerator", strategy="uuid")
    @GeneratedValue(generator="idGenerator")
    private String id;
    private String siteId;
    private String tags;
    private Integer orderNum;

    public static WorkSiteTagsBuilder builder() {
        return new WorkSiteTagsBuilder();
    }

    public String getId() {
        return this.id;
    }

    public String getSiteId() {
        return this.siteId;
    }

    public String getTags() {
        return this.tags;
    }

    public Integer getOrderNum() {
        return this.orderNum;
    }

    public void setId(String id) {
        this.id = id;
    }

    public void setSiteId(String siteId) {
        this.siteId = siteId;
    }

    public void setTags(String tags) {
        this.tags = tags;
    }

    public void setOrderNum(Integer orderNum) {
        this.orderNum = orderNum;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof WorkSiteTags)) {
            return false;
        }
        WorkSiteTags other = (WorkSiteTags)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        Integer this$orderNum = this.getOrderNum();
        Integer other$orderNum = other.getOrderNum();
        if (this$orderNum == null ? other$orderNum != null : !((Object)this$orderNum).equals(other$orderNum)) {
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
        String this$tags = this.getTags();
        String other$tags = other.getTags();
        return !(this$tags == null ? other$tags != null : !this$tags.equals(other$tags));
    }

    protected boolean canEqual(Object other) {
        return other instanceof WorkSiteTags;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        Integer $orderNum = this.getOrderNum();
        result = result * 59 + ($orderNum == null ? 43 : ((Object)$orderNum).hashCode());
        String $id = this.getId();
        result = result * 59 + ($id == null ? 43 : $id.hashCode());
        String $siteId = this.getSiteId();
        result = result * 59 + ($siteId == null ? 43 : $siteId.hashCode());
        String $tags = this.getTags();
        result = result * 59 + ($tags == null ? 43 : $tags.hashCode());
        return result;
    }

    public String toString() {
        return "WorkSiteTags(id=" + this.getId() + ", siteId=" + this.getSiteId() + ", tags=" + this.getTags() + ", orderNum=" + this.getOrderNum() + ")";
    }

    public WorkSiteTags() {
    }

    public WorkSiteTags(String id, String siteId, String tags, Integer orderNum) {
        this.id = id;
        this.siteId = siteId;
        this.tags = tags;
        this.orderNum = orderNum;
    }
}

