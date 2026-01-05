/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.vo.req.ScriptBootReq
 *  io.swagger.annotations.ApiModel
 */
package com.seer.rds.vo.req;

import io.swagger.annotations.ApiModel;
import java.io.Serializable;
import java.util.Arrays;

@ApiModel
public class ScriptBootReq
implements Serializable {
    private String functionName;
    private Object[] args;

    public String getFunctionName() {
        return this.functionName;
    }

    public Object[] getArgs() {
        return this.args;
    }

    public void setFunctionName(String functionName) {
        this.functionName = functionName;
    }

    public void setArgs(Object[] args) {
        this.args = args;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof ScriptBootReq)) {
            return false;
        }
        ScriptBootReq other = (ScriptBootReq)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        String this$functionName = this.getFunctionName();
        String other$functionName = other.getFunctionName();
        if (this$functionName == null ? other$functionName != null : !this$functionName.equals(other$functionName)) {
            return false;
        }
        return Arrays.deepEquals(this.getArgs(), other.getArgs());
    }

    protected boolean canEqual(Object other) {
        return other instanceof ScriptBootReq;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        String $functionName = this.getFunctionName();
        result = result * 59 + ($functionName == null ? 43 : $functionName.hashCode());
        result = result * 59 + Arrays.deepHashCode(this.getArgs());
        return result;
    }

    public String toString() {
        return "ScriptBootReq(functionName=" + this.getFunctionName() + ", args=" + Arrays.deepToString(this.getArgs()) + ")";
    }
}

