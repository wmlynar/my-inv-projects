/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.vo.req.WindTaskCatoryReq
 */
package com.seer.rds.vo.req;

import java.util.List;

public class WindTaskCatoryReq {
    private String id;
    private String label;
    private String isDel;
    private String parentId;
    private String parentIds;
    private List<String> ids;

    public String getId() {
        return this.id;
    }

    public String getLabel() {
        return this.label;
    }

    public String getIsDel() {
        return this.isDel;
    }

    public String getParentId() {
        return this.parentId;
    }

    public String getParentIds() {
        return this.parentIds;
    }

    public List<String> getIds() {
        return this.ids;
    }

    public void setId(String id) {
        this.id = id;
    }

    public void setLabel(String label) {
        this.label = label;
    }

    public void setIsDel(String isDel) {
        this.isDel = isDel;
    }

    public void setParentId(String parentId) {
        this.parentId = parentId;
    }

    public void setParentIds(String parentIds) {
        this.parentIds = parentIds;
    }

    public void setIds(List<String> ids) {
        this.ids = ids;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof WindTaskCatoryReq)) {
            return false;
        }
        WindTaskCatoryReq other = (WindTaskCatoryReq)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        String this$id = this.getId();
        String other$id = other.getId();
        if (this$id == null ? other$id != null : !this$id.equals(other$id)) {
            return false;
        }
        String this$label = this.getLabel();
        String other$label = other.getLabel();
        if (this$label == null ? other$label != null : !this$label.equals(other$label)) {
            return false;
        }
        String this$isDel = this.getIsDel();
        String other$isDel = other.getIsDel();
        if (this$isDel == null ? other$isDel != null : !this$isDel.equals(other$isDel)) {
            return false;
        }
        String this$parentId = this.getParentId();
        String other$parentId = other.getParentId();
        if (this$parentId == null ? other$parentId != null : !this$parentId.equals(other$parentId)) {
            return false;
        }
        String this$parentIds = this.getParentIds();
        String other$parentIds = other.getParentIds();
        if (this$parentIds == null ? other$parentIds != null : !this$parentIds.equals(other$parentIds)) {
            return false;
        }
        List this$ids = this.getIds();
        List other$ids = other.getIds();
        return !(this$ids == null ? other$ids != null : !((Object)this$ids).equals(other$ids));
    }

    protected boolean canEqual(Object other) {
        return other instanceof WindTaskCatoryReq;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        String $id = this.getId();
        result = result * 59 + ($id == null ? 43 : $id.hashCode());
        String $label = this.getLabel();
        result = result * 59 + ($label == null ? 43 : $label.hashCode());
        String $isDel = this.getIsDel();
        result = result * 59 + ($isDel == null ? 43 : $isDel.hashCode());
        String $parentId = this.getParentId();
        result = result * 59 + ($parentId == null ? 43 : $parentId.hashCode());
        String $parentIds = this.getParentIds();
        result = result * 59 + ($parentIds == null ? 43 : $parentIds.hashCode());
        List $ids = this.getIds();
        result = result * 59 + ($ids == null ? 43 : ((Object)$ids).hashCode());
        return result;
    }

    public String toString() {
        return "WindTaskCatoryReq(id=" + this.getId() + ", label=" + this.getLabel() + ", isDel=" + this.getIsDel() + ", parentId=" + this.getParentId() + ", parentIds=" + this.getParentIds() + ", ids=" + this.getIds() + ")";
    }

    public WindTaskCatoryReq withId(String id) {
        return this.id == id ? this : new WindTaskCatoryReq(id, this.label, this.isDel, this.parentId, this.parentIds, this.ids);
    }

    public WindTaskCatoryReq withLabel(String label) {
        return this.label == label ? this : new WindTaskCatoryReq(this.id, label, this.isDel, this.parentId, this.parentIds, this.ids);
    }

    public WindTaskCatoryReq withIsDel(String isDel) {
        return this.isDel == isDel ? this : new WindTaskCatoryReq(this.id, this.label, isDel, this.parentId, this.parentIds, this.ids);
    }

    public WindTaskCatoryReq withParentId(String parentId) {
        return this.parentId == parentId ? this : new WindTaskCatoryReq(this.id, this.label, this.isDel, parentId, this.parentIds, this.ids);
    }

    public WindTaskCatoryReq withParentIds(String parentIds) {
        return this.parentIds == parentIds ? this : new WindTaskCatoryReq(this.id, this.label, this.isDel, this.parentId, parentIds, this.ids);
    }

    public WindTaskCatoryReq withIds(List<String> ids) {
        return this.ids == ids ? this : new WindTaskCatoryReq(this.id, this.label, this.isDel, this.parentId, this.parentIds, ids);
    }

    public WindTaskCatoryReq(String id, String label, String isDel, String parentId, String parentIds, List<String> ids) {
        this.id = id;
        this.label = label;
        this.isDel = isDel;
        this.parentId = parentId;
        this.parentIds = parentIds;
        this.ids = ids;
    }

    public WindTaskCatoryReq() {
    }
}

