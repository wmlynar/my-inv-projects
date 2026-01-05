/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.vo.core.UndispatchableReasonVo
 */
package com.seer.rds.vo.core;

public class UndispatchableReasonVo {
    private Boolean current_map_invalid;
    private Boolean disconnect;
    private Integer dispatchable_status;
    private Boolean low_battery;
    private Boolean unconfirmed_reloc;
    private Integer unlock;

    public Boolean getCurrent_map_invalid() {
        return this.current_map_invalid;
    }

    public Boolean getDisconnect() {
        return this.disconnect;
    }

    public Integer getDispatchable_status() {
        return this.dispatchable_status;
    }

    public Boolean getLow_battery() {
        return this.low_battery;
    }

    public Boolean getUnconfirmed_reloc() {
        return this.unconfirmed_reloc;
    }

    public Integer getUnlock() {
        return this.unlock;
    }

    public void setCurrent_map_invalid(Boolean current_map_invalid) {
        this.current_map_invalid = current_map_invalid;
    }

    public void setDisconnect(Boolean disconnect) {
        this.disconnect = disconnect;
    }

    public void setDispatchable_status(Integer dispatchable_status) {
        this.dispatchable_status = dispatchable_status;
    }

    public void setLow_battery(Boolean low_battery) {
        this.low_battery = low_battery;
    }

    public void setUnconfirmed_reloc(Boolean unconfirmed_reloc) {
        this.unconfirmed_reloc = unconfirmed_reloc;
    }

    public void setUnlock(Integer unlock) {
        this.unlock = unlock;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof UndispatchableReasonVo)) {
            return false;
        }
        UndispatchableReasonVo other = (UndispatchableReasonVo)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        Boolean this$current_map_invalid = this.getCurrent_map_invalid();
        Boolean other$current_map_invalid = other.getCurrent_map_invalid();
        if (this$current_map_invalid == null ? other$current_map_invalid != null : !((Object)this$current_map_invalid).equals(other$current_map_invalid)) {
            return false;
        }
        Boolean this$disconnect = this.getDisconnect();
        Boolean other$disconnect = other.getDisconnect();
        if (this$disconnect == null ? other$disconnect != null : !((Object)this$disconnect).equals(other$disconnect)) {
            return false;
        }
        Integer this$dispatchable_status = this.getDispatchable_status();
        Integer other$dispatchable_status = other.getDispatchable_status();
        if (this$dispatchable_status == null ? other$dispatchable_status != null : !((Object)this$dispatchable_status).equals(other$dispatchable_status)) {
            return false;
        }
        Boolean this$low_battery = this.getLow_battery();
        Boolean other$low_battery = other.getLow_battery();
        if (this$low_battery == null ? other$low_battery != null : !((Object)this$low_battery).equals(other$low_battery)) {
            return false;
        }
        Boolean this$unconfirmed_reloc = this.getUnconfirmed_reloc();
        Boolean other$unconfirmed_reloc = other.getUnconfirmed_reloc();
        if (this$unconfirmed_reloc == null ? other$unconfirmed_reloc != null : !((Object)this$unconfirmed_reloc).equals(other$unconfirmed_reloc)) {
            return false;
        }
        Integer this$unlock = this.getUnlock();
        Integer other$unlock = other.getUnlock();
        return !(this$unlock == null ? other$unlock != null : !((Object)this$unlock).equals(other$unlock));
    }

    protected boolean canEqual(Object other) {
        return other instanceof UndispatchableReasonVo;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        Boolean $current_map_invalid = this.getCurrent_map_invalid();
        result = result * 59 + ($current_map_invalid == null ? 43 : ((Object)$current_map_invalid).hashCode());
        Boolean $disconnect = this.getDisconnect();
        result = result * 59 + ($disconnect == null ? 43 : ((Object)$disconnect).hashCode());
        Integer $dispatchable_status = this.getDispatchable_status();
        result = result * 59 + ($dispatchable_status == null ? 43 : ((Object)$dispatchable_status).hashCode());
        Boolean $low_battery = this.getLow_battery();
        result = result * 59 + ($low_battery == null ? 43 : ((Object)$low_battery).hashCode());
        Boolean $unconfirmed_reloc = this.getUnconfirmed_reloc();
        result = result * 59 + ($unconfirmed_reloc == null ? 43 : ((Object)$unconfirmed_reloc).hashCode());
        Integer $unlock = this.getUnlock();
        result = result * 59 + ($unlock == null ? 43 : ((Object)$unlock).hashCode());
        return result;
    }

    public String toString() {
        return "UndispatchableReasonVo(current_map_invalid=" + this.getCurrent_map_invalid() + ", disconnect=" + this.getDisconnect() + ", dispatchable_status=" + this.getDispatchable_status() + ", low_battery=" + this.getLow_battery() + ", unconfirmed_reloc=" + this.getUnconfirmed_reloc() + ", unlock=" + this.getUnlock() + ")";
    }

    public UndispatchableReasonVo(Boolean current_map_invalid, Boolean disconnect, Integer dispatchable_status, Boolean low_battery, Boolean unconfirmed_reloc, Integer unlock) {
        this.current_map_invalid = current_map_invalid;
        this.disconnect = disconnect;
        this.dispatchable_status = dispatchable_status;
        this.low_battery = low_battery;
        this.unconfirmed_reloc = unconfirmed_reloc;
        this.unlock = unlock;
    }

    public UndispatchableReasonVo() {
    }
}

