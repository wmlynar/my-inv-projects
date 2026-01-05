/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.vo.response.ModbusWriteResponseVo
 *  com.seer.rds.vo.response.ModbusWriteResponseVo$ModbusWriteResponseVoBuilder
 *  io.swagger.annotations.ApiModel
 */
package com.seer.rds.vo.response;

import com.seer.rds.vo.response.ModbusWriteResponseVo;
import io.swagger.annotations.ApiModel;
import java.io.Serializable;

@ApiModel(value="modbus \u5199\u8bb0\u5f55\u8fd4\u56de\u5bf9\u8c61")
public class ModbusWriteResponseVo
implements Serializable {
    private Long id;
    private String createTime;
    private String mHost;
    private Integer mPort;
    private String functionCode;
    private Integer slaveId;
    private Integer mOffset;
    private Integer writeLength;
    private String writeValues;
    private String remark;

    public static ModbusWriteResponseVoBuilder builder() {
        return new ModbusWriteResponseVoBuilder();
    }

    public Long getId() {
        return this.id;
    }

    public String getCreateTime() {
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

    public Integer getWriteLength() {
        return this.writeLength;
    }

    public String getWriteValues() {
        return this.writeValues;
    }

    public String getRemark() {
        return this.remark;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public void setCreateTime(String createTime) {
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

    public void setWriteLength(Integer writeLength) {
        this.writeLength = writeLength;
    }

    public void setWriteValues(String writeValues) {
        this.writeValues = writeValues;
    }

    public void setRemark(String remark) {
        this.remark = remark;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof ModbusWriteResponseVo)) {
            return false;
        }
        ModbusWriteResponseVo other = (ModbusWriteResponseVo)o;
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
        Integer this$writeLength = this.getWriteLength();
        Integer other$writeLength = other.getWriteLength();
        if (this$writeLength == null ? other$writeLength != null : !((Object)this$writeLength).equals(other$writeLength)) {
            return false;
        }
        String this$createTime = this.getCreateTime();
        String other$createTime = other.getCreateTime();
        if (this$createTime == null ? other$createTime != null : !this$createTime.equals(other$createTime)) {
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
        String this$writeValues = this.getWriteValues();
        String other$writeValues = other.getWriteValues();
        if (this$writeValues == null ? other$writeValues != null : !this$writeValues.equals(other$writeValues)) {
            return false;
        }
        String this$remark = this.getRemark();
        String other$remark = other.getRemark();
        return !(this$remark == null ? other$remark != null : !this$remark.equals(other$remark));
    }

    protected boolean canEqual(Object other) {
        return other instanceof ModbusWriteResponseVo;
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
        Integer $writeLength = this.getWriteLength();
        result = result * 59 + ($writeLength == null ? 43 : ((Object)$writeLength).hashCode());
        String $createTime = this.getCreateTime();
        result = result * 59 + ($createTime == null ? 43 : $createTime.hashCode());
        String $mHost = this.getMHost();
        result = result * 59 + ($mHost == null ? 43 : $mHost.hashCode());
        String $functionCode = this.getFunctionCode();
        result = result * 59 + ($functionCode == null ? 43 : $functionCode.hashCode());
        String $writeValues = this.getWriteValues();
        result = result * 59 + ($writeValues == null ? 43 : $writeValues.hashCode());
        String $remark = this.getRemark();
        result = result * 59 + ($remark == null ? 43 : $remark.hashCode());
        return result;
    }

    public String toString() {
        return "ModbusWriteResponseVo(id=" + this.getId() + ", createTime=" + this.getCreateTime() + ", mHost=" + this.getMHost() + ", mPort=" + this.getMPort() + ", functionCode=" + this.getFunctionCode() + ", slaveId=" + this.getSlaveId() + ", mOffset=" + this.getMOffset() + ", writeLength=" + this.getWriteLength() + ", writeValues=" + this.getWriteValues() + ", remark=" + this.getRemark() + ")";
    }

    public ModbusWriteResponseVo(Long id, String createTime, String mHost, Integer mPort, String functionCode, Integer slaveId, Integer mOffset, Integer writeLength, String writeValues, String remark) {
        this.id = id;
        this.createTime = createTime;
        this.mHost = mHost;
        this.mPort = mPort;
        this.functionCode = functionCode;
        this.slaveId = slaveId;
        this.mOffset = mOffset;
        this.writeLength = writeLength;
        this.writeValues = writeValues;
        this.remark = remark;
    }

    public ModbusWriteResponseVo() {
    }
}

