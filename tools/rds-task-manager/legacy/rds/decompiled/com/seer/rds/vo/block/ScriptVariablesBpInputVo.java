/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.vo.block.ScriptVariablesBpInputVo
 */
package com.seer.rds.vo.block;

public class ScriptVariablesBpInputVo {
    private String functionName;

    public String getFunctionName() {
        return this.functionName;
    }

    public void setFunctionName(String functionName) {
        this.functionName = functionName;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof ScriptVariablesBpInputVo)) {
            return false;
        }
        ScriptVariablesBpInputVo other = (ScriptVariablesBpInputVo)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        String this$functionName = this.getFunctionName();
        String other$functionName = other.getFunctionName();
        return !(this$functionName == null ? other$functionName != null : !this$functionName.equals(other$functionName));
    }

    protected boolean canEqual(Object other) {
        return other instanceof ScriptVariablesBpInputVo;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        String $functionName = this.getFunctionName();
        result = result * 59 + ($functionName == null ? 43 : $functionName.hashCode());
        return result;
    }

    public String toString() {
        return "ScriptVariablesBpInputVo(functionName=" + this.getFunctionName() + ")";
    }
}

