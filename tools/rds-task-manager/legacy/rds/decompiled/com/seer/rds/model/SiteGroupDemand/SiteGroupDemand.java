/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.model.SiteGroupDemand.SiteGroupDemand
 *  com.seer.rds.model.SiteGroupDemand.SiteGroupDemand$SiteGroupDemandBuilder
 *  javax.persistence.Entity
 *  javax.persistence.GeneratedValue
 *  javax.persistence.Id
 *  javax.persistence.Table
 *  org.hibernate.annotations.GenericGenerator
 */
package com.seer.rds.model.SiteGroupDemand;

import com.seer.rds.model.SiteGroupDemand.SiteGroupDemand;
import java.util.Date;
import javax.persistence.Entity;
import javax.persistence.GeneratedValue;
import javax.persistence.Id;
import javax.persistence.Table;
import org.hibernate.annotations.GenericGenerator;

@Entity
@Table(name="t_sitegroupdemand")
public class SiteGroupDemand {
    @Id
    @GenericGenerator(name="idGenerator", strategy="uuid")
    @GeneratedValue(generator="idGenerator")
    private String id;
    private Integer status;
    private Date createdOn;
    private Date endedOn;
    private String fromGroup;
    private String toGroup;
    private String groupName;
    private String vehicleName;
    private Integer vehicleMaxNumber;

    public static SiteGroupDemandBuilder builder() {
        return new SiteGroupDemandBuilder();
    }

    public String getId() {
        return this.id;
    }

    public Integer getStatus() {
        return this.status;
    }

    public Date getCreatedOn() {
        return this.createdOn;
    }

    public Date getEndedOn() {
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

    public void setCreatedOn(Date createdOn) {
        this.createdOn = createdOn;
    }

    public void setEndedOn(Date endedOn) {
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
        if (!(o instanceof SiteGroupDemand)) {
            return false;
        }
        SiteGroupDemand other = (SiteGroupDemand)o;
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
        Date this$createdOn = this.getCreatedOn();
        Date other$createdOn = other.getCreatedOn();
        if (this$createdOn == null ? other$createdOn != null : !((Object)this$createdOn).equals(other$createdOn)) {
            return false;
        }
        Date this$endedOn = this.getEndedOn();
        Date other$endedOn = other.getEndedOn();
        if (this$endedOn == null ? other$endedOn != null : !((Object)this$endedOn).equals(other$endedOn)) {
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
        return other instanceof SiteGroupDemand;
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
        Date $createdOn = this.getCreatedOn();
        result = result * 59 + ($createdOn == null ? 43 : ((Object)$createdOn).hashCode());
        Date $endedOn = this.getEndedOn();
        result = result * 59 + ($endedOn == null ? 43 : ((Object)$endedOn).hashCode());
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
        return "SiteGroupDemand(id=" + this.getId() + ", status=" + this.getStatus() + ", createdOn=" + this.getCreatedOn() + ", endedOn=" + this.getEndedOn() + ", fromGroup=" + this.getFromGroup() + ", toGroup=" + this.getToGroup() + ", groupName=" + this.getGroupName() + ", vehicleName=" + this.getVehicleName() + ", vehicleMaxNumber=" + this.getVehicleMaxNumber() + ")";
    }

    public SiteGroupDemand() {
    }

    public SiteGroupDemand(String id, Integer status, Date createdOn, Date endedOn, String fromGroup, String toGroup, String groupName, String vehicleName, Integer vehicleMaxNumber) {
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

