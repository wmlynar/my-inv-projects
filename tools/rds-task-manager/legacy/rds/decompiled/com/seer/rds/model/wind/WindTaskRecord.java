/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.model.wind.TaskRecord
 *  com.seer.rds.model.wind.WindTaskRecord
 *  com.seer.rds.model.wind.WindTaskRecord$WindTaskRecordBuilder
 *  javax.persistence.Entity
 *  javax.persistence.Index
 *  javax.persistence.Table
 */
package com.seer.rds.model.wind;

import com.seer.rds.model.wind.TaskRecord;
import com.seer.rds.model.wind.WindTaskRecord;
import java.util.Date;
import javax.persistence.Entity;
import javax.persistence.Index;
import javax.persistence.Table;

@Entity
@Table(name="t_windtaskrecord", indexes={@Index(name="defIdIsDelIndex", columnList="defId,isDel"), @Index(name="outOrderNoIsDelIndex", columnList="outOrderNo,isDel"), @Index(name="endedOnStatusAgvId", columnList="endedOn,status,agvId"), @Index(name="parentTaskRecordIdIsDelIndex", columnList="parentTaskRecordId,isDel"), @Index(name="createdOnIsDelDefLabelAgvIdStatusIndex", columnList="createdOn,isDel,defLabel,agvId,status"), @Index(name="createdOnWorkStationWorkTypeIsDel", columnList="createdOn,workStations,workTypes,isDel"), @Index(name="createdOnIsDelDefLabelAgvIdStatusStateDescriptionIndex", columnList="createdOn,isDel,defLabel,agvId,status,stateDescription"), @Index(name="statusIndex", columnList="status")})
public class WindTaskRecord
extends TaskRecord {
    public WindTaskRecord() {
    }

    public WindTaskRecord(String id, String defLabel, Date createdOn, Integer status, String agvId) {
        this.id = id;
        this.defLabel = defLabel;
        this.createdOn = createdOn;
        this.status = status;
        this.agvId = agvId;
    }

    public WindTaskRecord(String defLabel, Integer status, Integer executorTime) {
        this.defLabel = defLabel;
        this.status = status;
        this.executorTime = executorTime;
    }

    public WindTaskRecord(String defLabel, Integer status, Integer executorTime, String callWorkType, String callWorkStation) {
        this.defLabel = defLabel;
        this.status = status;
        this.executorTime = executorTime;
        this.callWorkType = callWorkType;
        this.callWorkStation = callWorkStation;
    }

    public WindTaskRecord(String id, String outOrderNo, String defId, String defLabel, Date createdOn, Integer status, Date endedOn, String stateDescription, String agvId) {
        this.id = id;
        this.outOrderNo = outOrderNo;
        this.defId = defId;
        this.defLabel = defLabel;
        this.createdOn = createdOn;
        this.status = status;
        this.endedOn = endedOn;
        this.stateDescription = stateDescription;
        this.agvId = agvId;
    }

    public WindTaskRecord(String id, String defId, String defLabel) {
        this.id = id;
        this.defId = defId;
        this.defLabel = defLabel;
    }

    public WindTaskRecord(String id, String defId) {
        this.id = id;
        this.defId = defId;
    }

    public static WindTaskRecordBuilder builder() {
        return new WindTaskRecordBuilder();
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof WindTaskRecord)) {
            return false;
        }
        WindTaskRecord other = (WindTaskRecord)o;
        return other.canEqual((Object)this);
    }

    protected boolean canEqual(Object other) {
        return other instanceof WindTaskRecord;
    }

    public int hashCode() {
        boolean result = true;
        return 1;
    }

    public String toString() {
        return "WindTaskRecord()";
    }
}

