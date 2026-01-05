/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.vo.WindBlockRunningVo
 *  com.seer.rds.vo.WindBlockRunningVo$WindBlockRunningVoBuilder
 */
package com.seer.rds.vo;

import com.seer.rds.vo.WindBlockRunningVo;
import java.util.Date;

public class WindBlockRunningVo {
    private String blockConfigId;
    private String blockName;
    private Integer status;
    private Date startedOn;
    private Date endedOn;
    private String endedReason;
    private String blockLabel;
    private String remark;

    public static WindBlockRunningVoBuilder builder() {
        return new WindBlockRunningVoBuilder();
    }

    public String getBlockConfigId() {
        return this.blockConfigId;
    }

    public String getBlockName() {
        return this.blockName;
    }

    public Integer getStatus() {
        return this.status;
    }

    public Date getStartedOn() {
        return this.startedOn;
    }

    public Date getEndedOn() {
        return this.endedOn;
    }

    public String getEndedReason() {
        return this.endedReason;
    }

    public String getBlockLabel() {
        return this.blockLabel;
    }

    public String getRemark() {
        return this.remark;
    }

    public void setBlockConfigId(String blockConfigId) {
        this.blockConfigId = blockConfigId;
    }

    public void setBlockName(String blockName) {
        this.blockName = blockName;
    }

    public void setStatus(Integer status) {
        this.status = status;
    }

    public void setStartedOn(Date startedOn) {
        this.startedOn = startedOn;
    }

    public void setEndedOn(Date endedOn) {
        this.endedOn = endedOn;
    }

    public void setEndedReason(String endedReason) {
        this.endedReason = endedReason;
    }

    public void setBlockLabel(String blockLabel) {
        this.blockLabel = blockLabel;
    }

    public void setRemark(String remark) {
        this.remark = remark;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof WindBlockRunningVo)) {
            return false;
        }
        WindBlockRunningVo other = (WindBlockRunningVo)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        Integer this$status = this.getStatus();
        Integer other$status = other.getStatus();
        if (this$status == null ? other$status != null : !((Object)this$status).equals(other$status)) {
            return false;
        }
        String this$blockConfigId = this.getBlockConfigId();
        String other$blockConfigId = other.getBlockConfigId();
        if (this$blockConfigId == null ? other$blockConfigId != null : !this$blockConfigId.equals(other$blockConfigId)) {
            return false;
        }
        String this$blockName = this.getBlockName();
        String other$blockName = other.getBlockName();
        if (this$blockName == null ? other$blockName != null : !this$blockName.equals(other$blockName)) {
            return false;
        }
        Date this$startedOn = this.getStartedOn();
        Date other$startedOn = other.getStartedOn();
        if (this$startedOn == null ? other$startedOn != null : !((Object)this$startedOn).equals(other$startedOn)) {
            return false;
        }
        Date this$endedOn = this.getEndedOn();
        Date other$endedOn = other.getEndedOn();
        if (this$endedOn == null ? other$endedOn != null : !((Object)this$endedOn).equals(other$endedOn)) {
            return false;
        }
        String this$endedReason = this.getEndedReason();
        String other$endedReason = other.getEndedReason();
        if (this$endedReason == null ? other$endedReason != null : !this$endedReason.equals(other$endedReason)) {
            return false;
        }
        String this$blockLabel = this.getBlockLabel();
        String other$blockLabel = other.getBlockLabel();
        if (this$blockLabel == null ? other$blockLabel != null : !this$blockLabel.equals(other$blockLabel)) {
            return false;
        }
        String this$remark = this.getRemark();
        String other$remark = other.getRemark();
        return !(this$remark == null ? other$remark != null : !this$remark.equals(other$remark));
    }

    protected boolean canEqual(Object other) {
        return other instanceof WindBlockRunningVo;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        Integer $status = this.getStatus();
        result = result * 59 + ($status == null ? 43 : ((Object)$status).hashCode());
        String $blockConfigId = this.getBlockConfigId();
        result = result * 59 + ($blockConfigId == null ? 43 : $blockConfigId.hashCode());
        String $blockName = this.getBlockName();
        result = result * 59 + ($blockName == null ? 43 : $blockName.hashCode());
        Date $startedOn = this.getStartedOn();
        result = result * 59 + ($startedOn == null ? 43 : ((Object)$startedOn).hashCode());
        Date $endedOn = this.getEndedOn();
        result = result * 59 + ($endedOn == null ? 43 : ((Object)$endedOn).hashCode());
        String $endedReason = this.getEndedReason();
        result = result * 59 + ($endedReason == null ? 43 : $endedReason.hashCode());
        String $blockLabel = this.getBlockLabel();
        result = result * 59 + ($blockLabel == null ? 43 : $blockLabel.hashCode());
        String $remark = this.getRemark();
        result = result * 59 + ($remark == null ? 43 : $remark.hashCode());
        return result;
    }

    public String toString() {
        return "WindBlockRunningVo(blockConfigId=" + this.getBlockConfigId() + ", blockName=" + this.getBlockName() + ", status=" + this.getStatus() + ", startedOn=" + this.getStartedOn() + ", endedOn=" + this.getEndedOn() + ", endedReason=" + this.getEndedReason() + ", blockLabel=" + this.getBlockLabel() + ", remark=" + this.getRemark() + ")";
    }

    public WindBlockRunningVo() {
    }

    public WindBlockRunningVo(String blockConfigId, String blockName, Integer status, Date startedOn, Date endedOn, String endedReason, String blockLabel, String remark) {
        this.blockConfigId = blockConfigId;
        this.blockName = blockName;
        this.status = status;
        this.startedOn = startedOn;
        this.endedOn = endedOn;
        this.endedReason = endedReason;
        this.blockLabel = blockLabel;
        this.remark = remark;
    }
}

