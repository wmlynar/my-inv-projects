/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.config.configview.ModbusConfig
 */
package com.seer.rds.config.configview;

public class ModbusConfig {
    private Integer retryDelay = 2000;

    public Integer getRetryDelay() {
        return this.retryDelay;
    }

    public void setRetryDelay(Integer retryDelay) {
        this.retryDelay = retryDelay;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof ModbusConfig)) {
            return false;
        }
        ModbusConfig other = (ModbusConfig)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        Integer this$retryDelay = this.getRetryDelay();
        Integer other$retryDelay = other.getRetryDelay();
        return !(this$retryDelay == null ? other$retryDelay != null : !((Object)this$retryDelay).equals(other$retryDelay));
    }

    protected boolean canEqual(Object other) {
        return other instanceof ModbusConfig;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        Integer $retryDelay = this.getRetryDelay();
        result = result * 59 + ($retryDelay == null ? 43 : ((Object)$retryDelay).hashCode());
        return result;
    }

    public String toString() {
        return "ModbusConfig(retryDelay=" + this.getRetryDelay() + ")";
    }
}

