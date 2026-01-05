/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.model.stat.RobotStatusRecord
 *  com.seer.rds.model.stat.RobotStatusRecord$RobotStatusRecordBuilder
 *  javax.persistence.Column
 *  javax.persistence.Entity
 *  javax.persistence.GeneratedValue
 *  javax.persistence.Id
 *  javax.persistence.Index
 *  javax.persistence.Table
 *  org.hibernate.annotations.ColumnDefault
 *  org.hibernate.annotations.GenericGenerator
 */
package com.seer.rds.model.stat;

import com.seer.rds.model.stat.RobotStatusRecord;
import java.math.BigDecimal;
import java.util.Date;
import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.GeneratedValue;
import javax.persistence.Id;
import javax.persistence.Index;
import javax.persistence.Table;
import org.hibernate.annotations.ColumnDefault;
import org.hibernate.annotations.GenericGenerator;

@Entity
@Table(name="t_robotstatusrecord", indexes={@Index(name="robotstatusrecordStartOnIndex", columnList="startedOn"), @Index(name="uuidIndex", columnList="uuid"), @Index(name="newStatus", columnList="newStatus")})
public class RobotStatusRecord {
    @Id
    @GenericGenerator(name="idGenerator", strategy="uuid")
    @GeneratedValue(generator="idGenerator")
    private String id;
    @Column(nullable=false)
    private String uuid;
    private String vehicleName;
    private Integer oldStatus = 0;
    @Column(nullable=false)
    private Integer newStatus = 0;
    @Column(nullable=false)
    private Date startedOn;
    private Date endedOn;
    private Long duration = 0L;
    @ColumnDefault(value="0")
    private BigDecimal odo;
    @ColumnDefault(value="0")
    private BigDecimal todayOdo;
    private String orderId;
    private String externalId;
    private String location;

    public RobotStatusRecord(String externalId, String location) {
        this.externalId = externalId;
        this.location = location;
    }

    public static RobotStatusRecordBuilder builder() {
        return new RobotStatusRecordBuilder();
    }

    public String getId() {
        return this.id;
    }

    public String getUuid() {
        return this.uuid;
    }

    public String getVehicleName() {
        return this.vehicleName;
    }

    public Integer getOldStatus() {
        return this.oldStatus;
    }

    public Integer getNewStatus() {
        return this.newStatus;
    }

    public Date getStartedOn() {
        return this.startedOn;
    }

    public Date getEndedOn() {
        return this.endedOn;
    }

    public Long getDuration() {
        return this.duration;
    }

    public BigDecimal getOdo() {
        return this.odo;
    }

    public BigDecimal getTodayOdo() {
        return this.todayOdo;
    }

    public String getOrderId() {
        return this.orderId;
    }

    public String getExternalId() {
        return this.externalId;
    }

    public String getLocation() {
        return this.location;
    }

    public void setId(String id) {
        this.id = id;
    }

    public void setUuid(String uuid) {
        this.uuid = uuid;
    }

    public void setVehicleName(String vehicleName) {
        this.vehicleName = vehicleName;
    }

    public void setOldStatus(Integer oldStatus) {
        this.oldStatus = oldStatus;
    }

    public void setNewStatus(Integer newStatus) {
        this.newStatus = newStatus;
    }

    public void setStartedOn(Date startedOn) {
        this.startedOn = startedOn;
    }

    public void setEndedOn(Date endedOn) {
        this.endedOn = endedOn;
    }

    public void setDuration(Long duration) {
        this.duration = duration;
    }

    public void setOdo(BigDecimal odo) {
        this.odo = odo;
    }

    public void setTodayOdo(BigDecimal todayOdo) {
        this.todayOdo = todayOdo;
    }

    public void setOrderId(String orderId) {
        this.orderId = orderId;
    }

    public void setExternalId(String externalId) {
        this.externalId = externalId;
    }

    public void setLocation(String location) {
        this.location = location;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof RobotStatusRecord)) {
            return false;
        }
        RobotStatusRecord other = (RobotStatusRecord)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        Integer this$oldStatus = this.getOldStatus();
        Integer other$oldStatus = other.getOldStatus();
        if (this$oldStatus == null ? other$oldStatus != null : !((Object)this$oldStatus).equals(other$oldStatus)) {
            return false;
        }
        Integer this$newStatus = this.getNewStatus();
        Integer other$newStatus = other.getNewStatus();
        if (this$newStatus == null ? other$newStatus != null : !((Object)this$newStatus).equals(other$newStatus)) {
            return false;
        }
        Long this$duration = this.getDuration();
        Long other$duration = other.getDuration();
        if (this$duration == null ? other$duration != null : !((Object)this$duration).equals(other$duration)) {
            return false;
        }
        String this$id = this.getId();
        String other$id = other.getId();
        if (this$id == null ? other$id != null : !this$id.equals(other$id)) {
            return false;
        }
        String this$uuid = this.getUuid();
        String other$uuid = other.getUuid();
        if (this$uuid == null ? other$uuid != null : !this$uuid.equals(other$uuid)) {
            return false;
        }
        String this$vehicleName = this.getVehicleName();
        String other$vehicleName = other.getVehicleName();
        if (this$vehicleName == null ? other$vehicleName != null : !this$vehicleName.equals(other$vehicleName)) {
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
        BigDecimal this$odo = this.getOdo();
        BigDecimal other$odo = other.getOdo();
        if (this$odo == null ? other$odo != null : !((Object)this$odo).equals(other$odo)) {
            return false;
        }
        BigDecimal this$todayOdo = this.getTodayOdo();
        BigDecimal other$todayOdo = other.getTodayOdo();
        if (this$todayOdo == null ? other$todayOdo != null : !((Object)this$todayOdo).equals(other$todayOdo)) {
            return false;
        }
        String this$orderId = this.getOrderId();
        String other$orderId = other.getOrderId();
        if (this$orderId == null ? other$orderId != null : !this$orderId.equals(other$orderId)) {
            return false;
        }
        String this$externalId = this.getExternalId();
        String other$externalId = other.getExternalId();
        if (this$externalId == null ? other$externalId != null : !this$externalId.equals(other$externalId)) {
            return false;
        }
        String this$location = this.getLocation();
        String other$location = other.getLocation();
        return !(this$location == null ? other$location != null : !this$location.equals(other$location));
    }

    protected boolean canEqual(Object other) {
        return other instanceof RobotStatusRecord;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        Integer $oldStatus = this.getOldStatus();
        result = result * 59 + ($oldStatus == null ? 43 : ((Object)$oldStatus).hashCode());
        Integer $newStatus = this.getNewStatus();
        result = result * 59 + ($newStatus == null ? 43 : ((Object)$newStatus).hashCode());
        Long $duration = this.getDuration();
        result = result * 59 + ($duration == null ? 43 : ((Object)$duration).hashCode());
        String $id = this.getId();
        result = result * 59 + ($id == null ? 43 : $id.hashCode());
        String $uuid = this.getUuid();
        result = result * 59 + ($uuid == null ? 43 : $uuid.hashCode());
        String $vehicleName = this.getVehicleName();
        result = result * 59 + ($vehicleName == null ? 43 : $vehicleName.hashCode());
        Date $startedOn = this.getStartedOn();
        result = result * 59 + ($startedOn == null ? 43 : ((Object)$startedOn).hashCode());
        Date $endedOn = this.getEndedOn();
        result = result * 59 + ($endedOn == null ? 43 : ((Object)$endedOn).hashCode());
        BigDecimal $odo = this.getOdo();
        result = result * 59 + ($odo == null ? 43 : ((Object)$odo).hashCode());
        BigDecimal $todayOdo = this.getTodayOdo();
        result = result * 59 + ($todayOdo == null ? 43 : ((Object)$todayOdo).hashCode());
        String $orderId = this.getOrderId();
        result = result * 59 + ($orderId == null ? 43 : $orderId.hashCode());
        String $externalId = this.getExternalId();
        result = result * 59 + ($externalId == null ? 43 : $externalId.hashCode());
        String $location = this.getLocation();
        result = result * 59 + ($location == null ? 43 : $location.hashCode());
        return result;
    }

    public String toString() {
        return "RobotStatusRecord(id=" + this.getId() + ", uuid=" + this.getUuid() + ", vehicleName=" + this.getVehicleName() + ", oldStatus=" + this.getOldStatus() + ", newStatus=" + this.getNewStatus() + ", startedOn=" + this.getStartedOn() + ", endedOn=" + this.getEndedOn() + ", duration=" + this.getDuration() + ", odo=" + this.getOdo() + ", todayOdo=" + this.getTodayOdo() + ", orderId=" + this.getOrderId() + ", externalId=" + this.getExternalId() + ", location=" + this.getLocation() + ")";
    }

    public RobotStatusRecord() {
    }

    public RobotStatusRecord(String id, String uuid, String vehicleName, Integer oldStatus, Integer newStatus, Date startedOn, Date endedOn, Long duration, BigDecimal odo, BigDecimal todayOdo, String orderId, String externalId, String location) {
        this.id = id;
        this.uuid = uuid;
        this.vehicleName = vehicleName;
        this.oldStatus = oldStatus;
        this.newStatus = newStatus;
        this.startedOn = startedOn;
        this.endedOn = endedOn;
        this.duration = duration;
        this.odo = odo;
        this.todayOdo = todayOdo;
        this.orderId = orderId;
        this.externalId = externalId;
        this.location = location;
    }

    public RobotStatusRecord withId(String id) {
        return this.id == id ? this : new RobotStatusRecord(id, this.uuid, this.vehicleName, this.oldStatus, this.newStatus, this.startedOn, this.endedOn, this.duration, this.odo, this.todayOdo, this.orderId, this.externalId, this.location);
    }

    public RobotStatusRecord withUuid(String uuid) {
        return this.uuid == uuid ? this : new RobotStatusRecord(this.id, uuid, this.vehicleName, this.oldStatus, this.newStatus, this.startedOn, this.endedOn, this.duration, this.odo, this.todayOdo, this.orderId, this.externalId, this.location);
    }

    public RobotStatusRecord withVehicleName(String vehicleName) {
        return this.vehicleName == vehicleName ? this : new RobotStatusRecord(this.id, this.uuid, vehicleName, this.oldStatus, this.newStatus, this.startedOn, this.endedOn, this.duration, this.odo, this.todayOdo, this.orderId, this.externalId, this.location);
    }

    public RobotStatusRecord withOldStatus(Integer oldStatus) {
        return this.oldStatus == oldStatus ? this : new RobotStatusRecord(this.id, this.uuid, this.vehicleName, oldStatus, this.newStatus, this.startedOn, this.endedOn, this.duration, this.odo, this.todayOdo, this.orderId, this.externalId, this.location);
    }

    public RobotStatusRecord withNewStatus(Integer newStatus) {
        return this.newStatus == newStatus ? this : new RobotStatusRecord(this.id, this.uuid, this.vehicleName, this.oldStatus, newStatus, this.startedOn, this.endedOn, this.duration, this.odo, this.todayOdo, this.orderId, this.externalId, this.location);
    }

    public RobotStatusRecord withStartedOn(Date startedOn) {
        return this.startedOn == startedOn ? this : new RobotStatusRecord(this.id, this.uuid, this.vehicleName, this.oldStatus, this.newStatus, startedOn, this.endedOn, this.duration, this.odo, this.todayOdo, this.orderId, this.externalId, this.location);
    }

    public RobotStatusRecord withEndedOn(Date endedOn) {
        return this.endedOn == endedOn ? this : new RobotStatusRecord(this.id, this.uuid, this.vehicleName, this.oldStatus, this.newStatus, this.startedOn, endedOn, this.duration, this.odo, this.todayOdo, this.orderId, this.externalId, this.location);
    }

    public RobotStatusRecord withDuration(Long duration) {
        return this.duration == duration ? this : new RobotStatusRecord(this.id, this.uuid, this.vehicleName, this.oldStatus, this.newStatus, this.startedOn, this.endedOn, duration, this.odo, this.todayOdo, this.orderId, this.externalId, this.location);
    }

    public RobotStatusRecord withOdo(BigDecimal odo) {
        return this.odo == odo ? this : new RobotStatusRecord(this.id, this.uuid, this.vehicleName, this.oldStatus, this.newStatus, this.startedOn, this.endedOn, this.duration, odo, this.todayOdo, this.orderId, this.externalId, this.location);
    }

    public RobotStatusRecord withTodayOdo(BigDecimal todayOdo) {
        return this.todayOdo == todayOdo ? this : new RobotStatusRecord(this.id, this.uuid, this.vehicleName, this.oldStatus, this.newStatus, this.startedOn, this.endedOn, this.duration, this.odo, todayOdo, this.orderId, this.externalId, this.location);
    }

    public RobotStatusRecord withOrderId(String orderId) {
        return this.orderId == orderId ? this : new RobotStatusRecord(this.id, this.uuid, this.vehicleName, this.oldStatus, this.newStatus, this.startedOn, this.endedOn, this.duration, this.odo, this.todayOdo, orderId, this.externalId, this.location);
    }

    public RobotStatusRecord withExternalId(String externalId) {
        return this.externalId == externalId ? this : new RobotStatusRecord(this.id, this.uuid, this.vehicleName, this.oldStatus, this.newStatus, this.startedOn, this.endedOn, this.duration, this.odo, this.todayOdo, this.orderId, externalId, this.location);
    }

    public RobotStatusRecord withLocation(String location) {
        return this.location == location ? this : new RobotStatusRecord(this.id, this.uuid, this.vehicleName, this.oldStatus, this.newStatus, this.startedOn, this.endedOn, this.duration, this.odo, this.todayOdo, this.orderId, this.externalId, location);
    }
}

