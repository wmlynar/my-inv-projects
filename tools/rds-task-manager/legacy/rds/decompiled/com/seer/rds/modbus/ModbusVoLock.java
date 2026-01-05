/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.modbus.ModbusVoLock
 */
package com.seer.rds.modbus;

public class ModbusVoLock {
    private String host;
    private Integer port;

    public String getHost() {
        return this.host;
    }

    public Integer getPort() {
        return this.port;
    }

    public void setHost(String host) {
        this.host = host;
    }

    public void setPort(Integer port) {
        this.port = port;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof ModbusVoLock)) {
            return false;
        }
        ModbusVoLock other = (ModbusVoLock)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        Integer this$port = this.getPort();
        Integer other$port = other.getPort();
        if (this$port == null ? other$port != null : !((Object)this$port).equals(other$port)) {
            return false;
        }
        String this$host = this.getHost();
        String other$host = other.getHost();
        return !(this$host == null ? other$host != null : !this$host.equals(other$host));
    }

    protected boolean canEqual(Object other) {
        return other instanceof ModbusVoLock;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        Integer $port = this.getPort();
        result = result * 59 + ($port == null ? 43 : ((Object)$port).hashCode());
        String $host = this.getHost();
        result = result * 59 + ($host == null ? 43 : $host.hashCode());
        return result;
    }

    public String toString() {
        return "ModbusVoLock(host=" + this.getHost() + ", port=" + this.getPort() + ")";
    }
}

