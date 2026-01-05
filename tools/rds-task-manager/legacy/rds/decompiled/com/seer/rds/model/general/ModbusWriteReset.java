/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.model.general.ModbusWriteReset
 *  com.seer.rds.model.general.ModbusWriteReset$ModbusWriteResetBuilder
 *  javax.persistence.Entity
 *  javax.persistence.GeneratedValue
 *  javax.persistence.Id
 *  javax.persistence.Table
 *  org.hibernate.annotations.GenericGenerator
 */
package com.seer.rds.model.general;

import com.seer.rds.model.general.ModbusWriteReset;
import javax.persistence.Entity;
import javax.persistence.GeneratedValue;
import javax.persistence.Id;
import javax.persistence.Table;
import org.hibernate.annotations.GenericGenerator;

@Entity
@Table(name="t_modbuswriterest")
public class ModbusWriteReset {
    @Id
    @GenericGenerator(name="idGenerator", strategy="uuid")
    @GeneratedValue(generator="idGenerator")
    private String id;
    private String ip;
    private Integer port;
    private String addrType;
    private Integer slaveId;
    private Integer addrNo;
    private String taskRecordId;
    private Integer writeValue;

    public static ModbusWriteResetBuilder builder() {
        return new ModbusWriteResetBuilder();
    }

    public String getId() {
        return this.id;
    }

    public String getIp() {
        return this.ip;
    }

    public Integer getPort() {
        return this.port;
    }

    public String getAddrType() {
        return this.addrType;
    }

    public Integer getSlaveId() {
        return this.slaveId;
    }

    public Integer getAddrNo() {
        return this.addrNo;
    }

    public String getTaskRecordId() {
        return this.taskRecordId;
    }

    public Integer getWriteValue() {
        return this.writeValue;
    }

    public void setId(String id) {
        this.id = id;
    }

    public void setIp(String ip) {
        this.ip = ip;
    }

    public void setPort(Integer port) {
        this.port = port;
    }

    public void setAddrType(String addrType) {
        this.addrType = addrType;
    }

    public void setSlaveId(Integer slaveId) {
        this.slaveId = slaveId;
    }

    public void setAddrNo(Integer addrNo) {
        this.addrNo = addrNo;
    }

    public void setTaskRecordId(String taskRecordId) {
        this.taskRecordId = taskRecordId;
    }

    public void setWriteValue(Integer writeValue) {
        this.writeValue = writeValue;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof ModbusWriteReset)) {
            return false;
        }
        ModbusWriteReset other = (ModbusWriteReset)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        Integer this$port = this.getPort();
        Integer other$port = other.getPort();
        if (this$port == null ? other$port != null : !((Object)this$port).equals(other$port)) {
            return false;
        }
        Integer this$slaveId = this.getSlaveId();
        Integer other$slaveId = other.getSlaveId();
        if (this$slaveId == null ? other$slaveId != null : !((Object)this$slaveId).equals(other$slaveId)) {
            return false;
        }
        Integer this$addrNo = this.getAddrNo();
        Integer other$addrNo = other.getAddrNo();
        if (this$addrNo == null ? other$addrNo != null : !((Object)this$addrNo).equals(other$addrNo)) {
            return false;
        }
        Integer this$writeValue = this.getWriteValue();
        Integer other$writeValue = other.getWriteValue();
        if (this$writeValue == null ? other$writeValue != null : !((Object)this$writeValue).equals(other$writeValue)) {
            return false;
        }
        String this$id = this.getId();
        String other$id = other.getId();
        if (this$id == null ? other$id != null : !this$id.equals(other$id)) {
            return false;
        }
        String this$ip = this.getIp();
        String other$ip = other.getIp();
        if (this$ip == null ? other$ip != null : !this$ip.equals(other$ip)) {
            return false;
        }
        String this$addrType = this.getAddrType();
        String other$addrType = other.getAddrType();
        if (this$addrType == null ? other$addrType != null : !this$addrType.equals(other$addrType)) {
            return false;
        }
        String this$taskRecordId = this.getTaskRecordId();
        String other$taskRecordId = other.getTaskRecordId();
        return !(this$taskRecordId == null ? other$taskRecordId != null : !this$taskRecordId.equals(other$taskRecordId));
    }

    protected boolean canEqual(Object other) {
        return other instanceof ModbusWriteReset;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        Integer $port = this.getPort();
        result = result * 59 + ($port == null ? 43 : ((Object)$port).hashCode());
        Integer $slaveId = this.getSlaveId();
        result = result * 59 + ($slaveId == null ? 43 : ((Object)$slaveId).hashCode());
        Integer $addrNo = this.getAddrNo();
        result = result * 59 + ($addrNo == null ? 43 : ((Object)$addrNo).hashCode());
        Integer $writeValue = this.getWriteValue();
        result = result * 59 + ($writeValue == null ? 43 : ((Object)$writeValue).hashCode());
        String $id = this.getId();
        result = result * 59 + ($id == null ? 43 : $id.hashCode());
        String $ip = this.getIp();
        result = result * 59 + ($ip == null ? 43 : $ip.hashCode());
        String $addrType = this.getAddrType();
        result = result * 59 + ($addrType == null ? 43 : $addrType.hashCode());
        String $taskRecordId = this.getTaskRecordId();
        result = result * 59 + ($taskRecordId == null ? 43 : $taskRecordId.hashCode());
        return result;
    }

    public String toString() {
        return "ModbusWriteReset(id=" + this.getId() + ", ip=" + this.getIp() + ", port=" + this.getPort() + ", addrType=" + this.getAddrType() + ", slaveId=" + this.getSlaveId() + ", addrNo=" + this.getAddrNo() + ", taskRecordId=" + this.getTaskRecordId() + ", writeValue=" + this.getWriteValue() + ")";
    }

    public ModbusWriteReset() {
    }

    public ModbusWriteReset(String id, String ip, Integer port, String addrType, Integer slaveId, Integer addrNo, String taskRecordId, Integer writeValue) {
        this.id = id;
        this.ip = ip;
        this.port = port;
        this.addrType = addrType;
        this.slaveId = slaveId;
        this.addrNo = addrNo;
        this.taskRecordId = taskRecordId;
        this.writeValue = writeValue;
    }
}

