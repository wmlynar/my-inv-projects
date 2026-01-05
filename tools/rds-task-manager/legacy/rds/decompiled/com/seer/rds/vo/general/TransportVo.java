/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.vo.general.TransportModbusVo
 *  com.seer.rds.vo.general.TransportVo
 *  com.seer.rds.vo.general.TransportVo$TransportVoBuilder
 */
package com.seer.rds.vo.general;

import com.seer.rds.vo.general.TransportModbusVo;
import com.seer.rds.vo.general.TransportVo;

public class TransportVo {
    private TransportModbusVo modbus;

    public static TransportVoBuilder builder() {
        return new TransportVoBuilder();
    }

    public TransportModbusVo getModbus() {
        return this.modbus;
    }

    public void setModbus(TransportModbusVo modbus) {
        this.modbus = modbus;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof TransportVo)) {
            return false;
        }
        TransportVo other = (TransportVo)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        TransportModbusVo this$modbus = this.getModbus();
        TransportModbusVo other$modbus = other.getModbus();
        return !(this$modbus == null ? other$modbus != null : !this$modbus.equals(other$modbus));
    }

    protected boolean canEqual(Object other) {
        return other instanceof TransportVo;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        TransportModbusVo $modbus = this.getModbus();
        result = result * 59 + ($modbus == null ? 43 : $modbus.hashCode());
        return result;
    }

    public String toString() {
        return "TransportVo(modbus=" + this.getModbus() + ")";
    }

    public TransportVo() {
    }

    public TransportVo(TransportModbusVo modbus) {
        this.modbus = modbus;
    }
}

