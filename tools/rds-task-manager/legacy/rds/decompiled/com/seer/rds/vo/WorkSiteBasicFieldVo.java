/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.vo.WorkSiteBasicFieldVo
 *  com.seer.rds.vo.WorkSiteBasicFieldVo$WorkSiteBasicFieldVoBuilder
 */
package com.seer.rds.vo;

import com.seer.rds.vo.WorkSiteBasicFieldVo;

public class WorkSiteBasicFieldVo {
    private String siteId;
    private String siteName;
    private Integer locked;
    private String lockedBy;
    private Integer filled;
    private String content;
    private String area;
    private String tags;
    private Integer type;
    private String groupName;

    public static WorkSiteBasicFieldVoBuilder builder() {
        return new WorkSiteBasicFieldVoBuilder();
    }

    public String getSiteId() {
        return this.siteId;
    }

    public String getSiteName() {
        return this.siteName;
    }

    public Integer getLocked() {
        return this.locked;
    }

    public String getLockedBy() {
        return this.lockedBy;
    }

    public Integer getFilled() {
        return this.filled;
    }

    public String getContent() {
        return this.content;
    }

    public String getArea() {
        return this.area;
    }

    public String getTags() {
        return this.tags;
    }

    public Integer getType() {
        return this.type;
    }

    public String getGroupName() {
        return this.groupName;
    }

    public void setSiteId(String siteId) {
        this.siteId = siteId;
    }

    public void setSiteName(String siteName) {
        this.siteName = siteName;
    }

    public void setLocked(Integer locked) {
        this.locked = locked;
    }

    public void setLockedBy(String lockedBy) {
        this.lockedBy = lockedBy;
    }

    public void setFilled(Integer filled) {
        this.filled = filled;
    }

    public void setContent(String content) {
        this.content = content;
    }

    public void setArea(String area) {
        this.area = area;
    }

    public void setTags(String tags) {
        this.tags = tags;
    }

    public void setType(Integer type) {
        this.type = type;
    }

    public void setGroupName(String groupName) {
        this.groupName = groupName;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof WorkSiteBasicFieldVo)) {
            return false;
        }
        WorkSiteBasicFieldVo other = (WorkSiteBasicFieldVo)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        Integer this$locked = this.getLocked();
        Integer other$locked = other.getLocked();
        if (this$locked == null ? other$locked != null : !((Object)this$locked).equals(other$locked)) {
            return false;
        }
        Integer this$filled = this.getFilled();
        Integer other$filled = other.getFilled();
        if (this$filled == null ? other$filled != null : !((Object)this$filled).equals(other$filled)) {
            return false;
        }
        Integer this$type = this.getType();
        Integer other$type = other.getType();
        if (this$type == null ? other$type != null : !((Object)this$type).equals(other$type)) {
            return false;
        }
        String this$siteId = this.getSiteId();
        String other$siteId = other.getSiteId();
        if (this$siteId == null ? other$siteId != null : !this$siteId.equals(other$siteId)) {
            return false;
        }
        String this$siteName = this.getSiteName();
        String other$siteName = other.getSiteName();
        if (this$siteName == null ? other$siteName != null : !this$siteName.equals(other$siteName)) {
            return false;
        }
        String this$lockedBy = this.getLockedBy();
        String other$lockedBy = other.getLockedBy();
        if (this$lockedBy == null ? other$lockedBy != null : !this$lockedBy.equals(other$lockedBy)) {
            return false;
        }
        String this$content = this.getContent();
        String other$content = other.getContent();
        if (this$content == null ? other$content != null : !this$content.equals(other$content)) {
            return false;
        }
        String this$area = this.getArea();
        String other$area = other.getArea();
        if (this$area == null ? other$area != null : !this$area.equals(other$area)) {
            return false;
        }
        String this$tags = this.getTags();
        String other$tags = other.getTags();
        if (this$tags == null ? other$tags != null : !this$tags.equals(other$tags)) {
            return false;
        }
        String this$groupName = this.getGroupName();
        String other$groupName = other.getGroupName();
        return !(this$groupName == null ? other$groupName != null : !this$groupName.equals(other$groupName));
    }

    protected boolean canEqual(Object other) {
        return other instanceof WorkSiteBasicFieldVo;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        Integer $locked = this.getLocked();
        result = result * 59 + ($locked == null ? 43 : ((Object)$locked).hashCode());
        Integer $filled = this.getFilled();
        result = result * 59 + ($filled == null ? 43 : ((Object)$filled).hashCode());
        Integer $type = this.getType();
        result = result * 59 + ($type == null ? 43 : ((Object)$type).hashCode());
        String $siteId = this.getSiteId();
        result = result * 59 + ($siteId == null ? 43 : $siteId.hashCode());
        String $siteName = this.getSiteName();
        result = result * 59 + ($siteName == null ? 43 : $siteName.hashCode());
        String $lockedBy = this.getLockedBy();
        result = result * 59 + ($lockedBy == null ? 43 : $lockedBy.hashCode());
        String $content = this.getContent();
        result = result * 59 + ($content == null ? 43 : $content.hashCode());
        String $area = this.getArea();
        result = result * 59 + ($area == null ? 43 : $area.hashCode());
        String $tags = this.getTags();
        result = result * 59 + ($tags == null ? 43 : $tags.hashCode());
        String $groupName = this.getGroupName();
        result = result * 59 + ($groupName == null ? 43 : $groupName.hashCode());
        return result;
    }

    public String toString() {
        return "WorkSiteBasicFieldVo(siteId=" + this.getSiteId() + ", siteName=" + this.getSiteName() + ", locked=" + this.getLocked() + ", lockedBy=" + this.getLockedBy() + ", filled=" + this.getFilled() + ", content=" + this.getContent() + ", area=" + this.getArea() + ", tags=" + this.getTags() + ", type=" + this.getType() + ", groupName=" + this.getGroupName() + ")";
    }

    public WorkSiteBasicFieldVo() {
    }

    public WorkSiteBasicFieldVo(String siteId, String siteName, Integer locked, String lockedBy, Integer filled, String content, String area, String tags, Integer type, String groupName) {
        this.siteId = siteId;
        this.siteName = siteName;
        this.locked = locked;
        this.lockedBy = lockedBy;
        this.filled = filled;
        this.content = content;
        this.area = area;
        this.tags = tags;
        this.type = type;
        this.groupName = groupName;
    }
}

