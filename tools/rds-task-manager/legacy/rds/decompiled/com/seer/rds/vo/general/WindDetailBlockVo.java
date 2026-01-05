/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.vo.general.ChildrenInputParamsVo
 *  com.seer.rds.vo.general.WindDetailBlockVo
 *  com.seer.rds.vo.general.WindDetailBlockVo$WindDetailBlockVoBuilder
 */
package com.seer.rds.vo.general;

import com.seer.rds.vo.general.ChildrenInputParamsVo;
import com.seer.rds.vo.general.WindDetailBlockVo;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class WindDetailBlockVo {
    private Integer id = -1;
    private String name = "-1";
    private String blockType = "RootBp";
    private Map<String, List<WindDetailBlockVo>> children = new HashMap();
    private Boolean selected = false;
    private String refTaskDefId = "";
    private Map<String, ChildrenInputParamsVo> inputParams = new HashMap();
    private Boolean expanded = true;

    public static WindDetailBlockVoBuilder builder() {
        return new WindDetailBlockVoBuilder();
    }

    public Integer getId() {
        return this.id;
    }

    public String getName() {
        return this.name;
    }

    public String getBlockType() {
        return this.blockType;
    }

    public Map<String, List<WindDetailBlockVo>> getChildren() {
        return this.children;
    }

    public Boolean getSelected() {
        return this.selected;
    }

    public String getRefTaskDefId() {
        return this.refTaskDefId;
    }

    public Map<String, ChildrenInputParamsVo> getInputParams() {
        return this.inputParams;
    }

    public Boolean getExpanded() {
        return this.expanded;
    }

    public void setId(Integer id) {
        this.id = id;
    }

    public void setName(String name) {
        this.name = name;
    }

    public void setBlockType(String blockType) {
        this.blockType = blockType;
    }

    public void setChildren(Map<String, List<WindDetailBlockVo>> children) {
        this.children = children;
    }

    public void setSelected(Boolean selected) {
        this.selected = selected;
    }

    public void setRefTaskDefId(String refTaskDefId) {
        this.refTaskDefId = refTaskDefId;
    }

    public void setInputParams(Map<String, ChildrenInputParamsVo> inputParams) {
        this.inputParams = inputParams;
    }

    public void setExpanded(Boolean expanded) {
        this.expanded = expanded;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof WindDetailBlockVo)) {
            return false;
        }
        WindDetailBlockVo other = (WindDetailBlockVo)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        Integer this$id = this.getId();
        Integer other$id = other.getId();
        if (this$id == null ? other$id != null : !((Object)this$id).equals(other$id)) {
            return false;
        }
        Boolean this$selected = this.getSelected();
        Boolean other$selected = other.getSelected();
        if (this$selected == null ? other$selected != null : !((Object)this$selected).equals(other$selected)) {
            return false;
        }
        Boolean this$expanded = this.getExpanded();
        Boolean other$expanded = other.getExpanded();
        if (this$expanded == null ? other$expanded != null : !((Object)this$expanded).equals(other$expanded)) {
            return false;
        }
        String this$name = this.getName();
        String other$name = other.getName();
        if (this$name == null ? other$name != null : !this$name.equals(other$name)) {
            return false;
        }
        String this$blockType = this.getBlockType();
        String other$blockType = other.getBlockType();
        if (this$blockType == null ? other$blockType != null : !this$blockType.equals(other$blockType)) {
            return false;
        }
        Map this$children = this.getChildren();
        Map other$children = other.getChildren();
        if (this$children == null ? other$children != null : !((Object)this$children).equals(other$children)) {
            return false;
        }
        String this$refTaskDefId = this.getRefTaskDefId();
        String other$refTaskDefId = other.getRefTaskDefId();
        if (this$refTaskDefId == null ? other$refTaskDefId != null : !this$refTaskDefId.equals(other$refTaskDefId)) {
            return false;
        }
        Map this$inputParams = this.getInputParams();
        Map other$inputParams = other.getInputParams();
        return !(this$inputParams == null ? other$inputParams != null : !((Object)this$inputParams).equals(other$inputParams));
    }

    protected boolean canEqual(Object other) {
        return other instanceof WindDetailBlockVo;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        Integer $id = this.getId();
        result = result * 59 + ($id == null ? 43 : ((Object)$id).hashCode());
        Boolean $selected = this.getSelected();
        result = result * 59 + ($selected == null ? 43 : ((Object)$selected).hashCode());
        Boolean $expanded = this.getExpanded();
        result = result * 59 + ($expanded == null ? 43 : ((Object)$expanded).hashCode());
        String $name = this.getName();
        result = result * 59 + ($name == null ? 43 : $name.hashCode());
        String $blockType = this.getBlockType();
        result = result * 59 + ($blockType == null ? 43 : $blockType.hashCode());
        Map $children = this.getChildren();
        result = result * 59 + ($children == null ? 43 : ((Object)$children).hashCode());
        String $refTaskDefId = this.getRefTaskDefId();
        result = result * 59 + ($refTaskDefId == null ? 43 : $refTaskDefId.hashCode());
        Map $inputParams = this.getInputParams();
        result = result * 59 + ($inputParams == null ? 43 : ((Object)$inputParams).hashCode());
        return result;
    }

    public String toString() {
        return "WindDetailBlockVo(id=" + this.getId() + ", name=" + this.getName() + ", blockType=" + this.getBlockType() + ", children=" + this.getChildren() + ", selected=" + this.getSelected() + ", refTaskDefId=" + this.getRefTaskDefId() + ", inputParams=" + this.getInputParams() + ", expanded=" + this.getExpanded() + ")";
    }

    public WindDetailBlockVo() {
    }

    public WindDetailBlockVo(Integer id, String name, String blockType, Map<String, List<WindDetailBlockVo>> children, Boolean selected, String refTaskDefId, Map<String, ChildrenInputParamsVo> inputParams, Boolean expanded) {
        this.id = id;
        this.name = name;
        this.blockType = blockType;
        this.children = children;
        this.selected = selected;
        this.refTaskDefId = refTaskDefId;
        this.inputParams = inputParams;
        this.expanded = expanded;
    }
}

