/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.config.configview.ModbusConfig
 *  com.seer.rds.config.configview.WindTaskConfig
 */
package com.seer.rds.config.configview;

import com.seer.rds.config.configview.ModbusConfig;

public class WindTaskConfig {
    private ModbusConfig modbusConfig = new ModbusConfig();

    public ModbusConfig getModbusConfig() {
        return this.modbusConfig;
    }

    public void setModbusConfig(ModbusConfig modbusConfig) {
        this.modbusConfig = modbusConfig;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof WindTaskConfig)) {
            return false;
        }
        WindTaskConfig other = (WindTaskConfig)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        ModbusConfig this$modbusConfig = this.getModbusConfig();
        ModbusConfig other$modbusConfig = other.getModbusConfig();
        return !(this$modbusConfig == null ? other$modbusConfig != null : !this$modbusConfig.equals(other$modbusConfig));
    }

    protected boolean canEqual(Object other) {
        return other instanceof WindTaskConfig;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        ModbusConfig $modbusConfig = this.getModbusConfig();
        result = result * 59 + ($modbusConfig == null ? 43 : $modbusConfig.hashCode());
        return result;
    }

    public String toString() {
        return "WindTaskConfig(modbusConfig=" + this.getModbusConfig() + ")";
    }
}

