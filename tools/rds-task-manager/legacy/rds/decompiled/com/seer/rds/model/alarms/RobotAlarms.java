/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.model.alarms.BaseAlarms
 *  com.seer.rds.model.alarms.RobotAlarms
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
@Table(name="t_robot_alarms", indexes={@Index(name="robotAlarmsIsOk", columnList="is_ok"), @Index(name="robotAlarmsAgvIdCodeRecordMark", columnList="agv_id,code,record_mark")})
public class RobotAlarms
extends BaseAlarms {
    @Column(name="agv_id")
    private String agvId;

    public boolean equals(Object o) {
        if (this == o) {
            return true;
        }
        if (!(o instanceof RobotAlarms)) {
            return false;
        }
        if (!super.equals(o)) {
            return false;
        }
        RobotAlarms that = (RobotAlarms)o;
        return this.agvId.equals(that.agvId);
    }

    public RobotAlarms(RobotAlarms other) {
        this.agvId = other.agvId;
        this.setId(other.getId());
        this.setCode(other.getCode());
        this.setSendMsg(other.getSendMsg());
        this.setAgvId(other.getAgvId());
        this.setIsOk(other.getIsOk());
        this.setCurrentNo(other.getCurrentNo());
        this.setCreateTime(other.getCreateTime());
        this.setErrorTime(other.getErrorTime());
        this.setLevel(other.getLevel());
        this.setRecordMark(other.getRecordMark());
        this.setUpdateTime(other.getUpdateTime());
    }

    public int hashCode() {
        return Objects.hash(super.hashCode(), this.agvId);
    }

    public String getAgvId() {
        return this.agvId;
    }

    public void setAgvId(String agvId) {
        this.agvId = agvId;
    }

    public String toString() {
        return "RobotAlarms(agvId=" + this.getAgvId() + ")";
    }

    public RobotAlarms() {
    }
}

