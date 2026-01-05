/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.service.wind.vo.BinDetails
 */
package com.seer.rds.service.wind.vo;

public class BinDetails {
    private Integer code;
    private String id;
    private Boolean filled;
    private Integer holder;
    private Integer status;

    public Integer getCode() {
        return this.code;
    }

    public String getId() {
        return this.id;
    }

    public Boolean getFilled() {
        return this.filled;
    }

    public Integer getHolder() {
        return this.holder;
    }

    public Integer getStatus() {
        return this.status;
    }

    public void setCode(Integer code) {
        this.code = code;
    }

    public void setId(String id) {
        this.id = id;
    }

    public void setFilled(Boolean filled) {
        this.filled = filled;
    }

    public void setHolder(Integer holder) {
        this.holder = holder;
    }

    public void setStatus(Integer status) {
        this.status = status;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof BinDetails)) {
            return false;
        }
        BinDetails other = (BinDetails)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        Integer this$code = this.getCode();
        Integer other$code = other.getCode();
        if (this$code == null ? other$code != null : !((Object)this$code).equals(other$code)) {
            return false;
        }
        Boolean this$filled = this.getFilled();
        Boolean other$filled = other.getFilled();
        if (this$filled == null ? other$filled != null : !((Object)this$filled).equals(other$filled)) {
            return false;
        }
        Integer this$holder = this.getHolder();
        Integer other$holder = other.getHolder();
        if (this$holder == null ? other$holder != null : !((Object)this$holder).equals(other$holder)) {
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
        return other instanceof BinDetails;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        Integer $code = this.getCode();
        result = result * 59 + ($code == null ? 43 : ((Object)$code).hashCode());
        Boolean $filled = this.getFilled();
        result = result * 59 + ($filled == null ? 43 : ((Object)$filled).hashCode());
        Integer $holder = this.getHolder();
        result = result * 59 + ($holder == null ? 43 : ((Object)$holder).hashCode());
        Integer $status = this.getStatus();
        result = result * 59 + ($status == null ? 43 : ((Object)$status).hashCode());
        String $id = this.getId();
        result = result * 59 + ($id == null ? 43 : $id.hashCode());
        return result;
    }

    public String toString() {
        return "BinDetails(code=" + this.getCode() + ", id=" + this.getId() + ", filled=" + this.getFilled() + ", holder=" + this.getHolder() + ", status=" + this.getStatus() + ")";
    }
}

