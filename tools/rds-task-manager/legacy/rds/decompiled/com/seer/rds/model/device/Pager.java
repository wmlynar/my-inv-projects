/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.model.device.Pager
 *  com.seer.rds.model.device.Pager$PagerBuilder
 *  javax.persistence.Column
 *  javax.persistence.Entity
 *  javax.persistence.GeneratedValue
 *  javax.persistence.GenerationType
 *  javax.persistence.Id
 *  javax.persistence.Index
 *  javax.persistence.Table
 *  javax.persistence.Temporal
 *  javax.persistence.TemporalType
 *  org.hibernate.annotations.CreationTimestamp
 *  org.hibernate.annotations.UpdateTimestamp
 *  org.springframework.data.annotation.CreatedDate
 *  org.springframework.data.annotation.LastModifiedDate
 */
package com.seer.rds.model.device;

import com.seer.rds.model.device.Pager;
import java.util.Date;
import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.GeneratedValue;
import javax.persistence.GenerationType;
import javax.persistence.Id;
import javax.persistence.Index;
import javax.persistence.Table;
import javax.persistence.Temporal;
import javax.persistence.TemporalType;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;

@Entity
@Table(name="t_pager", indexes={@Index(name="ipIndex", columnList="ip", unique=true)})
public class Pager {
    @Id
    @GeneratedValue(strategy=GenerationType.AUTO)
    private Long id;
    private String protocolType = "Modbus TCP";
    private String brand;
    private String deviceName;
    private String ip;
    private Integer port;
    private Integer slaveId;
    private String functionCode = "4x";
    @Column(columnDefinition="INT DEFAULT '0'")
    private Boolean disabled;
    @CreatedDate
    @Temporal(value=TemporalType.TIMESTAMP)
    @CreationTimestamp
    private Date createTime;
    @LastModifiedDate
    @Temporal(value=TemporalType.TIMESTAMP)
    @UpdateTimestamp
    private Date modifyTime;

    public static PagerBuilder builder() {
        return new PagerBuilder();
    }

    public Long getId() {
        return this.id;
    }

    public String getProtocolType() {
        return this.protocolType;
    }

    public String getBrand() {
        return this.brand;
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

    public Boolean getDisabled() {
        return this.disabled;
    }

    public Date getCreateTime() {
        return this.createTime;
    }

    public Date getModifyTime() {
        return this.modifyTime;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public void setProtocolType(String protocolType) {
        this.protocolType = protocolType;
    }

    public void setBrand(String brand) {
        this.brand = brand;
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

    public void setDisabled(Boolean disabled) {
        this.disabled = disabled;
    }

    public void setCreateTime(Date createTime) {
        this.createTime = createTime;
    }

    public void setModifyTime(Date modifyTime) {
        this.modifyTime = modifyTime;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof Pager)) {
            return false;
        }
        Pager other = (Pager)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        Long this$id = this.getId();
        Long other$id = other.getId();
        if (this$id == null ? other$id != null : !((Object)this$id).equals(other$id)) {
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
        Boolean this$disabled = this.getDisabled();
        Boolean other$disabled = other.getDisabled();
        if (this$disabled == null ? other$disabled != null : !((Object)this$disabled).equals(other$disabled)) {
            return false;
        }
        String this$protocolType = this.getProtocolType();
        String other$protocolType = other.getProtocolType();
        if (this$protocolType == null ? other$protocolType != null : !this$protocolType.equals(other$protocolType)) {
            return false;
        }
        String this$brand = this.getBrand();
        String other$brand = other.getBrand();
        if (this$brand == null ? other$brand != null : !this$brand.equals(other$brand)) {
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
        Date this$createTime = this.getCreateTime();
        Date other$createTime = other.getCreateTime();
        if (this$createTime == null ? other$createTime != null : !((Object)this$createTime).equals(other$createTime)) {
            return false;
        }
        Date this$modifyTime = this.getModifyTime();
        Date other$modifyTime = other.getModifyTime();
        return !(this$modifyTime == null ? other$modifyTime != null : !((Object)this$modifyTime).equals(other$modifyTime));
    }

    protected boolean canEqual(Object other) {
        return other instanceof Pager;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        Long $id = this.getId();
        result = result * 59 + ($id == null ? 43 : ((Object)$id).hashCode());
        Integer $port = this.getPort();
        result = result * 59 + ($port == null ? 43 : ((Object)$port).hashCode());
        Integer $slaveId = this.getSlaveId();
        result = result * 59 + ($slaveId == null ? 43 : ((Object)$slaveId).hashCode());
        Boolean $disabled = this.getDisabled();
        result = result * 59 + ($disabled == null ? 43 : ((Object)$disabled).hashCode());
        String $protocolType = this.getProtocolType();
        result = result * 59 + ($protocolType == null ? 43 : $protocolType.hashCode());
        String $brand = this.getBrand();
        result = result * 59 + ($brand == null ? 43 : $brand.hashCode());
        String $deviceName = this.getDeviceName();
        result = result * 59 + ($deviceName == null ? 43 : $deviceName.hashCode());
        String $ip = this.getIp();
        result = result * 59 + ($ip == null ? 43 : $ip.hashCode());
        String $functionCode = this.getFunctionCode();
        result = result * 59 + ($functionCode == null ? 43 : $functionCode.hashCode());
        Date $createTime = this.getCreateTime();
        result = result * 59 + ($createTime == null ? 43 : ((Object)$createTime).hashCode());
        Date $modifyTime = this.getModifyTime();
        result = result * 59 + ($modifyTime == null ? 43 : ((Object)$modifyTime).hashCode());
        return result;
    }

    public String toString() {
        return "Pager(id=" + this.getId() + ", protocolType=" + this.getProtocolType() + ", brand=" + this.getBrand() + ", deviceName=" + this.getDeviceName() + ", ip=" + this.getIp() + ", port=" + this.getPort() + ", slaveId=" + this.getSlaveId() + ", functionCode=" + this.getFunctionCode() + ", disabled=" + this.getDisabled() + ", createTime=" + this.getCreateTime() + ", modifyTime=" + this.getModifyTime() + ")";
    }

    public Pager() {
    }

    public Pager(Long id, String protocolType, String brand, String deviceName, String ip, Integer port, Integer slaveId, String functionCode, Boolean disabled, Date createTime, Date modifyTime) {
        this.id = id;
        this.protocolType = protocolType;
        this.brand = brand;
        this.deviceName = deviceName;
        this.ip = ip;
        this.port = port;
        this.slaveId = slaveId;
        this.functionCode = functionCode;
        this.disabled = disabled;
        this.createTime = createTime;
        this.modifyTime = modifyTime;
    }
}

