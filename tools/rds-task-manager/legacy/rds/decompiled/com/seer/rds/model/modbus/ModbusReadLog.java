/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.model.modbus.ModbusReadLog
 *  com.seer.rds.model.modbus.ModbusReadLog$ModbusReadLogBuilder
 *  javax.persistence.Entity
 *  javax.persistence.GeneratedValue
 *  javax.persistence.GenerationType
 *  javax.persistence.Id
 *  javax.persistence.Table
 *  javax.persistence.Temporal
 *  javax.persistence.TemporalType
 *  org.hibernate.annotations.CreationTimestamp
 */
package com.seer.rds.model.modbus;

import com.seer.rds.model.modbus.ModbusReadLog;
import java.util.Date;
import javax.persistence.Entity;
import javax.persistence.GeneratedValue;
import javax.persistence.GenerationType;
import javax.persistence.Id;
import javax.persistence.Table;
import javax.persistence.Temporal;
import javax.persistence.TemporalType;
import org.hibernate.annotations.CreationTimestamp;

@Entity
@Table(name="t_modbus_read_log")
public class ModbusReadLog {
    @Id
    @GeneratedValue(strategy=GenerationType.AUTO)
    private Long id;
    @Temporal(value=TemporalType.TIMESTAMP)
    @CreationTimestamp
    private Date createTime;
    private String mHost;
    private Integer mPort;
    private String functionCode;
    private Integer slaveId;
    private Integer mOffset;
    private Integer readLength;
    private String oldValues;
    private String newValues;
    private String remark;

    public static ModbusReadLogBuilder builder() {
        return new ModbusReadLogBuilder();
    }

    public Long getId() {
        return this.id;
    }

    public Date getCreateTime() {
        return this.createTime;
    }

    public String getMHost() {
        return this.mHost;
    }

    public Integer getMPort() {
        return this.mPort;
    }

    public String getFunctionCode() {
        return this.functionCode;
    }

    public Integer getSlaveId() {
        return this.slaveId;
    }

    public Integer getMOffset() {
        return this.mOffset;
    }

    public Integer getReadLength() {
        return this.readLength;
    }

    public String getOldValues() {
        return this.oldValues;
    }

    public String getNewValues() {
        return this.newValues;
    }

    public String getRemark() {
        return this.remark;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public void setCreateTime(Date createTime) {
        this.createTime = createTime;
    }

    public void setMHost(String mHost) {
        this.mHost = mHost;
    }

    public void setMPort(Integer mPort) {
        this.mPort = mPort;
    }

    public void setFunctionCode(String functionCode) {
        this.functionCode = functionCode;
    }

    public void setSlaveId(Integer slaveId) {
        this.slaveId = slaveId;
    }

    public void setMOffset(Integer mOffset) {
        this.mOffset = mOffset;
    }

    public void setReadLength(Integer readLength) {
        this.readLength = readLength;
    }

    public void setOldValues(String oldValues) {
        this.oldValues = oldValues;
    }

    public void setNewValues(String newValues) {
        this.newValues = newValues;
    }

    public void setRemark(String remark) {
        this.remark = remark;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof ModbusReadLog)) {
            return false;
        }
        ModbusReadLog other = (ModbusReadLog)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        Long this$id = this.getId();
        Long other$id = other.getId();
        if (this$id == null ? other$id != null : !((Object)this$id).equals(other$id)) {
            return false;
        }
        Integer this$mPort = this.getMPort();
        Integer other$mPort = other.getMPort();
        if (this$mPort == null ? other$mPort != null : !((Object)this$mPort).equals(other$mPort)) {
            return false;
        }
        Integer this$slaveId = this.getSlaveId();
        Integer other$slaveId = other.getSlaveId();
        if (this$slaveId == null ? other$slaveId != null : !((Object)this$slaveId).equals(other$slaveId)) {
            return false;
        }
        Integer this$mOffset = this.getMOffset();
        Integer other$mOffset = other.getMOffset();
        if (this$mOffset == null ? other$mOffset != null : !((Object)this$mOffset).equals(other$mOffset)) {
            return false;
        }
        Integer this$readLength = this.getReadLength();
        Integer other$readLength = other.getReadLength();
        if (this$readLength == null ? other$readLength != null : !((Object)this$readLength).equals(other$readLength)) {
            return false;
        }
        Date this$createTime = this.getCreateTime();
        Date other$createTime = other.getCreateTime();
        if (this$createTime == null ? other$createTime != null : !((Object)this$createTime).equals(other$createTime)) {
            return false;
        }
        String this$mHost = this.getMHost();
        String other$mHost = other.getMHost();
        if (this$mHost == null ? other$mHost != null : !this$mHost.equals(other$mHost)) {
            return false;
        }
        String this$functionCode = this.getFunctionCode();
        String other$functionCode = other.getFunctionCode();
        if (this$functionCode == null ? other$functionCode != null : !this$functionCode.equals(other$functionCode)) {
            return false;
        }
        String this$oldValues = this.getOldValues();
        String other$oldValues = other.getOldValues();
        if (this$oldValues == null ? other$oldValues != null : !this$oldValues.equals(other$oldValues)) {
            return false;
        }
        String this$newValues = this.getNewValues();
        String other$newValues = other.getNewValues();
        if (this$newValues == null ? other$newValues != null : !this$newValues.equals(other$newValues)) {
            return false;
        }
        String this$remark = this.getRemark();
        String other$remark = other.getRemark();
        return !(this$remark == null ? other$remark != null : !this$remark.equals(other$remark));
    }

    protected boolean canEqual(Object other) {
        return other instanceof ModbusReadLog;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        Long $id = this.getId();
        result = result * 59 + ($id == null ? 43 : ((Object)$id).hashCode());
        Integer $mPort = this.getMPort();
        result = result * 59 + ($mPort == null ? 43 : ((Object)$mPort).hashCode());
        Integer $slaveId = this.getSlaveId();
        result = result * 59 + ($slaveId == null ? 43 : ((Object)$slaveId).hashCode());
        Integer $mOffset = this.getMOffset();
        result = result * 59 + ($mOffset == null ? 43 : ((Object)$mOffset).hashCode());
        Integer $readLength = this.getReadLength();
        result = result * 59 + ($readLength == null ? 43 : ((Object)$readLength).hashCode());
        Date $createTime = this.getCreateTime();
        result = result * 59 + ($createTime == null ? 43 : ((Object)$createTime).hashCode());
        String $mHost = this.getMHost();
        result = result * 59 + ($mHost == null ? 43 : $mHost.hashCode());
        String $functionCode = this.getFunctionCode();
        result = result * 59 + ($functionCode == null ? 43 : $functionCode.hashCode());
        String $oldValues = this.getOldValues();
        result = result * 59 + ($oldValues == null ? 43 : $oldValues.hashCode());
        String $newValues = this.getNewValues();
        result = result * 59 + ($newValues == null ? 43 : $newValues.hashCode());
        String $remark = this.getRemark();
        result = result * 59 + ($remark == null ? 43 : $remark.hashCode());
        return result;
    }

    public String toString() {
        return "ModbusReadLog(id=" + this.getId() + ", createTime=" + this.getCreateTime() + ", mHost=" + this.getMHost() + ", mPort=" + this.getMPort() + ", functionCode=" + this.getFunctionCode() + ", slaveId=" + this.getSlaveId() + ", mOffset=" + this.getMOffset() + ", readLength=" + this.getReadLength() + ", oldValues=" + this.getOldValues() + ", newValues=" + this.getNewValues() + ", remark=" + this.getRemark() + ")";
    }

    public ModbusReadLog() {
    }

    public ModbusReadLog(Long id, Date createTime, String mHost, Integer mPort, String functionCode, Integer slaveId, Integer mOffset, Integer readLength, String oldValues, String newValues, String remark) {
        this.id = id;
        this.createTime = createTime;
        this.mHost = mHost;
        this.mPort = mPort;
        this.functionCode = functionCode;
        this.slaveId = slaveId;
        this.mOffset = mOffset;
        this.readLength = readLength;
        this.oldValues = oldValues;
        this.newValues = newValues;
        this.remark = remark;
    }
}

