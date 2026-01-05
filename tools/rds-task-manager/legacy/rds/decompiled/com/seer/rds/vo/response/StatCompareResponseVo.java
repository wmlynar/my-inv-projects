/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.vo.response.StatCompareResponseVo
 *  com.seer.rds.vo.response.StatCompareResponseVo$StatCompareResponseVoBuilder
 *  com.seer.rds.vo.response.StatRecordCompareVo
 */
package com.seer.rds.vo.response;

import com.seer.rds.vo.response.StatCompareResponseVo;
import com.seer.rds.vo.response.StatRecordCompareVo;
import java.util.List;

public class StatCompareResponseVo {
    private String date;
    private List<StatRecordCompareVo> statRecordVos;

    public static StatCompareResponseVoBuilder builder() {
        return new StatCompareResponseVoBuilder();
    }

    public String getDate() {
        return this.date;
    }

    public List<StatRecordCompareVo> getStatRecordVos() {
        return this.statRecordVos;
    }

    public void setDate(String date) {
        this.date = date;
    }

    public void setStatRecordVos(List<StatRecordCompareVo> statRecordVos) {
        this.statRecordVos = statRecordVos;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof StatCompareResponseVo)) {
            return false;
        }
        StatCompareResponseVo other = (StatCompareResponseVo)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        String this$date = this.getDate();
        String other$date = other.getDate();
        if (this$date == null ? other$date != null : !this$date.equals(other$date)) {
            return false;
        }
        List this$statRecordVos = this.getStatRecordVos();
        List other$statRecordVos = other.getStatRecordVos();
        return !(this$statRecordVos == null ? other$statRecordVos != null : !((Object)this$statRecordVos).equals(other$statRecordVos));
    }

    protected boolean canEqual(Object other) {
        return other instanceof StatCompareResponseVo;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        String $date = this.getDate();
        result = result * 59 + ($date == null ? 43 : $date.hashCode());
        List $statRecordVos = this.getStatRecordVos();
        result = result * 59 + ($statRecordVos == null ? 43 : ((Object)$statRecordVos).hashCode());
        return result;
    }

    public String toString() {
        return "StatCompareResponseVo(date=" + this.getDate() + ", statRecordVos=" + this.getStatRecordVos() + ")";
    }

    public StatCompareResponseVo() {
    }

    public StatCompareResponseVo(String date, List<StatRecordCompareVo> statRecordVos) {
        this.date = date;
        this.statRecordVos = statRecordVos;
    }
}

