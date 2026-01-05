/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.vo.SiteGroupDemandVo
 *  com.seer.rds.vo.SiteGroupDemandVo$SiteGroupDemandVoBuilder
 */
package com.seer.rds.vo;

import com.seer.rds.vo.SiteGroupDemandVo;

public class SiteGroupDemandVo {
    private String id;
    private Integer status;
    private String createdOn;
    private String endedOn;
    private String fromGroup;
    private String toGroup;
    private String groupName;
    private String vehicleName;
    private Integer vehicleMaxNumber;

    public static SiteGroupDemandVoBuilder builder() {
        return new SiteGroupDemandVoBuilder();
    }

    public String getId() {
        return this.id;
    }

    public Integer getStatus() {
        return this.status;
    }

    public String getCreatedOn() {
        return this.createdOn;
    }

    public String getEndedOn() {
        return this.endedOn;
    }

    public String getFromGroup() {
        return this.fromGroup;
    }

    public String getToGroup() {
        return this.toGroup;
    }

    public String getGroupName() {
        return this.groupName;
    }

    public String getVehicleName() {
        return this.vehicleName;
    }

    public Integer getVehicleMaxNumber() {
        return this.vehicleMaxNumber;
    }

    public void setId(String id) {
        this.id = id;
    }

    public void setStatus(Integer status) {
        this.status = status;
    }

    public void setCreatedOn(String createdOn) {
        this.createdOn = createdOn;
    }

    public void setEndedOn(String endedOn) {
        this.endedOn = endedOn;
    }

    public void setFromGroup(String fromGroup) {
        this.fromGroup = fromGroup;
    }

    public void setToGroup(String toGroup) {
        this.toGroup = toGroup;
    }

    public void setGroupName(String groupName) {
        this.groupName = groupName;
    }

    public void setVehicleName(String vehicleName) {
        this.vehicleName = vehicleName;
    }

    public void setVehicleMaxNumber(Integer vehicleMaxNumber) {
        this.vehicleMaxNumber = vehicleMaxNumber;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof SiteGroupDemandVo)) {
            return false;
        }
        SiteGroupDemandVo other = (SiteGroupDemandVo)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        Integer this$status = this.getStatus();
        Integer other$status = other.getStatus();
        if (this$status == null ? other$status != null : !((Object)this$status).equals(other$status)) {
            return false;
        }
        Integer this$vehicleMaxNumber = this.getVehicleMaxNumber();
        Integer other$vehicleMaxNumber = other.getVehicleMaxNumber();
        if (this$vehicleMaxNumber == null ? other$vehicleMaxNumber != null : !((Object)this$vehicleMaxNumber).equals(other$vehicleMaxNumber)) {
            return false;
        }
        String this$id = this.getId();
        String other$id = other.getId();
        if (this$id == null ? other$id != null : !this$id.equals(other$id)) {
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
        String this$fromGroup = this.getFromGroup();
        String other$fromGroup = other.getFromGroup();
        if (this$fromGroup == null ? other$fromGroup != null : !this$fromGroup.equals(other$fromGroup)) {
            return false;
        }
        String this$toGroup = this.getToGroup();
        String other$toGroup = other.getToGroup();
        if (this$toGroup == null ? other$toGroup != null : !this$toGroup.equals(other$toGroup)) {
            return false;
        }
        String this$groupName = this.getGroupName();
        String other$groupName = other.getGroupName();
        if (this$groupName == null ? other$groupName != null : !this$groupName.equals(other$groupName)) {
            return false;
        }
        String this$vehicleName = this.getVehicleName();
        String other$vehicleName = other.getVehicleName();
        return !(this$vehicleName == null ? other$vehicleName != null : !this$vehicleName.equals(other$vehicleName));
    }

    protected boolean canEqual(Object other) {
        return other instanceof SiteGroupDemandVo;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        Integer $status = this.getStatus();
        result = result * 59 + ($status == null ? 43 : ((Object)$status).hashCode());
        Integer $vehicleMaxNumber = this.getVehicleMaxNumber();
        result = result * 59 + ($vehicleMaxNumber == null ? 43 : ((Object)$vehicleMaxNumber).hashCode());
        String $id = this.getId();
        result = result * 59 + ($id == null ? 43 : $id.hashCode());
        String $createdOn = this.getCreatedOn();
        result = result * 59 + ($createdOn == null ? 43 : $createdOn.hashCode());
        String $endedOn = this.getEndedOn();
        result = result * 59 + ($endedOn == null ? 43 : $endedOn.hashCode());
        String $fromGroup = this.getFromGroup();
        result = result * 59 + ($fromGroup == null ? 43 : $fromGroup.hashCode());
        String $toGroup = this.getToGroup();
        result = result * 59 + ($toGroup == null ? 43 : $toGroup.hashCode());
        String $groupName = this.getGroupName();
        result = result * 59 + ($groupName == null ? 43 : $groupName.hashCode());
        String $vehicleName = this.getVehicleName();
        result = result * 59 + ($vehicleName == null ? 43 : $vehicleName.hashCode());
        return result;
    }

    public String toString() {
        return "SiteGroupDemandVo(id=" + this.getId() + ", status=" + this.getStatus() + ", createdOn=" + this.getCreatedOn() + ", endedOn=" + this.getEndedOn() + ", fromGroup=" + this.getFromGroup() + ", toGroup=" + this.getToGroup() + ", groupName=" + this.getGroupName() + ", vehicleName=" + this.getVehicleName() + ", vehicleMaxNumber=" + this.getVehicleMaxNumber() + ")";
    }

    public SiteGroupDemandVo() {
    }

    public SiteGroupDemandVo(String id, Integer status, String createdOn, String endedOn, String fromGroup, String toGroup, String groupName, String vehicleName, Integer vehicleMaxNumber) {
        this.id = id;
        this.status = status;
        this.createdOn = createdOn;
        this.endedOn = endedOn;
        this.fromGroup = fromGroup;
        this.toGroup = toGroup;
        this.groupName = groupName;
        this.vehicleName = vehicleName;
        this.vehicleMaxNumber = vehicleMaxNumber;
    }
}

