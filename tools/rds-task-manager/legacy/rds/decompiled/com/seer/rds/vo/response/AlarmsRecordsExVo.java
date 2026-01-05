/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  cn.afterturn.easypoi.excel.annotation.Excel
 *  com.seer.rds.vo.response.AlarmsRecordsExVo
 *  com.seer.rds.vo.response.AlarmsRecordsExVo$AlarmsRecordsExVoBuilder
 */
package com.seer.rds.vo.response;

import cn.afterturn.easypoi.excel.annotation.Excel;
import com.seer.rds.vo.response.AlarmsRecordsExVo;
import java.math.BigDecimal;
import java.util.Date;

public class AlarmsRecordsExVo {
    @Excel(name="alarmsRecord.export.alarmsCode", orderNum="0")
    private String alarmsCode;
    @Excel(name="alarmsRecord.export.vehicleId", orderNum="1")
    private String vehicleId;
    @Excel(name="alarmsRecord.export.level", orderNum="2")
    private String level;
    @Excel(name="alarmsRecord.export.start", orderNum="3")
    private Date start;
    @Excel(name="alarmsRecord.export.end", orderNum="4", type=10)
    private Date end;
    @Excel(name="alarmsRecord.export.alarmsCostTime", orderNum="5")
    private BigDecimal alarmsCostTime;
    @Excel(name="alarmsRecord.export.alarmsDesc", orderNum="6")
    private String alarmsDesc;

    public static AlarmsRecordsExVoBuilder builder() {
        return new AlarmsRecordsExVoBuilder();
    }

    public String getAlarmsCode() {
        return this.alarmsCode;
    }

    public String getVehicleId() {
        return this.vehicleId;
    }

    public String getLevel() {
        return this.level;
    }

    public Date getStart() {
        return this.start;
    }

    public Date getEnd() {
        return this.end;
    }

    public BigDecimal getAlarmsCostTime() {
        return this.alarmsCostTime;
    }

    public String getAlarmsDesc() {
        return this.alarmsDesc;
    }

    public void setAlarmsCode(String alarmsCode) {
        this.alarmsCode = alarmsCode;
    }

    public void setVehicleId(String vehicleId) {
        this.vehicleId = vehicleId;
    }

    public void setLevel(String level) {
        this.level = level;
    }

    public void setStart(Date start) {
        this.start = start;
    }

    public void setEnd(Date end) {
        this.end = end;
    }

    public void setAlarmsCostTime(BigDecimal alarmsCostTime) {
        this.alarmsCostTime = alarmsCostTime;
    }

    public void setAlarmsDesc(String alarmsDesc) {
        this.alarmsDesc = alarmsDesc;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof AlarmsRecordsExVo)) {
            return false;
        }
        AlarmsRecordsExVo other = (AlarmsRecordsExVo)o;
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
        String this$level = this.getLevel();
        String other$level = other.getLevel();
        if (this$level == null ? other$level != null : !this$level.equals(other$level)) {
            return false;
        }
        Date this$start = this.getStart();
        Date other$start = other.getStart();
        if (this$start == null ? other$start != null : !((Object)this$start).equals(other$start)) {
            return false;
        }
        Date this$end = this.getEnd();
        Date other$end = other.getEnd();
        if (this$end == null ? other$end != null : !((Object)this$end).equals(other$end)) {
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
        return other instanceof AlarmsRecordsExVo;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        String $alarmsCode = this.getAlarmsCode();
        result = result * 59 + ($alarmsCode == null ? 43 : $alarmsCode.hashCode());
        String $vehicleId = this.getVehicleId();
        result = result * 59 + ($vehicleId == null ? 43 : $vehicleId.hashCode());
        String $level = this.getLevel();
        result = result * 59 + ($level == null ? 43 : $level.hashCode());
        Date $start = this.getStart();
        result = result * 59 + ($start == null ? 43 : ((Object)$start).hashCode());
        Date $end = this.getEnd();
        result = result * 59 + ($end == null ? 43 : ((Object)$end).hashCode());
        BigDecimal $alarmsCostTime = this.getAlarmsCostTime();
        result = result * 59 + ($alarmsCostTime == null ? 43 : ((Object)$alarmsCostTime).hashCode());
        String $alarmsDesc = this.getAlarmsDesc();
        result = result * 59 + ($alarmsDesc == null ? 43 : $alarmsDesc.hashCode());
        return result;
    }

    public String toString() {
        return "AlarmsRecordsExVo(alarmsCode=" + this.getAlarmsCode() + ", vehicleId=" + this.getVehicleId() + ", level=" + this.getLevel() + ", start=" + this.getStart() + ", end=" + this.getEnd() + ", alarmsCostTime=" + this.getAlarmsCostTime() + ", alarmsDesc=" + this.getAlarmsDesc() + ")";
    }

    public AlarmsRecordsExVo() {
    }

    public AlarmsRecordsExVo(String alarmsCode, String vehicleId, String level, Date start, Date end, BigDecimal alarmsCostTime, String alarmsDesc) {
        this.alarmsCode = alarmsCode;
        this.vehicleId = vehicleId;
        this.level = level;
        this.start = start;
        this.end = end;
        this.alarmsCostTime = alarmsCostTime;
        this.alarmsDesc = alarmsDesc;
    }
}

