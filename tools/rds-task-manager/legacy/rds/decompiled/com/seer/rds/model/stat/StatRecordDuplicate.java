/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.model.stat.StatRecordDuplicate
 *  com.seer.rds.model.stat.StatRecordDuplicate$StatRecordDuplicateBuilder
 *  javax.persistence.Column
 *  javax.persistence.Entity
 *  javax.persistence.GeneratedValue
 *  javax.persistence.Id
 *  javax.persistence.Index
 *  javax.persistence.Table
 *  org.hibernate.annotations.GenericGenerator
 */
package com.seer.rds.model.stat;

import com.seer.rds.model.stat.StatRecordDuplicate;
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
@Table(name="t_statrecord_duplicate", indexes={@Index(name="statrecordDupTimeIndex", columnList="time DESC"), @Index(name="srdLevelTimeIndex", columnList="level,time")})
public class StatRecordDuplicate {
    @Id
    @GenericGenerator(name="idGenerator", strategy="uuid")
    @GeneratedValue(generator="idGenerator")
    private String id;
    private Date recordedOn;
    @Column(name="\"level\"")
    private String level;
    @Column(nullable=false)
    private String time;
    @Column(nullable=false)
    private String type;
    private BigDecimal value;
    private String thirdId;

    public StatRecordDuplicate(String level, String time, String type, BigDecimal value, String thirdId) {
        this.level = level;
        this.time = time;
        this.type = type;
        this.value = value;
        this.thirdId = thirdId;
    }

    public StatRecordDuplicate(String level, String time, String type, BigDecimal value) {
        this.level = level;
        this.time = time;
        this.type = type;
        this.value = value;
        this.thirdId = "";
    }

    public static StatRecordDuplicateBuilder builder() {
        return new StatRecordDuplicateBuilder();
    }

    public String getId() {
        return this.id;
    }

    public Date getRecordedOn() {
        return this.recordedOn;
    }

    public String getLevel() {
        return this.level;
    }

    public String getTime() {
        return this.time;
    }

    public String getType() {
        return this.type;
    }

    public BigDecimal getValue() {
        return this.value;
    }

    public String getThirdId() {
        return this.thirdId;
    }

    public void setId(String id) {
        this.id = id;
    }

    public void setRecordedOn(Date recordedOn) {
        this.recordedOn = recordedOn;
    }

    public void setLevel(String level) {
        this.level = level;
    }

    public void setTime(String time) {
        this.time = time;
    }

    public void setType(String type) {
        this.type = type;
    }

    public void setValue(BigDecimal value) {
        this.value = value;
    }

    public void setThirdId(String thirdId) {
        this.thirdId = thirdId;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof StatRecordDuplicate)) {
            return false;
        }
        StatRecordDuplicate other = (StatRecordDuplicate)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        String this$id = this.getId();
        String other$id = other.getId();
        if (this$id == null ? other$id != null : !this$id.equals(other$id)) {
            return false;
        }
        Date this$recordedOn = this.getRecordedOn();
        Date other$recordedOn = other.getRecordedOn();
        if (this$recordedOn == null ? other$recordedOn != null : !((Object)this$recordedOn).equals(other$recordedOn)) {
            return false;
        }
        String this$level = this.getLevel();
        String other$level = other.getLevel();
        if (this$level == null ? other$level != null : !this$level.equals(other$level)) {
            return false;
        }
        String this$time = this.getTime();
        String other$time = other.getTime();
        if (this$time == null ? other$time != null : !this$time.equals(other$time)) {
            return false;
        }
        String this$type = this.getType();
        String other$type = other.getType();
        if (this$type == null ? other$type != null : !this$type.equals(other$type)) {
            return false;
        }
        BigDecimal this$value = this.getValue();
        BigDecimal other$value = other.getValue();
        if (this$value == null ? other$value != null : !((Object)this$value).equals(other$value)) {
            return false;
        }
        String this$thirdId = this.getThirdId();
        String other$thirdId = other.getThirdId();
        return !(this$thirdId == null ? other$thirdId != null : !this$thirdId.equals(other$thirdId));
    }

    protected boolean canEqual(Object other) {
        return other instanceof StatRecordDuplicate;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        String $id = this.getId();
        result = result * 59 + ($id == null ? 43 : $id.hashCode());
        Date $recordedOn = this.getRecordedOn();
        result = result * 59 + ($recordedOn == null ? 43 : ((Object)$recordedOn).hashCode());
        String $level = this.getLevel();
        result = result * 59 + ($level == null ? 43 : $level.hashCode());
        String $time = this.getTime();
        result = result * 59 + ($time == null ? 43 : $time.hashCode());
        String $type = this.getType();
        result = result * 59 + ($type == null ? 43 : $type.hashCode());
        BigDecimal $value = this.getValue();
        result = result * 59 + ($value == null ? 43 : ((Object)$value).hashCode());
        String $thirdId = this.getThirdId();
        result = result * 59 + ($thirdId == null ? 43 : $thirdId.hashCode());
        return result;
    }

    public String toString() {
        return "StatRecordDuplicate(id=" + this.getId() + ", recordedOn=" + this.getRecordedOn() + ", level=" + this.getLevel() + ", time=" + this.getTime() + ", type=" + this.getType() + ", value=" + this.getValue() + ", thirdId=" + this.getThirdId() + ")";
    }

    public StatRecordDuplicate() {
    }

    public StatRecordDuplicate(String id, Date recordedOn, String level, String time, String type, BigDecimal value, String thirdId) {
        this.id = id;
        this.recordedOn = recordedOn;
        this.level = level;
        this.time = time;
        this.type = type;
        this.value = value;
        this.thirdId = thirdId;
    }

    public StatRecordDuplicate withId(String id) {
        return this.id == id ? this : new StatRecordDuplicate(id, this.recordedOn, this.level, this.time, this.type, this.value, this.thirdId);
    }

    public StatRecordDuplicate withRecordedOn(Date recordedOn) {
        return this.recordedOn == recordedOn ? this : new StatRecordDuplicate(this.id, recordedOn, this.level, this.time, this.type, this.value, this.thirdId);
    }

    public StatRecordDuplicate withLevel(String level) {
        return this.level == level ? this : new StatRecordDuplicate(this.id, this.recordedOn, level, this.time, this.type, this.value, this.thirdId);
    }

    public StatRecordDuplicate withTime(String time) {
        return this.time == time ? this : new StatRecordDuplicate(this.id, this.recordedOn, this.level, time, this.type, this.value, this.thirdId);
    }

    public StatRecordDuplicate withType(String type) {
        return this.type == type ? this : new StatRecordDuplicate(this.id, this.recordedOn, this.level, this.time, type, this.value, this.thirdId);
    }

    public StatRecordDuplicate withValue(BigDecimal value) {
        return this.value == value ? this : new StatRecordDuplicate(this.id, this.recordedOn, this.level, this.time, this.type, value, this.thirdId);
    }

    public StatRecordDuplicate withThirdId(String thirdId) {
        return this.thirdId == thirdId ? this : new StatRecordDuplicate(this.id, this.recordedOn, this.level, this.time, this.type, this.value, thirdId);
    }
}

