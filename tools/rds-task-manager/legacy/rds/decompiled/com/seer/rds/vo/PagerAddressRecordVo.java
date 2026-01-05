/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  cn.afterturn.easypoi.excel.annotation.Excel
 *  com.seer.rds.vo.PagerAddressRecordVo
 *  com.seer.rds.vo.PagerAddressRecordVo$PagerAddressRecordVoBuilder
 */
package com.seer.rds.vo;

import cn.afterturn.easypoi.excel.annotation.Excel;
import com.seer.rds.vo.PagerAddressRecordVo;

public class PagerAddressRecordVo {
    @Excel(name="protocolType", orderNum="1")
    private String protocolType = "Modbus TCP";
    @Excel(name="brandName", orderNum="2")
    private String brandName;
    @Excel(name="pagerId", orderNum="3")
    private Long pagerId;
    @Excel(name="deviceName", orderNum="4")
    private String deviceName;
    @Excel(name="ip", orderNum="5")
    private String ip;
    @Excel(name="port", orderNum="6")
    private Integer port;
    @Excel(name="slaveId", orderNum="7")
    private Integer slaveId;
    @Excel(name="functionCode", orderNum="8")
    private String functionCode = "4x";
    @Excel(name="id", orderNum="9")
    private Long id;
    @Excel(name="address", orderNum="10")
    private Integer address;
    private Integer value;
    @Excel(name="remark", orderNum="11")
    private String remark;
    @Excel(name="lightAddress", orderNum="12")
    private Integer lightAddress;
    private Integer lightValue;
    @Excel(name="lightRemark", orderNum="13")
    private String lightRemark;
    @Excel(name="orderTask", orderNum="14")
    private String orderTask;
    @Excel(name="cancelTask", orderNum="15")
    private String cancelTask;

    public PagerAddressRecordVo(String ip, Integer port, Integer slaveId, String functionCode, Integer address, String remark, Integer lightAddress) {
        this.ip = ip;
        this.port = port;
        this.slaveId = slaveId;
        this.functionCode = functionCode;
        this.address = address;
        this.remark = remark;
        this.lightAddress = lightAddress;
    }

    public static PagerAddressRecordVoBuilder builder() {
        return new PagerAddressRecordVoBuilder();
    }

    public String getProtocolType() {
        return this.protocolType;
    }

    public String getBrandName() {
        return this.brandName;
    }

    public Long getPagerId() {
        return this.pagerId;
    }

    public String getDeviceName() {
        return this.deviceName;
    }

    public String getIp() {
        return this.ip;
    }

    public Integer getPort() {
        return this.port;
    }

    public Integer getSlaveId() {
        return this.slaveId;
    }

    public String getFunctionCode() {
        return this.functionCode;
    }

    public Long getId() {
        return this.id;
    }

    public Integer getAddress() {
        return this.address;
    }

    public Integer getValue() {
        return this.value;
    }

    public String getRemark() {
        return this.remark;
    }

    public Integer getLightAddress() {
        return this.lightAddress;
    }

    public Integer getLightValue() {
        return this.lightValue;
    }

    public String getLightRemark() {
        return this.lightRemark;
    }

    public String getOrderTask() {
        return this.orderTask;
    }

    public String getCancelTask() {
        return this.cancelTask;
    }

    public void setProtocolType(String protocolType) {
        this.protocolType = protocolType;
    }

    public void setBrandName(String brandName) {
        this.brandName = brandName;
    }

    public void setPagerId(Long pagerId) {
        this.pagerId = pagerId;
    }

    public void setDeviceName(String deviceName) {
        this.deviceName = deviceName;
    }

    public void setIp(String ip) {
        this.ip = ip;
    }

    public void setPort(Integer port) {
        this.port = port;
    }

    public void setSlaveId(Integer slaveId) {
        this.slaveId = slaveId;
    }

    public void setFunctionCode(String functionCode) {
        this.functionCode = functionCode;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public void setAddress(Integer address) {
        this.address = address;
    }

    public void setValue(Integer value) {
        this.value = value;
    }

    public void setRemark(String remark) {
        this.remark = remark;
    }

    public void setLightAddress(Integer lightAddress) {
        this.lightAddress = lightAddress;
    }

    public void setLightValue(Integer lightValue) {
        this.lightValue = lightValue;
    }

    public void setLightRemark(String lightRemark) {
        this.lightRemark = lightRemark;
    }

    public void setOrderTask(String orderTask) {
        this.orderTask = orderTask;
    }

    public void setCancelTask(String cancelTask) {
        this.cancelTask = cancelTask;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof PagerAddressRecordVo)) {
            return false;
        }
        PagerAddressRecordVo other = (PagerAddressRecordVo)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        Long this$pagerId = this.getPagerId();
        Long other$pagerId = other.getPagerId();
        if (this$pagerId == null ? other$pagerId != null : !((Object)this$pagerId).equals(other$pagerId)) {
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
        Long this$id = this.getId();
        Long other$id = other.getId();
        if (this$id == null ? other$id != null : !((Object)this$id).equals(other$id)) {
            return false;
        }
        Integer this$address = this.getAddress();
        Integer other$address = other.getAddress();
        if (this$address == null ? other$address != null : !((Object)this$address).equals(other$address)) {
            return false;
        }
        Integer this$value = this.getValue();
        Integer other$value = other.getValue();
        if (this$value == null ? other$value != null : !((Object)this$value).equals(other$value)) {
            return false;
        }
        Integer this$lightAddress = this.getLightAddress();
        Integer other$lightAddress = other.getLightAddress();
        if (this$lightAddress == null ? other$lightAddress != null : !((Object)this$lightAddress).equals(other$lightAddress)) {
            return false;
        }
        Integer this$lightValue = this.getLightValue();
        Integer other$lightValue = other.getLightValue();
        if (this$lightValue == null ? other$lightValue != null : !((Object)this$lightValue).equals(other$lightValue)) {
            return false;
        }
        String this$protocolType = this.getProtocolType();
        String other$protocolType = other.getProtocolType();
        if (this$protocolType == null ? other$protocolType != null : !this$protocolType.equals(other$protocolType)) {
            return false;
        }
        String this$brandName = this.getBrandName();
        String other$brandName = other.getBrandName();
        if (this$brandName == null ? other$brandName != null : !this$brandName.equals(other$brandName)) {
            return false;
        }
        String this$deviceName = this.getDeviceName();
        String other$deviceName = other.getDeviceName();
        if (this$deviceName == null ? other$deviceName != null : !this$deviceName.equals(other$deviceName)) {
            return false;
        }
        String this$ip = this.getIp();
        String other$ip = other.getIp();
        if (this$ip == null ? other$ip != null : !this$ip.equals(other$ip)) {
            return false;
        }
        String this$functionCode = this.getFunctionCode();
        String other$functionCode = other.getFunctionCode();
        if (this$functionCode == null ? other$functionCode != null : !this$functionCode.equals(other$functionCode)) {
            return false;
        }
        String this$remark = this.getRemark();
        String other$remark = other.getRemark();
        if (this$remark == null ? other$remark != null : !this$remark.equals(other$remark)) {
            return false;
        }
        String this$lightRemark = this.getLightRemark();
        String other$lightRemark = other.getLightRemark();
        if (this$lightRemark == null ? other$lightRemark != null : !this$lightRemark.equals(other$lightRemark)) {
            return false;
        }
        String this$orderTask = this.getOrderTask();
        String other$orderTask = other.getOrderTask();
        if (this$orderTask == null ? other$orderTask != null : !this$orderTask.equals(other$orderTask)) {
            return false;
        }
        String this$cancelTask = this.getCancelTask();
        String other$cancelTask = other.getCancelTask();
        return !(this$cancelTask == null ? other$cancelTask != null : !this$cancelTask.equals(other$cancelTask));
    }

    protected boolean canEqual(Object other) {
        return other instanceof PagerAddressRecordVo;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        Long $pagerId = this.getPagerId();
        result = result * 59 + ($pagerId == null ? 43 : ((Object)$pagerId).hashCode());
        Integer $port = this.getPort();
        result = result * 59 + ($port == null ? 43 : ((Object)$port).hashCode());
        Integer $slaveId = this.getSlaveId();
        result = result * 59 + ($slaveId == null ? 43 : ((Object)$slaveId).hashCode());
        Long $id = this.getId();
        result = result * 59 + ($id == null ? 43 : ((Object)$id).hashCode());
        Integer $address = this.getAddress();
        result = result * 59 + ($address == null ? 43 : ((Object)$address).hashCode());
        Integer $value = this.getValue();
        result = result * 59 + ($value == null ? 43 : ((Object)$value).hashCode());
        Integer $lightAddress = this.getLightAddress();
        result = result * 59 + ($lightAddress == null ? 43 : ((Object)$lightAddress).hashCode());
        Integer $lightValue = this.getLightValue();
        result = result * 59 + ($lightValue == null ? 43 : ((Object)$lightValue).hashCode());
        String $protocolType = this.getProtocolType();
        result = result * 59 + ($protocolType == null ? 43 : $protocolType.hashCode());
        String $brandName = this.getBrandName();
        result = result * 59 + ($brandName == null ? 43 : $brandName.hashCode());
        String $deviceName = this.getDeviceName();
        result = result * 59 + ($deviceName == null ? 43 : $deviceName.hashCode());
        String $ip = this.getIp();
        result = result * 59 + ($ip == null ? 43 : $ip.hashCode());
        String $functionCode = this.getFunctionCode();
        result = result * 59 + ($functionCode == null ? 43 : $functionCode.hashCode());
        String $remark = this.getRemark();
        result = result * 59 + ($remark == null ? 43 : $remark.hashCode());
        String $lightRemark = this.getLightRemark();
        result = result * 59 + ($lightRemark == null ? 43 : $lightRemark.hashCode());
        String $orderTask = this.getOrderTask();
        result = result * 59 + ($orderTask == null ? 43 : $orderTask.hashCode());
        String $cancelTask = this.getCancelTask();
        result = result * 59 + ($cancelTask == null ? 43 : $cancelTask.hashCode());
        return result;
    }

    public String toString() {
        return "PagerAddressRecordVo(protocolType=" + this.getProtocolType() + ", brandName=" + this.getBrandName() + ", pagerId=" + this.getPagerId() + ", deviceName=" + this.getDeviceName() + ", ip=" + this.getIp() + ", port=" + this.getPort() + ", slaveId=" + this.getSlaveId() + ", functionCode=" + this.getFunctionCode() + ", id=" + this.getId() + ", address=" + this.getAddress() + ", value=" + this.getValue() + ", remark=" + this.getRemark() + ", lightAddress=" + this.getLightAddress() + ", lightValue=" + this.getLightValue() + ", lightRemark=" + this.getLightRemark() + ", orderTask=" + this.getOrderTask() + ", cancelTask=" + this.getCancelTask() + ")";
    }

    public PagerAddressRecordVo() {
    }

    public PagerAddressRecordVo(String protocolType, String brandName, Long pagerId, String deviceName, String ip, Integer port, Integer slaveId, String functionCode, Long id, Integer address, Integer value, String remark, Integer lightAddress, Integer lightValue, String lightRemark, String orderTask, String cancelTask) {
        this.protocolType = protocolType;
        this.brandName = brandName;
        this.pagerId = pagerId;
        this.deviceName = deviceName;
        this.ip = ip;
        this.port = port;
        this.slaveId = slaveId;
        this.functionCode = functionCode;
        this.id = id;
        this.address = address;
        this.value = value;
        this.remark = remark;
        this.lightAddress = lightAddress;
        this.lightValue = lightValue;
        this.lightRemark = lightRemark;
        this.orderTask = orderTask;
        this.cancelTask = cancelTask;
    }
}

