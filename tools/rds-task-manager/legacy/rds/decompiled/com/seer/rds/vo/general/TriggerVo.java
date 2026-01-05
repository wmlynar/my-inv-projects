/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.vo.general.ModbusTcpInputParamsVo
 *  com.seer.rds.vo.general.TriggerVo
 *  com.seer.rds.vo.general.TriggerVo$TriggerVoBuilder
 */
package com.seer.rds.vo.general;

import com.seer.rds.vo.general.ModbusTcpInputParamsVo;
import com.seer.rds.vo.general.TriggerVo;
import java.util.List;

public class TriggerVo {
    private List<ModbusTcpInputParamsVo> modbus;
    private String scriptFun;
    private Integer type = 1;

    public static TriggerVoBuilder builder() {
        return new TriggerVoBuilder();
    }

    public List<ModbusTcpInputParamsVo> getModbus() {
        return this.modbus;
    }

    public String getScriptFun() {
        return this.scriptFun;
    }

    public Integer getType() {
        return this.type;
    }

    public void setModbus(List<ModbusTcpInputParamsVo> modbus) {
        this.modbus = modbus;
    }

    public void setScriptFun(String scriptFun) {
        this.scriptFun = scriptFun;
    }

    public void setType(Integer type) {
        this.type = type;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof TriggerVo)) {
            return false;
        }
        TriggerVo other = (TriggerVo)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        Integer this$type = this.getType();
        Integer other$type = other.getType();
        if (this$type == null ? other$type != null : !((Object)this$type).equals(other$type)) {
            return false;
        }
        List this$modbus = this.getModbus();
        List other$modbus = other.getModbus();
        if (this$modbus == null ? other$modbus != null : !((Object)this$modbus).equals(other$modbus)) {
            return false;
        }
        String this$scriptFun = this.getScriptFun();
        String other$scriptFun = other.getScriptFun();
        return !(this$scriptFun == null ? other$scriptFun != null : !this$scriptFun.equals(other$scriptFun));
    }

    protected boolean canEqual(Object other) {
        return other instanceof TriggerVo;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        Integer $type = this.getType();
        result = result * 59 + ($type == null ? 43 : ((Object)$type).hashCode());
        List $modbus = this.getModbus();
        result = result * 59 + ($modbus == null ? 43 : ((Object)$modbus).hashCode());
        String $scriptFun = this.getScriptFun();
        result = result * 59 + ($scriptFun == null ? 43 : $scriptFun.hashCode());
        return result;
    }

    public String toString() {
        return "TriggerVo(modbus=" + this.getModbus() + ", scriptFun=" + this.getScriptFun() + ", type=" + this.getType() + ")";
    }

    public TriggerVo() {
    }

    public TriggerVo(List<ModbusTcpInputParamsVo> modbus, String scriptFun, Integer type) {
        this.modbus = modbus;
        this.scriptFun = scriptFun;
        this.type = type;
    }
}

