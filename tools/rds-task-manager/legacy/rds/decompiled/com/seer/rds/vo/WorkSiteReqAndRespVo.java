/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.vo.AttrVo
 *  com.seer.rds.vo.WorkSiteReqAndRespVo
 *  com.seer.rds.vo.WorkSiteReqAndRespVo$WorkSiteReqAndRespVoBuilder
 */
package com.seer.rds.vo;

import com.seer.rds.vo.AttrVo;
import com.seer.rds.vo.WorkSiteReqAndRespVo;
import java.util.List;

public class WorkSiteReqAndRespVo {
    private String id;
    private String siteId;
    private String siteName;
    private Integer working;
    private Integer locked = 0;
    private String lockedBy;
    private Integer filled = 0;
    private Integer disabled = 0;
    private Integer syncFailed = 0;
    private String content;
    private String area;
    private String rowNum;
    private String colNum;
    private String level;
    private String depth;
    private String no;
    private String agvId;
    private String tags;
    private Integer type = 0;
    private String groupName;
    private List<AttrVo> attrList;

    public static WorkSiteReqAndRespVoBuilder builder() {
        return new WorkSiteReqAndRespVoBuilder();
    }

    public String getId() {
        return this.id;
    }

    public String getSiteId() {
        return this.siteId;
    }

    public String getSiteName() {
        return this.siteName;
    }

    public Integer getWorking() {
        return this.working;
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

    public List<AttrVo> getAttrList() {
        return this.attrList;
    }

    public void setId(String id) {
        this.id = id;
    }

    public void setSiteId(String siteId) {
        this.siteId = siteId;
    }

    public void setSiteName(String siteName) {
        this.siteName = siteName;
    }

    public void setWorking(Integer working) {
        this.working = working;
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

    public void setAttrList(List<AttrVo> attrList) {
        this.attrList = attrList;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof WorkSiteReqAndRespVo)) {
            return false;
        }
        WorkSiteReqAndRespVo other = (WorkSiteReqAndRespVo)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        Integer this$working = this.getWorking();
        Integer other$working = other.getWorking();
        if (this$working == null ? other$working != null : !((Object)this$working).equals(other$working)) {
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
        List this$attrList = this.getAttrList();
        List other$attrList = other.getAttrList();
        return !(this$attrList == null ? other$attrList != null : !((Object)this$attrList).equals(other$attrList));
    }

    protected boolean canEqual(Object other) {
        return other instanceof WorkSiteReqAndRespVo;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        Integer $working = this.getWorking();
        result = result * 59 + ($working == null ? 43 : ((Object)$working).hashCode());
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
        String $id = this.getId();
        result = result * 59 + ($id == null ? 43 : $id.hashCode());
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
        List $attrList = this.getAttrList();
        result = result * 59 + ($attrList == null ? 43 : ((Object)$attrList).hashCode());
        return result;
    }

    public String toString() {
        return "WorkSiteReqAndRespVo(id=" + this.getId() + ", siteId=" + this.getSiteId() + ", siteName=" + this.getSiteName() + ", working=" + this.getWorking() + ", locked=" + this.getLocked() + ", lockedBy=" + this.getLockedBy() + ", filled=" + this.getFilled() + ", disabled=" + this.getDisabled() + ", syncFailed=" + this.getSyncFailed() + ", content=" + this.getContent() + ", area=" + this.getArea() + ", rowNum=" + this.getRowNum() + ", colNum=" + this.getColNum() + ", level=" + this.getLevel() + ", depth=" + this.getDepth() + ", no=" + this.getNo() + ", agvId=" + this.getAgvId() + ", tags=" + this.getTags() + ", type=" + this.getType() + ", groupName=" + this.getGroupName() + ", attrList=" + this.getAttrList() + ")";
    }

    public WorkSiteReqAndRespVo() {
    }

    public WorkSiteReqAndRespVo(String id, String siteId, String siteName, Integer working, Integer locked, String lockedBy, Integer filled, Integer disabled, Integer syncFailed, String content, String area, String rowNum, String colNum, String level, String depth, String no, String agvId, String tags, Integer type, String groupName, List<AttrVo> attrList) {
        this.id = id;
        this.siteId = siteId;
        this.siteName = siteName;
        this.working = working;
        this.locked = locked;
        this.lockedBy = lockedBy;
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
        this.attrList = attrList;
    }
}

