/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.vo.req.FindSitesReq
 *  com.seer.rds.vo.req.FindSitesReq$FindSitesReqBuilder
 *  io.swagger.annotations.ApiModel
 */
package com.seer.rds.vo.req;

import com.seer.rds.vo.req.FindSitesReq;
import io.swagger.annotations.ApiModel;
import java.io.Serializable;

@ApiModel(value="\u5bf9\u5916\u63a5\u53e3\u3001\u5730\u56fe\u67e5\u8be2\u5e93\u4f4d\u5217\u8868\u3001\u5e93\u4f4d\u5217\u8868\u9875\uff0c\u7684\u8bf7\u6c42\u5bf9\u8c61\uff0c\u5b57\u6bb5\u540e\u7eed\u9700\u8981\u53ef\u4ee5\u52a0")
public class FindSitesReq
implements Serializable {
    private String siteId;
    private String siteName;
    private Integer locked;
    private String lockedBy;
    private Integer filled;
    private Integer disabled;
    private Integer syncFailed;
    private String content;
    private String area;
    private Integer type;
    private String groupName;
    private String tags;
    private Boolean withExtFields;

    public static FindSitesReqBuilder builder() {
        return new FindSitesReqBuilder();
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

    public Integer getDisabled() {
        return this.disabled;
    }

    public Integer getSyncFailed() {
        return this.syncFailed;
    }

    public String getContent() {
        return this.content;
    }

    public String getArea() {
        return this.area;
    }

    public Integer getType() {
        return this.type;
    }

    public String getGroupName() {
        return this.groupName;
    }

    public String getTags() {
        return this.tags;
    }

    public Boolean getWithExtFields() {
        return this.withExtFields;
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

    public void setDisabled(Integer disabled) {
        this.disabled = disabled;
    }

    public void setSyncFailed(Integer syncFailed) {
        this.syncFailed = syncFailed;
    }

    public void setContent(String content) {
        this.content = content;
    }

    public void setArea(String area) {
        this.area = area;
    }

    public void setType(Integer type) {
        this.type = type;
    }

    public void setGroupName(String groupName) {
        this.groupName = groupName;
    }

    public void setTags(String tags) {
        this.tags = tags;
    }

    public void setWithExtFields(Boolean withExtFields) {
        this.withExtFields = withExtFields;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof FindSitesReq)) {
            return false;
        }
        FindSitesReq other = (FindSitesReq)o;
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
        Integer this$disabled = this.getDisabled();
        Integer other$disabled = other.getDisabled();
        if (this$disabled == null ? other$disabled != null : !((Object)this$disabled).equals(other$disabled)) {
            return false;
        }
        Integer this$syncFailed = this.getSyncFailed();
        Integer other$syncFailed = other.getSyncFailed();
        if (this$syncFailed == null ? other$syncFailed != null : !((Object)this$syncFailed).equals(other$syncFailed)) {
            return false;
        }
        Integer this$type = this.getType();
        Integer other$type = other.getType();
        if (this$type == null ? other$type != null : !((Object)this$type).equals(other$type)) {
            return false;
        }
        Boolean this$withExtFields = this.getWithExtFields();
        Boolean other$withExtFields = other.getWithExtFields();
        if (this$withExtFields == null ? other$withExtFields != null : !((Object)this$withExtFields).equals(other$withExtFields)) {
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
        String this$groupName = this.getGroupName();
        String other$groupName = other.getGroupName();
        if (this$groupName == null ? other$groupName != null : !this$groupName.equals(other$groupName)) {
            return false;
        }
        String this$tags = this.getTags();
        String other$tags = other.getTags();
        return !(this$tags == null ? other$tags != null : !this$tags.equals(other$tags));
    }

    protected boolean canEqual(Object other) {
        return other instanceof FindSitesReq;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        Integer $locked = this.getLocked();
        result = result * 59 + ($locked == null ? 43 : ((Object)$locked).hashCode());
        Integer $filled = this.getFilled();
        result = result * 59 + ($filled == null ? 43 : ((Object)$filled).hashCode());
        Integer $disabled = this.getDisabled();
        result = result * 59 + ($disabled == null ? 43 : ((Object)$disabled).hashCode());
        Integer $syncFailed = this.getSyncFailed();
        result = result * 59 + ($syncFailed == null ? 43 : ((Object)$syncFailed).hashCode());
        Integer $type = this.getType();
        result = result * 59 + ($type == null ? 43 : ((Object)$type).hashCode());
        Boolean $withExtFields = this.getWithExtFields();
        result = result * 59 + ($withExtFields == null ? 43 : ((Object)$withExtFields).hashCode());
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
        String $groupName = this.getGroupName();
        result = result * 59 + ($groupName == null ? 43 : $groupName.hashCode());
        String $tags = this.getTags();
        result = result * 59 + ($tags == null ? 43 : $tags.hashCode());
        return result;
    }

    public String toString() {
        return "FindSitesReq(siteId=" + this.getSiteId() + ", siteName=" + this.getSiteName() + ", locked=" + this.getLocked() + ", lockedBy=" + this.getLockedBy() + ", filled=" + this.getFilled() + ", disabled=" + this.getDisabled() + ", syncFailed=" + this.getSyncFailed() + ", content=" + this.getContent() + ", area=" + this.getArea() + ", type=" + this.getType() + ", groupName=" + this.getGroupName() + ", tags=" + this.getTags() + ", withExtFields=" + this.getWithExtFields() + ")";
    }

    public FindSitesReq(String siteId, String siteName, Integer locked, String lockedBy, Integer filled, Integer disabled, Integer syncFailed, String content, String area, Integer type, String groupName, String tags, Boolean withExtFields) {
        this.siteId = siteId;
        this.siteName = siteName;
        this.locked = locked;
        this.lockedBy = lockedBy;
        this.filled = filled;
        this.disabled = disabled;
        this.syncFailed = syncFailed;
        this.content = content;
        this.area = area;
        this.type = type;
        this.groupName = groupName;
        this.tags = tags;
        this.withExtFields = withExtFields;
    }

    public FindSitesReq() {
    }
}

