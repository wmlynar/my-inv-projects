/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.model.distribute.DistributeRecord
 *  javax.persistence.Column
 *  javax.persistence.Entity
 *  javax.persistence.GeneratedValue
 *  javax.persistence.Id
 *  javax.persistence.Index
 *  javax.persistence.Table
 *  javax.persistence.Transient
 *  org.hibernate.annotations.GenericGenerator
 */
package com.seer.rds.model.distribute;

import java.util.Date;
import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.GeneratedValue;
import javax.persistence.Id;
import javax.persistence.Index;
import javax.persistence.Table;
import javax.persistence.Transient;
import org.hibernate.annotations.GenericGenerator;

@Entity
@Table(name="t_distribute_record", indexes={@Index(name="distributeisend", columnList="is_end"), @Index(name="distributetaskrecordid", columnList="distribute_id", unique=true)})
public class DistributeRecord {
    @Id
    @GenericGenerator(name="idGenerator", strategy="uuid")
    @GeneratedValue(generator="idGenerator")
    private String id;
    @Column(name="task_record_id")
    private String taskRecordId;
    @Column(name="distribute_id")
    private String distributeId;
    @Column(name="agv_id")
    private String agvId;
    @Column(name="create_time")
    private Date createTime;
    @Column(name="is_end")
    private Integer isEnd;
    private String remark;
    private String defLabel;
    @Transient
    private String loc;
    @Transient
    private Integer mode;
    @Transient
    private boolean distributeFlag;
    @Transient
    private String fromLoc;
    @Transient
    private String toLoc;

    public String getId() {
        return this.id;
    }

    public String getTaskRecordId() {
        return this.taskRecordId;
    }

    public String getDistributeId() {
        return this.distributeId;
    }

    public String getAgvId() {
        return this.agvId;
    }

    public Date getCreateTime() {
        return this.createTime;
    }

    public Integer getIsEnd() {
        return this.isEnd;
    }

    public String getRemark() {
        return this.remark;
    }

    public String getDefLabel() {
        return this.defLabel;
    }

    public String getLoc() {
        return this.loc;
    }

    public Integer getMode() {
        return this.mode;
    }

    public boolean isDistributeFlag() {
        return this.distributeFlag;
    }

    public String getFromLoc() {
        return this.fromLoc;
    }

    public String getToLoc() {
        return this.toLoc;
    }

    public void setId(String id) {
        this.id = id;
    }

    public void setTaskRecordId(String taskRecordId) {
        this.taskRecordId = taskRecordId;
    }

    public void setDistributeId(String distributeId) {
        this.distributeId = distributeId;
    }

    public void setAgvId(String agvId) {
        this.agvId = agvId;
    }

    public void setCreateTime(Date createTime) {
        this.createTime = createTime;
    }

    public void setIsEnd(Integer isEnd) {
        this.isEnd = isEnd;
    }

    public void setRemark(String remark) {
        this.remark = remark;
    }

    public void setDefLabel(String defLabel) {
        this.defLabel = defLabel;
    }

    public void setLoc(String loc) {
        this.loc = loc;
    }

    public void setMode(Integer mode) {
        this.mode = mode;
    }

    public void setDistributeFlag(boolean distributeFlag) {
        this.distributeFlag = distributeFlag;
    }

    public void setFromLoc(String fromLoc) {
        this.fromLoc = fromLoc;
    }

    public void setToLoc(String toLoc) {
        this.toLoc = toLoc;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof DistributeRecord)) {
            return false;
        }
        DistributeRecord other = (DistributeRecord)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        if (this.isDistributeFlag() != other.isDistributeFlag()) {
            return false;
        }
        Integer this$isEnd = this.getIsEnd();
        Integer other$isEnd = other.getIsEnd();
        if (this$isEnd == null ? other$isEnd != null : !((Object)this$isEnd).equals(other$isEnd)) {
            return false;
        }
        Integer this$mode = this.getMode();
        Integer other$mode = other.getMode();
        if (this$mode == null ? other$mode != null : !((Object)this$mode).equals(other$mode)) {
            return false;
        }
        String this$id = this.getId();
        String other$id = other.getId();
        if (this$id == null ? other$id != null : !this$id.equals(other$id)) {
            return false;
        }
        String this$taskRecordId = this.getTaskRecordId();
        String other$taskRecordId = other.getTaskRecordId();
        if (this$taskRecordId == null ? other$taskRecordId != null : !this$taskRecordId.equals(other$taskRecordId)) {
            return false;
        }
        String this$distributeId = this.getDistributeId();
        String other$distributeId = other.getDistributeId();
        if (this$distributeId == null ? other$distributeId != null : !this$distributeId.equals(other$distributeId)) {
            return false;
        }
        String this$agvId = this.getAgvId();
        String other$agvId = other.getAgvId();
        if (this$agvId == null ? other$agvId != null : !this$agvId.equals(other$agvId)) {
            return false;
        }
        Date this$createTime = this.getCreateTime();
        Date other$createTime = other.getCreateTime();
        if (this$createTime == null ? other$createTime != null : !((Object)this$createTime).equals(other$createTime)) {
            return false;
        }
        String this$remark = this.getRemark();
        String other$remark = other.getRemark();
        if (this$remark == null ? other$remark != null : !this$remark.equals(other$remark)) {
            return false;
        }
        String this$defLabel = this.getDefLabel();
        String other$defLabel = other.getDefLabel();
        if (this$defLabel == null ? other$defLabel != null : !this$defLabel.equals(other$defLabel)) {
            return false;
        }
        String this$loc = this.getLoc();
        String other$loc = other.getLoc();
        if (this$loc == null ? other$loc != null : !this$loc.equals(other$loc)) {
            return false;
        }
        String this$fromLoc = this.getFromLoc();
        String other$fromLoc = other.getFromLoc();
        if (this$fromLoc == null ? other$fromLoc != null : !this$fromLoc.equals(other$fromLoc)) {
            return false;
        }
        String this$toLoc = this.getToLoc();
        String other$toLoc = other.getToLoc();
        return !(this$toLoc == null ? other$toLoc != null : !this$toLoc.equals(other$toLoc));
    }

    protected boolean canEqual(Object other) {
        return other instanceof DistributeRecord;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        result = result * 59 + (this.isDistributeFlag() ? 79 : 97);
        Integer $isEnd = this.getIsEnd();
        result = result * 59 + ($isEnd == null ? 43 : ((Object)$isEnd).hashCode());
        Integer $mode = this.getMode();
        result = result * 59 + ($mode == null ? 43 : ((Object)$mode).hashCode());
        String $id = this.getId();
        result = result * 59 + ($id == null ? 43 : $id.hashCode());
        String $taskRecordId = this.getTaskRecordId();
        result = result * 59 + ($taskRecordId == null ? 43 : $taskRecordId.hashCode());
        String $distributeId = this.getDistributeId();
        result = result * 59 + ($distributeId == null ? 43 : $distributeId.hashCode());
        String $agvId = this.getAgvId();
        result = result * 59 + ($agvId == null ? 43 : $agvId.hashCode());
        Date $createTime = this.getCreateTime();
        result = result * 59 + ($createTime == null ? 43 : ((Object)$createTime).hashCode());
        String $remark = this.getRemark();
        result = result * 59 + ($remark == null ? 43 : $remark.hashCode());
        String $defLabel = this.getDefLabel();
        result = result * 59 + ($defLabel == null ? 43 : $defLabel.hashCode());
        String $loc = this.getLoc();
        result = result * 59 + ($loc == null ? 43 : $loc.hashCode());
        String $fromLoc = this.getFromLoc();
        result = result * 59 + ($fromLoc == null ? 43 : $fromLoc.hashCode());
        String $toLoc = this.getToLoc();
        result = result * 59 + ($toLoc == null ? 43 : $toLoc.hashCode());
        return result;
    }

    public String toString() {
        return "DistributeRecord(id=" + this.getId() + ", taskRecordId=" + this.getTaskRecordId() + ", distributeId=" + this.getDistributeId() + ", agvId=" + this.getAgvId() + ", createTime=" + this.getCreateTime() + ", isEnd=" + this.getIsEnd() + ", remark=" + this.getRemark() + ", defLabel=" + this.getDefLabel() + ", loc=" + this.getLoc() + ", mode=" + this.getMode() + ", distributeFlag=" + this.isDistributeFlag() + ", fromLoc=" + this.getFromLoc() + ", toLoc=" + this.getToLoc() + ")";
    }
}

