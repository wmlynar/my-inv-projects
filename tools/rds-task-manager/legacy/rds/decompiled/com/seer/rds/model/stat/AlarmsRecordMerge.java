/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.model.stat.AlarmsRecordMerge
 *  com.seer.rds.model.stat.AlarmsRecordMerge$AlarmsRecordMergeBuilder
 *  javax.persistence.Column
 *  javax.persistence.Entity
 *  javax.persistence.GeneratedValue
 *  javax.persistence.Id
 *  javax.persistence.Index
 *  javax.persistence.Table
 *  org.hibernate.annotations.GenericGenerator
 */
package com.seer.rds.model.stat;

import com.seer.rds.model.stat.AlarmsRecordMerge;
import java.math.BigDecimal;
import java.util.Date;
import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.GeneratedValue;
import javax.persistence.Id;
import javax.persistence.Index;
import javax.persistence.Table;
import org.hibernate.annotations.GenericGenerator;

@Entity
@Table(name="t_alarmsrecord_merge", indexes={@Index(name="alarmsrecordMergeStartOnIndex", columnList="startedOn"), @Index(name="alarmsrecordMergeVehicleIdIndex", columnList="vehicleId"), @Index(name="alarmsrecordMergeLevelIndex", columnList="level"), @Index(name="alarmsrecordMergeAlarmsCodeIndex", columnList="alarmsCode")})
public class AlarmsRecordMerge {
    @Id
    @GenericGenerator(name="idGenerator", strategy="uuid")
    @GeneratedValue(generator="idGenerator")
    private String id;
    private String alarmsCode;
    private String vehicleId;
    @Column(name="\"level\"")
    private String level;
    private Date startedOn;
    private Date endedOn;
    private BigDecimal alarmsCostTime;
    @Column(length=1024)
    private String alarmsDesc;
    private Integer type;

    public static AlarmsRecordMergeBuilder builder() {
        return new AlarmsRecordMergeBuilder();
    }

    public String getId() {
        return this.id;
    }

    public String getAlarmsCode() {
        return this.alarmsCode;
    }

    public String getVehicleId() {
        return this.vehicleId;
    }

    public String getLevel() {
        return this.level;
    }

    public Date getStartedOn() {
        return this.startedOn;
    }

    public Date getEndedOn() {
        return this.endedOn;
    }

    public BigDecimal getAlarmsCostTime() {
        return this.alarmsCostTime;
    }

    public String getAlarmsDesc() {
        return this.alarmsDesc;
    }

    public Integer getType() {
        return this.type;
    }

    public void setId(String id) {
        this.id = id;
    }

    public void setAlarmsCode(String alarmsCode) {
        this.alarmsCode = alarmsCode;
    }

    public void setVehicleId(String vehicleId) {
        this.vehicleId = vehicleId;
    }

    public void setLevel(String level) {
        this.level = level;
    }

    public void setStartedOn(Date startedOn) {
        this.startedOn = startedOn;
    }

    public void setEndedOn(Date endedOn) {
        this.endedOn = endedOn;
    }

    public void setAlarmsCostTime(BigDecimal alarmsCostTime) {
        this.alarmsCostTime = alarmsCostTime;
    }

    public void setAlarmsDesc(String alarmsDesc) {
        this.alarmsDesc = alarmsDesc;
    }

    public void setType(Integer type) {
        this.type = type;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof AlarmsRecordMerge)) {
            return false;
        }
        AlarmsRecordMerge other = (AlarmsRecordMerge)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        Integer this$type = this.getType();
        Integer other$type = other.getType();
        if (this$type == null ? other$type != null : !((Object)this$type).equals(other$type)) {
            return false;
        }
        String this$id = this.getId();
        String other$id = other.getId();
        if (this$id == null ? other$id != null : !this$id.equals(other$id)) {
            return false;
        }
        String this$alarmsCode = this.getAlarmsCode();
        String other$alarmsCode = other.getAlarmsCode();
        if (this$alarmsCode == null ? other$alarmsCode != null : !this$alarmsCode.equals(other$alarmsCode)) {
            return false;
        }
        String this$vehicleId = this.getVehicleId();
        String other$vehicleId = other.getVehicleId();
        if (this$vehicleId == null ? other$vehicleId != null : !this$vehicleId.equals(other$vehicleId)) {
            return false;
        }
        String this$level = this.getLevel();
        String other$level = other.getLevel();
        if (this$level == null ? other$level != null : !this$level.equals(other$level)) {
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
        BigDecimal this$alarmsCostTime = this.getAlarmsCostTime();
        BigDecimal other$alarmsCostTime = other.getAlarmsCostTime();
        if (this$alarmsCostTime == null ? other$alarmsCostTime != null : !((Object)this$alarmsCostTime).equals(other$alarmsCostTime)) {
            return false;
        }
        String this$alarmsDesc = this.getAlarmsDesc();
        String other$alarmsDesc = other.getAlarmsDesc();
        return !(this$alarmsDesc == null ? other$alarmsDesc != null : !this$alarmsDesc.equals(other$alarmsDesc));
    }

    protected boolean canEqual(Object other) {
        return other instanceof AlarmsRecordMerge;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        Integer $type = this.getType();
        result = result * 59 + ($type == null ? 43 : ((Object)$type).hashCode());
        String $id = this.getId();
        result = result * 59 + ($id == null ? 43 : $id.hashCode());
        String $alarmsCode = this.getAlarmsCode();
        result = result * 59 + ($alarmsCode == null ? 43 : $alarmsCode.hashCode());
        String $vehicleId = this.getVehicleId();
        result = result * 59 + ($vehicleId == null ? 43 : $vehicleId.hashCode());
        String $level = this.getLevel();
        result = result * 59 + ($level == null ? 43 : $level.hashCode());
        Date $startedOn = this.getStartedOn();
        result = result * 59 + ($startedOn == null ? 43 : ((Object)$startedOn).hashCode());
        Date $endedOn = this.getEndedOn();
        result = result * 59 + ($endedOn == null ? 43 : ((Object)$endedOn).hashCode());
        BigDecimal $alarmsCostTime = this.getAlarmsCostTime();
        result = result * 59 + ($alarmsCostTime == null ? 43 : ((Object)$alarmsCostTime).hashCode());
        String $alarmsDesc = this.getAlarmsDesc();
        result = result * 59 + ($alarmsDesc == null ? 43 : $alarmsDesc.hashCode());
        return result;
    }

    public String toString() {
        return "AlarmsRecordMerge(id=" + this.getId() + ", alarmsCode=" + this.getAlarmsCode() + ", vehicleId=" + this.getVehicleId() + ", level=" + this.getLevel() + ", startedOn=" + this.getStartedOn() + ", endedOn=" + this.getEndedOn() + ", alarmsCostTime=" + this.getAlarmsCostTime() + ", alarmsDesc=" + this.getAlarmsDesc() + ", type=" + this.getType() + ")";
    }

    public AlarmsRecordMerge() {
    }

    public AlarmsRecordMerge(String id, String alarmsCode, String vehicleId, String level, Date startedOn, Date endedOn, BigDecimal alarmsCostTime, String alarmsDesc, Integer type) {
        this.id = id;
        this.alarmsCode = alarmsCode;
        this.vehicleId = vehicleId;
        this.level = level;
        this.startedOn = startedOn;
        this.endedOn = endedOn;
        this.alarmsCostTime = alarmsCostTime;
        this.alarmsDesc = alarmsDesc;
        this.type = type;
    }

    public AlarmsRecordMerge withId(String id) {
        return this.id == id ? this : new AlarmsRecordMerge(id, this.alarmsCode, this.vehicleId, this.level, this.startedOn, this.endedOn, this.alarmsCostTime, this.alarmsDesc, this.type);
    }

    public AlarmsRecordMerge withAlarmsCode(String alarmsCode) {
        return this.alarmsCode == alarmsCode ? this : new AlarmsRecordMerge(this.id, alarmsCode, this.vehicleId, this.level, this.startedOn, this.endedOn, this.alarmsCostTime, this.alarmsDesc, this.type);
    }

    public AlarmsRecordMerge withVehicleId(String vehicleId) {
        return this.vehicleId == vehicleId ? this : new AlarmsRecordMerge(this.id, this.alarmsCode, vehicleId, this.level, this.startedOn, this.endedOn, this.alarmsCostTime, this.alarmsDesc, this.type);
    }

    public AlarmsRecordMerge withLevel(String level) {
        return this.level == level ? this : new AlarmsRecordMerge(this.id, this.alarmsCode, this.vehicleId, level, this.startedOn, this.endedOn, this.alarmsCostTime, this.alarmsDesc, this.type);
    }

    public AlarmsRecordMerge withStartedOn(Date startedOn) {
        return this.startedOn == startedOn ? this : new AlarmsRecordMerge(this.id, this.alarmsCode, this.vehicleId, this.level, startedOn, this.endedOn, this.alarmsCostTime, this.alarmsDesc, this.type);
    }

    public AlarmsRecordMerge withEndedOn(Date endedOn) {
        return this.endedOn == endedOn ? this : new AlarmsRecordMerge(this.id, this.alarmsCode, this.vehicleId, this.level, this.startedOn, endedOn, this.alarmsCostTime, this.alarmsDesc, this.type);
    }

    public AlarmsRecordMerge withAlarmsCostTime(BigDecimal alarmsCostTime) {
        return this.alarmsCostTime == alarmsCostTime ? this : new AlarmsRecordMerge(this.id, this.alarmsCode, this.vehicleId, this.level, this.startedOn, this.endedOn, alarmsCostTime, this.alarmsDesc, this.type);
    }

    public AlarmsRecordMerge withAlarmsDesc(String alarmsDesc) {
        return this.alarmsDesc == alarmsDesc ? this : new AlarmsRecordMerge(this.id, this.alarmsCode, this.vehicleId, this.level, this.startedOn, this.endedOn, this.alarmsCostTime, alarmsDesc, this.type);
    }

    public AlarmsRecordMerge withType(Integer type) {
        return this.type == type ? this : new AlarmsRecordMerge(this.id, this.alarmsCode, this.vehicleId, this.level, this.startedOn, this.endedOn, this.alarmsCostTime, this.alarmsDesc, type);
    }
}

