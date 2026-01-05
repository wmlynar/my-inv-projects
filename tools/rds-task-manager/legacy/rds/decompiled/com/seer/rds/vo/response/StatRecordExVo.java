/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  cn.afterturn.easypoi.excel.annotation.Excel
 *  com.seer.rds.vo.response.StatRecordExVo
 *  com.seer.rds.vo.response.StatRecordExVo$StatRecordExVoBuilder
 */
package com.seer.rds.vo.response;

import cn.afterturn.easypoi.excel.annotation.Excel;
import com.seer.rds.vo.response.StatRecordExVo;
import java.math.BigDecimal;

public class StatRecordExVo {
    @Excel(name="statRecord.export.thirdId", orderNum="0")
    private String thirdId;
    @Excel(name="statRecord.export.time", orderNum="1")
    private String time;
    @Excel(name="statRecord.export.level", orderNum="2")
    private String level;
    @Excel(name="statRecord.export.value", orderNum="3")
    private BigDecimal value;

    public static StatRecordExVoBuilder builder() {
        return new StatRecordExVoBuilder();
    }

    public String getThirdId() {
        return this.thirdId;
    }

    public String getTime() {
        return this.time;
    }

    public String getLevel() {
        return this.level;
    }

    public BigDecimal getValue() {
        return this.value;
    }

    public void setThirdId(String thirdId) {
        this.thirdId = thirdId;
    }

    public void setTime(String time) {
        this.time = time;
    }

    public void setLevel(String level) {
        this.level = level;
    }

    public void setValue(BigDecimal value) {
        this.value = value;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof StatRecordExVo)) {
            return false;
        }
        StatRecordExVo other = (StatRecordExVo)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        String this$thirdId = this.getThirdId();
        String other$thirdId = other.getThirdId();
        if (this$thirdId == null ? other$thirdId != null : !this$thirdId.equals(other$thirdId)) {
            return false;
        }
        String this$time = this.getTime();
        String other$time = other.getTime();
        if (this$time == null ? other$time != null : !this$time.equals(other$time)) {
            return false;
        }
        String this$level = this.getLevel();
        String other$level = other.getLevel();
        if (this$level == null ? other$level != null : !this$level.equals(other$level)) {
            return false;
        }
        BigDecimal this$value = this.getValue();
        BigDecimal other$value = other.getValue();
        return !(this$value == null ? other$value != null : !((Object)this$value).equals(other$value));
    }

    protected boolean canEqual(Object other) {
        return other instanceof StatRecordExVo;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        String $thirdId = this.getThirdId();
        result = result * 59 + ($thirdId == null ? 43 : $thirdId.hashCode());
        String $time = this.getTime();
        result = result * 59 + ($time == null ? 43 : $time.hashCode());
        String $level = this.getLevel();
        result = result * 59 + ($level == null ? 43 : $level.hashCode());
        BigDecimal $value = this.getValue();
        result = result * 59 + ($value == null ? 43 : ((Object)$value).hashCode());
        return result;
    }

    public String toString() {
        return "StatRecordExVo(thirdId=" + this.getThirdId() + ", time=" + this.getTime() + ", level=" + this.getLevel() + ", value=" + this.getValue() + ")";
    }

    public StatRecordExVo() {
    }

    public StatRecordExVo(String thirdId, String time, String level, BigDecimal value) {
        this.thirdId = thirdId;
        this.time = time;
        this.level = level;
        this.value = value;
    }
}

