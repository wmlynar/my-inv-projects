/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.fasterxml.jackson.annotation.JsonIgnoreProperties
 *  com.seer.rds.vo.response.AlarmsDetailVo
 *  com.seer.rds.vo.response.AlarmsDetailVo$AlarmsDetailVoBuilder
 */
package com.seer.rds.vo.response;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.seer.rds.vo.response.AlarmsDetailVo;
import java.math.BigDecimal;

@JsonIgnoreProperties(ignoreUnknown=true)
public class AlarmsDetailVo {
    private Integer code;
    private String desc;
    private Integer times;
    private BigDecimal timestamp;

    public static AlarmsDetailVoBuilder builder() {
        return new AlarmsDetailVoBuilder();
    }

    public Integer getCode() {
        return this.code;
    }

    public String getDesc() {
        return this.desc;
    }

    public Integer getTimes() {
        return this.times;
    }

    public BigDecimal getTimestamp() {
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

    public void setTimestamp(BigDecimal timestamp) {
        this.timestamp = timestamp;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof AlarmsDetailVo)) {
            return false;
        }
        AlarmsDetailVo other = (AlarmsDetailVo)o;
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
        String this$desc = this.getDesc();
        String other$desc = other.getDesc();
        if (this$desc == null ? other$desc != null : !this$desc.equals(other$desc)) {
            return false;
        }
        BigDecimal this$timestamp = this.getTimestamp();
        BigDecimal other$timestamp = other.getTimestamp();
        return !(this$timestamp == null ? other$timestamp != null : !((Object)this$timestamp).equals(other$timestamp));
    }

    protected boolean canEqual(Object other) {
        return other instanceof AlarmsDetailVo;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        Integer $code = this.getCode();
        result = result * 59 + ($code == null ? 43 : ((Object)$code).hashCode());
        Integer $times = this.getTimes();
        result = result * 59 + ($times == null ? 43 : ((Object)$times).hashCode());
        String $desc = this.getDesc();
        result = result * 59 + ($desc == null ? 43 : $desc.hashCode());
        BigDecimal $timestamp = this.getTimestamp();
        result = result * 59 + ($timestamp == null ? 43 : ((Object)$timestamp).hashCode());
        return result;
    }

    public String toString() {
        return "AlarmsDetailVo(code=" + this.getCode() + ", desc=" + this.getDesc() + ", times=" + this.getTimes() + ", timestamp=" + this.getTimestamp() + ")";
    }

    public AlarmsDetailVo() {
    }

    public AlarmsDetailVo(Integer code, String desc, Integer times, BigDecimal timestamp) {
        this.code = code;
        this.desc = desc;
        this.times = times;
        this.timestamp = timestamp;
    }
}

