/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.vo.req.StackMemInfoReq
 */
package com.seer.rds.vo.req;

public class StackMemInfoReq {
    private String date;

    public String getDate() {
        return this.date;
    }

    public void setDate(String date) {
        this.date = date;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof StackMemInfoReq)) {
            return false;
        }
        StackMemInfoReq other = (StackMemInfoReq)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        String this$date = this.getDate();
        String other$date = other.getDate();
        return !(this$date == null ? other$date != null : !this$date.equals(other$date));
    }

    protected boolean canEqual(Object other) {
        return other instanceof StackMemInfoReq;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        String $date = this.getDate();
        result = result * 59 + ($date == null ? 43 : $date.hashCode());
        return result;
    }

    public String toString() {
        return "StackMemInfoReq(date=" + this.getDate() + ")";
    }
}

