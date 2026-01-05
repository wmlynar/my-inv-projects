/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.service.wind.vo.AlarmInfo
 */
package com.seer.rds.service.wind.vo;

public class AlarmInfo {
    private Integer code;
    private String desc;
    private Integer times;
    private Integer timestamp;

    public Integer getCode() {
        return this.code;
    }

    public String getDesc() {
        return this.desc;
    }

    public Integer getTimes() {
        return this.times;
    }

    public Integer getTimestamp() {
        return this.timestamp;
    }

    public void setCode(Integer code) {
        this.code = code;
    }

    public void setDesc(String desc) {
        this.desc = desc;
    }

    public void setTimes(Integer times) {
        this.times = times;
    }

    public void setTimestamp(Integer timestamp) {
        this.timestamp = timestamp;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof AlarmInfo)) {
            return false;
        }
        AlarmInfo other = (AlarmInfo)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        Integer this$code = this.getCode();
        Integer other$code = other.getCode();
        if (this$code == null ? other$code != null : !((Object)this$code).equals(other$code)) {
            return false;
        }
        Integer this$times = this.getTimes();
        Integer other$times = other.getTimes();
        if (this$times == null ? other$times != null : !((Object)this$times).equals(other$times)) {
            return false;
        }
        Integer this$timestamp = this.getTimestamp();
        Integer other$timestamp = other.getTimestamp();
        if (this$timestamp == null ? other$timestamp != null : !((Object)this$timestamp).equals(other$timestamp)) {
            return false;
        }
        String this$desc = this.getDesc();
        String other$desc = other.getDesc();
        return !(this$desc == null ? other$desc != null : !this$desc.equals(other$desc));
    }

    protected boolean canEqual(Object other) {
        return other instanceof AlarmInfo;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        Integer $code = this.getCode();
        result = result * 59 + ($code == null ? 43 : ((Object)$code).hashCode());
        Integer $times = this.getTimes();
        result = result * 59 + ($times == null ? 43 : ((Object)$times).hashCode());
        Integer $timestamp = this.getTimestamp();
        result = result * 59 + ($timestamp == null ? 43 : ((Object)$timestamp).hashCode());
        String $desc = this.getDesc();
        result = result * 59 + ($desc == null ? 43 : $desc.hashCode());
        return result;
    }

    public String toString() {
        return "AlarmInfo(code=" + this.getCode() + ", desc=" + this.getDesc() + ", times=" + this.getTimes() + ", timestamp=" + this.getTimestamp() + ")";
    }
}

