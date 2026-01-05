/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.vo.CAgvOperationVo
 *  com.seer.rds.vo.CAgvOperationVo$CAgvOperationVoBuilder
 */
package com.seer.rds.vo;

import com.seer.rds.vo.CAgvOperationVo;

public class CAgvOperationVo {
    private Integer blockId;
    private String blockName;
    private String blockType;
    private String agvId;
    private String targetSiteLabel;
    private String scriptName;
    private String var_param;

    CAgvOperationVo(Integer blockId, String blockName, String blockType, String agvId, String targetSiteLabel, String scriptName, String var_param) {
        this.blockId = blockId;
        this.blockName = blockName;
        this.blockType = blockType;
        this.agvId = agvId;
        this.targetSiteLabel = targetSiteLabel;
        this.scriptName = scriptName;
        this.var_param = var_param;
    }

    public static CAgvOperationVoBuilder builder() {
        return new CAgvOperationVoBuilder();
    }

    public Integer getBlockId() {
        return this.blockId;
    }

    public String getBlockName() {
        return this.blockName;
    }

    public String getBlockType() {
        return this.blockType;
    }

    public String getAgvId() {
        return this.agvId;
    }

    public String getTargetSiteLabel() {
        return this.targetSiteLabel;
    }

    public String getScriptName() {
        return this.scriptName;
    }

    public String getVar_param() {
        return this.var_param;
    }

    public void setBlockId(Integer blockId) {
        this.blockId = blockId;
    }

    public void setBlockName(String blockName) {
        this.blockName = blockName;
    }

    public void setBlockType(String blockType) {
        this.blockType = blockType;
    }

    public void setAgvId(String agvId) {
        this.agvId = agvId;
    }

    public void setTargetSiteLabel(String targetSiteLabel) {
        this.targetSiteLabel = targetSiteLabel;
    }

    public void setScriptName(String scriptName) {
        this.scriptName = scriptName;
    }

    public void setVar_param(String var_param) {
        this.var_param = var_param;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof CAgvOperationVo)) {
            return false;
        }
        CAgvOperationVo other = (CAgvOperationVo)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        Integer this$blockId = this.getBlockId();
        Integer other$blockId = other.getBlockId();
        if (this$blockId == null ? other$blockId != null : !((Object)this$blockId).equals(other$blockId)) {
            return false;
        }
        String this$blockName = this.getBlockName();
        String other$blockName = other.getBlockName();
        if (this$blockName == null ? other$blockName != null : !this$blockName.equals(other$blockName)) {
            return false;
        }
        String this$blockType = this.getBlockType();
        String other$blockType = other.getBlockType();
        if (this$blockType == null ? other$blockType != null : !this$blockType.equals(other$blockType)) {
            return false;
        }
        String this$agvId = this.getAgvId();
        String other$agvId = other.getAgvId();
        if (this$agvId == null ? other$agvId != null : !this$agvId.equals(other$agvId)) {
            return false;
        }
        String this$targetSiteLabel = this.getTargetSiteLabel();
        String other$targetSiteLabel = other.getTargetSiteLabel();
        if (this$targetSiteLabel == null ? other$targetSiteLabel != null : !this$targetSiteLabel.equals(other$targetSiteLabel)) {
            return false;
        }
        String this$scriptName = this.getScriptName();
        String other$scriptName = other.getScriptName();
        if (this$scriptName == null ? other$scriptName != null : !this$scriptName.equals(other$scriptName)) {
            return false;
        }
        String this$var_param = this.getVar_param();
        String other$var_param = other.getVar_param();
        return !(this$var_param == null ? other$var_param != null : !this$var_param.equals(other$var_param));
    }

    protected boolean canEqual(Object other) {
        return other instanceof CAgvOperationVo;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        Integer $blockId = this.getBlockId();
        result = result * 59 + ($blockId == null ? 43 : ((Object)$blockId).hashCode());
        String $blockName = this.getBlockName();
        result = result * 59 + ($blockName == null ? 43 : $blockName.hashCode());
        String $blockType = this.getBlockType();
        result = result * 59 + ($blockType == null ? 43 : $blockType.hashCode());
        String $agvId = this.getAgvId();
        result = result * 59 + ($agvId == null ? 43 : $agvId.hashCode());
        String $targetSiteLabel = this.getTargetSiteLabel();
        result = result * 59 + ($targetSiteLabel == null ? 43 : $targetSiteLabel.hashCode());
        String $scriptName = this.getScriptName();
        result = result * 59 + ($scriptName == null ? 43 : $scriptName.hashCode());
        String $var_param = this.getVar_param();
        result = result * 59 + ($var_param == null ? 43 : $var_param.hashCode());
        return result;
    }

    public String toString() {
        return "CAgvOperationVo(blockId=" + this.getBlockId() + ", blockName=" + this.getBlockName() + ", blockType=" + this.getBlockType() + ", agvId=" + this.getAgvId() + ", targetSiteLabel=" + this.getTargetSiteLabel() + ", scriptName=" + this.getScriptName() + ", var_param=" + this.getVar_param() + ")";
    }
}

