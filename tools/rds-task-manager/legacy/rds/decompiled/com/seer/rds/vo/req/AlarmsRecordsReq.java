/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.vo.req.AlarmsRecordsReq
 *  com.seer.rds.vo.req.AlarmsRecordsReq$AlarmsRecordsReqBuilder
 */
package com.seer.rds.vo.req;

import com.seer.rds.vo.req.AlarmsRecordsReq;

public class AlarmsRecordsReq {
    private String vehicleId;
    private String startCreateTime;
    private String endCreateTime;
    private String startEndTime;
    private String endEndTime;
    private String alarmsCode;
    private String alarmsDesc;
    private String level;

    public static AlarmsRecordsReqBuilder builder() {
        return new AlarmsRecordsReqBuilder();
    }

    public String getVehicleId() {
        return this.vehicleId;
    }

    public String getStartCreateTime() {
        return this.startCreateTime;
    }

    public String getEndCreateTime() {
        return this.endCreateTime;
    }

    public String getStartEndTime() {
        return this.startEndTime;
    }

    public String getEndEndTime() {
        return this.endEndTime;
    }

    public String getAlarmsCode() {
        return this.alarmsCode;
    }

    public String getAlarmsDesc() {
        return this.alarmsDesc;
    }

    public String getLevel() {
        return this.level;
    }

    public void setVehicleId(String vehicleId) {
        this.vehicleId = vehicleId;
    }

    public void setStartCreateTime(String startCreateTime) {
        this.startCreateTime = startCreateTime;
    }

    public void setEndCreateTime(String endCreateTime) {
        this.endCreateTime = endCreateTime;
    }

    public void setStartEndTime(String startEndTime) {
        this.startEndTime = startEndTime;
    }

    public void setEndEndTime(String endEndTime) {
        this.endEndTime = endEndTime;
    }

    public void setAlarmsCode(String alarmsCode) {
        this.alarmsCode = alarmsCode;
    }

    public void setAlarmsDesc(String alarmsDesc) {
        this.alarmsDesc = alarmsDesc;
    }

    public void setLevel(String level) {
        this.level = level;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof AlarmsRecordsReq)) {
            return false;
        }
        AlarmsRecordsReq other = (AlarmsRecordsReq)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        String this$vehicleId = this.getVehicleId();
        String other$vehicleId = other.getVehicleId();
        if (this$vehicleId == null ? other$vehicleId != null : !this$vehicleId.equals(other$vehicleId)) {
            return false;
        }
        String this$startCreateTime = this.getStartCreateTime();
        String other$startCreateTime = other.getStartCreateTime();
        if (this$startCreateTime == null ? other$startCreateTime != null : !this$startCreateTime.equals(other$startCreateTime)) {
            return false;
        }
        String this$endCreateTime = this.getEndCreateTime();
        String other$endCreateTime = other.getEndCreateTime();
        if (this$endCreateTime == null ? other$endCreateTime != null : !this$endCreateTime.equals(other$endCreateTime)) {
            return false;
        }
        String this$startEndTime = this.getStartEndTime();
        String other$startEndTime = other.getStartEndTime();
        if (this$startEndTime == null ? other$startEndTime != null : !this$startEndTime.equals(other$startEndTime)) {
            return false;
        }
        String this$endEndTime = this.getEndEndTime();
        String other$endEndTime = other.getEndEndTime();
        if (this$endEndTime == null ? other$endEndTime != null : !this$endEndTime.equals(other$endEndTime)) {
            return false;
        }
        String this$alarmsCode = this.getAlarmsCode();
        String other$alarmsCode = other.getAlarmsCode();
        if (this$alarmsCode == null ? other$alarmsCode != null : !this$alarmsCode.equals(other$alarmsCode)) {
            return false;
        }
        String this$alarmsDesc = this.getAlarmsDesc();
        String other$alarmsDesc = other.getAlarmsDesc();
        if (this$alarmsDesc == null ? other$alarmsDesc != null : !this$alarmsDesc.equals(other$alarmsDesc)) {
            return false;
        }
        String this$level = this.getLevel();
        String other$level = other.getLevel();
        return !(this$level == null ? other$level != null : !this$level.equals(other$level));
    }

    protected boolean canEqual(Object other) {
        return other instanceof AlarmsRecordsReq;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        String $vehicleId = this.getVehicleId();
        result = result * 59 + ($vehicleId == null ? 43 : $vehicleId.hashCode());
        String $startCreateTime = this.getStartCreateTime();
        result = result * 59 + ($startCreateTime == null ? 43 : $startCreateTime.hashCode());
        String $endCreateTime = this.getEndCreateTime();
        result = result * 59 + ($endCreateTime == null ? 43 : $endCreateTime.hashCode());
        String $startEndTime = this.getStartEndTime();
        result = result * 59 + ($startEndTime == null ? 43 : $startEndTime.hashCode());
        String $endEndTime = this.getEndEndTime();
        result = result * 59 + ($endEndTime == null ? 43 : $endEndTime.hashCode());
        String $alarmsCode = this.getAlarmsCode();
        result = result * 59 + ($alarmsCode == null ? 43 : $alarmsCode.hashCode());
        String $alarmsDesc = this.getAlarmsDesc();
        result = result * 59 + ($alarmsDesc == null ? 43 : $alarmsDesc.hashCode());
        String $level = this.getLevel();
        result = result * 59 + ($level == null ? 43 : $level.hashCode());
        return result;
    }

    public String toString() {
        return "AlarmsRecordsReq(vehicleId=" + this.getVehicleId() + ", startCreateTime=" + this.getStartCreateTime() + ", endCreateTime=" + this.getEndCreateTime() + ", startEndTime=" + this.getStartEndTime() + ", endEndTime=" + this.getEndEndTime() + ", alarmsCode=" + this.getAlarmsCode() + ", alarmsDesc=" + this.getAlarmsDesc() + ", level=" + this.getLevel() + ")";
    }

    public AlarmsRecordsReq() {
    }

    public AlarmsRecordsReq(String vehicleId, String startCreateTime, String endCreateTime, String startEndTime, String endEndTime, String alarmsCode, String alarmsDesc, String level) {
        this.vehicleId = vehicleId;
        this.startCreateTime = startCreateTime;
        this.endCreateTime = endCreateTime;
        this.startEndTime = startEndTime;
        this.endEndTime = endEndTime;
        this.alarmsCode = alarmsCode;
        this.alarmsDesc = alarmsDesc;
        this.level = level;
    }
}

