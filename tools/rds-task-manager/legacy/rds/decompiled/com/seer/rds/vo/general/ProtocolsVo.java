/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.vo.general.ModbusVo
 *  com.seer.rds.vo.general.ProtocolsVo
 *  com.seer.rds.vo.general.ProtocolsVo$ProtocolsVoBuilder
 */
package com.seer.rds.vo.general;

import com.seer.rds.vo.general.ModbusVo;
import com.seer.rds.vo.general.ProtocolsVo;
import java.util.ArrayList;
import java.util.List;

public class ProtocolsVo {
    private List<ModbusVo> modbus = new ArrayList();

    public static ProtocolsVoBuilder builder() {
        return new ProtocolsVoBuilder();
    }

    public List<ModbusVo> getModbus() {
        return this.modbus;
    }

    public void setModbus(List<ModbusVo> modbus) {
        this.modbus = modbus;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof ProtocolsVo)) {
            return false;
        }
        ProtocolsVo other = (ProtocolsVo)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        List this$modbus = this.getModbus();
        List other$modbus = other.getModbus();
        return !(this$modbus == null ? other$modbus != null : !((Object)this$modbus).equals(other$modbus));
    }

    protected boolean canEqual(Object other) {
        return other instanceof ProtocolsVo;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        List $modbus = this.getModbus();
        result = result * 59 + ($modbus == null ? 43 : ((Object)$modbus).hashCode());
        return result;
    }

    public String toString() {
        return "ProtocolsVo(modbus=" + this.getModbus() + ")";
    }

    public ProtocolsVo() {
    }

    public ProtocolsVo(List<ModbusVo> modbus) {
        this.modbus = modbus;
    }
}

