/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.vo.response.StatRecordDuplicateVo
 *  com.seer.rds.vo.response.StatResponseDuplicateVo
 *  com.seer.rds.vo.response.StatResponseDuplicateVo$StatResponseDuplicateVoBuilder
 */
package com.seer.rds.vo.response;

import com.seer.rds.vo.response.StatRecordDuplicateVo;
import com.seer.rds.vo.response.StatResponseDuplicateVo;
import java.math.BigDecimal;
import java.util.List;

public class StatResponseDuplicateVo {
    private String date;
    private BigDecimal total;
    private BigDecimal average;
    private String type;
    private List<StatRecordDuplicateVo> statRecordVos;

    public static StatResponseDuplicateVoBuilder builder() {
        return new StatResponseDuplicateVoBuilder();
    }

    public String getDate() {
        return this.date;
    }

    public BigDecimal getTotal() {
        return this.total;
    }

    public BigDecimal getAverage() {
        return this.average;
    }

    public String getType() {
        return this.type;
    }

    public List<StatRecordDuplicateVo> getStatRecordVos() {
        return this.statRecordVos;
    }

    public void setDate(String date) {
        this.date = date;
    }

    public void setTotal(BigDecimal total) {
        this.total = total;
    }

    public void setAverage(BigDecimal average) {
        this.average = average;
    }

    public void setType(String type) {
        this.type = type;
    }

    public void setStatRecordVos(List<StatRecordDuplicateVo> statRecordVos) {
        this.statRecordVos = statRecordVos;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof StatResponseDuplicateVo)) {
            return false;
        }
        StatResponseDuplicateVo other = (StatResponseDuplicateVo)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        String this$date = this.getDate();
        String other$date = other.getDate();
        if (this$date == null ? other$date != null : !this$date.equals(other$date)) {
            return false;
        }
        BigDecimal this$total = this.getTotal();
        BigDecimal other$total = other.getTotal();
        if (this$total == null ? other$total != null : !((Object)this$total).equals(other$total)) {
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
        List this$statRecordVos = this.getStatRecordVos();
        List other$statRecordVos = other.getStatRecordVos();
        return !(this$statRecordVos == null ? other$statRecordVos != null : !((Object)this$statRecordVos).equals(other$statRecordVos));
    }

    protected boolean canEqual(Object other) {
        return other instanceof StatResponseDuplicateVo;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        String $date = this.getDate();
        result = result * 59 + ($date == null ? 43 : $date.hashCode());
        BigDecimal $total = this.getTotal();
        result = result * 59 + ($total == null ? 43 : ((Object)$total).hashCode());
        BigDecimal $average = this.getAverage();
        result = result * 59 + ($average == null ? 43 : ((Object)$average).hashCode());
        String $type = this.getType();
        result = result * 59 + ($type == null ? 43 : $type.hashCode());
        List $statRecordVos = this.getStatRecordVos();
        result = result * 59 + ($statRecordVos == null ? 43 : ((Object)$statRecordVos).hashCode());
        return result;
    }

    public String toString() {
        return "StatResponseDuplicateVo(date=" + this.getDate() + ", total=" + this.getTotal() + ", average=" + this.getAverage() + ", type=" + this.getType() + ", statRecordVos=" + this.getStatRecordVos() + ")";
    }

    public StatResponseDuplicateVo() {
    }

    public StatResponseDuplicateVo(String date, BigDecimal total, BigDecimal average, String type, List<StatRecordDuplicateVo> statRecordVos) {
        this.date = date;
        this.total = total;
        this.average = average;
        this.type = type;
        this.statRecordVos = statRecordVos;
    }
}

