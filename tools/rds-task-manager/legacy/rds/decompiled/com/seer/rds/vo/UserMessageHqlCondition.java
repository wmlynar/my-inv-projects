/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.vo.UserMessageHqlCondition
 *  com.seer.rds.vo.UserMessageHqlCondition$UserMessageHqlConditionBuilder
 */
package com.seer.rds.vo;

import com.seer.rds.vo.UserMessageHqlCondition;

public class UserMessageHqlCondition {
    private Integer level;
    private Integer ifRead;
    private String startDate;
    private String endDate;
    private Boolean isOrderDesc;

    public static UserMessageHqlConditionBuilder builder() {
        return new UserMessageHqlConditionBuilder();
    }

    public Integer getLevel() {
        return this.level;
    }

    public Integer getIfRead() {
        return this.ifRead;
    }

    public String getStartDate() {
        return this.startDate;
    }

    public String getEndDate() {
        return this.endDate;
    }

    public Boolean getIsOrderDesc() {
        return this.isOrderDesc;
    }

    public void setLevel(Integer level) {
        this.level = level;
    }

    public void setIfRead(Integer ifRead) {
        this.ifRead = ifRead;
    }

    public void setStartDate(String startDate) {
        this.startDate = startDate;
    }

    public void setEndDate(String endDate) {
        this.endDate = endDate;
    }

    public void setIsOrderDesc(Boolean isOrderDesc) {
        this.isOrderDesc = isOrderDesc;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof UserMessageHqlCondition)) {
            return false;
        }
        UserMessageHqlCondition other = (UserMessageHqlCondition)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        Integer this$level = this.getLevel();
        Integer other$level = other.getLevel();
        if (this$level == null ? other$level != null : !((Object)this$level).equals(other$level)) {
            return false;
        }
        Integer this$ifRead = this.getIfRead();
        Integer other$ifRead = other.getIfRead();
        if (this$ifRead == null ? other$ifRead != null : !((Object)this$ifRead).equals(other$ifRead)) {
            return false;
        }
        Boolean this$isOrderDesc = this.getIsOrderDesc();
        Boolean other$isOrderDesc = other.getIsOrderDesc();
        if (this$isOrderDesc == null ? other$isOrderDesc != null : !((Object)this$isOrderDesc).equals(other$isOrderDesc)) {
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
        return other instanceof UserMessageHqlCondition;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        Integer $level = this.getLevel();
        result = result * 59 + ($level == null ? 43 : ((Object)$level).hashCode());
        Integer $ifRead = this.getIfRead();
        result = result * 59 + ($ifRead == null ? 43 : ((Object)$ifRead).hashCode());
        Boolean $isOrderDesc = this.getIsOrderDesc();
        result = result * 59 + ($isOrderDesc == null ? 43 : ((Object)$isOrderDesc).hashCode());
        String $startDate = this.getStartDate();
        result = result * 59 + ($startDate == null ? 43 : $startDate.hashCode());
        String $endDate = this.getEndDate();
        result = result * 59 + ($endDate == null ? 43 : $endDate.hashCode());
        return result;
    }

    public String toString() {
        return "UserMessageHqlCondition(level=" + this.getLevel() + ", ifRead=" + this.getIfRead() + ", startDate=" + this.getStartDate() + ", endDate=" + this.getEndDate() + ", isOrderDesc=" + this.getIsOrderDesc() + ")";
    }

    public UserMessageHqlCondition() {
    }

    public UserMessageHqlCondition(Integer level, Integer ifRead, String startDate, String endDate, Boolean isOrderDesc) {
        this.level = level;
        this.ifRead = ifRead;
        this.startDate = startDate;
        this.endDate = endDate;
        this.isOrderDesc = isOrderDesc;
    }
}

