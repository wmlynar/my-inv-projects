/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.model.stat.CoreAlarmsRecord
 *  com.seer.rds.model.stat.CoreAlarmsRecord$CoreAlarmsRecordBuilder
 *  javax.persistence.Entity
 *  javax.persistence.GeneratedValue
 *  javax.persistence.Id
 *  javax.persistence.Index
 *  javax.persistence.Lob
 *  javax.persistence.Table
 *  org.hibernate.annotations.GenericGenerator
 */
package com.seer.rds.model.stat;

import com.seer.rds.model.stat.CoreAlarmsRecord;
import java.math.BigDecimal;
import java.util.Date;
import javax.persistence.Entity;
import javax.persistence.GeneratedValue;
import javax.persistence.Id;
import javax.persistence.Index;
import javax.persistence.Lob;
import javax.persistence.Table;
import org.hibernate.annotations.GenericGenerator;

@Entity
@Table(name="t_core_alarmsrecord", indexes={@Index(name="coreAlarmsRecordStartOnIndex", columnList="startedOn"), @Index(name="coreAlarmsRecordLevelIndex", columnList="alarmLevel"), @Index(name="coreAlarmsRecordAlarmsCodeIndex", columnList="alarmsCode")})
public class CoreAlarmsRecord {
    @Id
    @GenericGenerator(name="idGenerator", strategy="uuid")
    @GeneratedValue(generator="idGenerator")
    private String id;
    private String alarmsCode;
    private String alarmLevel;
    private Date startedOn;
    private Date endedOn;
    private BigDecimal alarmsCostTime;
    @Lob
    private String alarmsDesc;
    private Integer type;

    public static CoreAlarmsRecordBuilder builder() {
        return new CoreAlarmsRecordBuilder();
    }

    public String getId() {
        return this.id;
    }

    public String getAlarmsCode() {
        return this.alarmsCode;
    }

    public String getAlarmLevel() {
        return this.alarmLevel;
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

    public void setAlarmLevel(String alarmLevel) {
        this.alarmLevel = alarmLevel;
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
        if (!(o instanceof CoreAlarmsRecord)) {
            return false;
        }
        CoreAlarmsRecord other = (CoreAlarmsRecord)o;
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
        String this$alarmLevel = this.getAlarmLevel();
        String other$alarmLevel = other.getAlarmLevel();
        if (this$alarmLevel == null ? other$alarmLevel != null : !this$alarmLevel.equals(other$alarmLevel)) {
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
        return other instanceof CoreAlarmsRecord;
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
        String $alarmLevel = this.getAlarmLevel();
        result = result * 59 + ($alarmLevel == null ? 43 : $alarmLevel.hashCode());
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
        return "CoreAlarmsRecord(id=" + this.getId() + ", alarmsCode=" + this.getAlarmsCode() + ", alarmLevel=" + this.getAlarmLevel() + ", startedOn=" + this.getStartedOn() + ", endedOn=" + this.getEndedOn() + ", alarmsCostTime=" + this.getAlarmsCostTime() + ", alarmsDesc=" + this.getAlarmsDesc() + ", type=" + this.getType() + ")";
    }

    public CoreAlarmsRecord() {
    }

    public CoreAlarmsRecord(String id, String alarmsCode, String alarmLevel, Date startedOn, Date endedOn, BigDecimal alarmsCostTime, String alarmsDesc, Integer type) {
        this.id = id;
        this.alarmsCode = alarmsCode;
        this.alarmLevel = alarmLevel;
        this.startedOn = startedOn;
        this.endedOn = endedOn;
        this.alarmsCostTime = alarmsCostTime;
        this.alarmsDesc = alarmsDesc;
        this.type = type;
    }
}

