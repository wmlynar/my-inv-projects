/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.model.worksite.WorkSiteLog
 *  com.seer.rds.model.worksite.WorkSiteLog$WorkSiteLogBuilder
 *  javax.persistence.Entity
 *  javax.persistence.GeneratedValue
 *  javax.persistence.Id
 *  javax.persistence.Index
 *  javax.persistence.Table
 *  org.hibernate.annotations.GenericGenerator
 */
package com.seer.rds.model.worksite;

import com.seer.rds.model.worksite.WorkSiteLog;
import java.util.Date;
import javax.persistence.Entity;
import javax.persistence.GeneratedValue;
import javax.persistence.Id;
import javax.persistence.Index;
import javax.persistence.Table;
import org.hibernate.annotations.GenericGenerator;

@Entity
@Table(name="t_worksite_log", indexes={@Index(name="oprUserIndex", columnList="oprUser"), @Index(name="workSiteIdIndex", columnList="workSiteId"), @Index(name="oprTypeIndex", columnList="oprType"), @Index(name="createDateIndex", columnList="createDate")})
public class WorkSiteLog {
    @Id
    @GenericGenerator(name="idGenerator", strategy="uuid")
    @GeneratedValue(generator="idGenerator")
    private String id;
    private String workSiteId;
    private String oprUser;
    private int oprType;
    private Date createDate;
    private String remark;

    public static WorkSiteLogBuilder builder() {
        return new WorkSiteLogBuilder();
    }

    public String getId() {
        return this.id;
    }

    public String getWorkSiteId() {
        return this.workSiteId;
    }

    public String getOprUser() {
        return this.oprUser;
    }

    public int getOprType() {
        return this.oprType;
    }

    public Date getCreateDate() {
        return this.createDate;
    }

    public String getRemark() {
        return this.remark;
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

    public void setOprType(int oprType) {
        this.oprType = oprType;
    }

    public void setCreateDate(Date createDate) {
        this.createDate = createDate;
    }

    public void setRemark(String remark) {
        this.remark = remark;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof WorkSiteLog)) {
            return false;
        }
        WorkSiteLog other = (WorkSiteLog)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        if (this.getOprType() != other.getOprType()) {
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
        Date this$createDate = this.getCreateDate();
        Date other$createDate = other.getCreateDate();
        if (this$createDate == null ? other$createDate != null : !((Object)this$createDate).equals(other$createDate)) {
            return false;
        }
        String this$remark = this.getRemark();
        String other$remark = other.getRemark();
        return !(this$remark == null ? other$remark != null : !this$remark.equals(other$remark));
    }

    protected boolean canEqual(Object other) {
        return other instanceof WorkSiteLog;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        result = result * 59 + this.getOprType();
        String $id = this.getId();
        result = result * 59 + ($id == null ? 43 : $id.hashCode());
        String $workSiteId = this.getWorkSiteId();
        result = result * 59 + ($workSiteId == null ? 43 : $workSiteId.hashCode());
        String $oprUser = this.getOprUser();
        result = result * 59 + ($oprUser == null ? 43 : $oprUser.hashCode());
        Date $createDate = this.getCreateDate();
        result = result * 59 + ($createDate == null ? 43 : ((Object)$createDate).hashCode());
        String $remark = this.getRemark();
        result = result * 59 + ($remark == null ? 43 : $remark.hashCode());
        return result;
    }

    public String toString() {
        return "WorkSiteLog(id=" + this.getId() + ", workSiteId=" + this.getWorkSiteId() + ", oprUser=" + this.getOprUser() + ", oprType=" + this.getOprType() + ", createDate=" + this.getCreateDate() + ", remark=" + this.getRemark() + ")";
    }

    public WorkSiteLog(String id, String workSiteId, String oprUser, int oprType, Date createDate, String remark) {
        this.id = id;
        this.workSiteId = workSiteId;
        this.oprUser = oprUser;
        this.oprType = oprType;
        this.createDate = createDate;
        this.remark = remark;
    }

    public WorkSiteLog() {
    }
}

