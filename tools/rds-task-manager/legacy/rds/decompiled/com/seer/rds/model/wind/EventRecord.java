/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.model.wind.BaseRecord
 *  com.seer.rds.model.wind.EventRecord
 *  com.seer.rds.model.wind.EventRecord$EventRecordBuilder
 *  javax.persistence.Entity
 *  javax.persistence.Index
 *  javax.persistence.Table
 */
package com.seer.rds.model.wind;

import com.seer.rds.model.wind.BaseRecord;
import com.seer.rds.model.wind.EventRecord;
import javax.persistence.Entity;
import javax.persistence.Index;
import javax.persistence.Table;

@Entity
@Table(name="t_eventrecord", indexes={@Index(name="eventrecordStatusCreatedOnIndex", columnList="status,createdOn"), @Index(name="eventrecordTaskDefLabelCreatedOnIndex", columnList="defLabel,createdOn"), @Index(name="eventrecordCreatedOnIndex", columnList="createdOn")})
public class EventRecord
extends BaseRecord {
    private String taskRecordId;

    public static EventRecordBuilder builder() {
        return new EventRecordBuilder();
    }

    public String getTaskRecordId() {
        return this.taskRecordId;
    }

    public void setTaskRecordId(String taskRecordId) {
        this.taskRecordId = taskRecordId;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof EventRecord)) {
            return false;
        }
        EventRecord other = (EventRecord)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        String this$taskRecordId = this.getTaskRecordId();
        String other$taskRecordId = other.getTaskRecordId();
        return !(this$taskRecordId == null ? other$taskRecordId != null : !this$taskRecordId.equals(other$taskRecordId));
    }

    protected boolean canEqual(Object other) {
        return other instanceof EventRecord;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        String $taskRecordId = this.getTaskRecordId();
        result = result * 59 + ($taskRecordId == null ? 43 : $taskRecordId.hashCode());
        return result;
    }

    public String toString() {
        return "EventRecord(taskRecordId=" + this.getTaskRecordId() + ")";
    }

    public EventRecord() {
    }

    public EventRecord(String taskRecordId) {
        this.taskRecordId = taskRecordId;
    }
}

