/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.vo.popWindowsVo
 *  com.seer.rds.vo.popWindowsVo$popWindowsVoBuilder
 */
package com.seer.rds.vo;

import com.seer.rds.vo.popWindowsVo;

public class popWindowsVo {
    private Boolean error;
    private Boolean warn;
    private Boolean info;

    public static popWindowsVoBuilder builder() {
        return new popWindowsVoBuilder();
    }

    public Boolean getError() {
        return this.error;
    }

    public Boolean getWarn() {
        return this.warn;
    }

    public Boolean getInfo() {
        return this.info;
    }

    public void setError(Boolean error) {
        this.error = error;
    }

    public void setWarn(Boolean warn) {
        this.warn = warn;
    }

    public void setInfo(Boolean info) {
        this.info = info;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof popWindowsVo)) {
            return false;
        }
        popWindowsVo other = (popWindowsVo)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        Boolean this$error = this.getError();
        Boolean other$error = other.getError();
        if (this$error == null ? other$error != null : !((Object)this$error).equals(other$error)) {
            return false;
        }
        Boolean this$warn = this.getWarn();
        Boolean other$warn = other.getWarn();
        if (this$warn == null ? other$warn != null : !((Object)this$warn).equals(other$warn)) {
            return false;
        }
        Boolean this$info = this.getInfo();
        Boolean other$info = other.getInfo();
        return !(this$info == null ? other$info != null : !((Object)this$info).equals(other$info));
    }

    protected boolean canEqual(Object other) {
        return other instanceof popWindowsVo;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        Boolean $error = this.getError();
        result = result * 59 + ($error == null ? 43 : ((Object)$error).hashCode());
        Boolean $warn = this.getWarn();
        result = result * 59 + ($warn == null ? 43 : ((Object)$warn).hashCode());
        Boolean $info = this.getInfo();
        result = result * 59 + ($info == null ? 43 : ((Object)$info).hashCode());
        return result;
    }

    public String toString() {
        return "popWindowsVo(error=" + this.getError() + ", warn=" + this.getWarn() + ", info=" + this.getInfo() + ")";
    }

    public popWindowsVo() {
    }

    public popWindowsVo(Boolean error, Boolean warn, Boolean info) {
        this.error = error;
        this.warn = warn;
        this.info = info;
    }
}

