/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.config.configview.operator.RequestTimeOutConfig
 */
package com.seer.rds.config.configview.operator;

public class RequestTimeOutConfig {
    private int modbusTimeOut = 3000;
    private int httpConnectTimeout = 5000;
    private int httpReadTimeout = 5000;
    private int httpWriteTimeout = 5000;

    public int getModbusTimeOut() {
        return this.modbusTimeOut;
    }

    public int getHttpConnectTimeout() {
        return this.httpConnectTimeout;
    }

    public int getHttpReadTimeout() {
        return this.httpReadTimeout;
    }

    public int getHttpWriteTimeout() {
        return this.httpWriteTimeout;
    }

    public void setModbusTimeOut(int modbusTimeOut) {
        this.modbusTimeOut = modbusTimeOut;
    }

    public void setHttpConnectTimeout(int httpConnectTimeout) {
        this.httpConnectTimeout = httpConnectTimeout;
    }

    public void setHttpReadTimeout(int httpReadTimeout) {
        this.httpReadTimeout = httpReadTimeout;
    }

    public void setHttpWriteTimeout(int httpWriteTimeout) {
        this.httpWriteTimeout = httpWriteTimeout;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof RequestTimeOutConfig)) {
            return false;
        }
        RequestTimeOutConfig other = (RequestTimeOutConfig)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        if (this.getModbusTimeOut() != other.getModbusTimeOut()) {
            return false;
        }
        if (this.getHttpConnectTimeout() != other.getHttpConnectTimeout()) {
            return false;
        }
        if (this.getHttpReadTimeout() != other.getHttpReadTimeout()) {
            return false;
        }
        return this.getHttpWriteTimeout() == other.getHttpWriteTimeout();
    }

    protected boolean canEqual(Object other) {
        return other instanceof RequestTimeOutConfig;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        result = result * 59 + this.getModbusTimeOut();
        result = result * 59 + this.getHttpConnectTimeout();
        result = result * 59 + this.getHttpReadTimeout();
        result = result * 59 + this.getHttpWriteTimeout();
        return result;
    }

    public String toString() {
        return "RequestTimeOutConfig(modbusTimeOut=" + this.getModbusTimeOut() + ", httpConnectTimeout=" + this.getHttpConnectTimeout() + ", httpReadTimeout=" + this.getHttpReadTimeout() + ", httpWriteTimeout=" + this.getHttpWriteTimeout() + ")";
    }
}

