/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.vo.response.TimeValueVo
 *  com.seer.rds.vo.response.TimeValueVo$TimeValueVoBuilder
 */
package com.seer.rds.vo.response;

import com.seer.rds.vo.response.TimeValueVo;
import java.math.BigDecimal;

public class TimeValueVo {
    private String time;
    private BigDecimal value;

    public static TimeValueVoBuilder builder() {
        return new TimeValueVoBuilder();
    }

    public String getTime() {
        return this.time;
    }

    public BigDecimal getValue() {
        return this.value;
    }

    public void setTime(String time) {
        this.time = time;
    }

    public void setValue(BigDecimal value) {
        this.value = value;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof TimeValueVo)) {
            return false;
        }
        TimeValueVo other = (TimeValueVo)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        String this$time = this.getTime();
        String other$time = other.getTime();
        if (this$time == null ? other$time != null : !this$time.equals(other$time)) {
            return false;
        }
        BigDecimal this$value = this.getValue();
        BigDecimal other$value = other.getValue();
        return !(this$value == null ? other$value != null : !((Object)this$value).equals(other$value));
    }

    protected boolean canEqual(Object other) {
        return other instanceof TimeValueVo;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        String $time = this.getTime();
        result = result * 59 + ($time == null ? 43 : $time.hashCode());
        BigDecimal $value = this.getValue();
        result = result * 59 + ($value == null ? 43 : ((Object)$value).hashCode());
        return result;
    }

    public String toString() {
        return "TimeValueVo(time=" + this.getTime() + ", value=" + this.getValue() + ")";
    }

    public TimeValueVo() {
    }

    public TimeValueVo(String time, BigDecimal value) {
        this.time = time;
        this.value = value;
    }
}

