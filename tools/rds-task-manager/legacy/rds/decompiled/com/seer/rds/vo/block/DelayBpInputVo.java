/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.vo.block.DelayBpInputVo
 */
package com.seer.rds.vo.block;

public class DelayBpInputVo {
    private Long timeMillis;

    public Long getTimeMillis() {
        return this.timeMillis;
    }

    public void setTimeMillis(Long timeMillis) {
        this.timeMillis = timeMillis;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof DelayBpInputVo)) {
            return false;
        }
        DelayBpInputVo other = (DelayBpInputVo)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        Long this$timeMillis = this.getTimeMillis();
        Long other$timeMillis = other.getTimeMillis();
        return !(this$timeMillis == null ? other$timeMillis != null : !((Object)this$timeMillis).equals(other$timeMillis));
    }

    protected boolean canEqual(Object other) {
        return other instanceof DelayBpInputVo;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        Long $timeMillis = this.getTimeMillis();
        result = result * 59 + ($timeMillis == null ? 43 : ((Object)$timeMillis).hashCode());
        return result;
    }

    public String toString() {
        return "DelayBpInputVo(timeMillis=" + this.getTimeMillis() + ")";
    }
}

