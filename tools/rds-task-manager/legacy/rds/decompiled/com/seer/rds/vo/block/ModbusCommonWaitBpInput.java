/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.vo.block.ModbusCommonWaitBpInput
 */
package com.seer.rds.vo.block;

public class ModbusCommonWaitBpInput {
    public String addrType;
    public Integer ipRegisterData;
    public String ipModbusHost;
    public Integer ipModbusPort;
    public Integer ipSlaveId;
    public Integer ipAddress;

    public String getAddrType() {
        return this.addrType;
    }

    public Integer getIpRegisterData() {
        return this.ipRegisterData;
    }

    public String getIpModbusHost() {
        return this.ipModbusHost;
    }

    public Integer getIpModbusPort() {
        return this.ipModbusPort;
    }

    public Integer getIpSlaveId() {
        return this.ipSlaveId;
    }

    public Integer getIpAddress() {
        return this.ipAddress;
    }

    public void setAddrType(String addrType) {
        this.addrType = addrType;
    }

    public void setIpRegisterData(Integer ipRegisterData) {
        this.ipRegisterData = ipRegisterData;
    }

    public void setIpModbusHost(String ipModbusHost) {
        this.ipModbusHost = ipModbusHost;
    }

    public void setIpModbusPort(Integer ipModbusPort) {
        this.ipModbusPort = ipModbusPort;
    }

    public void setIpSlaveId(Integer ipSlaveId) {
        this.ipSlaveId = ipSlaveId;
    }

    public void setIpAddress(Integer ipAddress) {
        this.ipAddress = ipAddress;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof ModbusCommonWaitBpInput)) {
            return false;
        }
        ModbusCommonWaitBpInput other = (ModbusCommonWaitBpInput)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        Integer this$ipRegisterData = this.getIpRegisterData();
        Integer other$ipRegisterData = other.getIpRegisterData();
        if (this$ipRegisterData == null ? other$ipRegisterData != null : !((Object)this$ipRegisterData).equals(other$ipRegisterData)) {
            return false;
        }
        Integer this$ipModbusPort = this.getIpModbusPort();
        Integer other$ipModbusPort = other.getIpModbusPort();
        if (this$ipModbusPort == null ? other$ipModbusPort != null : !((Object)this$ipModbusPort).equals(other$ipModbusPort)) {
            return false;
        }
        Integer this$ipSlaveId = this.getIpSlaveId();
        Integer other$ipSlaveId = other.getIpSlaveId();
        if (this$ipSlaveId == null ? other$ipSlaveId != null : !((Object)this$ipSlaveId).equals(other$ipSlaveId)) {
            return false;
        }
        Integer this$ipAddress = this.getIpAddress();
        Integer other$ipAddress = other.getIpAddress();
        if (this$ipAddress == null ? other$ipAddress != null : !((Object)this$ipAddress).equals(other$ipAddress)) {
            return false;
        }
        String this$addrType = this.getAddrType();
        String other$addrType = other.getAddrType();
        if (this$addrType == null ? other$addrType != null : !this$addrType.equals(other$addrType)) {
            return false;
        }
        String this$ipModbusHost = this.getIpModbusHost();
        String other$ipModbusHost = other.getIpModbusHost();
        return !(this$ipModbusHost == null ? other$ipModbusHost != null : !this$ipModbusHost.equals(other$ipModbusHost));
    }

    protected boolean canEqual(Object other) {
        return other instanceof ModbusCommonWaitBpInput;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        Integer $ipRegisterData = this.getIpRegisterData();
        result = result * 59 + ($ipRegisterData == null ? 43 : ((Object)$ipRegisterData).hashCode());
        Integer $ipModbusPort = this.getIpModbusPort();
        result = result * 59 + ($ipModbusPort == null ? 43 : ((Object)$ipModbusPort).hashCode());
        Integer $ipSlaveId = this.getIpSlaveId();
        result = result * 59 + ($ipSlaveId == null ? 43 : ((Object)$ipSlaveId).hashCode());
        Integer $ipAddress = this.getIpAddress();
        result = result * 59 + ($ipAddress == null ? 43 : ((Object)$ipAddress).hashCode());
        String $addrType = this.getAddrType();
        result = result * 59 + ($addrType == null ? 43 : $addrType.hashCode());
        String $ipModbusHost = this.getIpModbusHost();
        result = result * 59 + ($ipModbusHost == null ? 43 : $ipModbusHost.hashCode());
        return result;
    }

    public String toString() {
        return "ModbusCommonWaitBpInput(addrType=" + this.getAddrType() + ", ipRegisterData=" + this.getIpRegisterData() + ", ipModbusHost=" + this.getIpModbusHost() + ", ipModbusPort=" + this.getIpModbusPort() + ", ipSlaveId=" + this.getIpSlaveId() + ", ipAddress=" + this.getIpAddress() + ")";
    }
}

