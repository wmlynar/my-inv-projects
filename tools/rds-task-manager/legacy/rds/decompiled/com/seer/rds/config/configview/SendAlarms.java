/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.config.configview.ApproachConfig
 *  com.seer.rds.config.configview.SendAlarms
 *  com.seer.rds.constant.ShieldingTypeEnum
 *  com.seer.rds.constant.VehicleAlarmsEnum
 */
package com.seer.rds.config.configview;

import com.seer.rds.config.configview.ApproachConfig;
import com.seer.rds.constant.ShieldingTypeEnum;
import com.seer.rds.constant.VehicleAlarmsEnum;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

public class SendAlarms {
    private Boolean enable = false;
    private String language = "zh";
    private Integer times = 1;
    private ApproachConfig approach = new ApproachConfig();
    private List<String> reportErrorType = new ArrayList<String>(Arrays.asList("core", "rbk", "task"));
    private List<String> reportLevel = new ArrayList<String>(Arrays.asList(VehicleAlarmsEnum.VehicleWarnings.getLevel(), VehicleAlarmsEnum.VehicleErrors.getLevel(), VehicleAlarmsEnum.VehicleFatals.getLevel()));
    private String shieldingType = ShieldingTypeEnum.NoShielding.getType();
    private Integer shieldingStartTime = 20;
    private Integer shieldingEndTime = 6;

    public Boolean getEnable() {
        return this.enable;
    }

    public String getLanguage() {
        return this.language;
    }

    public Integer getTimes() {
        return this.times;
    }

    public ApproachConfig getApproach() {
        return this.approach;
    }

    public List<String> getReportErrorType() {
        return this.reportErrorType;
    }

    public List<String> getReportLevel() {
        return this.reportLevel;
    }

    public String getShieldingType() {
        return this.shieldingType;
    }

    public Integer getShieldingStartTime() {
        return this.shieldingStartTime;
    }

    public Integer getShieldingEndTime() {
        return this.shieldingEndTime;
    }

    public void setEnable(Boolean enable) {
        this.enable = enable;
    }

    public void setLanguage(String language) {
        this.language = language;
    }

    public void setTimes(Integer times) {
        this.times = times;
    }

    public void setApproach(ApproachConfig approach) {
        this.approach = approach;
    }

    public void setReportErrorType(List<String> reportErrorType) {
        this.reportErrorType = reportErrorType;
    }

    public void setReportLevel(List<String> reportLevel) {
        this.reportLevel = reportLevel;
    }

    public void setShieldingType(String shieldingType) {
        this.shieldingType = shieldingType;
    }

    public void setShieldingStartTime(Integer shieldingStartTime) {
        this.shieldingStartTime = shieldingStartTime;
    }

    public void setShieldingEndTime(Integer shieldingEndTime) {
        this.shieldingEndTime = shieldingEndTime;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof SendAlarms)) {
            return false;
        }
        SendAlarms other = (SendAlarms)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        Boolean this$enable = this.getEnable();
        Boolean other$enable = other.getEnable();
        if (this$enable == null ? other$enable != null : !((Object)this$enable).equals(other$enable)) {
            return false;
        }
        Integer this$times = this.getTimes();
        Integer other$times = other.getTimes();
        if (this$times == null ? other$times != null : !((Object)this$times).equals(other$times)) {
            return false;
        }
        Integer this$shieldingStartTime = this.getShieldingStartTime();
        Integer other$shieldingStartTime = other.getShieldingStartTime();
        if (this$shieldingStartTime == null ? other$shieldingStartTime != null : !((Object)this$shieldingStartTime).equals(other$shieldingStartTime)) {
            return false;
        }
        Integer this$shieldingEndTime = this.getShieldingEndTime();
        Integer other$shieldingEndTime = other.getShieldingEndTime();
        if (this$shieldingEndTime == null ? other$shieldingEndTime != null : !((Object)this$shieldingEndTime).equals(other$shieldingEndTime)) {
            return false;
        }
        String this$language = this.getLanguage();
        String other$language = other.getLanguage();
        if (this$language == null ? other$language != null : !this$language.equals(other$language)) {
            return false;
        }
        ApproachConfig this$approach = this.getApproach();
        ApproachConfig other$approach = other.getApproach();
        if (this$approach == null ? other$approach != null : !this$approach.equals(other$approach)) {
            return false;
        }
        List this$reportErrorType = this.getReportErrorType();
        List other$reportErrorType = other.getReportErrorType();
        if (this$reportErrorType == null ? other$reportErrorType != null : !((Object)this$reportErrorType).equals(other$reportErrorType)) {
            return false;
        }
        List this$reportLevel = this.getReportLevel();
        List other$reportLevel = other.getReportLevel();
        if (this$reportLevel == null ? other$reportLevel != null : !((Object)this$reportLevel).equals(other$reportLevel)) {
            return false;
        }
        String this$shieldingType = this.getShieldingType();
        String other$shieldingType = other.getShieldingType();
        return !(this$shieldingType == null ? other$shieldingType != null : !this$shieldingType.equals(other$shieldingType));
    }

    protected boolean canEqual(Object other) {
        return other instanceof SendAlarms;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        Boolean $enable = this.getEnable();
        result = result * 59 + ($enable == null ? 43 : ((Object)$enable).hashCode());
        Integer $times = this.getTimes();
        result = result * 59 + ($times == null ? 43 : ((Object)$times).hashCode());
        Integer $shieldingStartTime = this.getShieldingStartTime();
        result = result * 59 + ($shieldingStartTime == null ? 43 : ((Object)$shieldingStartTime).hashCode());
        Integer $shieldingEndTime = this.getShieldingEndTime();
        result = result * 59 + ($shieldingEndTime == null ? 43 : ((Object)$shieldingEndTime).hashCode());
        String $language = this.getLanguage();
        result = result * 59 + ($language == null ? 43 : $language.hashCode());
        ApproachConfig $approach = this.getApproach();
        result = result * 59 + ($approach == null ? 43 : $approach.hashCode());
        List $reportErrorType = this.getReportErrorType();
        result = result * 59 + ($reportErrorType == null ? 43 : ((Object)$reportErrorType).hashCode());
        List $reportLevel = this.getReportLevel();
        result = result * 59 + ($reportLevel == null ? 43 : ((Object)$reportLevel).hashCode());
        String $shieldingType = this.getShieldingType();
        result = result * 59 + ($shieldingType == null ? 43 : $shieldingType.hashCode());
        return result;
    }

    public String toString() {
        return "SendAlarms(enable=" + this.getEnable() + ", language=" + this.getLanguage() + ", times=" + this.getTimes() + ", approach=" + this.getApproach() + ", reportErrorType=" + this.getReportErrorType() + ", reportLevel=" + this.getReportLevel() + ", shieldingType=" + this.getShieldingType() + ", shieldingStartTime=" + this.getShieldingStartTime() + ", shieldingEndTime=" + this.getShieldingEndTime() + ")";
    }
}

