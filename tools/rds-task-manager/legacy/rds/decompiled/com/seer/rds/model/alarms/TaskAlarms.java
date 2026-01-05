/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.model.alarms.BaseAlarms
 *  com.seer.rds.model.alarms.TaskAlarms
 *  javax.persistence.Column
 *  javax.persistence.Entity
 *  javax.persistence.Index
 *  javax.persistence.Table
 */
package com.seer.rds.model.alarms;

import com.seer.rds.model.alarms.BaseAlarms;
import java.util.Objects;
import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.Index;
import javax.persistence.Table;

@Entity
@Table(name="t_task_alarms", indexes={@Index(name="taskAlarmsIsOk", columnList="is_ok"), @Index(name="taskAlarmsMislabelingRecordMark", columnList="mislabeling,record_mark")})
public class TaskAlarms
extends BaseAlarms {
    @Column(name="mislabeling")
    private String mislabeling;
    private String recordId;
    private String agvId;
    private String outOrderId;

    public boolean equals(Object o) {
        if (this == o) {
            return true;
        }
        if (!(o instanceof TaskAlarms)) {
            return false;
        }
        if (!super.equals(o)) {
            return false;
        }
        TaskAlarms that = (TaskAlarms)o;
        return this.mislabeling.equals(that.mislabeling);
    }

    public int hashCode() {
        return Objects.hash(super.hashCode(), this.mislabeling);
    }

    public String getMislabeling() {
        return this.mislabeling;
    }

    public String getRecordId() {
        return this.recordId;
    }

    public String getAgvId() {
        return this.agvId;
    }

    public String getOutOrderId() {
        return this.outOrderId;
    }

    public void setMislabeling(String mislabeling) {
        this.mislabeling = mislabeling;
    }

    public void setRecordId(String recordId) {
        this.recordId = recordId;
    }

    public void setAgvId(String agvId) {
        this.agvId = agvId;
    }

    public void setOutOrderId(String outOrderId) {
        this.outOrderId = outOrderId;
    }

    public String toString() {
        return "TaskAlarms(mislabeling=" + this.getMislabeling() + ", recordId=" + this.getRecordId() + ", agvId=" + this.getAgvId() + ", outOrderId=" + this.getOutOrderId() + ")";
    }
}

