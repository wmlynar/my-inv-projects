/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.vo.response.WindTaskRecordVo
 *  com.seer.rds.vo.response.WindTaskRecordVo$WindTaskRecordVoBuilder
 */
package com.seer.rds.vo.response;

import com.seer.rds.vo.response.WindTaskRecordVo;

public class WindTaskRecordVo {
    private String id;
    private String outOrderNo;
    private String defId;
    private String defLabel;
    private String createdOn;
    private Integer status;
    private String endedOn;
    private String stateDescription;
    private String agvId;

    public static WindTaskRecordVoBuilder builder() {
        return new WindTaskRecordVoBuilder();
    }

    public String getId() {
        return this.id;
    }

    public String getOutOrderNo() {
        return this.outOrderNo;
    }

    public String getDefId() {
        return this.defId;
    }

    public String getDefLabel() {
        return this.defLabel;
    }

    public String getCreatedOn() {
        return this.createdOn;
    }

    public Integer getStatus() {
        return this.status;
    }

    public String getEndedOn() {
        return this.endedOn;
    }

    public String getStateDescription() {
        return this.stateDescription;
    }

    public String getAgvId() {
        return this.agvId;
    }

    public void setId(String id) {
        this.id = id;
    }

    public void setOutOrderNo(String outOrderNo) {
        this.outOrderNo = outOrderNo;
    }

    public void setDefId(String defId) {
        this.defId = defId;
    }

    public void setDefLabel(String defLabel) {
        this.defLabel = defLabel;
    }

    public void setCreatedOn(String createdOn) {
        this.createdOn = createdOn;
    }

    public void setStatus(Integer status) {
        this.status = status;
    }

    public void setEndedOn(String endedOn) {
        this.endedOn = endedOn;
    }

    public void setStateDescription(String stateDescription) {
        this.stateDescription = stateDescription;
    }

    public void setAgvId(String agvId) {
        this.agvId = agvId;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof WindTaskRecordVo)) {
            return false;
        }
        WindTaskRecordVo other = (WindTaskRecordVo)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        Integer this$status = this.getStatus();
        Integer other$status = other.getStatus();
        if (this$status == null ? other$status != null : !((Object)this$status).equals(other$status)) {
            return false;
        }
        String this$id = this.getId();
        String other$id = other.getId();
        if (this$id == null ? other$id != null : !this$id.equals(other$id)) {
            return false;
        }
        String this$outOrderNo = this.getOutOrderNo();
        String other$outOrderNo = other.getOutOrderNo();
        if (this$outOrderNo == null ? other$outOrderNo != null : !this$outOrderNo.equals(other$outOrderNo)) {
            return false;
        }
        String this$defId = this.getDefId();
        String other$defId = other.getDefId();
        if (this$defId == null ? other$defId != null : !this$defId.equals(other$defId)) {
            return false;
        }
        String this$defLabel = this.getDefLabel();
        String other$defLabel = other.getDefLabel();
        if (this$defLabel == null ? other$defLabel != null : !this$defLabel.equals(other$defLabel)) {
            return false;
        }
        String this$createdOn = this.getCreatedOn();
        String other$createdOn = other.getCreatedOn();
        if (this$createdOn == null ? other$createdOn != null : !this$createdOn.equals(other$createdOn)) {
            return false;
        }
        String this$endedOn = this.getEndedOn();
        String other$endedOn = other.getEndedOn();
        if (this$endedOn == null ? other$endedOn != null : !this$endedOn.equals(other$endedOn)) {
            return false;
        }
        String this$stateDescription = this.getStateDescription();
        String other$stateDescription = other.getStateDescription();
        if (this$stateDescription == null ? other$stateDescription != null : !this$stateDescription.equals(other$stateDescription)) {
            return false;
        }
        String this$agvId = this.getAgvId();
        String other$agvId = other.getAgvId();
        return !(this$agvId == null ? other$agvId != null : !this$agvId.equals(other$agvId));
    }

    protected boolean canEqual(Object other) {
        return other instanceof WindTaskRecordVo;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        Integer $status = this.getStatus();
        result = result * 59 + ($status == null ? 43 : ((Object)$status).hashCode());
        String $id = this.getId();
        result = result * 59 + ($id == null ? 43 : $id.hashCode());
        String $outOrderNo = this.getOutOrderNo();
        result = result * 59 + ($outOrderNo == null ? 43 : $outOrderNo.hashCode());
        String $defId = this.getDefId();
        result = result * 59 + ($defId == null ? 43 : $defId.hashCode());
        String $defLabel = this.getDefLabel();
        result = result * 59 + ($defLabel == null ? 43 : $defLabel.hashCode());
        String $createdOn = this.getCreatedOn();
        result = result * 59 + ($createdOn == null ? 43 : $createdOn.hashCode());
        String $endedOn = this.getEndedOn();
        result = result * 59 + ($endedOn == null ? 43 : $endedOn.hashCode());
        String $stateDescription = this.getStateDescription();
        result = result * 59 + ($stateDescription == null ? 43 : $stateDescription.hashCode());
        String $agvId = this.getAgvId();
        result = result * 59 + ($agvId == null ? 43 : $agvId.hashCode());
        return result;
    }

    public String toString() {
        return "WindTaskRecordVo(id=" + this.getId() + ", outOrderNo=" + this.getOutOrderNo() + ", defId=" + this.getDefId() + ", defLabel=" + this.getDefLabel() + ", createdOn=" + this.getCreatedOn() + ", status=" + this.getStatus() + ", endedOn=" + this.getEndedOn() + ", stateDescription=" + this.getStateDescription() + ", agvId=" + this.getAgvId() + ")";
    }

    public WindTaskRecordVo() {
    }

    public WindTaskRecordVo(String id, String outOrderNo, String defId, String defLabel, String createdOn, Integer status, String endedOn, String stateDescription, String agvId) {
        this.id = id;
        this.outOrderNo = outOrderNo;
        this.defId = defId;
        this.defLabel = defLabel;
        this.createdOn = createdOn;
        this.status = status;
        this.endedOn = endedOn;
        this.stateDescription = stateDescription;
        this.agvId = agvId;
    }
}

