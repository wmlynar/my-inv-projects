/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.alibaba.fastjson.JSONObject
 *  com.seer.rds.annotation.Description
 *  com.seer.rds.model.worksite.WorkSite
 *  com.seer.rds.vo.WorkSiteVo
 *  com.seer.rds.vo.WorkSiteVo$WorkSiteVoBuilder
 */
package com.seer.rds.vo;

import com.alibaba.fastjson.JSONObject;
import com.seer.rds.annotation.Description;
import com.seer.rds.model.worksite.WorkSite;
import com.seer.rds.vo.WorkSiteVo;

public class WorkSiteVo {
    private String id;
    private String projectId;
    @Description(value="@{WorkSite.siteId}")
    private String siteId;
    @Description(value="@{WorkSite.siteName}")
    private String siteName;
    private Boolean working;
    @Description(value="@{WorkSite.locked}")
    private Boolean locked;
    @Description(value="@{WorkSite.lockedBy}")
    private String lockedBy;
    private Boolean preparing;
    @Description(value="@{WorkSite.filled}")
    private Boolean filled;
    @Description(value="@{WorkSite.disabled}")
    private Boolean disabled;
    @Description(value="@{WorkSite.syncFailed}")
    private Boolean syncFailed;
    @Description(value="@{WorkSite.content}")
    private String content;
    @Description(value="@{WorkSite.area}")
    private String area;
    @Description(value="@{WorkSite.rowNum}")
    private String rowNum;
    @Description(value="@{WorkSite.colNum}")
    private String colNum;
    @Description(value="@{WorkSite.level}")
    private String level;
    @Description(value="@{WorkSite.depth}")
    private String depth;
    private String no;
    @Description(value="@{WorkSite.agvId}")
    private String agvId;
    private String tags;
    @Description(value="@{WorkSite.type}")
    private Integer type;
    @Description(value="@{WorkSite.groupName}")
    private String groupName;
    private String siteLabel;
    private Boolean lockSuccess;
    private WorkSite oldWorkSite;
    private WorkSite newWorkSite;

    public WorkSiteVo(String siteLabel, Boolean lockSuccess, String agvId) {
        this.siteLabel = siteLabel;
        this.lockSuccess = lockSuccess;
        this.agvId = agvId;
    }

    public static void main(String[] args) {
        WorkSiteVo v = new WorkSiteVo();
        v.setArea("abc");
        v.setContent("abc");
        v.setDepth("2");
        v.setColNum("4");
        v.setDisabled(Boolean.valueOf(true));
        v.setFilled(Boolean.valueOf(true));
        v.setGroupName("abc");
        v.setLevel("3");
        v.setLocked(Boolean.valueOf(true));
        v.setLockedBy("12345");
        v.setNo("10");
        v.setPreparing(Boolean.valueOf(true));
        v.setRowNum("5");
        v.setSiteId("site_01");
        v.setTags("abc");
        v.setType(Integer.valueOf(1));
        v.setWorking(Boolean.valueOf(true));
        System.out.println(JSONObject.toJSONString((Object)v));
    }

    public static WorkSiteVoBuilder builder() {
        return new WorkSiteVoBuilder();
    }

    public String getId() {
        return this.id;
    }

    public String getProjectId() {
        return this.projectId;
    }

    public String getSiteId() {
        return this.siteId;
    }

    public String getSiteName() {
        return this.siteName;
    }

    public Boolean getWorking() {
        return this.working;
    }

    public Boolean getLocked() {
        return this.locked;
    }

    public String getLockedBy() {
        return this.lockedBy;
    }

    public Boolean getPreparing() {
        return this.preparing;
    }

    public Boolean getFilled() {
        return this.filled;
    }

    public Boolean getDisabled() {
        return this.disabled;
    }

    public Boolean getSyncFailed() {
        return this.syncFailed;
    }

    public String getContent() {
        return this.content;
    }

    public String getArea() {
        return this.area;
    }

    public String getRowNum() {
        return this.rowNum;
    }

    public String getColNum() {
        return this.colNum;
    }

    public String getLevel() {
        return this.level;
    }

    public String getDepth() {
        return this.depth;
    }

    public String getNo() {
        return this.no;
    }

    public String getAgvId() {
        return this.agvId;
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

    public String getSiteLabel() {
        return this.siteLabel;
    }

    public Boolean getLockSuccess() {
        return this.lockSuccess;
    }

    public WorkSite getOldWorkSite() {
        return this.oldWorkSite;
    }

    public WorkSite getNewWorkSite() {
        return this.newWorkSite;
    }

    public void setId(String id) {
        this.id = id;
    }

    public void setProjectId(String projectId) {
        this.projectId = projectId;
    }

    public void setSiteId(String siteId) {
        this.siteId = siteId;
    }

    public void setSiteName(String siteName) {
        this.siteName = siteName;
    }

    public void setWorking(Boolean working) {
        this.working = working;
    }

    public void setLocked(Boolean locked) {
        this.locked = locked;
    }

    public void setLockedBy(String lockedBy) {
        this.lockedBy = lockedBy;
    }

    public void setPreparing(Boolean preparing) {
        this.preparing = preparing;
    }

    public void setFilled(Boolean filled) {
        this.filled = filled;
    }

    public void setDisabled(Boolean disabled) {
        this.disabled = disabled;
    }

    public void setSyncFailed(Boolean syncFailed) {
        this.syncFailed = syncFailed;
    }

    public void setContent(String content) {
        this.content = content;
    }

    public void setArea(String area) {
        this.area = area;
    }

    public void setRowNum(String rowNum) {
        this.rowNum = rowNum;
    }

    public void setColNum(String colNum) {
        this.colNum = colNum;
    }

    public void setLevel(String level) {
        this.level = level;
    }

    public void setDepth(String depth) {
        this.depth = depth;
    }

    public void setNo(String no) {
        this.no = no;
    }

    public void setAgvId(String agvId) {
        this.agvId = agvId;
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

    public void setSiteLabel(String siteLabel) {
        this.siteLabel = siteLabel;
    }

    public void setLockSuccess(Boolean lockSuccess) {
        this.lockSuccess = lockSuccess;
    }

    public void setOldWorkSite(WorkSite oldWorkSite) {
        this.oldWorkSite = oldWorkSite;
    }

    public void setNewWorkSite(WorkSite newWorkSite) {
        this.newWorkSite = newWorkSite;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof WorkSiteVo)) {
            return false;
        }
        WorkSiteVo other = (WorkSiteVo)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        Boolean this$working = this.getWorking();
        Boolean other$working = other.getWorking();
        if (this$working == null ? other$working != null : !((Object)this$working).equals(other$working)) {
            return false;
        }
        Boolean this$locked = this.getLocked();
        Boolean other$locked = other.getLocked();
        if (this$locked == null ? other$locked != null : !((Object)this$locked).equals(other$locked)) {
            return false;
        }
        Boolean this$preparing = this.getPreparing();
        Boolean other$preparing = other.getPreparing();
        if (this$preparing == null ? other$preparing != null : !((Object)this$preparing).equals(other$preparing)) {
            return false;
        }
        Boolean this$filled = this.getFilled();
        Boolean other$filled = other.getFilled();
        if (this$filled == null ? other$filled != null : !((Object)this$filled).equals(other$filled)) {
            return false;
        }
        Boolean this$disabled = this.getDisabled();
        Boolean other$disabled = other.getDisabled();
        if (this$disabled == null ? other$disabled != null : !((Object)this$disabled).equals(other$disabled)) {
            return false;
        }
        Boolean this$syncFailed = this.getSyncFailed();
        Boolean other$syncFailed = other.getSyncFailed();
        if (this$syncFailed == null ? other$syncFailed != null : !((Object)this$syncFailed).equals(other$syncFailed)) {
            return false;
        }
        Integer this$type = this.getType();
        Integer other$type = other.getType();
        if (this$type == null ? other$type != null : !((Object)this$type).equals(other$type)) {
            return false;
        }
        Boolean this$lockSuccess = this.getLockSuccess();
        Boolean other$lockSuccess = other.getLockSuccess();
        if (this$lockSuccess == null ? other$lockSuccess != null : !((Object)this$lockSuccess).equals(other$lockSuccess)) {
            return false;
        }
        String this$id = this.getId();
        String other$id = other.getId();
        if (this$id == null ? other$id != null : !this$id.equals(other$id)) {
            return false;
        }
        String this$projectId = this.getProjectId();
        String other$projectId = other.getProjectId();
        if (this$projectId == null ? other$projectId != null : !this$projectId.equals(other$projectId)) {
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
        String this$rowNum = this.getRowNum();
        String other$rowNum = other.getRowNum();
        if (this$rowNum == null ? other$rowNum != null : !this$rowNum.equals(other$rowNum)) {
            return false;
        }
        String this$colNum = this.getColNum();
        String other$colNum = other.getColNum();
        if (this$colNum == null ? other$colNum != null : !this$colNum.equals(other$colNum)) {
            return false;
        }
        String this$level = this.getLevel();
        String other$level = other.getLevel();
        if (this$level == null ? other$level != null : !this$level.equals(other$level)) {
            return false;
        }
        String this$depth = this.getDepth();
        String other$depth = other.getDepth();
        if (this$depth == null ? other$depth != null : !this$depth.equals(other$depth)) {
            return false;
        }
        String this$no = this.getNo();
        String other$no = other.getNo();
        if (this$no == null ? other$no != null : !this$no.equals(other$no)) {
            return false;
        }
        String this$agvId = this.getAgvId();
        String other$agvId = other.getAgvId();
        if (this$agvId == null ? other$agvId != null : !this$agvId.equals(other$agvId)) {
            return false;
        }
        String this$tags = this.getTags();
        String other$tags = other.getTags();
        if (this$tags == null ? other$tags != null : !this$tags.equals(other$tags)) {
            return false;
        }
        String this$groupName = this.getGroupName();
        String other$groupName = other.getGroupName();
        if (this$groupName == null ? other$groupName != null : !this$groupName.equals(other$groupName)) {
            return false;
        }
        String this$siteLabel = this.getSiteLabel();
        String other$siteLabel = other.getSiteLabel();
        if (this$siteLabel == null ? other$siteLabel != null : !this$siteLabel.equals(other$siteLabel)) {
            return false;
        }
        WorkSite this$oldWorkSite = this.getOldWorkSite();
        WorkSite other$oldWorkSite = other.getOldWorkSite();
        if (this$oldWorkSite == null ? other$oldWorkSite != null : !this$oldWorkSite.equals(other$oldWorkSite)) {
            return false;
        }
        WorkSite this$newWorkSite = this.getNewWorkSite();
        WorkSite other$newWorkSite = other.getNewWorkSite();
        return !(this$newWorkSite == null ? other$newWorkSite != null : !this$newWorkSite.equals(other$newWorkSite));
    }

    protected boolean canEqual(Object other) {
        return other instanceof WorkSiteVo;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        Boolean $working = this.getWorking();
        result = result * 59 + ($working == null ? 43 : ((Object)$working).hashCode());
        Boolean $locked = this.getLocked();
        result = result * 59 + ($locked == null ? 43 : ((Object)$locked).hashCode());
        Boolean $preparing = this.getPreparing();
        result = result * 59 + ($preparing == null ? 43 : ((Object)$preparing).hashCode());
        Boolean $filled = this.getFilled();
        result = result * 59 + ($filled == null ? 43 : ((Object)$filled).hashCode());
        Boolean $disabled = this.getDisabled();
        result = result * 59 + ($disabled == null ? 43 : ((Object)$disabled).hashCode());
        Boolean $syncFailed = this.getSyncFailed();
        result = result * 59 + ($syncFailed == null ? 43 : ((Object)$syncFailed).hashCode());
        Integer $type = this.getType();
        result = result * 59 + ($type == null ? 43 : ((Object)$type).hashCode());
        Boolean $lockSuccess = this.getLockSuccess();
        result = result * 59 + ($lockSuccess == null ? 43 : ((Object)$lockSuccess).hashCode());
        String $id = this.getId();
        result = result * 59 + ($id == null ? 43 : $id.hashCode());
        String $projectId = this.getProjectId();
        result = result * 59 + ($projectId == null ? 43 : $projectId.hashCode());
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
        String $rowNum = this.getRowNum();
        result = result * 59 + ($rowNum == null ? 43 : $rowNum.hashCode());
        String $colNum = this.getColNum();
        result = result * 59 + ($colNum == null ? 43 : $colNum.hashCode());
        String $level = this.getLevel();
        result = result * 59 + ($level == null ? 43 : $level.hashCode());
        String $depth = this.getDepth();
        result = result * 59 + ($depth == null ? 43 : $depth.hashCode());
        String $no = this.getNo();
        result = result * 59 + ($no == null ? 43 : $no.hashCode());
        String $agvId = this.getAgvId();
        result = result * 59 + ($agvId == null ? 43 : $agvId.hashCode());
        String $tags = this.getTags();
        result = result * 59 + ($tags == null ? 43 : $tags.hashCode());
        String $groupName = this.getGroupName();
        result = result * 59 + ($groupName == null ? 43 : $groupName.hashCode());
        String $siteLabel = this.getSiteLabel();
        result = result * 59 + ($siteLabel == null ? 43 : $siteLabel.hashCode());
        WorkSite $oldWorkSite = this.getOldWorkSite();
        result = result * 59 + ($oldWorkSite == null ? 43 : $oldWorkSite.hashCode());
        WorkSite $newWorkSite = this.getNewWorkSite();
        result = result * 59 + ($newWorkSite == null ? 43 : $newWorkSite.hashCode());
        return result;
    }

    public String toString() {
        return "WorkSiteVo(id=" + this.getId() + ", projectId=" + this.getProjectId() + ", siteId=" + this.getSiteId() + ", siteName=" + this.getSiteName() + ", working=" + this.getWorking() + ", locked=" + this.getLocked() + ", lockedBy=" + this.getLockedBy() + ", preparing=" + this.getPreparing() + ", filled=" + this.getFilled() + ", disabled=" + this.getDisabled() + ", syncFailed=" + this.getSyncFailed() + ", content=" + this.getContent() + ", area=" + this.getArea() + ", rowNum=" + this.getRowNum() + ", colNum=" + this.getColNum() + ", level=" + this.getLevel() + ", depth=" + this.getDepth() + ", no=" + this.getNo() + ", agvId=" + this.getAgvId() + ", tags=" + this.getTags() + ", type=" + this.getType() + ", groupName=" + this.getGroupName() + ", siteLabel=" + this.getSiteLabel() + ", lockSuccess=" + this.getLockSuccess() + ", oldWorkSite=" + this.getOldWorkSite() + ", newWorkSite=" + this.getNewWorkSite() + ")";
    }

    public WorkSiteVo() {
    }

    public WorkSiteVo(String id, String projectId, String siteId, String siteName, Boolean working, Boolean locked, String lockedBy, Boolean preparing, Boolean filled, Boolean disabled, Boolean syncFailed, String content, String area, String rowNum, String colNum, String level, String depth, String no, String agvId, String tags, Integer type, String groupName, String siteLabel, Boolean lockSuccess, WorkSite oldWorkSite, WorkSite newWorkSite) {
        this.id = id;
        this.projectId = projectId;
        this.siteId = siteId;
        this.siteName = siteName;
        this.working = working;
        this.locked = locked;
        this.lockedBy = lockedBy;
        this.preparing = preparing;
        this.filled = filled;
        this.disabled = disabled;
        this.syncFailed = syncFailed;
        this.content = content;
        this.area = area;
        this.rowNum = rowNum;
        this.colNum = colNum;
        this.level = level;
        this.depth = depth;
        this.no = no;
        this.agvId = agvId;
        this.tags = tags;
        this.type = type;
        this.groupName = groupName;
        this.siteLabel = siteLabel;
        this.lockSuccess = lockSuccess;
        this.oldWorkSite = oldWorkSite;
        this.newWorkSite = newWorkSite;
    }
}

