/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.vo.response.RobotAlarm
 *  com.seer.rds.vo.response.RobotAlarm$RobotAlarmBuilder
 */
package com.seer.rds.vo.response;

import com.seer.rds.vo.response.RobotAlarm;
import java.util.Date;

public class RobotAlarm {
    private String alarmsCode;
    private String vehicleId;
    private String currentGroup;
    private String level;
    private Date startedOn;
    private String alarmsDesc;
    private String station;
    private String lastStation;

    public static RobotAlarmBuilder builder() {
        return new RobotAlarmBuilder();
    }

    public String getAlarmsCode() {
        return this.alarmsCode;
    }

    public String getVehicleId() {
        return this.vehicleId;
    }

    public String getCurrentGroup() {
        return this.currentGroup;
    }

    public String getLevel() {
        return this.level;
    }

    public Date getStartedOn() {
        return this.startedOn;
    }

    public String getAlarmsDesc() {
        return this.alarmsDesc;
    }

    public String getStation() {
        return this.station;
    }

    public String getLastStation() {
        return this.lastStation;
    }

    public void setAlarmsCode(String alarmsCode) {
        this.alarmsCode = alarmsCode;
    }

    public void setVehicleId(String vehicleId) {
        this.vehicleId = vehicleId;
    }

    public void setCurrentGroup(String currentGroup) {
        this.currentGroup = currentGroup;
    }

    public void setLevel(String level) {
        this.level = level;
    }

    public void setStartedOn(Date startedOn) {
        this.startedOn = startedOn;
    }

    public void setAlarmsDesc(String alarmsDesc) {
        this.alarmsDesc = alarmsDesc;
    }

    public void setStation(String station) {
        this.station = station;
    }

    public void setLastStation(String lastStation) {
        this.lastStation = lastStation;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof RobotAlarm)) {
            return false;
        }
        RobotAlarm other = (RobotAlarm)o;
        if (!other.canEqual((Object)this)) {
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
        String this$currentGroup = this.getCurrentGroup();
        String other$currentGroup = other.getCurrentGroup();
        if (this$currentGroup == null ? other$currentGroup != null : !this$currentGroup.equals(other$currentGroup)) {
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
        String this$alarmsDesc = this.getAlarmsDesc();
        String other$alarmsDesc = other.getAlarmsDesc();
        if (this$alarmsDesc == null ? other$alarmsDesc != null : !this$alarmsDesc.equals(other$alarmsDesc)) {
            return false;
        }
        String this$station = this.getStation();
        String other$station = other.getStation();
        if (this$station == null ? other$station != null : !this$station.equals(other$station)) {
            return false;
        }
        String this$lastStation = this.getLastStation();
        String other$lastStation = other.getLastStation();
        return !(this$lastStation == null ? other$lastStation != null : !this$lastStation.equals(other$lastStation));
    }

    protected boolean canEqual(Object other) {
        return other instanceof RobotAlarm;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        String $alarmsCode = this.getAlarmsCode();
        result = result * 59 + ($alarmsCode == null ? 43 : $alarmsCode.hashCode());
        String $vehicleId = this.getVehicleId();
        result = result * 59 + ($vehicleId == null ? 43 : $vehicleId.hashCode());
        String $currentGroup = this.getCurrentGroup();
        result = result * 59 + ($currentGroup == null ? 43 : $currentGroup.hashCode());
        String $level = this.getLevel();
        result = result * 59 + ($level == null ? 43 : $level.hashCode());
        Date $startedOn = this.getStartedOn();
        result = result * 59 + ($startedOn == null ? 43 : ((Object)$startedOn).hashCode());
        String $alarmsDesc = this.getAlarmsDesc();
        result = result * 59 + ($alarmsDesc == null ? 43 : $alarmsDesc.hashCode());
        String $station = this.getStation();
        result = result * 59 + ($station == null ? 43 : $station.hashCode());
        String $lastStation = this.getLastStation();
        result = result * 59 + ($lastStation == null ? 43 : $lastStation.hashCode());
        return result;
    }

    public String toString() {
        return "RobotAlarm(alarmsCode=" + this.getAlarmsCode() + ", vehicleId=" + this.getVehicleId() + ", currentGroup=" + this.getCurrentGroup() + ", level=" + this.getLevel() + ", startedOn=" + this.getStartedOn() + ", alarmsDesc=" + this.getAlarmsDesc() + ", station=" + this.getStation() + ", lastStation=" + this.getLastStation() + ")";
    }

    public RobotAlarm() {
    }

    public RobotAlarm(String alarmsCode, String vehicleId, String currentGroup, String level, Date startedOn, String alarmsDesc, String station, String lastStation) {
        this.alarmsCode = alarmsCode;
        this.vehicleId = vehicleId;
        this.currentGroup = currentGroup;
        this.level = level;
        this.startedOn = startedOn;
        this.alarmsDesc = alarmsDesc;
        this.station = station;
        this.lastStation = lastStation;
    }
}

