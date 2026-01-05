/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.model.alarms.BaseAlarms
 *  com.seer.rds.model.alarms.CoreAlarms
 *  javax.persistence.Entity
 *  javax.persistence.Index
 *  javax.persistence.Table
 */
package com.seer.rds.model.alarms;

import com.seer.rds.model.alarms.BaseAlarms;
import javax.persistence.Entity;
import javax.persistence.Index;
import javax.persistence.Table;

@Entity
@Table(name="t_core_alarms", indexes={@Index(name="coreAlarmsIsOk", columnList="is_ok"), @Index(name="coreAlarmsRecordMark", columnList="record_mark"), @Index(name="coreAlarmsCodeRecordMark", columnList="code,record_mark")})
public class CoreAlarms
extends BaseAlarms {
    public boolean equals(Object o) {
        return super.equals(o);
    }

    public int hashCode() {
        return super.hashCode();
    }

    public String toString() {
        return "CoreAlarms()";
    }
}

