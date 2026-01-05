/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.model.stat.AlarmsRecordMerge
 *  com.seer.rds.util.TimeUtils
 *  com.seer.rds.vo.response.AlarmsRecordRes
 *  com.seer.rds.vo.response.AlarmsRecordRes$AlarmsRecordResBuilder
 *  org.apache.commons.compress.utils.Lists
 */
package com.seer.rds.vo.response;

import com.seer.rds.model.stat.AlarmsRecordMerge;
import com.seer.rds.util.TimeUtils;
import com.seer.rds.vo.response.AlarmsRecordRes;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.Optional;
import org.apache.commons.compress.utils.Lists;

/*
 * Exception performing whole class analysis ignored.
 */
public class AlarmsRecordRes {
    private String alarmsCode;
    private String vehicleId;
    private String level;
    private String startedOn;
    private String endedOn;
    private BigDecimal alarmsCostTime;
    private String alarmsDesc;

    public static AlarmsRecordRes toAlarmsRecordRes(AlarmsRecordMerge alarmsRecordMerge) {
        return AlarmsRecordRes.builder().alarmsCode(Optional.ofNullable(alarmsRecordMerge.getAlarmsCode()).orElse("")).vehicleId(Optional.ofNullable(alarmsRecordMerge.getVehicleId()).orElse("")).level(Optional.ofNullable(alarmsRecordMerge.getLevel()).orElse("")).startedOn(Optional.ofNullable(alarmsRecordMerge.getStartedOn()).map(TimeUtils::transferDate2String).orElse("")).endedOn(Optional.ofNullable(alarmsRecordMerge.getEndedOn()).map(TimeUtils::transferDate2String).orElse("")).alarmsCostTime((BigDecimal)Optional.ofNullable(alarmsRecordMerge.getAlarmsCostTime()).map(time -> time.divide(BigDecimal.valueOf(60000L), 2, RoundingMode.CEILING)).orElse(null)).alarmsDesc(Optional.ofNullable(alarmsRecordMerge.getAlarmsDesc()).orElse("")).build();
    }

    public static List<AlarmsRecordRes> toAlarmsRecordResList(List<AlarmsRecordMerge> alarmsRecordMerges) {
        return Lists.newArrayList(alarmsRecordMerges.stream().map(AlarmsRecordRes::toAlarmsRecordRes).iterator());
    }

    public static AlarmsRecordResBuilder builder() {
        return new AlarmsRecordResBuilder();
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

    public String getStartedOn() {
        return this.startedOn;
    }

    public String getEndedOn() {
        return this.endedOn;
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

    public void setStartedOn(String startedOn) {
        this.startedOn = startedOn;
    }

    public void setEndedOn(String endedOn) {
        this.endedOn = endedOn;
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
        if (!(o instanceof AlarmsRecordRes)) {
            return false;
        }
        AlarmsRecordRes other = (AlarmsRecordRes)o;
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
        String this$startedOn = this.getStartedOn();
        String other$startedOn = other.getStartedOn();
        if (this$startedOn == null ? other$startedOn != null : !this$startedOn.equals(other$startedOn)) {
            return false;
        }
        String this$endedOn = this.getEndedOn();
        String other$endedOn = other.getEndedOn();
        if (this$endedOn == null ? other$endedOn != null : !this$endedOn.equals(other$endedOn)) {
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
        return other instanceof AlarmsRecordRes;
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
        String $startedOn = this.getStartedOn();
        result = result * 59 + ($startedOn == null ? 43 : $startedOn.hashCode());
        String $endedOn = this.getEndedOn();
        result = result * 59 + ($endedOn == null ? 43 : $endedOn.hashCode());
        BigDecimal $alarmsCostTime = this.getAlarmsCostTime();
        result = result * 59 + ($alarmsCostTime == null ? 43 : ((Object)$alarmsCostTime).hashCode());
        String $alarmsDesc = this.getAlarmsDesc();
        result = result * 59 + ($alarmsDesc == null ? 43 : $alarmsDesc.hashCode());
        return result;
    }

    public String toString() {
        return "AlarmsRecordRes(alarmsCode=" + this.getAlarmsCode() + ", vehicleId=" + this.getVehicleId() + ", level=" + this.getLevel() + ", startedOn=" + this.getStartedOn() + ", endedOn=" + this.getEndedOn() + ", alarmsCostTime=" + this.getAlarmsCostTime() + ", alarmsDesc=" + this.getAlarmsDesc() + ")";
    }

    public AlarmsRecordRes() {
    }

    public AlarmsRecordRes(String alarmsCode, String vehicleId, String level, String startedOn, String endedOn, BigDecimal alarmsCostTime, String alarmsDesc) {
        this.alarmsCode = alarmsCode;
        this.vehicleId = vehicleId;
        this.level = level;
        this.startedOn = startedOn;
        this.endedOn = endedOn;
        this.alarmsCostTime = alarmsCostTime;
        this.alarmsDesc = alarmsDesc;
    }
}

