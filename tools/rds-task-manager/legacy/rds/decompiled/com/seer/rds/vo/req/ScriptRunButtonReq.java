/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.vo.req.ScriptRunButtonReq
 */
package com.seer.rds.vo.req;

public class ScriptRunButtonReq {
    private String functionName;
    private Object args;
    private String folderName;

    public String getFunctionName() {
        return this.functionName;
    }

    public Object getArgs() {
        return this.args;
    }

    public String getFolderName() {
        return this.folderName;
    }

    public void setFunctionName(String functionName) {
        this.functionName = functionName;
    }

    public void setArgs(Object args) {
        this.args = args;
    }

    public void setFolderName(String folderName) {
        this.folderName = folderName;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof ScriptRunButtonReq)) {
            return false;
        }
        ScriptRunButtonReq other = (ScriptRunButtonReq)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        String this$functionName = this.getFunctionName();
        String other$functionName = other.getFunctionName();
        if (this$functionName == null ? other$functionName != null : !this$functionName.equals(other$functionName)) {
            return false;
        }
        Object this$args = this.getArgs();
        Object other$args = other.getArgs();
        if (this$args == null ? other$args != null : !this$args.equals(other$args)) {
            return false;
        }
        String this$folderName = this.getFolderName();
        String other$folderName = other.getFolderName();
        return !(this$folderName == null ? other$folderName != null : !this$folderName.equals(other$folderName));
    }

    protected boolean canEqual(Object other) {
        return other instanceof ScriptRunButtonReq;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        String $functionName = this.getFunctionName();
        result = result * 59 + ($functionName == null ? 43 : $functionName.hashCode());
        Object $args = this.getArgs();
        result = result * 59 + ($args == null ? 43 : $args.hashCode());
        String $folderName = this.getFolderName();
        result = result * 59 + ($folderName == null ? 43 : $folderName.hashCode());
        return result;
    }

    public String toString() {
        return "ScriptRunButtonReq(functionName=" + this.getFunctionName() + ", args=" + this.getArgs() + ", folderName=" + this.getFolderName() + ")";
    }
}

