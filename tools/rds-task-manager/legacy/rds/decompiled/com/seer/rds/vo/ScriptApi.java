/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.vo.ScriptApi
 *  com.seer.rds.vo.ScriptApi$ScriptApiBuilder
 */
package com.seer.rds.vo;

import com.seer.rds.vo.ScriptApi;

public class ScriptApi {
    private String method;
    private String path;
    private String functionName;
    private Boolean auth;

    public static ScriptApiBuilder builder() {
        return new ScriptApiBuilder();
    }

    public String getMethod() {
        return this.method;
    }

    public String getPath() {
        return this.path;
    }

    public String getFunctionName() {
        return this.functionName;
    }

    public Boolean getAuth() {
        return this.auth;
    }

    public void setMethod(String method) {
        this.method = method;
    }

    public void setPath(String path) {
        this.path = path;
    }

    public void setFunctionName(String functionName) {
        this.functionName = functionName;
    }

    public void setAuth(Boolean auth) {
        this.auth = auth;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof ScriptApi)) {
            return false;
        }
        ScriptApi other = (ScriptApi)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        Boolean this$auth = this.getAuth();
        Boolean other$auth = other.getAuth();
        if (this$auth == null ? other$auth != null : !((Object)this$auth).equals(other$auth)) {
            return false;
        }
        String this$method = this.getMethod();
        String other$method = other.getMethod();
        if (this$method == null ? other$method != null : !this$method.equals(other$method)) {
            return false;
        }
        String this$path = this.getPath();
        String other$path = other.getPath();
        if (this$path == null ? other$path != null : !this$path.equals(other$path)) {
            return false;
        }
        String this$functionName = this.getFunctionName();
        String other$functionName = other.getFunctionName();
        return !(this$functionName == null ? other$functionName != null : !this$functionName.equals(other$functionName));
    }

    protected boolean canEqual(Object other) {
        return other instanceof ScriptApi;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        Boolean $auth = this.getAuth();
        result = result * 59 + ($auth == null ? 43 : ((Object)$auth).hashCode());
        String $method = this.getMethod();
        result = result * 59 + ($method == null ? 43 : $method.hashCode());
        String $path = this.getPath();
        result = result * 59 + ($path == null ? 43 : $path.hashCode());
        String $functionName = this.getFunctionName();
        result = result * 59 + ($functionName == null ? 43 : $functionName.hashCode());
        return result;
    }

    public String toString() {
        return "ScriptApi(method=" + this.getMethod() + ", path=" + this.getPath() + ", functionName=" + this.getFunctionName() + ", auth=" + this.getAuth() + ")";
    }

    public ScriptApi(String method, String path, String functionName, Boolean auth) {
        this.method = method;
        this.path = path;
        this.functionName = functionName;
        this.auth = auth;
    }

    public ScriptApi() {
    }
}

