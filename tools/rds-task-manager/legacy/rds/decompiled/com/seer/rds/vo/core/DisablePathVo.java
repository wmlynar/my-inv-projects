/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.vo.core.DisablePathVo
 *  io.swagger.annotations.ApiModel
 */
package com.seer.rds.vo.core;

import io.swagger.annotations.ApiModel;

@ApiModel(value="\u7981\u7528\u7684\u7ebf\u8def\u5bf9\u8c61")
public class DisablePathVo {
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
        if (!(o instanceof DisablePathVo)) {
            return false;
        }
        DisablePathVo other = (DisablePathVo)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        String this$id = this.getId();
        String other$id = other.getId();
        return !(this$id == null ? other$id != null : !this$id.equals(other$id));
    }

    protected boolean canEqual(Object other) {
        return other instanceof DisablePathVo;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        String $id = this.getId();
        result = result * 59 + ($id == null ? 43 : $id.hashCode());
        return result;
    }

    public String toString() {
        return "DisablePathVo(id=" + this.getId() + ")";
    }

    public DisablePathVo(String id) {
        this.id = id;
    }

    public DisablePathVo() {
    }
}

