/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.vo.req.WorkSiteLogResp
 */
package com.seer.rds.vo.req;

public class WorkSiteLogResp {
    private String id;
    private String workSiteId;
    private String oprUser;
    private String oprType;
    private String createDate;

    public String getId() {
        return this.id;
    }

    public String getWorkSiteId() {
        return this.workSiteId;
    }

    public String getOprUser() {
        return this.oprUser;
    }

    public String getOprType() {
        return this.oprType;
    }

    public String getCreateDate() {
        return this.createDate;
    }

    public void setId(String id) {
        this.id = id;
    }

    public void setWorkSiteId(String workSiteId) {
        this.workSiteId = workSiteId;
    }

    public void setOprUser(String oprUser) {
        this.oprUser = oprUser;
    }

    public void setOprType(String oprType) {
        this.oprType = oprType;
    }

    public void setCreateDate(String createDate) {
        this.createDate = createDate;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof WorkSiteLogResp)) {
            return false;
        }
        WorkSiteLogResp other = (WorkSiteLogResp)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        String this$id = this.getId();
        String other$id = other.getId();
        if (this$id == null ? other$id != null : !this$id.equals(other$id)) {
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
        String this$oprType = this.getOprType();
        String other$oprType = other.getOprType();
        if (this$oprType == null ? other$oprType != null : !this$oprType.equals(other$oprType)) {
            return false;
        }
        String this$createDate = this.getCreateDate();
        String other$createDate = other.getCreateDate();
        return !(this$createDate == null ? other$createDate != null : !this$createDate.equals(other$createDate));
    }

    protected boolean canEqual(Object other) {
        return other instanceof WorkSiteLogResp;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        String $id = this.getId();
        result = result * 59 + ($id == null ? 43 : $id.hashCode());
        String $workSiteId = this.getWorkSiteId();
        result = result * 59 + ($workSiteId == null ? 43 : $workSiteId.hashCode());
        String $oprUser = this.getOprUser();
        result = result * 59 + ($oprUser == null ? 43 : $oprUser.hashCode());
        String $oprType = this.getOprType();
        result = result * 59 + ($oprType == null ? 43 : $oprType.hashCode());
        String $createDate = this.getCreateDate();
        result = result * 59 + ($createDate == null ? 43 : $createDate.hashCode());
        return result;
    }

    public String toString() {
        return "WorkSiteLogResp(id=" + this.getId() + ", workSiteId=" + this.getWorkSiteId() + ", oprUser=" + this.getOprUser() + ", oprType=" + this.getOprType() + ", createDate=" + this.getCreateDate() + ")";
    }
}

