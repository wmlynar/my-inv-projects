/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.vo.core.DisablePathVo
 *  com.seer.rds.vo.core.DisablePointVo
 *  com.seer.rds.vo.core.ReportVo
 *  com.seer.rds.vo.core.RobotVo
 *  com.seer.rds.vo.response.AlarmsVo
 *  io.swagger.annotations.ApiModel
 */
package com.seer.rds.vo.core;

import com.seer.rds.vo.core.DisablePathVo;
import com.seer.rds.vo.core.DisablePointVo;
import com.seer.rds.vo.core.ReportVo;
import com.seer.rds.vo.response.AlarmsVo;
import io.swagger.annotations.ApiModel;
import java.util.List;
import java.util.Map;

@ApiModel(value="core \u673a\u5668\u4eba\u72b6\u6001\u5bf9\u8c61")
public class RobotVo {
    private AlarmsVo alarms;
    private List<DisablePointVo> disable_points;
    private List<DisablePathVo> disable_paths;
    private List<Map<String, Object>> errors;
    private List<Map<String, Object>> fatals;
    private List<Map<String, Object>> notices;
    private List<Map<String, Object>> warnings;
    private String scene_md5;
    private List<ReportVo> report;

    public AlarmsVo getAlarms() {
        return this.alarms;
    }

    public List<DisablePointVo> getDisable_points() {
        return this.disable_points;
    }

    public List<DisablePathVo> getDisable_paths() {
        return this.disable_paths;
    }

    public List<Map<String, Object>> getErrors() {
        return this.errors;
    }

    public List<Map<String, Object>> getFatals() {
        return this.fatals;
    }

    public List<Map<String, Object>> getNotices() {
        return this.notices;
    }

    public List<Map<String, Object>> getWarnings() {
        return this.warnings;
    }

    public String getScene_md5() {
        return this.scene_md5;
    }

    public List<ReportVo> getReport() {
        return this.report;
    }

    public void setAlarms(AlarmsVo alarms) {
        this.alarms = alarms;
    }

    public void setDisable_points(List<DisablePointVo> disable_points) {
        this.disable_points = disable_points;
    }

    public void setDisable_paths(List<DisablePathVo> disable_paths) {
        this.disable_paths = disable_paths;
    }

    public void setErrors(List<Map<String, Object>> errors) {
        this.errors = errors;
    }

    public void setFatals(List<Map<String, Object>> fatals) {
        this.fatals = fatals;
    }

    public void setNotices(List<Map<String, Object>> notices) {
        this.notices = notices;
    }

    public void setWarnings(List<Map<String, Object>> warnings) {
        this.warnings = warnings;
    }

    public void setScene_md5(String scene_md5) {
        this.scene_md5 = scene_md5;
    }

    public void setReport(List<ReportVo> report) {
        this.report = report;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof RobotVo)) {
            return false;
        }
        RobotVo other = (RobotVo)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        AlarmsVo this$alarms = this.getAlarms();
        AlarmsVo other$alarms = other.getAlarms();
        if (this$alarms == null ? other$alarms != null : !this$alarms.equals(other$alarms)) {
            return false;
        }
        List this$disable_points = this.getDisable_points();
        List other$disable_points = other.getDisable_points();
        if (this$disable_points == null ? other$disable_points != null : !((Object)this$disable_points).equals(other$disable_points)) {
            return false;
        }
        List this$disable_paths = this.getDisable_paths();
        List other$disable_paths = other.getDisable_paths();
        if (this$disable_paths == null ? other$disable_paths != null : !((Object)this$disable_paths).equals(other$disable_paths)) {
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
        List this$notices = this.getNotices();
        List other$notices = other.getNotices();
        if (this$notices == null ? other$notices != null : !((Object)this$notices).equals(other$notices)) {
            return false;
        }
        List this$warnings = this.getWarnings();
        List other$warnings = other.getWarnings();
        if (this$warnings == null ? other$warnings != null : !((Object)this$warnings).equals(other$warnings)) {
            return false;
        }
        String this$scene_md5 = this.getScene_md5();
        String other$scene_md5 = other.getScene_md5();
        if (this$scene_md5 == null ? other$scene_md5 != null : !this$scene_md5.equals(other$scene_md5)) {
            return false;
        }
        List this$report = this.getReport();
        List other$report = other.getReport();
        return !(this$report == null ? other$report != null : !((Object)this$report).equals(other$report));
    }

    protected boolean canEqual(Object other) {
        return other instanceof RobotVo;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        AlarmsVo $alarms = this.getAlarms();
        result = result * 59 + ($alarms == null ? 43 : $alarms.hashCode());
        List $disable_points = this.getDisable_points();
        result = result * 59 + ($disable_points == null ? 43 : ((Object)$disable_points).hashCode());
        List $disable_paths = this.getDisable_paths();
        result = result * 59 + ($disable_paths == null ? 43 : ((Object)$disable_paths).hashCode());
        List $errors = this.getErrors();
        result = result * 59 + ($errors == null ? 43 : ((Object)$errors).hashCode());
        List $fatals = this.getFatals();
        result = result * 59 + ($fatals == null ? 43 : ((Object)$fatals).hashCode());
        List $notices = this.getNotices();
        result = result * 59 + ($notices == null ? 43 : ((Object)$notices).hashCode());
        List $warnings = this.getWarnings();
        result = result * 59 + ($warnings == null ? 43 : ((Object)$warnings).hashCode());
        String $scene_md5 = this.getScene_md5();
        result = result * 59 + ($scene_md5 == null ? 43 : $scene_md5.hashCode());
        List $report = this.getReport();
        result = result * 59 + ($report == null ? 43 : ((Object)$report).hashCode());
        return result;
    }

    public String toString() {
        return "RobotVo(alarms=" + this.getAlarms() + ", disable_points=" + this.getDisable_points() + ", disable_paths=" + this.getDisable_paths() + ", errors=" + this.getErrors() + ", fatals=" + this.getFatals() + ", notices=" + this.getNotices() + ", warnings=" + this.getWarnings() + ", scene_md5=" + this.getScene_md5() + ", report=" + this.getReport() + ")";
    }

    public RobotVo(AlarmsVo alarms, List<DisablePointVo> disable_points, List<DisablePathVo> disable_paths, List<Map<String, Object>> errors, List<Map<String, Object>> fatals, List<Map<String, Object>> notices, List<Map<String, Object>> warnings, String scene_md5, List<ReportVo> report) {
        this.alarms = alarms;
        this.disable_points = disable_points;
        this.disable_paths = disable_paths;
        this.errors = errors;
        this.fatals = fatals;
        this.notices = notices;
        this.warnings = warnings;
        this.scene_md5 = scene_md5;
        this.report = report;
    }

    public RobotVo() {
    }
}

