/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.alibaba.fastjson.JSONObject
 *  com.seer.rds.vo.WorkSiteHqlCondition
 *  com.seer.rds.vo.WorkSiteHqlCondition$WorkSiteHqlConditionBuilder
 */
package com.seer.rds.vo;

import com.alibaba.fastjson.JSONObject;
import com.seer.rds.vo.WorkSiteHqlCondition;
import java.util.Arrays;

public class WorkSiteHqlCondition {
    private String[] siteIds;
    private String[] siteNames;
    private String[] groupNames;
    private String area;
    private Boolean locked;
    private String lockedBy;
    private Boolean filled;
    private String[] content;
    private String[] tags;
    private Integer type;
    private String[] rowNum;
    private String[] colNum;
    private String[] level;
    private String[] depth;
    private String[] no;
    private String sort;
    private Boolean disabled;
    private Boolean syncFailed;

    public static void main(String[] args) {
        WorkSiteHqlCondition s = new WorkSiteHqlCondition();
        s.setSiteIds(new String[]{"abc", "%bc", "%b%", "ab%"});
        s.setGroupNames(new String[]{"abc", "%bc", "%b%", "ab%"});
        s.setArea("area01");
        s.setLocked(Boolean.valueOf(true));
        s.setLockedBy("12345");
        s.setFilled(Boolean.valueOf(true));
        s.setContent(new String[]{"abc", "%bc", "%b%", "ab%"});
        s.setTags(new String[]{"abc", "%bc", "%b%", "ab%"});
        s.setType(Integer.valueOf(1));
        s.setRowNum(new String[]{"abc", "%bc", "%b%", "ab%"});
        s.setColNum(new String[]{"abc", "%bc", "%b%", "ab%"});
        s.setLevel(new String[]{"abc", "%bc", "%b%", "ab%"});
        s.setDepth(new String[]{"abc", "%bc", "%b%", "ab%"});
        s.setNo(new String[]{"abc", "%bc", "%b%", "ab%"});
        s.setSort("DESC");
        System.out.println(JSONObject.toJSONString((Object)s));
    }

    public static WorkSiteHqlConditionBuilder builder() {
        return new WorkSiteHqlConditionBuilder();
    }

    public String[] getSiteIds() {
        return this.siteIds;
    }

    public String[] getSiteNames() {
        return this.siteNames;
    }

    public String[] getGroupNames() {
        return this.groupNames;
    }

    public String getArea() {
        return this.area;
    }

    public Boolean getLocked() {
        return this.locked;
    }

    public String getLockedBy() {
        return this.lockedBy;
    }

    public Boolean getFilled() {
        return this.filled;
    }

    public String[] getContent() {
        return this.content;
    }

    public String[] getTags() {
        return this.tags;
    }

    public Integer getType() {
        return this.type;
    }

    public String[] getRowNum() {
        return this.rowNum;
    }

    public String[] getColNum() {
        return this.colNum;
    }

    public String[] getLevel() {
        return this.level;
    }

    public String[] getDepth() {
        return this.depth;
    }

    public String[] getNo() {
        return this.no;
    }

    public String getSort() {
        return this.sort;
    }

    public Boolean getDisabled() {
        return this.disabled;
    }

    public Boolean getSyncFailed() {
        return this.syncFailed;
    }

    public void setSiteIds(String[] siteIds) {
        this.siteIds = siteIds;
    }

    public void setSiteNames(String[] siteNames) {
        this.siteNames = siteNames;
    }

    public void setGroupNames(String[] groupNames) {
        this.groupNames = groupNames;
    }

    public void setArea(String area) {
        this.area = area;
    }

    public void setLocked(Boolean locked) {
        this.locked = locked;
    }

    public void setLockedBy(String lockedBy) {
        this.lockedBy = lockedBy;
    }

    public void setFilled(Boolean filled) {
        this.filled = filled;
    }

    public void setContent(String[] content) {
        this.content = content;
    }

    public void setTags(String[] tags) {
        this.tags = tags;
    }

    public void setType(Integer type) {
        this.type = type;
    }

    public void setRowNum(String[] rowNum) {
        this.rowNum = rowNum;
    }

    public void setColNum(String[] colNum) {
        this.colNum = colNum;
    }

    public void setLevel(String[] level) {
        this.level = level;
    }

    public void setDepth(String[] depth) {
        this.depth = depth;
    }

    public void setNo(String[] no) {
        this.no = no;
    }

    public void setSort(String sort) {
        this.sort = sort;
    }

    public void setDisabled(Boolean disabled) {
        this.disabled = disabled;
    }

    public void setSyncFailed(Boolean syncFailed) {
        this.syncFailed = syncFailed;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof WorkSiteHqlCondition)) {
            return false;
        }
        WorkSiteHqlCondition other = (WorkSiteHqlCondition)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        Boolean this$locked = this.getLocked();
        Boolean other$locked = other.getLocked();
        if (this$locked == null ? other$locked != null : !((Object)this$locked).equals(other$locked)) {
            return false;
        }
        Boolean this$filled = this.getFilled();
        Boolean other$filled = other.getFilled();
        if (this$filled == null ? other$filled != null : !((Object)this$filled).equals(other$filled)) {
            return false;
        }
        Integer this$type = this.getType();
        Integer other$type = other.getType();
        if (this$type == null ? other$type != null : !((Object)this$type).equals(other$type)) {
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
        if (!Arrays.deepEquals(this.getSiteIds(), other.getSiteIds())) {
            return false;
        }
        if (!Arrays.deepEquals(this.getSiteNames(), other.getSiteNames())) {
            return false;
        }
        if (!Arrays.deepEquals(this.getGroupNames(), other.getGroupNames())) {
            return false;
        }
        String this$area = this.getArea();
        String other$area = other.getArea();
        if (this$area == null ? other$area != null : !this$area.equals(other$area)) {
            return false;
        }
        String this$lockedBy = this.getLockedBy();
        String other$lockedBy = other.getLockedBy();
        if (this$lockedBy == null ? other$lockedBy != null : !this$lockedBy.equals(other$lockedBy)) {
            return false;
        }
        if (!Arrays.deepEquals(this.getContent(), other.getContent())) {
            return false;
        }
        if (!Arrays.deepEquals(this.getTags(), other.getTags())) {
            return false;
        }
        if (!Arrays.deepEquals(this.getRowNum(), other.getRowNum())) {
            return false;
        }
        if (!Arrays.deepEquals(this.getColNum(), other.getColNum())) {
            return false;
        }
        if (!Arrays.deepEquals(this.getLevel(), other.getLevel())) {
            return false;
        }
        if (!Arrays.deepEquals(this.getDepth(), other.getDepth())) {
            return false;
        }
        if (!Arrays.deepEquals(this.getNo(), other.getNo())) {
            return false;
        }
        String this$sort = this.getSort();
        String other$sort = other.getSort();
        return !(this$sort == null ? other$sort != null : !this$sort.equals(other$sort));
    }

    protected boolean canEqual(Object other) {
        return other instanceof WorkSiteHqlCondition;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        Boolean $locked = this.getLocked();
        result = result * 59 + ($locked == null ? 43 : ((Object)$locked).hashCode());
        Boolean $filled = this.getFilled();
        result = result * 59 + ($filled == null ? 43 : ((Object)$filled).hashCode());
        Integer $type = this.getType();
        result = result * 59 + ($type == null ? 43 : ((Object)$type).hashCode());
        Boolean $disabled = this.getDisabled();
        result = result * 59 + ($disabled == null ? 43 : ((Object)$disabled).hashCode());
        Boolean $syncFailed = this.getSyncFailed();
        result = result * 59 + ($syncFailed == null ? 43 : ((Object)$syncFailed).hashCode());
        result = result * 59 + Arrays.deepHashCode(this.getSiteIds());
        result = result * 59 + Arrays.deepHashCode(this.getSiteNames());
        result = result * 59 + Arrays.deepHashCode(this.getGroupNames());
        String $area = this.getArea();
        result = result * 59 + ($area == null ? 43 : $area.hashCode());
        String $lockedBy = this.getLockedBy();
        result = result * 59 + ($lockedBy == null ? 43 : $lockedBy.hashCode());
        result = result * 59 + Arrays.deepHashCode(this.getContent());
        result = result * 59 + Arrays.deepHashCode(this.getTags());
        result = result * 59 + Arrays.deepHashCode(this.getRowNum());
        result = result * 59 + Arrays.deepHashCode(this.getColNum());
        result = result * 59 + Arrays.deepHashCode(this.getLevel());
        result = result * 59 + Arrays.deepHashCode(this.getDepth());
        result = result * 59 + Arrays.deepHashCode(this.getNo());
        String $sort = this.getSort();
        result = result * 59 + ($sort == null ? 43 : $sort.hashCode());
        return result;
    }

    public String toString() {
        return "WorkSiteHqlCondition(siteIds=" + Arrays.deepToString(this.getSiteIds()) + ", siteNames=" + Arrays.deepToString(this.getSiteNames()) + ", groupNames=" + Arrays.deepToString(this.getGroupNames()) + ", area=" + this.getArea() + ", locked=" + this.getLocked() + ", lockedBy=" + this.getLockedBy() + ", filled=" + this.getFilled() + ", content=" + Arrays.deepToString(this.getContent()) + ", tags=" + Arrays.deepToString(this.getTags()) + ", type=" + this.getType() + ", rowNum=" + Arrays.deepToString(this.getRowNum()) + ", colNum=" + Arrays.deepToString(this.getColNum()) + ", level=" + Arrays.deepToString(this.getLevel()) + ", depth=" + Arrays.deepToString(this.getDepth()) + ", no=" + Arrays.deepToString(this.getNo()) + ", sort=" + this.getSort() + ", disabled=" + this.getDisabled() + ", syncFailed=" + this.getSyncFailed() + ")";
    }

    public WorkSiteHqlCondition() {
    }

    public WorkSiteHqlCondition(String[] siteIds, String[] siteNames, String[] groupNames, String area, Boolean locked, String lockedBy, Boolean filled, String[] content, String[] tags, Integer type, String[] rowNum, String[] colNum, String[] level, String[] depth, String[] no, String sort, Boolean disabled, Boolean syncFailed) {
        this.siteIds = siteIds;
        this.siteNames = siteNames;
        this.groupNames = groupNames;
        this.area = area;
        this.locked = locked;
        this.lockedBy = lockedBy;
        this.filled = filled;
        this.content = content;
        this.tags = tags;
        this.type = type;
        this.rowNum = rowNum;
        this.colNum = colNum;
        this.level = level;
        this.depth = depth;
        this.no = no;
        this.sort = sort;
        this.disabled = disabled;
        this.syncFailed = syncFailed;
    }
}

