/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.vo.AlarmVo
 */
package com.seer.rds.vo;

public class AlarmVo {
    private Integer code;
    private String description;
    private String solutions;
    private String time;

    public Integer getCode() {
        return this.code;
    }

    public String getDescription() {
        return this.description;
    }

    public String getSolutions() {
        return this.solutions;
    }

    public String getTime() {
        return this.time;
    }

    public void setCode(Integer code) {
        this.code = code;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public void setSolutions(String solutions) {
        this.solutions = solutions;
    }

    public void setTime(String time) {
        this.time = time;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof AlarmVo)) {
            return false;
        }
        AlarmVo other = (AlarmVo)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        Integer this$code = this.getCode();
        Integer other$code = other.getCode();
        if (this$code == null ? other$code != null : !((Object)this$code).equals(other$code)) {
            return false;
        }
        String this$description = this.getDescription();
        String other$description = other.getDescription();
        if (this$description == null ? other$description != null : !this$description.equals(other$description)) {
            return false;
        }
        String this$solutions = this.getSolutions();
        String other$solutions = other.getSolutions();
        if (this$solutions == null ? other$solutions != null : !this$solutions.equals(other$solutions)) {
            return false;
        }
        String this$time = this.getTime();
        String other$time = other.getTime();
        return !(this$time == null ? other$time != null : !this$time.equals(other$time));
    }

    protected boolean canEqual(Object other) {
        return other instanceof AlarmVo;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        Integer $code = this.getCode();
        result = result * 59 + ($code == null ? 43 : ((Object)$code).hashCode());
        String $description = this.getDescription();
        result = result * 59 + ($description == null ? 43 : $description.hashCode());
        String $solutions = this.getSolutions();
        result = result * 59 + ($solutions == null ? 43 : $solutions.hashCode());
        String $time = this.getTime();
        result = result * 59 + ($time == null ? 43 : $time.hashCode());
        return result;
    }

    public String toString() {
        return "AlarmVo(code=" + this.getCode() + ", description=" + this.getDescription() + ", solutions=" + this.getSolutions() + ", time=" + this.getTime() + ")";
    }
}

