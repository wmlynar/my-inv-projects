/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.fasterxml.jackson.annotation.JsonIgnore
 *  com.seer.rds.annotation.Description
 *  com.seer.rds.model.worksite.WorkSite
 *  com.seer.rds.model.worksite.WorkSite$WorkSiteBuilder
 *  javax.persistence.Column
 *  javax.persistence.Entity
 *  javax.persistence.GeneratedValue
 *  javax.persistence.Id
 *  javax.persistence.Index
 *  javax.persistence.Table
 *  org.hibernate.annotations.GenericGenerator
 */
package com.seer.rds.model.worksite;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.seer.rds.annotation.Description;
import com.seer.rds.model.worksite.WorkSite;
import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.GeneratedValue;
import javax.persistence.Id;
import javax.persistence.Index;
import javax.persistence.Table;
import org.hibernate.annotations.GenericGenerator;

@Entity
@Table(name="t_worksite", indexes={@Index(name="siteIdIndex", columnList="siteId")})
public class WorkSite {
    @Id
    @GenericGenerator(name="idGenerator", strategy="uuid")
    @GeneratedValue(generator="idGenerator")
    private String id;
    @Column(name="siteId", unique=true)
    @Description(value="@{WorkSite.siteId}")
    private String siteId;
    @Column(name="siteName")
    @Description(value="@{WorkSite.siteName}")
    private String siteName;
    @JsonIgnore
    private Integer working;
    @Column(name="locked", columnDefinition="int default 0")
    @Description(value="@{WorkSite.locked}")
    private Integer locked;
    @Description(value="@{WorkSite.lockedBy}")
    private String lockedBy;
    @JsonIgnore
    private Integer preparing;
    @Column(name="filled", columnDefinition="int default 0")
    @Description(value="@{WorkSite.filled}")
    private Integer filled;
    @Column(name="disabled", columnDefinition="int default 0")
    @Description(value="@{WorkSite.disabled}")
    private Integer disabled;
    @Column(name="syncFailed", columnDefinition="int default 0")
    @Description(value="@{WorkSite.syncFailed}")
    private Integer syncFailed;
    @Description(value="@{WorkSite.content}")
    private String content;
    @Description(value="@{WorkSite.area}")
    private String area;
    @Description(value="@{WorkSite.rowNum}")
    private String rowNum;
    @Description(value="@{WorkSite.colNum}")
    private String colNum;
    @Column(name="\"level\"")
    @Description(value="@{WorkSite.level}")
    private String level;
    @Description(value="@{WorkSite.depth}")
    private String depth;
    private String no;
    @Description(value="@{WorkSite.agvId}")
    private String agvId;
    private String tags;
    @Column(nullable=true, columnDefinition="int default 0")
    @Description(value="@{WorkSite.type}")
    private Integer type;
    @Description(value="@{WorkSite.groupName}")
    private String groupName;
    @Column(name="holder", columnDefinition="int default 0")
    private Integer holder;

    public WorkSite(String id, String siteId, Integer working, Integer locked, Integer preparing, Integer filled, Integer disabled, String content, String groupName, String rowNum, String colNum, String level, String depth, String no, String agvId, String tags, Integer type) {
        this.id = id;
        this.siteId = siteId;
        this.working = working;
        this.locked = locked;
        this.preparing = preparing;
        this.filled = filled;
        this.disabled = disabled;
        this.content = content;
        this.groupName = groupName;
        this.rowNum = rowNum;
        this.colNum = colNum;
        this.level = level;
        this.depth = depth;
        this.no = no;
        this.agvId = agvId;
        this.tags = tags;
        this.type = type;
    }

    public WorkSite(String siteId, String siteName, Integer locked, String lockedBy, Integer filled, String content, String area, String tags, Integer type, String groupName) {
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

    public WorkSite(String id, String siteId, Integer locked, String lockedBy, Integer filled, String content) {
        this.id = id;
        this.siteId = siteId;
        this.locked = locked;
        this.lockedBy = lockedBy;
        this.filled = filled;
        this.content = content;
    }

    public WorkSite(String id, String siteId, Integer locked, Integer filled, String lockedBy, Integer disabled, Integer type, String content) {
        this.id = id;
        this.siteId = siteId;
        this.locked = locked;
        this.lockedBy = lockedBy;
        this.filled = filled;
        this.disabled = disabled;
        this.content = content;
        this.type = type;
    }

    public static WorkSiteBuilder builder() {
        return new WorkSiteBuilder();
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

    public Integer getPreparing() {
        return this.preparing;
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

    public Integer getHolder() {
        return this.holder;
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

    @JsonIgnore
    public void setWorking(Integer working) {
        this.working = working;
    }

    public void setLocked(Integer locked) {
        this.locked = locked;
    }

    public void setLockedBy(String lockedBy) {
        this.lockedBy = lockedBy;
    }

    @JsonIgnore
    public void setPreparing(Integer preparing) {
        this.preparing = preparing;
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

    public void setHolder(Integer holder) {
        this.holder = holder;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof WorkSite)) {
            return false;
        }
        WorkSite other = (WorkSite)o;
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
        Integer this$preparing = this.getPreparing();
        Integer other$preparing = other.getPreparing();
        if (this$preparing == null ? other$preparing != null : !((Object)this$preparing).equals(other$preparing)) {
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
        Integer this$holder = this.getHolder();
        Integer other$holder = other.getHolder();
        if (this$holder == null ? other$holder != null : !((Object)this$holder).equals(other$holder)) {
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
        return !(this$groupName == null ? other$groupName != null : !this$groupName.equals(other$groupName));
    }

    protected boolean canEqual(Object other) {
        return other instanceof WorkSite;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        Integer $working = this.getWorking();
        result = result * 59 + ($working == null ? 43 : ((Object)$working).hashCode());
        Integer $locked = this.getLocked();
        result = result * 59 + ($locked == null ? 43 : ((Object)$locked).hashCode());
        Integer $preparing = this.getPreparing();
        result = result * 59 + ($preparing == null ? 43 : ((Object)$preparing).hashCode());
        Integer $filled = this.getFilled();
        result = result * 59 + ($filled == null ? 43 : ((Object)$filled).hashCode());
        Integer $disabled = this.getDisabled();
        result = result * 59 + ($disabled == null ? 43 : ((Object)$disabled).hashCode());
        Integer $syncFailed = this.getSyncFailed();
        result = result * 59 + ($syncFailed == null ? 43 : ((Object)$syncFailed).hashCode());
        Integer $type = this.getType();
        result = result * 59 + ($type == null ? 43 : ((Object)$type).hashCode());
        Integer $holder = this.getHolder();
        result = result * 59 + ($holder == null ? 43 : ((Object)$holder).hashCode());
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
        return result;
    }

    public String toString() {
        return "WorkSite(id=" + this.getId() + ", siteId=" + this.getSiteId() + ", siteName=" + this.getSiteName() + ", working=" + this.getWorking() + ", locked=" + this.getLocked() + ", lockedBy=" + this.getLockedBy() + ", preparing=" + this.getPreparing() + ", filled=" + this.getFilled() + ", disabled=" + this.getDisabled() + ", syncFailed=" + this.getSyncFailed() + ", content=" + this.getContent() + ", area=" + this.getArea() + ", rowNum=" + this.getRowNum() + ", colNum=" + this.getColNum() + ", level=" + this.getLevel() + ", depth=" + this.getDepth() + ", no=" + this.getNo() + ", agvId=" + this.getAgvId() + ", tags=" + this.getTags() + ", type=" + this.getType() + ", groupName=" + this.getGroupName() + ", holder=" + this.getHolder() + ")";
    }

    public WorkSite() {
    }

    public WorkSite(String id, String siteId, String siteName, Integer working, Integer locked, String lockedBy, Integer preparing, Integer filled, Integer disabled, Integer syncFailed, String content, String area, String rowNum, String colNum, String level, String depth, String no, String agvId, String tags, Integer type, String groupName, Integer holder) {
        this.id = id;
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
        this.holder = holder;
    }
}

