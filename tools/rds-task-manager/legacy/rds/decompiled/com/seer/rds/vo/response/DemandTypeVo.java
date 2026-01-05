/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.vo.AttrVo
 *  com.seer.rds.vo.response.DemandTypeVo
 */
package com.seer.rds.vo.response;

import com.seer.rds.vo.AttrVo;
import java.util.List;

public class DemandTypeVo {
    private String id;
    private String defLabel;
    private String description;
    private String createdOn;
    private String content;
    private String type = "";
    private String typeLabel = "";
    private List<AttrVo> attrList;

    public String getId() {
        return this.id;
    }

    public String getDefLabel() {
        return this.defLabel;
    }

    public String getDescription() {
        return this.description;
    }

    public String getCreatedOn() {
        return this.createdOn;
    }

    public String getContent() {
        return this.content;
    }

    public String getType() {
        return this.type;
    }

    public String getTypeLabel() {
        return this.typeLabel;
    }

    public List<AttrVo> getAttrList() {
        return this.attrList;
    }

    public void setId(String id) {
        this.id = id;
    }

    public void setDefLabel(String defLabel) {
        this.defLabel = defLabel;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public void setCreatedOn(String createdOn) {
        this.createdOn = createdOn;
    }

    public void setContent(String content) {
        this.content = content;
    }

    public void setType(String type) {
        this.type = type;
    }

    public void setTypeLabel(String typeLabel) {
        this.typeLabel = typeLabel;
    }

    public void setAttrList(List<AttrVo> attrList) {
        this.attrList = attrList;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof DemandTypeVo)) {
            return false;
        }
        DemandTypeVo other = (DemandTypeVo)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        String this$id = this.getId();
        String other$id = other.getId();
        if (this$id == null ? other$id != null : !this$id.equals(other$id)) {
            return false;
        }
        String this$defLabel = this.getDefLabel();
        String other$defLabel = other.getDefLabel();
        if (this$defLabel == null ? other$defLabel != null : !this$defLabel.equals(other$defLabel)) {
            return false;
        }
        String this$description = this.getDescription();
        String other$description = other.getDescription();
        if (this$description == null ? other$description != null : !this$description.equals(other$description)) {
            return false;
        }
        String this$createdOn = this.getCreatedOn();
        String other$createdOn = other.getCreatedOn();
        if (this$createdOn == null ? other$createdOn != null : !this$createdOn.equals(other$createdOn)) {
            return false;
        }
        String this$content = this.getContent();
        String other$content = other.getContent();
        if (this$content == null ? other$content != null : !this$content.equals(other$content)) {
            return false;
        }
        String this$type = this.getType();
        String other$type = other.getType();
        if (this$type == null ? other$type != null : !this$type.equals(other$type)) {
            return false;
        }
        String this$typeLabel = this.getTypeLabel();
        String other$typeLabel = other.getTypeLabel();
        if (this$typeLabel == null ? other$typeLabel != null : !this$typeLabel.equals(other$typeLabel)) {
            return false;
        }
        List this$attrList = this.getAttrList();
        List other$attrList = other.getAttrList();
        return !(this$attrList == null ? other$attrList != null : !((Object)this$attrList).equals(other$attrList));
    }

    protected boolean canEqual(Object other) {
        return other instanceof DemandTypeVo;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        String $id = this.getId();
        result = result * 59 + ($id == null ? 43 : $id.hashCode());
        String $defLabel = this.getDefLabel();
        result = result * 59 + ($defLabel == null ? 43 : $defLabel.hashCode());
        String $description = this.getDescription();
        result = result * 59 + ($description == null ? 43 : $description.hashCode());
        String $createdOn = this.getCreatedOn();
        result = result * 59 + ($createdOn == null ? 43 : $createdOn.hashCode());
        String $content = this.getContent();
        result = result * 59 + ($content == null ? 43 : $content.hashCode());
        String $type = this.getType();
        result = result * 59 + ($type == null ? 43 : $type.hashCode());
        String $typeLabel = this.getTypeLabel();
        result = result * 59 + ($typeLabel == null ? 43 : $typeLabel.hashCode());
        List $attrList = this.getAttrList();
        result = result * 59 + ($attrList == null ? 43 : ((Object)$attrList).hashCode());
        return result;
    }

    public String toString() {
        return "DemandTypeVo(id=" + this.getId() + ", defLabel=" + this.getDefLabel() + ", description=" + this.getDescription() + ", createdOn=" + this.getCreatedOn() + ", content=" + this.getContent() + ", type=" + this.getType() + ", typeLabel=" + this.getTypeLabel() + ", attrList=" + this.getAttrList() + ")";
    }
}

