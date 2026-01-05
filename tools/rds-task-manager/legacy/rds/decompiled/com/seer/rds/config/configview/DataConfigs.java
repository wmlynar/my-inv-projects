/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.config.configview.DataConfigs
 */
package com.seer.rds.config.configview;

public class DataConfigs {
    private int clearDateMonth = 12;
    private int clearStatRecordInterval = 3;
    private int clearStatsIntervalMonth = 12;
    private int clearAlarmsRecordsMonth = 1;
    private int clearBatteryLevelRecordDay = 7;
    private int clearDataCacheDay = -1;

    public int getClearDateMonth() {
        return this.clearDateMonth;
    }

    public int getClearStatRecordInterval() {
        return this.clearStatRecordInterval;
    }

    public int getClearStatsIntervalMonth() {
        return this.clearStatsIntervalMonth;
    }

    public int getClearAlarmsRecordsMonth() {
        return this.clearAlarmsRecordsMonth;
    }

    public int getClearBatteryLevelRecordDay() {
        return this.clearBatteryLevelRecordDay;
    }

    public int getClearDataCacheDay() {
        return this.clearDataCacheDay;
    }

    public void setClearDateMonth(int clearDateMonth) {
        this.clearDateMonth = clearDateMonth;
    }

    public void setClearStatRecordInterval(int clearStatRecordInterval) {
        this.clearStatRecordInterval = clearStatRecordInterval;
    }

    public void setClearStatsIntervalMonth(int clearStatsIntervalMonth) {
        this.clearStatsIntervalMonth = clearStatsIntervalMonth;
    }

    public void setClearAlarmsRecordsMonth(int clearAlarmsRecordsMonth) {
        this.clearAlarmsRecordsMonth = clearAlarmsRecordsMonth;
    }

    public void setClearBatteryLevelRecordDay(int clearBatteryLevelRecordDay) {
        this.clearBatteryLevelRecordDay = clearBatteryLevelRecordDay;
    }

    public void setClearDataCacheDay(int clearDataCacheDay) {
        this.clearDataCacheDay = clearDataCacheDay;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof DataConfigs)) {
            return false;
        }
        DataConfigs other = (DataConfigs)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        if (this.getClearDateMonth() != other.getClearDateMonth()) {
            return false;
        }
        if (this.getClearStatRecordInterval() != other.getClearStatRecordInterval()) {
            return false;
        }
        if (this.getClearStatsIntervalMonth() != other.getClearStatsIntervalMonth()) {
            return false;
        }
        if (this.getClearAlarmsRecordsMonth() != other.getClearAlarmsRecordsMonth()) {
            return false;
        }
        if (this.getClearBatteryLevelRecordDay() != other.getClearBatteryLevelRecordDay()) {
            return false;
        }
        return this.getClearDataCacheDay() == other.getClearDataCacheDay();
    }

    protected boolean canEqual(Object other) {
        return other instanceof DataConfigs;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        result = result * 59 + this.getClearDateMonth();
        result = result * 59 + this.getClearStatRecordInterval();
        result = result * 59 + this.getClearStatsIntervalMonth();
        result = result * 59 + this.getClearAlarmsRecordsMonth();
        result = result * 59 + this.getClearBatteryLevelRecordDay();
        result = result * 59 + this.getClearDataCacheDay();
        return result;
    }

    public String toString() {
        return "DataConfigs(clearDateMonth=" + this.getClearDateMonth() + ", clearStatRecordInterval=" + this.getClearStatRecordInterval() + ", clearStatsIntervalMonth=" + this.getClearStatsIntervalMonth() + ", clearAlarmsRecordsMonth=" + this.getClearAlarmsRecordsMonth() + ", clearBatteryLevelRecordDay=" + this.getClearBatteryLevelRecordDay() + ", clearDataCacheDay=" + this.getClearDataCacheDay() + ")";
    }
}

