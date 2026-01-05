/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.vo.response.StatRecordCompareVo
 *  com.seer.rds.vo.response.StatRecordCompareVo$StatRecordCompareVoBuilder
 *  com.seer.rds.vo.response.TypeValueVo
 */
package com.seer.rds.vo.response;

import com.seer.rds.vo.response.StatRecordCompareVo;
import com.seer.rds.vo.response.TypeValueVo;
import java.math.BigDecimal;
import java.util.List;

public class StatRecordCompareVo {
    private String level;
    private String time;
    private List<TypeValueVo> typeValueVos;

    public BigDecimal getTotalValue() {
        BigDecimal sum = BigDecimal.ZERO;
        for (TypeValueVo typeValueVo : this.typeValueVos) {
            sum = sum.add(typeValueVo.getValue());
        }
        return sum;
    }

    public static StatRecordCompareVoBuilder builder() {
        return new StatRecordCompareVoBuilder();
    }

    public String getLevel() {
        return this.level;
    }

    public String getTime() {
        return this.time;
    }

    public List<TypeValueVo> getTypeValueVos() {
        return this.typeValueVos;
    }

    public void setLevel(String level) {
        this.level = level;
    }

    public void setTime(String time) {
        this.time = time;
    }

    public void setTypeValueVos(List<TypeValueVo> typeValueVos) {
        this.typeValueVos = typeValueVos;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof StatRecordCompareVo)) {
            return false;
        }
        StatRecordCompareVo other = (StatRecordCompareVo)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        String this$level = this.getLevel();
        String other$level = other.getLevel();
        if (this$level == null ? other$level != null : !this$level.equals(other$level)) {
            return false;
        }
        String this$time = this.getTime();
        String other$time = other.getTime();
        if (this$time == null ? other$time != null : !this$time.equals(other$time)) {
            return false;
        }
        List this$typeValueVos = this.getTypeValueVos();
        List other$typeValueVos = other.getTypeValueVos();
        return !(this$typeValueVos == null ? other$typeValueVos != null : !((Object)this$typeValueVos).equals(other$typeValueVos));
    }

    protected boolean canEqual(Object other) {
        return other instanceof StatRecordCompareVo;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        String $level = this.getLevel();
        result = result * 59 + ($level == null ? 43 : $level.hashCode());
        String $time = this.getTime();
        result = result * 59 + ($time == null ? 43 : $time.hashCode());
        List $typeValueVos = this.getTypeValueVos();
        result = result * 59 + ($typeValueVos == null ? 43 : ((Object)$typeValueVos).hashCode());
        return result;
    }

    public String toString() {
        return "StatRecordCompareVo(level=" + this.getLevel() + ", time=" + this.getTime() + ", typeValueVos=" + this.getTypeValueVos() + ")";
    }

    public StatRecordCompareVo() {
    }

    public StatRecordCompareVo(String level, String time, List<TypeValueVo> typeValueVos) {
        this.level = level;
        this.time = time;
        this.typeValueVos = typeValueVos;
    }
}

