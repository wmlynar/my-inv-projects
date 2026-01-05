/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.vo.response.WindTaskRecordStatVo
 *  com.seer.rds.vo.response.WindTaskRecordStatVo$WindTaskRecordStatVoBuilder
 *  io.swagger.annotations.ApiModel
 */
package com.seer.rds.vo.response;

import com.seer.rds.vo.response.WindTaskRecordStatVo;
import io.swagger.annotations.ApiModel;
import java.io.Serializable;
import java.util.Date;

@ApiModel(value="\u6ede\u7559\u4efb\u52a1\u7edf\u8ba1\u4f7f\u7528\u6b64\u5bf9\u8c61")
public class WindTaskRecordStatVo
implements Serializable {
    private String id;
    private String defLabel;
    private Date createdOn;
    private Integer status;
    private String agvId;

    public static WindTaskRecordStatVoBuilder builder() {
        return new WindTaskRecordStatVoBuilder();
    }

    public String getId() {
        return this.id;
    }

    public String getDefLabel() {
        return this.defLabel;
    }

    public Date getCreatedOn() {
        return this.createdOn;
    }

    public Integer getStatus() {
        return this.status;
    }

    public String getAgvId() {
        return this.agvId;
    }

    public void setId(String id) {
        this.id = id;
    }

    public void setDefLabel(String defLabel) {
        this.defLabel = defLabel;
    }

    public void setCreatedOn(Date createdOn) {
        this.createdOn = createdOn;
    }

    public void setStatus(Integer status) {
        this.status = status;
    }

    public void setAgvId(String agvId) {
        this.agvId = agvId;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof WindTaskRecordStatVo)) {
            return false;
        }
        WindTaskRecordStatVo other = (WindTaskRecordStatVo)o;
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
        String this$defLabel = this.getDefLabel();
        String other$defLabel = other.getDefLabel();
        if (this$defLabel == null ? other$defLabel != null : !this$defLabel.equals(other$defLabel)) {
            return false;
        }
        Date this$createdOn = this.getCreatedOn();
        Date other$createdOn = other.getCreatedOn();
        if (this$createdOn == null ? other$createdOn != null : !((Object)this$createdOn).equals(other$createdOn)) {
            return false;
        }
        String this$agvId = this.getAgvId();
        String other$agvId = other.getAgvId();
        return !(this$agvId == null ? other$agvId != null : !this$agvId.equals(other$agvId));
    }

    protected boolean canEqual(Object other) {
        return other instanceof WindTaskRecordStatVo;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        Integer $status = this.getStatus();
        result = result * 59 + ($status == null ? 43 : ((Object)$status).hashCode());
        String $id = this.getId();
        result = result * 59 + ($id == null ? 43 : $id.hashCode());
        String $defLabel = this.getDefLabel();
        result = result * 59 + ($defLabel == null ? 43 : $defLabel.hashCode());
        Date $createdOn = this.getCreatedOn();
        result = result * 59 + ($createdOn == null ? 43 : ((Object)$createdOn).hashCode());
        String $agvId = this.getAgvId();
        result = result * 59 + ($agvId == null ? 43 : $agvId.hashCode());
        return result;
    }

    public String toString() {
        return "WindTaskRecordStatVo(id=" + this.getId() + ", defLabel=" + this.getDefLabel() + ", createdOn=" + this.getCreatedOn() + ", status=" + this.getStatus() + ", agvId=" + this.getAgvId() + ")";
    }

    public WindTaskRecordStatVo(String id, String defLabel, Date createdOn, Integer status, String agvId) {
        this.id = id;
        this.defLabel = defLabel;
        this.createdOn = createdOn;
        this.status = status;
        this.agvId = agvId;
    }

    public WindTaskRecordStatVo() {
    }
}

