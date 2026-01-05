/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.vo.response.StatProportionResponseVo
 *  com.seer.rds.vo.response.StatProportionResponseVo$StatProportionResponseVoBuilder
 *  com.seer.rds.vo.response.TimeValueVo
 */
package com.seer.rds.vo.response;

import com.seer.rds.vo.response.StatProportionResponseVo;
import com.seer.rds.vo.response.TimeValueVo;
import java.math.BigDecimal;
import java.util.List;

public class StatProportionResponseVo {
    private String date;
    private BigDecimal average;
    private String type;
    private List<TimeValueVo> timeValueVos;

    public static StatProportionResponseVoBuilder builder() {
        return new StatProportionResponseVoBuilder();
    }

    public String getDate() {
        return this.date;
    }

    public BigDecimal getAverage() {
        return this.average;
    }

    public String getType() {
        return this.type;
    }

    public List<TimeValueVo> getTimeValueVos() {
        return this.timeValueVos;
    }

    public void setDate(String date) {
        this.date = date;
    }

    public void setAverage(BigDecimal average) {
        this.average = average;
    }

    public void setType(String type) {
        this.type = type;
    }

    public void setTimeValueVos(List<TimeValueVo> timeValueVos) {
        this.timeValueVos = timeValueVos;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof StatProportionResponseVo)) {
            return false;
        }
        StatProportionResponseVo other = (StatProportionResponseVo)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        String this$date = this.getDate();
        String other$date = other.getDate();
        if (this$date == null ? other$date != null : !this$date.equals(other$date)) {
            return false;
        }
        BigDecimal this$average = this.getAverage();
        BigDecimal other$average = other.getAverage();
        if (this$average == null ? other$average != null : !((Object)this$average).equals(other$average)) {
            return false;
        }
        String this$type = this.getType();
        String other$type = other.getType();
        if (this$type == null ? other$type != null : !this$type.equals(other$type)) {
            return false;
        }
        List this$timeValueVos = this.getTimeValueVos();
        List other$timeValueVos = other.getTimeValueVos();
        return !(this$timeValueVos == null ? other$timeValueVos != null : !((Object)this$timeValueVos).equals(other$timeValueVos));
    }

    protected boolean canEqual(Object other) {
        return other instanceof StatProportionResponseVo;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        String $date = this.getDate();
        result = result * 59 + ($date == null ? 43 : $date.hashCode());
        BigDecimal $average = this.getAverage();
        result = result * 59 + ($average == null ? 43 : ((Object)$average).hashCode());
        String $type = this.getType();
        result = result * 59 + ($type == null ? 43 : $type.hashCode());
        List $timeValueVos = this.getTimeValueVos();
        result = result * 59 + ($timeValueVos == null ? 43 : ((Object)$timeValueVos).hashCode());
        return result;
    }

    public String toString() {
        return "StatProportionResponseVo(date=" + this.getDate() + ", average=" + this.getAverage() + ", type=" + this.getType() + ", timeValueVos=" + this.getTimeValueVos() + ")";
    }

    public StatProportionResponseVo() {
    }

    public StatProportionResponseVo(String date, BigDecimal average, String type, List<TimeValueVo> timeValueVos) {
        this.date = date;
        this.average = average;
        this.type = type;
        this.timeValueVos = timeValueVos;
    }
}

