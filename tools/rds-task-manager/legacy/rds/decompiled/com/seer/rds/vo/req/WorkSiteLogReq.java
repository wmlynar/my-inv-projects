/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.vo.req.WorkSiteLogReq
 */
package com.seer.rds.vo.req;

import java.util.Date;

public class WorkSiteLogReq {
    private String workSiteId;
    private Integer oprType;
    private String oprUser;
    private Date startDate;
    private Date endDate;

    public String getWorkSiteId() {
        return this.workSiteId;
    }

    public Integer getOprType() {
        return this.oprType;
    }

    public String getOprUser() {
        return this.oprUser;
    }

    public Date getStartDate() {
        return this.startDate;
    }

    public Date getEndDate() {
        return this.endDate;
    }

    public void setWorkSiteId(String workSiteId) {
        this.workSiteId = workSiteId;
    }

    public void setOprType(Integer oprType) {
        this.oprType = oprType;
    }

    public void setOprUser(String oprUser) {
        this.oprUser = oprUser;
    }

    public void setStartDate(Date startDate) {
        this.startDate = startDate;
    }

    public void setEndDate(Date endDate) {
        this.endDate = endDate;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof WorkSiteLogReq)) {
            return false;
        }
        WorkSiteLogReq other = (WorkSiteLogReq)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        Integer this$oprType = this.getOprType();
        Integer other$oprType = other.getOprType();
        if (this$oprType == null ? other$oprType != null : !((Object)this$oprType).equals(other$oprType)) {
            return false;
        }
        String this$workSiteId = this.getWorkSiteId();
        String other$workSiteId = other.getWorkSiteId();
        if (this$workSiteId == null ? other$workSiteId != null : !this$workSiteId.equals(other$workSiteId)) {
            return false;
        }
        String this$oprUser = this.getOprUser();
        String other$oprUser = other.getOprUser();
        if (this$oprUser == null ? other$oprUser != null : !this$oprUser.equals(other$oprUser)) {
            return false;
        }
        Date this$startDate = this.getStartDate();
        Date other$startDate = other.getStartDate();
        if (this$startDate == null ? other$startDate != null : !((Object)this$startDate).equals(other$startDate)) {
            return false;
        }
        Date this$endDate = this.getEndDate();
        Date other$endDate = other.getEndDate();
        return !(this$endDate == null ? other$endDate != null : !((Object)this$endDate).equals(other$endDate));
    }

    protected boolean canEqual(Object other) {
        return other instanceof WorkSiteLogReq;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        Integer $oprType = this.getOprType();
        result = result * 59 + ($oprType == null ? 43 : ((Object)$oprType).hashCode());
        String $workSiteId = this.getWorkSiteId();
        result = result * 59 + ($workSiteId == null ? 43 : $workSiteId.hashCode());
        String $oprUser = this.getOprUser();
        result = result * 59 + ($oprUser == null ? 43 : $oprUser.hashCode());
        Date $startDate = this.getStartDate();
        result = result * 59 + ($startDate == null ? 43 : ((Object)$startDate).hashCode());
        Date $endDate = this.getEndDate();
        result = result * 59 + ($endDate == null ? 43 : ((Object)$endDate).hashCode());
        return result;
    }

    public String toString() {
        return "WorkSiteLogReq(workSiteId=" + this.getWorkSiteId() + ", oprType=" + this.getOprType() + ", oprUser=" + this.getOprUser() + ", startDate=" + this.getStartDate() + ", endDate=" + this.getEndDate() + ")";
    }
}

