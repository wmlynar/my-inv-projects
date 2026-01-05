/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.model.device.DutyRecord
 *  com.seer.rds.model.device.DutyRecord$DutyRecordBuilder
 *  javax.persistence.Entity
 *  javax.persistence.GeneratedValue
 *  javax.persistence.Id
 *  javax.persistence.Index
 *  javax.persistence.Table
 *  org.hibernate.annotations.GenericGenerator
 */
package com.seer.rds.model.device;

import com.seer.rds.model.device.DutyRecord;
import java.util.Date;
import javax.persistence.Entity;
import javax.persistence.GeneratedValue;
import javax.persistence.Id;
import javax.persistence.Index;
import javax.persistence.Table;
import org.hibernate.annotations.GenericGenerator;

@Entity
@Table(name="t_dutyrecord", indexes={@Index(name="drRecordedOnIndex", columnList="recordedOn")})
public class DutyRecord {
    @Id
    @GenericGenerator(name="idGenerator", strategy="uuid")
    @GeneratedValue(generator="idGenerator")
    private String id;
    private Boolean onDuty;
    private Date recordedOn;

    public static DutyRecordBuilder builder() {
        return new DutyRecordBuilder();
    }

    public String getId() {
        return this.id;
    }

    public Boolean getOnDuty() {
        return this.onDuty;
    }

    public Date getRecordedOn() {
        return this.recordedOn;
    }

    public void setId(String id) {
        this.id = id;
    }

    public void setOnDuty(Boolean onDuty) {
        this.onDuty = onDuty;
    }

    public void setRecordedOn(Date recordedOn) {
        this.recordedOn = recordedOn;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof DutyRecord)) {
            return false;
        }
        DutyRecord other = (DutyRecord)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        Boolean this$onDuty = this.getOnDuty();
        Boolean other$onDuty = other.getOnDuty();
        if (this$onDuty == null ? other$onDuty != null : !((Object)this$onDuty).equals(other$onDuty)) {
            return false;
        }
        String this$id = this.getId();
        String other$id = other.getId();
        if (this$id == null ? other$id != null : !this$id.equals(other$id)) {
            return false;
        }
        Date this$recordedOn = this.getRecordedOn();
        Date other$recordedOn = other.getRecordedOn();
        return !(this$recordedOn == null ? other$recordedOn != null : !((Object)this$recordedOn).equals(other$recordedOn));
    }

    protected boolean canEqual(Object other) {
        return other instanceof DutyRecord;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        Boolean $onDuty = this.getOnDuty();
        result = result * 59 + ($onDuty == null ? 43 : ((Object)$onDuty).hashCode());
        String $id = this.getId();
        result = result * 59 + ($id == null ? 43 : $id.hashCode());
        Date $recordedOn = this.getRecordedOn();
        result = result * 59 + ($recordedOn == null ? 43 : ((Object)$recordedOn).hashCode());
        return result;
    }

    public String toString() {
        return "DutyRecord(id=" + this.getId() + ", onDuty=" + this.getOnDuty() + ", recordedOn=" + this.getRecordedOn() + ")";
    }

    public DutyRecord() {
    }

    public DutyRecord(String id, Boolean onDuty, Date recordedOn) {
        this.id = id;
        this.onDuty = onDuty;
        this.recordedOn = recordedOn;
    }
}

