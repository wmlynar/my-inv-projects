/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.vo.req.ScriptStartupFuncReq
 *  com.seer.rds.vo.req.ScriptStartupFuncReq$ScriptStartupFuncReqBuilder
 *  io.swagger.annotations.ApiModel
 */
package com.seer.rds.vo.req;

import com.seer.rds.vo.req.ScriptStartupFuncReq;
import io.swagger.annotations.ApiModel;

@ApiModel
public class ScriptStartupFuncReq {
    private String functionName;

    public static ScriptStartupFuncReqBuilder builder() {
        return new ScriptStartupFuncReqBuilder();
    }

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
        if (!(o instanceof ScriptStartupFuncReq)) {
            return false;
        }
        ScriptStartupFuncReq other = (ScriptStartupFuncReq)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        String this$functionName = this.getFunctionName();
        String other$functionName = other.getFunctionName();
        return !(this$functionName == null ? other$functionName != null : !this$functionName.equals(other$functionName));
    }

    protected boolean canEqual(Object other) {
        return other instanceof ScriptStartupFuncReq;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        String $functionName = this.getFunctionName();
        result = result * 59 + ($functionName == null ? 43 : $functionName.hashCode());
        return result;
    }

    public String toString() {
        return "ScriptStartupFuncReq(functionName=" + this.getFunctionName() + ")";
    }

    public ScriptStartupFuncReq(String functionName) {
        this.functionName = functionName;
    }

    public ScriptStartupFuncReq() {
    }
}

