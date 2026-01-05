/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.vo.OrderRetentionVo
 *  com.seer.rds.vo.OrderRetentionVo$OrderRetentionVoBuilder
 *  io.swagger.annotations.ApiModel
 */
package com.seer.rds.vo;

import com.seer.rds.vo.OrderRetentionVo;
import io.swagger.annotations.ApiModel;

@ApiModel(value="\u6ede\u7559\u8fd0\u5355\u7edf\u8ba1\u4f7f\u7528\u6b64\u5bf9\u8c61")
public class OrderRetentionVo {
    private String id;
    private String vehicle;
    private String state;
    private String receiveTime;
    private String externalId;

    public static OrderRetentionVoBuilder builder() {
        return new OrderRetentionVoBuilder();
    }

    public String getId() {
        return this.id;
    }

    public String getVehicle() {
        return this.vehicle;
    }

    public String getState() {
        return this.state;
    }

    public String getReceiveTime() {
        return this.receiveTime;
    }

    public String getExternalId() {
        return this.externalId;
    }

    public void setId(String id) {
        this.id = id;
    }

    public void setVehicle(String vehicle) {
        this.vehicle = vehicle;
    }

    public void setState(String state) {
        this.state = state;
    }

    public void setReceiveTime(String receiveTime) {
        this.receiveTime = receiveTime;
    }

    public void setExternalId(String externalId) {
        this.externalId = externalId;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof OrderRetentionVo)) {
            return false;
        }
        OrderRetentionVo other = (OrderRetentionVo)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        String this$id = this.getId();
        String other$id = other.getId();
        if (this$id == null ? other$id != null : !this$id.equals(other$id)) {
            return false;
        }
        String this$vehicle = this.getVehicle();
        String other$vehicle = other.getVehicle();
        if (this$vehicle == null ? other$vehicle != null : !this$vehicle.equals(other$vehicle)) {
            return false;
        }
        String this$state = this.getState();
        String other$state = other.getState();
        if (this$state == null ? other$state != null : !this$state.equals(other$state)) {
            return false;
        }
        String this$receiveTime = this.getReceiveTime();
        String other$receiveTime = other.getReceiveTime();
        if (this$receiveTime == null ? other$receiveTime != null : !this$receiveTime.equals(other$receiveTime)) {
            return false;
        }
        String this$externalId = this.getExternalId();
        String other$externalId = other.getExternalId();
        return !(this$externalId == null ? other$externalId != null : !this$externalId.equals(other$externalId));
    }

    protected boolean canEqual(Object other) {
        return other instanceof OrderRetentionVo;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        String $id = this.getId();
        result = result * 59 + ($id == null ? 43 : $id.hashCode());
        String $vehicle = this.getVehicle();
        result = result * 59 + ($vehicle == null ? 43 : $vehicle.hashCode());
        String $state = this.getState();
        result = result * 59 + ($state == null ? 43 : $state.hashCode());
        String $receiveTime = this.getReceiveTime();
        result = result * 59 + ($receiveTime == null ? 43 : $receiveTime.hashCode());
        String $externalId = this.getExternalId();
        result = result * 59 + ($externalId == null ? 43 : $externalId.hashCode());
        return result;
    }

    public String toString() {
        return "OrderRetentionVo(id=" + this.getId() + ", vehicle=" + this.getVehicle() + ", state=" + this.getState() + ", receiveTime=" + this.getReceiveTime() + ", externalId=" + this.getExternalId() + ")";
    }

    public OrderRetentionVo(String id, String vehicle, String state, String receiveTime, String externalId) {
        this.id = id;
        this.vehicle = vehicle;
        this.state = state;
        this.receiveTime = receiveTime;
        this.externalId = externalId;
    }

    public OrderRetentionVo() {
    }
}

