/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.vo.core.DisablePointVo
 *  io.swagger.annotations.ApiModel
 */
package com.seer.rds.vo.core;

import io.swagger.annotations.ApiModel;

@ApiModel(value="\u7981\u7528\u7684\u70b9\u4f4d\u5bf9\u8c61")
public class DisablePointVo {
    private String id;

    public String getId() {
        return this.id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof DisablePointVo)) {
            return false;
        }
        DisablePointVo other = (DisablePointVo)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        String this$id = this.getId();
        String other$id = other.getId();
        return !(this$id == null ? other$id != null : !this$id.equals(other$id));
    }

    protected boolean canEqual(Object other) {
        return other instanceof DisablePointVo;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        String $id = this.getId();
        result = result * 59 + ($id == null ? 43 : $id.hashCode());
        return result;
    }

    public String toString() {
        return "DisablePointVo(id=" + this.getId() + ")";
    }

    public DisablePointVo(String id) {
        this.id = id;
    }

    public DisablePointVo() {
    }
}

