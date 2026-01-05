/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.vo.req.SystemLogReq
 */
package com.seer.rds.vo.req;

public class SystemLogReq {
    private String level;
    private String oprUser;
    private String startDate;
    private String endDate;

    public String getLevel() {
        return this.level;
    }

    public String getOprUser() {
        return this.oprUser;
    }

    public String getStartDate() {
        return this.startDate;
    }

    public String getEndDate() {
        return this.endDate;
    }

    public void setLevel(String level) {
        this.level = level;
    }

    public void setOprUser(String oprUser) {
        this.oprUser = oprUser;
    }

    public void setStartDate(String startDate) {
        this.startDate = startDate;
    }

    public void setEndDate(String endDate) {
        this.endDate = endDate;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof SystemLogReq)) {
            return false;
        }
        SystemLogReq other = (SystemLogReq)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        String this$level = this.getLevel();
        String other$level = other.getLevel();
        if (this$level == null ? other$level != null : !this$level.equals(other$level)) {
            return false;
        }
        String this$oprUser = this.getOprUser();
        String other$oprUser = other.getOprUser();
        if (this$oprUser == null ? other$oprUser != null : !this$oprUser.equals(other$oprUser)) {
            return false;
        }
        String this$startDate = this.getStartDate();
        String other$startDate = other.getStartDate();
        if (this$startDate == null ? other$startDate != null : !this$startDate.equals(other$startDate)) {
            return false;
        }
        String this$endDate = this.getEndDate();
        String other$endDate = other.getEndDate();
        return !(this$endDate == null ? other$endDate != null : !this$endDate.equals(other$endDate));
    }

    protected boolean canEqual(Object other) {
        return other instanceof SystemLogReq;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        String $level = this.getLevel();
        result = result * 59 + ($level == null ? 43 : $level.hashCode());
        String $oprUser = this.getOprUser();
        result = result * 59 + ($oprUser == null ? 43 : $oprUser.hashCode());
        String $startDate = this.getStartDate();
        result = result * 59 + ($startDate == null ? 43 : $startDate.hashCode());
        String $endDate = this.getEndDate();
        result = result * 59 + ($endDate == null ? 43 : $endDate.hashCode());
        return result;
    }

    public String toString() {
        return "SystemLogReq(level=" + this.getLevel() + ", oprUser=" + this.getOprUser() + ", startDate=" + this.getStartDate() + ", endDate=" + this.getEndDate() + ")";
    }
}

