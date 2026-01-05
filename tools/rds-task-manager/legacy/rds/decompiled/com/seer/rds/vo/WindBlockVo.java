/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.alibaba.fastjson.JSONObject
 *  com.seer.rds.vo.WindBlockVo
 *  com.seer.rds.vo.WindBlockVo$WindBlockVoBuilder
 */
package com.seer.rds.vo;

import com.alibaba.fastjson.JSONObject;
import com.seer.rds.vo.WindBlockVo;

public class WindBlockVo {
    private Integer blockId;
    private String blockName;
    private String blockType;
    private Integer operationParentBlockId;
    private JSONObject blockInputParamsValues;
    private String remark;
    protected Long maxTimeOut;
    protected String errorMsg;

    WindBlockVo(Integer blockId, String blockName, String blockType, Integer operationParentBlockId, JSONObject blockInputParamsValues, String remark, Long maxTimeOut, String errorMsg) {
        this.blockId = blockId;
        this.blockName = blockName;
        this.blockType = blockType;
        this.operationParentBlockId = operationParentBlockId;
        this.blockInputParamsValues = blockInputParamsValues;
        this.remark = remark;
        this.maxTimeOut = maxTimeOut;
        this.errorMsg = errorMsg;
    }

    public static WindBlockVoBuilder builder() {
        return new WindBlockVoBuilder();
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

    public Integer getOperationParentBlockId() {
        return this.operationParentBlockId;
    }

    public JSONObject getBlockInputParamsValues() {
        return this.blockInputParamsValues;
    }

    public String getRemark() {
        return this.remark;
    }

    public Long getMaxTimeOut() {
        return this.maxTimeOut;
    }

    public String getErrorMsg() {
        return this.errorMsg;
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

    public void setOperationParentBlockId(Integer operationParentBlockId) {
        this.operationParentBlockId = operationParentBlockId;
    }

    public void setBlockInputParamsValues(JSONObject blockInputParamsValues) {
        this.blockInputParamsValues = blockInputParamsValues;
    }

    public void setRemark(String remark) {
        this.remark = remark;
    }

    public void setMaxTimeOut(Long maxTimeOut) {
        this.maxTimeOut = maxTimeOut;
    }

    public void setErrorMsg(String errorMsg) {
        this.errorMsg = errorMsg;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof WindBlockVo)) {
            return false;
        }
        WindBlockVo other = (WindBlockVo)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        Integer this$blockId = this.getBlockId();
        Integer other$blockId = other.getBlockId();
        if (this$blockId == null ? other$blockId != null : !((Object)this$blockId).equals(other$blockId)) {
            return false;
        }
        Integer this$operationParentBlockId = this.getOperationParentBlockId();
        Integer other$operationParentBlockId = other.getOperationParentBlockId();
        if (this$operationParentBlockId == null ? other$operationParentBlockId != null : !((Object)this$operationParentBlockId).equals(other$operationParentBlockId)) {
            return false;
        }
        Long this$maxTimeOut = this.getMaxTimeOut();
        Long other$maxTimeOut = other.getMaxTimeOut();
        if (this$maxTimeOut == null ? other$maxTimeOut != null : !((Object)this$maxTimeOut).equals(other$maxTimeOut)) {
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
        JSONObject this$blockInputParamsValues = this.getBlockInputParamsValues();
        JSONObject other$blockInputParamsValues = other.getBlockInputParamsValues();
        if (this$blockInputParamsValues == null ? other$blockInputParamsValues != null : !this$blockInputParamsValues.equals(other$blockInputParamsValues)) {
            return false;
        }
        String this$remark = this.getRemark();
        String other$remark = other.getRemark();
        if (this$remark == null ? other$remark != null : !this$remark.equals(other$remark)) {
            return false;
        }
        String this$errorMsg = this.getErrorMsg();
        String other$errorMsg = other.getErrorMsg();
        return !(this$errorMsg == null ? other$errorMsg != null : !this$errorMsg.equals(other$errorMsg));
    }

    protected boolean canEqual(Object other) {
        return other instanceof WindBlockVo;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        Integer $blockId = this.getBlockId();
        result = result * 59 + ($blockId == null ? 43 : ((Object)$blockId).hashCode());
        Integer $operationParentBlockId = this.getOperationParentBlockId();
        result = result * 59 + ($operationParentBlockId == null ? 43 : ((Object)$operationParentBlockId).hashCode());
        Long $maxTimeOut = this.getMaxTimeOut();
        result = result * 59 + ($maxTimeOut == null ? 43 : ((Object)$maxTimeOut).hashCode());
        String $blockName = this.getBlockName();
        result = result * 59 + ($blockName == null ? 43 : $blockName.hashCode());
        String $blockType = this.getBlockType();
        result = result * 59 + ($blockType == null ? 43 : $blockType.hashCode());
        JSONObject $blockInputParamsValues = this.getBlockInputParamsValues();
        result = result * 59 + ($blockInputParamsValues == null ? 43 : $blockInputParamsValues.hashCode());
        String $remark = this.getRemark();
        result = result * 59 + ($remark == null ? 43 : $remark.hashCode());
        String $errorMsg = this.getErrorMsg();
        result = result * 59 + ($errorMsg == null ? 43 : $errorMsg.hashCode());
        return result;
    }

    public String toString() {
        return "WindBlockVo(blockId=" + this.getBlockId() + ", blockName=" + this.getBlockName() + ", blockType=" + this.getBlockType() + ", operationParentBlockId=" + this.getOperationParentBlockId() + ", blockInputParamsValues=" + this.getBlockInputParamsValues() + ", remark=" + this.getRemark() + ", maxTimeOut=" + this.getMaxTimeOut() + ", errorMsg=" + this.getErrorMsg() + ")";
    }
}

