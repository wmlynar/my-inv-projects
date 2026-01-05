/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.model.modbus.ModbusInstance
 *  com.seer.rds.model.modbus.ModbusInstanceVo
 */
package com.seer.rds.model.modbus;

import com.seer.rds.model.modbus.ModbusInstance;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;

/*
 * Exception performing whole class analysis ignored.
 */
public class ModbusInstanceVo {
    private String id;
    private String name;
    private String host;
    private Integer port;
    private Integer slaveId;
    private String protocol;
    private String remark;
    private Date createTime;
    private String type;

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

    public String getType() {
        return this.type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public static ModbusInstanceVo buildModbusInstanceVo(ModbusInstance instance) {
        ModbusInstanceVo vo = new ModbusInstanceVo();
        vo.setId(instance.getId());
        vo.setName(instance.getName());
        vo.setHost(instance.getHost());
        vo.setPort(instance.getPort());
        vo.setSlaveId(instance.getSlaveId());
        vo.setProtocol(instance.getProtocol());
        vo.setRemark(instance.getRemark());
        vo.setCreateTime(instance.getCreateTime());
        vo.setType(instance.getType());
        return vo;
    }

    public static List<ModbusInstanceVo> buildModbusInstanceVos(List<ModbusInstance> instances) {
        ArrayList<ModbusInstanceVo> vos = new ArrayList<ModbusInstanceVo>();
        for (ModbusInstance instance : instances) {
            vos.add(ModbusInstanceVo.buildModbusInstanceVo((ModbusInstance)instance));
        }
        return vos;
    }
}

