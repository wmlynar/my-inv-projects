/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.vo.core.SiteVo
 */
package com.seer.rds.vo.core;

public class SiteVo {
    private String id;
    private Boolean filled;
    private Integer status;

    public String getId() {
        return this.id;
    }

    public Boolean getFilled() {
        return this.filled;
    }

    public Integer getStatus() {
        return this.status;
    }

    public void setId(String id) {
        this.id = id;
    }

    public void setFilled(Boolean filled) {
        this.filled = filled;
    }

    public void setStatus(Integer status) {
        this.status = status;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof SiteVo)) {
            return false;
        }
        SiteVo other = (SiteVo)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        Boolean this$filled = this.getFilled();
        Boolean other$filled = other.getFilled();
        if (this$filled == null ? other$filled != null : !((Object)this$filled).equals(other$filled)) {
            return false;
        }
        Integer this$status = this.getStatus();
        Integer other$status = other.getStatus();
        if (this$status == null ? other$status != null : !((Object)this$status).equals(other$status)) {
            return false;
        }
        String this$id = this.getId();
        String other$id = other.getId();
        return !(this$id == null ? other$id != null : !this$id.equals(other$id));
    }

    protected boolean canEqual(Object other) {
        return other instanceof SiteVo;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        Boolean $filled = this.getFilled();
        result = result * 59 + ($filled == null ? 43 : ((Object)$filled).hashCode());
        Integer $status = this.getStatus();
        result = result * 59 + ($status == null ? 43 : ((Object)$status).hashCode());
        String $id = this.getId();
        result = result * 59 + ($id == null ? 43 : $id.hashCode());
        return result;
    }

    public String toString() {
        return "SiteVo(id=" + this.getId() + ", filled=" + this.getFilled() + ", status=" + this.getStatus() + ")";
    }
}

