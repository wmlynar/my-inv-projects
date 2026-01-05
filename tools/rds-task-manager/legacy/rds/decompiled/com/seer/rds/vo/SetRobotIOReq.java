/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.vo.SetRobotIOReq
 */
package com.seer.rds.vo;

public class SetRobotIOReq {
    private String vehicle;
    private Integer id;
    private String type;
    private Boolean status;

    public String getVehicle() {
        return this.vehicle;
    }

    public Integer getId() {
        return this.id;
    }

    public String getType() {
        return this.type;
    }

    public Boolean getStatus() {
        return this.status;
    }

    public void setVehicle(String vehicle) {
        this.vehicle = vehicle;
    }

    public void setId(Integer id) {
        this.id = id;
    }

    public void setType(String type) {
        this.type = type;
    }

    public void setStatus(Boolean status) {
        this.status = status;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof SetRobotIOReq)) {
            return false;
        }
        SetRobotIOReq other = (SetRobotIOReq)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        Integer this$id = this.getId();
        Integer other$id = other.getId();
        if (this$id == null ? other$id != null : !((Object)this$id).equals(other$id)) {
            return false;
        }
        Boolean this$status = this.getStatus();
        Boolean other$status = other.getStatus();
        if (this$status == null ? other$status != null : !((Object)this$status).equals(other$status)) {
            return false;
        }
        String this$vehicle = this.getVehicle();
        String other$vehicle = other.getVehicle();
        if (this$vehicle == null ? other$vehicle != null : !this$vehicle.equals(other$vehicle)) {
            return false;
        }
        String this$type = this.getType();
        String other$type = other.getType();
        return !(this$type == null ? other$type != null : !this$type.equals(other$type));
    }

    protected boolean canEqual(Object other) {
        return other instanceof SetRobotIOReq;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        Integer $id = this.getId();
        result = result * 59 + ($id == null ? 43 : ((Object)$id).hashCode());
        Boolean $status = this.getStatus();
        result = result * 59 + ($status == null ? 43 : ((Object)$status).hashCode());
        String $vehicle = this.getVehicle();
        result = result * 59 + ($vehicle == null ? 43 : $vehicle.hashCode());
        String $type = this.getType();
        result = result * 59 + ($type == null ? 43 : $type.hashCode());
        return result;
    }

    public String toString() {
        return "SetRobotIOReq(vehicle=" + this.getVehicle() + ", id=" + this.getId() + ", type=" + this.getType() + ", status=" + this.getStatus() + ")";
    }
}

