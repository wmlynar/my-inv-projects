/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.config.configview.ModbusLogConfig
 */
package com.seer.rds.config.configview;

public class ModbusLogConfig {
    private Boolean saveLog = false;

    public Boolean getSaveLog() {
        return this.saveLog;
    }

    public void setSaveLog(Boolean saveLog) {
        this.saveLog = saveLog;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof ModbusLogConfig)) {
            return false;
        }
        ModbusLogConfig other = (ModbusLogConfig)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        Boolean this$saveLog = this.getSaveLog();
        Boolean other$saveLog = other.getSaveLog();
        return !(this$saveLog == null ? other$saveLog != null : !((Object)this$saveLog).equals(other$saveLog));
    }

    protected boolean canEqual(Object other) {
        return other instanceof ModbusLogConfig;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        Boolean $saveLog = this.getSaveLog();
        result = result * 59 + ($saveLog == null ? 43 : ((Object)$saveLog).hashCode());
        return result;
    }

    public String toString() {
        return "ModbusLogConfig(saveLog=" + this.getSaveLog() + ")";
    }
}

