/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.model.modbus.ModbusInstance
 *  com.seer.rds.model.modbus.ModbusInstance$ModbusInstanceBuilder
 *  javax.persistence.Column
 *  javax.persistence.Entity
 *  javax.persistence.GeneratedValue
 *  javax.persistence.Id
 *  javax.persistence.Index
 *  javax.persistence.Table
 *  javax.persistence.Transient
 *  org.hibernate.annotations.GenericGenerator
 */
package com.seer.rds.model.modbus;

import com.seer.rds.model.modbus.ModbusInstance;
import java.util.Date;
import java.util.List;
import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.GeneratedValue;
import javax.persistence.Id;
import javax.persistence.Index;
import javax.persistence.Table;
import javax.persistence.Transient;
import org.hibernate.annotations.GenericGenerator;

@Entity
@Table(name="t_modbus_instance", indexes={@Index(name="createTimeIndex", columnList="createTime DESC"), @Index(name="nameIndex", columnList="name")})
public class ModbusInstance {
    @Id
    @GenericGenerator(name="idGenerator", strategy="uuid")
    @GeneratedValue(generator="idGenerator")
    private String id;
    @Column(nullable=false)
    private String name;
    @Column(nullable=false)
    private String host;
    @Column(nullable=false)
    private Integer port;
    @Column(nullable=false)
    private Integer slaveId;
    @Column(nullable=false)
    private String type;
    @Column(nullable=false)
    private Integer targetAddr;
    private String taskDefLabel;
    private String prefix;
    private Integer targetType;
    private String targetValue;
    private Integer reset;
    private Integer resetAddr;
    private Integer resetType;
    private String resetValue;
    private String protocol;
    private String remark;
    private Date createTime;
    private Date updateTime;
    @Transient
    private List<String> desc;
    @Transient
    private List<String> asc;

    public String getId() {
        return this.id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getName() {
        return this.name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getHost() {
        return this.host;
    }

    public void setHost(String host) {
        this.host = host;
    }

    public Integer getPort() {
        return this.port;
    }

    public void setPort(Integer port) {
        this.port = port;
    }

    public Integer getSlaveId() {
        return this.slaveId;
    }

    public void setSlaveId(Integer slaveId) {
        this.slaveId = slaveId;
    }

    public String getType() {
        return this.type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public String getTaskDefLabel() {
        return this.taskDefLabel;
    }

    public void setTaskDefLabel(String taskDefLabel) {
        this.taskDefLabel = taskDefLabel;
    }

    public Integer getTargetAddr() {
        return this.targetAddr;
    }

    public void setTargetAddr(Integer targetAddr) {
        this.targetAddr = targetAddr;
    }

    public String getTargetValue() {
        return this.targetValue;
    }

    public void setTargetValue(String targetValue) {
        this.targetValue = targetValue;
    }

    public Integer getTargetType() {
        return this.targetType;
    }

    public void setTargetType(Integer targetType) {
        this.targetType = targetType;
    }

    public Integer getReset() {
        return this.reset;
    }

    public void setReset(Integer reset) {
        this.reset = reset;
    }

    public Integer getResetAddr() {
        return this.resetAddr;
    }

    public void setResetAddr(Integer resetAddr) {
        this.resetAddr = resetAddr;
    }

    public String getResetValue() {
        return this.resetValue;
    }

    public void setResetValue(String resetValue) {
        this.resetValue = resetValue;
    }

    public Integer getResetType() {
        return this.resetType;
    }

    public void setResetType(Integer resetType) {
        this.resetType = resetType;
    }

    public String getProtocol() {
        return this.protocol;
    }

    public void setProtocol(String protocol) {
        this.protocol = protocol;
    }

    public String getRemark() {
        return this.remark;
    }

    public void setRemark(String remark) {
        this.remark = remark;
    }

    public Date getCreateTime() {
        return this.createTime;
    }

    public void setCreateTime(Date createTime) {
        this.createTime = createTime;
    }

    public List<String> getDesc() {
        return this.desc;
    }

    public void setDesc(List<String> desc) {
        this.desc = desc;
    }

    public List<String> getAsc() {
        return this.asc;
    }

    public void setAsc(List<String> asc) {
        this.asc = asc;
    }

    public Date getUpdateTime() {
        return this.updateTime;
    }

    public void setUpdateTime(Date updateTime) {
        this.updateTime = updateTime;
    }

    public String getPrefix() {
        return this.prefix;
    }

    public void setPrefix(String prefix) {
        this.prefix = prefix;
    }

    public static ModbusInstanceBuilder builder() {
        return new ModbusInstanceBuilder();
    }

    public ModbusInstance() {
    }

    public ModbusInstance(String id, String name, String host, Integer port, Integer slaveId, String type, Integer targetAddr, String taskDefLabel, String prefix, Integer targetType, String targetValue, Integer reset, Integer resetAddr, Integer resetType, String resetValue, String protocol, String remark, Date createTime, Date updateTime, List<String> desc, List<String> asc) {
        this.id = id;
        this.name = name;
        this.host = host;
        this.port = port;
        this.slaveId = slaveId;
        this.type = type;
        this.targetAddr = targetAddr;
        this.taskDefLabel = taskDefLabel;
        this.prefix = prefix;
        this.targetType = targetType;
        this.targetValue = targetValue;
        this.reset = reset;
        this.resetAddr = resetAddr;
        this.resetType = resetType;
        this.resetValue = resetValue;
        this.protocol = protocol;
        this.remark = remark;
        this.createTime = createTime;
        this.updateTime = updateTime;
        this.desc = desc;
        this.asc = asc;
    }

    public ModbusInstance withId(String id) {
        return this.id == id ? this : new ModbusInstance(id, this.name, this.host, this.port, this.slaveId, this.type, this.targetAddr, this.taskDefLabel, this.prefix, this.targetType, this.targetValue, this.reset, this.resetAddr, this.resetType, this.resetValue, this.protocol, this.remark, this.createTime, this.updateTime, this.desc, this.asc);
    }

    public ModbusInstance withName(String name) {
        return this.name == name ? this : new ModbusInstance(this.id, name, this.host, this.port, this.slaveId, this.type, this.targetAddr, this.taskDefLabel, this.prefix, this.targetType, this.targetValue, this.reset, this.resetAddr, this.resetType, this.resetValue, this.protocol, this.remark, this.createTime, this.updateTime, this.desc, this.asc);
    }

    public ModbusInstance withHost(String host) {
        return this.host == host ? this : new ModbusInstance(this.id, this.name, host, this.port, this.slaveId, this.type, this.targetAddr, this.taskDefLabel, this.prefix, this.targetType, this.targetValue, this.reset, this.resetAddr, this.resetType, this.resetValue, this.protocol, this.remark, this.createTime, this.updateTime, this.desc, this.asc);
    }

    public ModbusInstance withPort(Integer port) {
        return this.port == port ? this : new ModbusInstance(this.id, this.name, this.host, port, this.slaveId, this.type, this.targetAddr, this.taskDefLabel, this.prefix, this.targetType, this.targetValue, this.reset, this.resetAddr, this.resetType, this.resetValue, this.protocol, this.remark, this.createTime, this.updateTime, this.desc, this.asc);
    }

    public ModbusInstance withSlaveId(Integer slaveId) {
        return this.slaveId == slaveId ? this : new ModbusInstance(this.id, this.name, this.host, this.port, slaveId, this.type, this.targetAddr, this.taskDefLabel, this.prefix, this.targetType, this.targetValue, this.reset, this.resetAddr, this.resetType, this.resetValue, this.protocol, this.remark, this.createTime, this.updateTime, this.desc, this.asc);
    }

    public ModbusInstance withType(String type) {
        return this.type == type ? this : new ModbusInstance(this.id, this.name, this.host, this.port, this.slaveId, type, this.targetAddr, this.taskDefLabel, this.prefix, this.targetType, this.targetValue, this.reset, this.resetAddr, this.resetType, this.resetValue, this.protocol, this.remark, this.createTime, this.updateTime, this.desc, this.asc);
    }

    public ModbusInstance withTargetAddr(Integer targetAddr) {
        return this.targetAddr == targetAddr ? this : new ModbusInstance(this.id, this.name, this.host, this.port, this.slaveId, this.type, targetAddr, this.taskDefLabel, this.prefix, this.targetType, this.targetValue, this.reset, this.resetAddr, this.resetType, this.resetValue, this.protocol, this.remark, this.createTime, this.updateTime, this.desc, this.asc);
    }

    public ModbusInstance withTaskDefLabel(String taskDefLabel) {
        return this.taskDefLabel == taskDefLabel ? this : new ModbusInstance(this.id, this.name, this.host, this.port, this.slaveId, this.type, this.targetAddr, taskDefLabel, this.prefix, this.targetType, this.targetValue, this.reset, this.resetAddr, this.resetType, this.resetValue, this.protocol, this.remark, this.createTime, this.updateTime, this.desc, this.asc);
    }

    public ModbusInstance withPrefix(String prefix) {
        return this.prefix == prefix ? this : new ModbusInstance(this.id, this.name, this.host, this.port, this.slaveId, this.type, this.targetAddr, this.taskDefLabel, prefix, this.targetType, this.targetValue, this.reset, this.resetAddr, this.resetType, this.resetValue, this.protocol, this.remark, this.createTime, this.updateTime, this.desc, this.asc);
    }

    public ModbusInstance withTargetType(Integer targetType) {
        return this.targetType == targetType ? this : new ModbusInstance(this.id, this.name, this.host, this.port, this.slaveId, this.type, this.targetAddr, this.taskDefLabel, this.prefix, targetType, this.targetValue, this.reset, this.resetAddr, this.resetType, this.resetValue, this.protocol, this.remark, this.createTime, this.updateTime, this.desc, this.asc);
    }

    public ModbusInstance withTargetValue(String targetValue) {
        return this.targetValue == targetValue ? this : new ModbusInstance(this.id, this.name, this.host, this.port, this.slaveId, this.type, this.targetAddr, this.taskDefLabel, this.prefix, this.targetType, targetValue, this.reset, this.resetAddr, this.resetType, this.resetValue, this.protocol, this.remark, this.createTime, this.updateTime, this.desc, this.asc);
    }

    public ModbusInstance withReset(Integer reset) {
        return this.reset == reset ? this : new ModbusInstance(this.id, this.name, this.host, this.port, this.slaveId, this.type, this.targetAddr, this.taskDefLabel, this.prefix, this.targetType, this.targetValue, reset, this.resetAddr, this.resetType, this.resetValue, this.protocol, this.remark, this.createTime, this.updateTime, this.desc, this.asc);
    }

    public ModbusInstance withResetAddr(Integer resetAddr) {
        return this.resetAddr == resetAddr ? this : new ModbusInstance(this.id, this.name, this.host, this.port, this.slaveId, this.type, this.targetAddr, this.taskDefLabel, this.prefix, this.targetType, this.targetValue, this.reset, resetAddr, this.resetType, this.resetValue, this.protocol, this.remark, this.createTime, this.updateTime, this.desc, this.asc);
    }

    public ModbusInstance withResetType(Integer resetType) {
        return this.resetType == resetType ? this : new ModbusInstance(this.id, this.name, this.host, this.port, this.slaveId, this.type, this.targetAddr, this.taskDefLabel, this.prefix, this.targetType, this.targetValue, this.reset, this.resetAddr, resetType, this.resetValue, this.protocol, this.remark, this.createTime, this.updateTime, this.desc, this.asc);
    }

    public ModbusInstance withResetValue(String resetValue) {
        return this.resetValue == resetValue ? this : new ModbusInstance(this.id, this.name, this.host, this.port, this.slaveId, this.type, this.targetAddr, this.taskDefLabel, this.prefix, this.targetType, this.targetValue, this.reset, this.resetAddr, this.resetType, resetValue, this.protocol, this.remark, this.createTime, this.updateTime, this.desc, this.asc);
    }

    public ModbusInstance withProtocol(String protocol) {
        return this.protocol == protocol ? this : new ModbusInstance(this.id, this.name, this.host, this.port, this.slaveId, this.type, this.targetAddr, this.taskDefLabel, this.prefix, this.targetType, this.targetValue, this.reset, this.resetAddr, this.resetType, this.resetValue, protocol, this.remark, this.createTime, this.updateTime, this.desc, this.asc);
    }

    public ModbusInstance withRemark(String remark) {
        return this.remark == remark ? this : new ModbusInstance(this.id, this.name, this.host, this.port, this.slaveId, this.type, this.targetAddr, this.taskDefLabel, this.prefix, this.targetType, this.targetValue, this.reset, this.resetAddr, this.resetType, this.resetValue, this.protocol, remark, this.createTime, this.updateTime, this.desc, this.asc);
    }

    public ModbusInstance withCreateTime(Date createTime) {
        return this.createTime == createTime ? this : new ModbusInstance(this.id, this.name, this.host, this.port, this.slaveId, this.type, this.targetAddr, this.taskDefLabel, this.prefix, this.targetType, this.targetValue, this.reset, this.resetAddr, this.resetType, this.resetValue, this.protocol, this.remark, createTime, this.updateTime, this.desc, this.asc);
    }

    public ModbusInstance withUpdateTime(Date updateTime) {
        return this.updateTime == updateTime ? this : new ModbusInstance(this.id, this.name, this.host, this.port, this.slaveId, this.type, this.targetAddr, this.taskDefLabel, this.prefix, this.targetType, this.targetValue, this.reset, this.resetAddr, this.resetType, this.resetValue, this.protocol, this.remark, this.createTime, updateTime, this.desc, this.asc);
    }

    public ModbusInstance withDesc(List<String> desc) {
        return this.desc == desc ? this : new ModbusInstance(this.id, this.name, this.host, this.port, this.slaveId, this.type, this.targetAddr, this.taskDefLabel, this.prefix, this.targetType, this.targetValue, this.reset, this.resetAddr, this.resetType, this.resetValue, this.protocol, this.remark, this.createTime, this.updateTime, desc, this.asc);
    }

    public ModbusInstance withAsc(List<String> asc) {
        return this.asc == asc ? this : new ModbusInstance(this.id, this.name, this.host, this.port, this.slaveId, this.type, this.targetAddr, this.taskDefLabel, this.prefix, this.targetType, this.targetValue, this.reset, this.resetAddr, this.resetType, this.resetValue, this.protocol, this.remark, this.createTime, this.updateTime, this.desc, asc);
    }
}

