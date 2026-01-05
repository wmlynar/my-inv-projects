/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.model.stat.TimePeriod
 *  org.springframework.format.annotation.DateTimeFormat
 */
package com.seer.rds.model.stat;

import java.util.Date;
import org.springframework.format.annotation.DateTimeFormat;

public class TimePeriod {
    @DateTimeFormat(pattern="yyyy-MM-dd HH:mm:ss")
    private Date beginTime;
    @DateTimeFormat(pattern="yyyy-MM-dd HH:mm:ss")
    private Date endTime;

    public Date getBeginTime() {
        return this.beginTime;
    }

    public Date getEndTime() {
        return this.endTime;
    }

    public void setBeginTime(Date beginTime) {
        this.beginTime = beginTime;
    }

    public void setEndTime(Date endTime) {
        this.endTime = endTime;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof TimePeriod)) {
            return false;
        }
        TimePeriod other = (TimePeriod)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        Date this$beginTime = this.getBeginTime();
        Date other$beginTime = other.getBeginTime();
        if (this$beginTime == null ? other$beginTime != null : !((Object)this$beginTime).equals(other$beginTime)) {
            return false;
        }
        Date this$endTime = this.getEndTime();
        Date other$endTime = other.getEndTime();
        return !(this$endTime == null ? other$endTime != null : !((Object)this$endTime).equals(other$endTime));
    }

    protected boolean canEqual(Object other) {
        return other instanceof TimePeriod;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        Date $beginTime = this.getBeginTime();
        result = result * 59 + ($beginTime == null ? 43 : ((Object)$beginTime).hashCode());
        Date $endTime = this.getEndTime();
        result = result * 59 + ($endTime == null ? 43 : ((Object)$endTime).hashCode());
        return result;
    }

    public String toString() {
        return "TimePeriod(beginTime=" + this.getBeginTime() + ", endTime=" + this.getEndTime() + ")";
    }

    public TimePeriod(Date beginTime, Date endTime) {
        this.beginTime = beginTime;
        this.endTime = endTime;
    }

    public TimePeriod() {
    }
}

