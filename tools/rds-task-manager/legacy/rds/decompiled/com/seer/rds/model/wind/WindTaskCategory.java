/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.model.wind.WindTaskCategory
 *  com.seer.rds.model.wind.WindTaskCategory$WindTaskCategoryBuilder
 *  com.seer.rds.model.wind.WindTaskDef
 *  javax.persistence.Column
 *  javax.persistence.Entity
 *  javax.persistence.GeneratedValue
 *  javax.persistence.GenerationType
 *  javax.persistence.Id
 *  javax.persistence.Lob
 *  javax.persistence.Table
 *  javax.persistence.Transient
 */
package com.seer.rds.model.wind;

import com.seer.rds.model.wind.WindTaskCategory;
import com.seer.rds.model.wind.WindTaskDef;
import java.io.Serializable;
import java.util.List;
import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.GeneratedValue;
import javax.persistence.GenerationType;
import javax.persistence.Id;
import javax.persistence.Lob;
import javax.persistence.Table;
import javax.persistence.Transient;

@Entity
@Table(name="t_windtaskcategory")
public class WindTaskCategory
implements Serializable {
    @Id
    @GeneratedValue(strategy=GenerationType.AUTO)
    private Long id;
    private String label;
    @Column(nullable=false)
    private Integer isDel = 0;
    @Column(nullable=false)
    private Long parentId = 0L;
    @Lob
    @Column(nullable=true)
    private String parentIds;
    @Transient
    private List<WindTaskCategory> children;
    @Transient
    private List<WindTaskDef> defChildren;

    public static WindTaskCategoryBuilder builder() {
        return new WindTaskCategoryBuilder();
    }

    public Long getId() {
        return this.id;
    }

    public String getLabel() {
        return this.label;
    }

    public Integer getIsDel() {
        return this.isDel;
    }

    public Long getParentId() {
        return this.parentId;
    }

    public String getParentIds() {
        return this.parentIds;
    }

    public List<WindTaskCategory> getChildren() {
        return this.children;
    }

    public List<WindTaskDef> getDefChildren() {
        return this.defChildren;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public void setLabel(String label) {
        this.label = label;
    }

    public void setIsDel(Integer isDel) {
        this.isDel = isDel;
    }

    public void setParentId(Long parentId) {
        this.parentId = parentId;
    }

    public void setParentIds(String parentIds) {
        this.parentIds = parentIds;
    }

    public void setChildren(List<WindTaskCategory> children) {
        this.children = children;
    }

    public void setDefChildren(List<WindTaskDef> defChildren) {
        this.defChildren = defChildren;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof WindTaskCategory)) {
            return false;
        }
        WindTaskCategory other = (WindTaskCategory)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        Long this$id = this.getId();
        Long other$id = other.getId();
        if (this$id == null ? other$id != null : !((Object)this$id).equals(other$id)) {
            return false;
        }
        Integer this$isDel = this.getIsDel();
        Integer other$isDel = other.getIsDel();
        if (this$isDel == null ? other$isDel != null : !((Object)this$isDel).equals(other$isDel)) {
            return false;
        }
        Long this$parentId = this.getParentId();
        Long other$parentId = other.getParentId();
        if (this$parentId == null ? other$parentId != null : !((Object)this$parentId).equals(other$parentId)) {
            return false;
        }
        String this$label = this.getLabel();
        String other$label = other.getLabel();
        if (this$label == null ? other$label != null : !this$label.equals(other$label)) {
            return false;
        }
        String this$parentIds = this.getParentIds();
        String other$parentIds = other.getParentIds();
        if (this$parentIds == null ? other$parentIds != null : !this$parentIds.equals(other$parentIds)) {
            return false;
        }
        List this$children = this.getChildren();
        List other$children = other.getChildren();
        if (this$children == null ? other$children != null : !((Object)this$children).equals(other$children)) {
            return false;
        }
        List this$defChildren = this.getDefChildren();
        List other$defChildren = other.getDefChildren();
        return !(this$defChildren == null ? other$defChildren != null : !((Object)this$defChildren).equals(other$defChildren));
    }

    protected boolean canEqual(Object other) {
        return other instanceof WindTaskCategory;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        Long $id = this.getId();
        result = result * 59 + ($id == null ? 43 : ((Object)$id).hashCode());
        Integer $isDel = this.getIsDel();
        result = result * 59 + ($isDel == null ? 43 : ((Object)$isDel).hashCode());
        Long $parentId = this.getParentId();
        result = result * 59 + ($parentId == null ? 43 : ((Object)$parentId).hashCode());
        String $label = this.getLabel();
        result = result * 59 + ($label == null ? 43 : $label.hashCode());
        String $parentIds = this.getParentIds();
        result = result * 59 + ($parentIds == null ? 43 : $parentIds.hashCode());
        List $children = this.getChildren();
        result = result * 59 + ($children == null ? 43 : ((Object)$children).hashCode());
        List $defChildren = this.getDefChildren();
        result = result * 59 + ($defChildren == null ? 43 : ((Object)$defChildren).hashCode());
        return result;
    }

    public String toString() {
        return "WindTaskCategory(id=" + this.getId() + ", label=" + this.getLabel() + ", isDel=" + this.getIsDel() + ", parentId=" + this.getParentId() + ", parentIds=" + this.getParentIds() + ", children=" + this.getChildren() + ", defChildren=" + this.getDefChildren() + ")";
    }

    public WindTaskCategory() {
    }

    public WindTaskCategory(Long id, String label, Integer isDel, Long parentId, String parentIds, List<WindTaskCategory> children, List<WindTaskDef> defChildren) {
        this.id = id;
        this.label = label;
        this.isDel = isDel;
        this.parentId = parentId;
        this.parentIds = parentIds;
        this.children = children;
        this.defChildren = defChildren;
    }
}

