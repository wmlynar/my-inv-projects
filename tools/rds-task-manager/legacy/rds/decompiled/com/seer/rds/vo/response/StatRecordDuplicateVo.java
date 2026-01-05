/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.model.stat.StatRecordDuplicate
 *  com.seer.rds.vo.response.StatRecordDuplicateVo
 *  com.seer.rds.vo.response.StatRecordDuplicateVo$StatRecordDuplicateVoBuilder
 *  org.apache.commons.compress.utils.Lists
 */
package com.seer.rds.vo.response;

import com.seer.rds.model.stat.StatRecordDuplicate;
import com.seer.rds.vo.response.StatRecordDuplicateVo;
import java.math.BigDecimal;
import java.util.List;
import org.apache.commons.compress.utils.Lists;

/*
 * Exception performing whole class analysis ignored.
 */
public class StatRecordDuplicateVo {
    private String level;
    private String time;
    private String type;
    private BigDecimal value;
    private String id;

    public static StatRecordDuplicateVo toStatRecordVo(StatRecordDuplicate statRecord) {
        return StatRecordDuplicateVo.builder().level(statRecord.getLevel()).time(statRecord.getTime()).type(statRecord.getType()).value(statRecord.getValue()).id(statRecord.getThirdId()).build();
    }

    public static List<StatRecordDuplicateVo> toStatRecordVoList(List<StatRecordDuplicate> statRecordList) {
        return Lists.newArrayList(statRecordList.stream().map(StatRecordDuplicateVo::toStatRecordVo).iterator());
    }

    public static StatRecordDuplicateVoBuilder builder() {
        return new StatRecordDuplicateVoBuilder();
    }

    public String getLevel() {
        return this.level;
    }

    public String getTime() {
        return this.time;
    }

    public String getType() {
        return this.type;
    }

    public BigDecimal getValue() {
        return this.value;
    }

    public String getId() {
        return this.id;
    }

    public void setLevel(String level) {
        this.level = level;
    }

    public void setTime(String time) {
        this.time = time;
    }

    public void setType(String type) {
        this.type = type;
    }

    public void setValue(BigDecimal value) {
        this.value = value;
    }

    public void setId(String id) {
        this.id = id;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof StatRecordDuplicateVo)) {
            return false;
        }
        StatRecordDuplicateVo other = (StatRecordDuplicateVo)o;
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
        String this$type = this.getType();
        String other$type = other.getType();
        if (this$type == null ? other$type != null : !this$type.equals(other$type)) {
            return false;
        }
        BigDecimal this$value = this.getValue();
        BigDecimal other$value = other.getValue();
        if (this$value == null ? other$value != null : !((Object)this$value).equals(other$value)) {
            return false;
        }
        String this$id = this.getId();
        String other$id = other.getId();
        return !(this$id == null ? other$id != null : !this$id.equals(other$id));
    }

    protected boolean canEqual(Object other) {
        return other instanceof StatRecordDuplicateVo;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        String $level = this.getLevel();
        result = result * 59 + ($level == null ? 43 : $level.hashCode());
        String $time = this.getTime();
        result = result * 59 + ($time == null ? 43 : $time.hashCode());
        String $type = this.getType();
        result = result * 59 + ($type == null ? 43 : $type.hashCode());
        BigDecimal $value = this.getValue();
        result = result * 59 + ($value == null ? 43 : ((Object)$value).hashCode());
        String $id = this.getId();
        result = result * 59 + ($id == null ? 43 : $id.hashCode());
        return result;
    }

    public String toString() {
        return "StatRecordDuplicateVo(level=" + this.getLevel() + ", time=" + this.getTime() + ", type=" + this.getType() + ", value=" + this.getValue() + ", id=" + this.getId() + ")";
    }

    public StatRecordDuplicateVo() {
    }

    public StatRecordDuplicateVo(String level, String time, String type, BigDecimal value, String id) {
        this.level = level;
        this.time = time;
        this.type = type;
        this.value = value;
        this.id = id;
    }
}

