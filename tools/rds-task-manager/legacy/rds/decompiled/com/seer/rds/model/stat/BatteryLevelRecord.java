/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.model.stat.BatteryLevelRecord
 *  com.seer.rds.model.stat.BatteryLevelRecord$BatteryLevelRecordBuilder
 *  javax.persistence.Entity
 *  javax.persistence.GeneratedValue
 *  javax.persistence.Id
 *  javax.persistence.Index
 *  javax.persistence.Table
 *  org.hibernate.annotations.GenericGenerator
 */
package com.seer.rds.model.stat;

import com.seer.rds.model.stat.BatteryLevelRecord;
import java.math.BigDecimal;
import javax.persistence.Entity;
import javax.persistence.GeneratedValue;
import javax.persistence.Id;
import javax.persistence.Index;
import javax.persistence.Table;
import org.hibernate.annotations.GenericGenerator;

@Entity
@Table(name="t_batterylevelrecord", indexes={@Index(name="timeIndex", columnList="time")})
public class BatteryLevelRecord {
    @Id
    @GenericGenerator(name="idGenerator", strategy="uuid")
    @GeneratedValue(generator="idGenerator")
    private String id;
    private String vehicleId;
    private BigDecimal batteryLevel;
    private String time;

    public static BatteryLevelRecordBuilder builder() {
        return new BatteryLevelRecordBuilder();
    }

    public String getId() {
        return this.id;
    }

    public String getVehicleId() {
        return this.vehicleId;
    }

    public BigDecimal getBatteryLevel() {
        return this.batteryLevel;
    }

    public String getTime() {
        return this.time;
    }

    public void setId(String id) {
        this.id = id;
    }

    public void setVehicleId(String vehicleId) {
        this.vehicleId = vehicleId;
    }

    public void setBatteryLevel(BigDecimal batteryLevel) {
        this.batteryLevel = batteryLevel;
    }

    public void setTime(String time) {
        this.time = time;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof BatteryLevelRecord)) {
            return false;
        }
        BatteryLevelRecord other = (BatteryLevelRecord)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        String this$id = this.getId();
        String other$id = other.getId();
        if (this$id == null ? other$id != null : !this$id.equals(other$id)) {
            return false;
        }
        String this$vehicleId = this.getVehicleId();
        String other$vehicleId = other.getVehicleId();
        if (this$vehicleId == null ? other$vehicleId != null : !this$vehicleId.equals(other$vehicleId)) {
            return false;
        }
        BigDecimal this$batteryLevel = this.getBatteryLevel();
        BigDecimal other$batteryLevel = other.getBatteryLevel();
        if (this$batteryLevel == null ? other$batteryLevel != null : !((Object)this$batteryLevel).equals(other$batteryLevel)) {
            return false;
        }
        String this$time = this.getTime();
        String other$time = other.getTime();
        return !(this$time == null ? other$time != null : !this$time.equals(other$time));
    }

    protected boolean canEqual(Object other) {
        return other instanceof BatteryLevelRecord;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        String $id = this.getId();
        result = result * 59 + ($id == null ? 43 : $id.hashCode());
        String $vehicleId = this.getVehicleId();
        result = result * 59 + ($vehicleId == null ? 43 : $vehicleId.hashCode());
        BigDecimal $batteryLevel = this.getBatteryLevel();
        result = result * 59 + ($batteryLevel == null ? 43 : ((Object)$batteryLevel).hashCode());
        String $time = this.getTime();
        result = result * 59 + ($time == null ? 43 : $time.hashCode());
        return result;
    }

    public String toString() {
        return "BatteryLevelRecord(id=" + this.getId() + ", vehicleId=" + this.getVehicleId() + ", batteryLevel=" + this.getBatteryLevel() + ", time=" + this.getTime() + ")";
    }

    public BatteryLevelRecord() {
    }

    public BatteryLevelRecord(String id, String vehicleId, BigDecimal batteryLevel, String time) {
        this.id = id;
        this.vehicleId = vehicleId;
        this.batteryLevel = batteryLevel;
        this.time = time;
    }

    public BatteryLevelRecord withId(String id) {
        return this.id == id ? this : new BatteryLevelRecord(id, this.vehicleId, this.batteryLevel, this.time);
    }

    public BatteryLevelRecord withVehicleId(String vehicleId) {
        return this.vehicleId == vehicleId ? this : new BatteryLevelRecord(this.id, vehicleId, this.batteryLevel, this.time);
    }

    public BatteryLevelRecord withBatteryLevel(BigDecimal batteryLevel) {
        return this.batteryLevel == batteryLevel ? this : new BatteryLevelRecord(this.id, this.vehicleId, batteryLevel, this.time);
    }

    public BatteryLevelRecord withTime(String time) {
        return this.time == time ? this : new BatteryLevelRecord(this.id, this.vehicleId, this.batteryLevel, time);
    }
}

