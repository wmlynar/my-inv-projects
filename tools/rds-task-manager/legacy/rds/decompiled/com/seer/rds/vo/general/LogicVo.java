/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.vo.general.LogicVo
 *  com.seer.rds.vo.general.LogicVo$LogicVoBuilder
 *  com.seer.rds.vo.general.ModbusTcpInputParamsVo
 */
package com.seer.rds.vo.general;

import com.seer.rds.vo.general.LogicVo;
import com.seer.rds.vo.general.ModbusTcpInputParamsVo;

public class LogicVo {
    private String blockName;
    private ModbusTcpInputParamsVo input;

    public static LogicVoBuilder builder() {
        return new LogicVoBuilder();
    }

    public String getBlockName() {
        return this.blockName;
    }

    public ModbusTcpInputParamsVo getInput() {
        return this.input;
    }

    public void setBlockName(String blockName) {
        this.blockName = blockName;
    }

    public void setInput(ModbusTcpInputParamsVo input) {
        this.input = input;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof LogicVo)) {
            return false;
        }
        LogicVo other = (LogicVo)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        String this$blockName = this.getBlockName();
        String other$blockName = other.getBlockName();
        if (this$blockName == null ? other$blockName != null : !this$blockName.equals(other$blockName)) {
            return false;
        }
        ModbusTcpInputParamsVo this$input = this.getInput();
        ModbusTcpInputParamsVo other$input = other.getInput();
        return !(this$input == null ? other$input != null : !this$input.equals(other$input));
    }

    protected boolean canEqual(Object other) {
        return other instanceof LogicVo;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        String $blockName = this.getBlockName();
        result = result * 59 + ($blockName == null ? 43 : $blockName.hashCode());
        ModbusTcpInputParamsVo $input = this.getInput();
        result = result * 59 + ($input == null ? 43 : $input.hashCode());
        return result;
    }

    public String toString() {
        return "LogicVo(blockName=" + this.getBlockName() + ", input=" + this.getInput() + ")";
    }

    public LogicVo() {
    }

    public LogicVo(String blockName, ModbusTcpInputParamsVo input) {
        this.blockName = blockName;
        this.input = input;
    }
}

