/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.vo.response.BatteryLevelVo
 *  com.seer.rds.vo.response.BatteryLevelVo$BatteryLevelVoBuilder
 */
package com.seer.rds.vo.response;

import com.seer.rds.vo.response.BatteryLevelVo;
import java.math.BigDecimal;

public class BatteryLevelVo {
    private String vehicleId;
    private BigDecimal batteryLevel;
    private String time;

    public static BatteryLevelVoBuilder builder() {
        return new BatteryLevelVoBuilder();
    }

    public String getVehicleId() {
        return this.vehicleId;
    }

    public BigDecimal getBatteryLevel() {
        return this.batteryLevel;
    }

    public String getTime() {
        return this.time;
    }

    public void setVehicleId(String vehicleId) {
        this.vehicleId = vehicleId;
    }

    public void setBatteryLevel(BigDecimal batteryLevel) {
        this.batteryLevel = batteryLevel;
    }

    public void setTime(String time) {
        this.time = time;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof BatteryLevelVo)) {
            return false;
        }
        BatteryLevelVo other = (BatteryLevelVo)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        String this$vehicleId = this.getVehicleId();
        String other$vehicleId = other.getVehicleId();
        if (this$vehicleId == null ? other$vehicleId != null : !this$vehicleId.equals(other$vehicleId)) {
            return false;
        }
        BigDecimal this$batteryLevel = this.getBatteryLevel();
        BigDecimal other$batteryLevel = other.getBatteryLevel();
        if (this$batteryLevel == null ? other$batteryLevel != null : !((Object)this$batteryLevel).equals(other$batteryLevel)) {
            return false;
        }
        String this$time = this.getTime();
        String other$time = other.getTime();
        return !(this$time == null ? other$time != null : !this$time.equals(other$time));
    }

    protected boolean canEqual(Object other) {
        return other instanceof BatteryLevelVo;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        String $vehicleId = this.getVehicleId();
        result = result * 59 + ($vehicleId == null ? 43 : $vehicleId.hashCode());
        BigDecimal $batteryLevel = this.getBatteryLevel();
        result = result * 59 + ($batteryLevel == null ? 43 : ((Object)$batteryLevel).hashCode());
        String $time = this.getTime();
        result = result * 59 + ($time == null ? 43 : $time.hashCode());
        return result;
    }

    public String toString() {
        return "BatteryLevelVo(vehicleId=" + this.getVehicleId() + ", batteryLevel=" + this.getBatteryLevel() + ", time=" + this.getTime() + ")";
    }

    public BatteryLevelVo() {
    }

    public BatteryLevelVo(String vehicleId, BigDecimal batteryLevel, String time) {
        this.vehicleId = vehicleId;
        this.batteryLevel = batteryLevel;
        this.time = time;
    }
}

