/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.vo.core.RbkReportVo
 *  com.seer.rds.vo.response.AlarmsVo
 */
package com.seer.rds.vo.core;

import com.seer.rds.vo.response.AlarmsVo;
import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

public class RbkReportVo {
    private Integer available_containers;
    private String current_map;
    private Integer reloc_status;
    private BigDecimal angle;
    private String current_station;
    private BigDecimal battery_level;
    private BigDecimal voltage;
    private Boolean charging;
    private BigDecimal confidence;
    private List<Map<String, Object>> errors;
    private List<Map<String, Object>> fatals;
    private List<Map<String, Object>> warnings;
    private List<Map<String, Object>> notices;
    private BigDecimal x;
    private BigDecimal y;
    private BigDecimal w;
    private Integer odo;
    private AlarmsVo alarms;

    public RbkReportVo(Integer available_containers, String current_map, Integer reloc_status, BigDecimal angle, String current_station, BigDecimal battery_level, BigDecimal voltage, Boolean charging, BigDecimal confidence, List<Map<String, Object>> errors, List<Map<String, Object>> fatals, List<Map<String, Object>> warnings, List<Map<String, Object>> notices, BigDecimal x, BigDecimal y, BigDecimal w, Integer odo) {
        this.available_containers = available_containers;
        this.current_map = current_map;
        this.reloc_status = reloc_status;
        this.angle = angle;
        this.current_station = current_station;
        this.battery_level = battery_level;
        this.voltage = voltage;
        this.charging = charging;
        this.confidence = confidence;
        this.errors = errors;
        this.fatals = fatals;
        this.warnings = warnings;
        this.notices = notices;
        this.x = x;
        this.y = y;
        this.w = w;
        this.odo = odo;
    }

    public Integer getAvailable_containers() {
        return this.available_containers;
    }

    public String getCurrent_map() {
        return this.current_map;
    }

    public Integer getReloc_status() {
        return this.reloc_status;
    }

    public BigDecimal getAngle() {
        return this.angle;
    }

    public String getCurrent_station() {
        return this.current_station;
    }

    public BigDecimal getBattery_level() {
        return this.battery_level;
    }

    public BigDecimal getVoltage() {
        return this.voltage;
    }

    public Boolean getCharging() {
        return this.charging;
    }

    public BigDecimal getConfidence() {
        return this.confidence;
    }

    public List<Map<String, Object>> getErrors() {
        return this.errors;
    }

    public List<Map<String, Object>> getFatals() {
        return this.fatals;
    }

    public List<Map<String, Object>> getWarnings() {
        return this.warnings;
    }

    public List<Map<String, Object>> getNotices() {
        return this.notices;
    }

    public BigDecimal getX() {
        return this.x;
    }

    public BigDecimal getY() {
        return this.y;
    }

    public BigDecimal getW() {
        return this.w;
    }

    public Integer getOdo() {
        return this.odo;
    }

    public AlarmsVo getAlarms() {
        return this.alarms;
    }

    public void setAvailable_containers(Integer available_containers) {
        this.available_containers = available_containers;
    }

    public void setCurrent_map(String current_map) {
        this.current_map = current_map;
    }

    public void setReloc_status(Integer reloc_status) {
        this.reloc_status = reloc_status;
    }

    public void setAngle(BigDecimal angle) {
        this.angle = angle;
    }

    public void setCurrent_station(String current_station) {
        this.current_station = current_station;
    }

    public void setBattery_level(BigDecimal battery_level) {
        this.battery_level = battery_level;
    }

    public void setVoltage(BigDecimal voltage) {
        this.voltage = voltage;
    }

    public void setCharging(Boolean charging) {
        this.charging = charging;
    }

    public void setConfidence(BigDecimal confidence) {
        this.confidence = confidence;
    }

    public void setErrors(List<Map<String, Object>> errors) {
        this.errors = errors;
    }

    public void setFatals(List<Map<String, Object>> fatals) {
        this.fatals = fatals;
    }

    public void setWarnings(List<Map<String, Object>> warnings) {
        this.warnings = warnings;
    }

    public void setNotices(List<Map<String, Object>> notices) {
        this.notices = notices;
    }

    public void setX(BigDecimal x) {
        this.x = x;
    }

    public void setY(BigDecimal y) {
        this.y = y;
    }

    public void setW(BigDecimal w) {
        this.w = w;
    }

    public void setOdo(Integer odo) {
        this.odo = odo;
    }

    public void setAlarms(AlarmsVo alarms) {
        this.alarms = alarms;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof RbkReportVo)) {
            return false;
        }
        RbkReportVo other = (RbkReportVo)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        Integer this$available_containers = this.getAvailable_containers();
        Integer other$available_containers = other.getAvailable_containers();
        if (this$available_containers == null ? other$available_containers != null : !((Object)this$available_containers).equals(other$available_containers)) {
            return false;
        }
        Integer this$reloc_status = this.getReloc_status();
        Integer other$reloc_status = other.getReloc_status();
        if (this$reloc_status == null ? other$reloc_status != null : !((Object)this$reloc_status).equals(other$reloc_status)) {
            return false;
        }
        Boolean this$charging = this.getCharging();
        Boolean other$charging = other.getCharging();
        if (this$charging == null ? other$charging != null : !((Object)this$charging).equals(other$charging)) {
            return false;
        }
        Integer this$odo = this.getOdo();
        Integer other$odo = other.getOdo();
        if (this$odo == null ? other$odo != null : !((Object)this$odo).equals(other$odo)) {
            return false;
        }
        String this$current_map = this.getCurrent_map();
        String other$current_map = other.getCurrent_map();
        if (this$current_map == null ? other$current_map != null : !this$current_map.equals(other$current_map)) {
            return false;
        }
        BigDecimal this$angle = this.getAngle();
        BigDecimal other$angle = other.getAngle();
        if (this$angle == null ? other$angle != null : !((Object)this$angle).equals(other$angle)) {
            return false;
        }
        String this$current_station = this.getCurrent_station();
        String other$current_station = other.getCurrent_station();
        if (this$current_station == null ? other$current_station != null : !this$current_station.equals(other$current_station)) {
            return false;
        }
        BigDecimal this$battery_level = this.getBattery_level();
        BigDecimal other$battery_level = other.getBattery_level();
        if (this$battery_level == null ? other$battery_level != null : !((Object)this$battery_level).equals(other$battery_level)) {
            return false;
        }
        BigDecimal this$voltage = this.getVoltage();
        BigDecimal other$voltage = other.getVoltage();
        if (this$voltage == null ? other$voltage != null : !((Object)this$voltage).equals(other$voltage)) {
            return false;
        }
        BigDecimal this$confidence = this.getConfidence();
        BigDecimal other$confidence = other.getConfidence();
        if (this$confidence == null ? other$confidence != null : !((Object)this$confidence).equals(other$confidence)) {
            return false;
        }
        List this$errors = this.getErrors();
        List other$errors = other.getErrors();
        if (this$errors == null ? other$errors != null : !((Object)this$errors).equals(other$errors)) {
            return false;
        }
        List this$fatals = this.getFatals();
        List other$fatals = other.getFatals();
        if (this$fatals == null ? other$fatals != null : !((Object)this$fatals).equals(other$fatals)) {
            return false;
        }
        List this$warnings = this.getWarnings();
        List other$warnings = other.getWarnings();
        if (this$warnings == null ? other$warnings != null : !((Object)this$warnings).equals(other$warnings)) {
            return false;
        }
        List this$notices = this.getNotices();
        List other$notices = other.getNotices();
        if (this$notices == null ? other$notices != null : !((Object)this$notices).equals(other$notices)) {
            return false;
        }
        BigDecimal this$x = this.getX();
        BigDecimal other$x = other.getX();
        if (this$x == null ? other$x != null : !((Object)this$x).equals(other$x)) {
            return false;
        }
        BigDecimal this$y = this.getY();
        BigDecimal other$y = other.getY();
        if (this$y == null ? other$y != null : !((Object)this$y).equals(other$y)) {
            return false;
        }
        BigDecimal this$w = this.getW();
        BigDecimal other$w = other.getW();
        if (this$w == null ? other$w != null : !((Object)this$w).equals(other$w)) {
            return false;
        }
        AlarmsVo this$alarms = this.getAlarms();
        AlarmsVo other$alarms = other.getAlarms();
        return !(this$alarms == null ? other$alarms != null : !this$alarms.equals(other$alarms));
    }

    protected boolean canEqual(Object other) {
        return other instanceof RbkReportVo;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        Integer $available_containers = this.getAvailable_containers();
        result = result * 59 + ($available_containers == null ? 43 : ((Object)$available_containers).hashCode());
        Integer $reloc_status = this.getReloc_status();
        result = result * 59 + ($reloc_status == null ? 43 : ((Object)$reloc_status).hashCode());
        Boolean $charging = this.getCharging();
        result = result * 59 + ($charging == null ? 43 : ((Object)$charging).hashCode());
        Integer $odo = this.getOdo();
        result = result * 59 + ($odo == null ? 43 : ((Object)$odo).hashCode());
        String $current_map = this.getCurrent_map();
        result = result * 59 + ($current_map == null ? 43 : $current_map.hashCode());
        BigDecimal $angle = this.getAngle();
        result = result * 59 + ($angle == null ? 43 : ((Object)$angle).hashCode());
        String $current_station = this.getCurrent_station();
        result = result * 59 + ($current_station == null ? 43 : $current_station.hashCode());
        BigDecimal $battery_level = this.getBattery_level();
        result = result * 59 + ($battery_level == null ? 43 : ((Object)$battery_level).hashCode());
        BigDecimal $voltage = this.getVoltage();
        result = result * 59 + ($voltage == null ? 43 : ((Object)$voltage).hashCode());
        BigDecimal $confidence = this.getConfidence();
        result = result * 59 + ($confidence == null ? 43 : ((Object)$confidence).hashCode());
        List $errors = this.getErrors();
        result = result * 59 + ($errors == null ? 43 : ((Object)$errors).hashCode());
        List $fatals = this.getFatals();
        result = result * 59 + ($fatals == null ? 43 : ((Object)$fatals).hashCode());
        List $warnings = this.getWarnings();
        result = result * 59 + ($warnings == null ? 43 : ((Object)$warnings).hashCode());
        List $notices = this.getNotices();
        result = result * 59 + ($notices == null ? 43 : ((Object)$notices).hashCode());
        BigDecimal $x = this.getX();
        result = result * 59 + ($x == null ? 43 : ((Object)$x).hashCode());
        BigDecimal $y = this.getY();
        result = result * 59 + ($y == null ? 43 : ((Object)$y).hashCode());
        BigDecimal $w = this.getW();
        result = result * 59 + ($w == null ? 43 : ((Object)$w).hashCode());
        AlarmsVo $alarms = this.getAlarms();
        result = result * 59 + ($alarms == null ? 43 : $alarms.hashCode());
        return result;
    }

    public String toString() {
        return "RbkReportVo(available_containers=" + this.getAvailable_containers() + ", current_map=" + this.getCurrent_map() + ", reloc_status=" + this.getReloc_status() + ", angle=" + this.getAngle() + ", current_station=" + this.getCurrent_station() + ", battery_level=" + this.getBattery_level() + ", voltage=" + this.getVoltage() + ", charging=" + this.getCharging() + ", confidence=" + this.getConfidence() + ", errors=" + this.getErrors() + ", fatals=" + this.getFatals() + ", warnings=" + this.getWarnings() + ", notices=" + this.getNotices() + ", x=" + this.getX() + ", y=" + this.getY() + ", w=" + this.getW() + ", odo=" + this.getOdo() + ", alarms=" + this.getAlarms() + ")";
    }

    public RbkReportVo(Integer available_containers, String current_map, Integer reloc_status, BigDecimal angle, String current_station, BigDecimal battery_level, BigDecimal voltage, Boolean charging, BigDecimal confidence, List<Map<String, Object>> errors, List<Map<String, Object>> fatals, List<Map<String, Object>> warnings, List<Map<String, Object>> notices, BigDecimal x, BigDecimal y, BigDecimal w, Integer odo, AlarmsVo alarms) {
        this.available_containers = available_containers;
        this.current_map = current_map;
        this.reloc_status = reloc_status;
        this.angle = angle;
        this.current_station = current_station;
        this.battery_level = battery_level;
        this.voltage = voltage;
        this.charging = charging;
        this.confidence = confidence;
        this.errors = errors;
        this.fatals = fatals;
        this.warnings = warnings;
        this.notices = notices;
        this.x = x;
        this.y = y;
        this.w = w;
        this.odo = odo;
        this.alarms = alarms;
    }

    public RbkReportVo() {
    }
}

