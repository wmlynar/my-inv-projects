/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.vo.general.AddrsVo
 *  com.seer.rds.vo.general.ModbusVo
 *  com.seer.rds.vo.general.ModbusVo$ModbusVoBuilder
 */
package com.seer.rds.vo.general;

import com.seer.rds.vo.general.AddrsVo;
import com.seer.rds.vo.general.ModbusVo;
import java.util.ArrayList;
import java.util.List;

public class ModbusVo {
    private String ip = "";
    private Integer port = 0;
    private String name = "";
    private Integer slaveId = 0;
    private String remake = "";
    private List<AddrsVo> addrs = new ArrayList();

    public static ModbusVoBuilder builder() {
        return new ModbusVoBuilder();
    }

    public String getIp() {
        return this.ip;
    }

    public Integer getPort() {
        return this.port;
    }

    public String getName() {
        return this.name;
    }

    public Integer getSlaveId() {
        return this.slaveId;
    }

    public String getRemake() {
        return this.remake;
    }

    public List<AddrsVo> getAddrs() {
        return this.addrs;
    }

    public void setIp(String ip) {
        this.ip = ip;
    }

    public void setPort(Integer port) {
        this.port = port;
    }

    public void setName(String name) {
        this.name = name;
    }

    public void setSlaveId(Integer slaveId) {
        this.slaveId = slaveId;
    }

    public void setRemake(String remake) {
        this.remake = remake;
    }

    public void setAddrs(List<AddrsVo> addrs) {
        this.addrs = addrs;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof ModbusVo)) {
            return false;
        }
        ModbusVo other = (ModbusVo)o;
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
        String this$ip = this.getIp();
        String other$ip = other.getIp();
        if (this$ip == null ? other$ip != null : !this$ip.equals(other$ip)) {
            return false;
        }
        String this$name = this.getName();
        String other$name = other.getName();
        if (this$name == null ? other$name != null : !this$name.equals(other$name)) {
            return false;
        }
        String this$remake = this.getRemake();
        String other$remake = other.getRemake();
        if (this$remake == null ? other$remake != null : !this$remake.equals(other$remake)) {
            return false;
        }
        List this$addrs = this.getAddrs();
        List other$addrs = other.getAddrs();
        return !(this$addrs == null ? other$addrs != null : !((Object)this$addrs).equals(other$addrs));
    }

    protected boolean canEqual(Object other) {
        return other instanceof ModbusVo;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        Integer $port = this.getPort();
        result = result * 59 + ($port == null ? 43 : ((Object)$port).hashCode());
        Integer $slaveId = this.getSlaveId();
        result = result * 59 + ($slaveId == null ? 43 : ((Object)$slaveId).hashCode());
        String $ip = this.getIp();
        result = result * 59 + ($ip == null ? 43 : $ip.hashCode());
        String $name = this.getName();
        result = result * 59 + ($name == null ? 43 : $name.hashCode());
        String $remake = this.getRemake();
        result = result * 59 + ($remake == null ? 43 : $remake.hashCode());
        List $addrs = this.getAddrs();
        result = result * 59 + ($addrs == null ? 43 : ((Object)$addrs).hashCode());
        return result;
    }

    public String toString() {
        return "ModbusVo(ip=" + this.getIp() + ", port=" + this.getPort() + ", name=" + this.getName() + ", slaveId=" + this.getSlaveId() + ", remake=" + this.getRemake() + ", addrs=" + this.getAddrs() + ")";
    }

    public ModbusVo() {
    }

    public ModbusVo(String ip, Integer port, String name, Integer slaveId, String remake, List<AddrsVo> addrs) {
        this.ip = ip;
        this.port = port;
        this.name = name;
        this.slaveId = slaveId;
        this.remake = remake;
        this.addrs = addrs;
    }
}

