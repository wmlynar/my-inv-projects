/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.model.device.LiftRecord
 *  com.seer.rds.model.device.LiftRecord$LiftRecordBuilder
 *  javax.persistence.Column
 *  javax.persistence.Entity
 *  javax.persistence.GeneratedValue
 *  javax.persistence.Id
 *  javax.persistence.Index
 *  javax.persistence.Table
 *  javax.persistence.Temporal
 *  javax.persistence.TemporalType
 *  org.hibernate.annotations.CreationTimestamp
 *  org.hibernate.annotations.GenericGenerator
 */
package com.seer.rds.model.device;

import com.seer.rds.model.device.LiftRecord;
import java.util.Date;
import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.GeneratedValue;
import javax.persistence.Id;
import javax.persistence.Index;
import javax.persistence.Table;
import javax.persistence.Temporal;
import javax.persistence.TemporalType;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.GenericGenerator;

@Entity
@Table(name="t_liftrecord", indexes={@Index(name="idx_combined", columnList="pickFloorArea, putFloorArea")})
public class LiftRecord {
    @Id
    @GenericGenerator(name="idGenerator", strategy="uuid")
    @GeneratedValue(generator="idGenerator")
    private String id;
    @CreationTimestamp
    @Temporal(value=TemporalType.TIMESTAMP)
    private Date createTime;
    private String preSiteId;
    private String putSiteId;
    private String pickSiteId;
    private String liftName;
    private String pickFloorArea;
    private String putFloorArea;
    private String taskRecordId;
    @Column(nullable=false)
    private Integer oprType = 0;
    @Column(nullable=false)
    private Integer isCrowed = 0;
    @Column(nullable=false)
    private Integer isInnerSite = 0;
    @Column(nullable=false)
    private Integer isFinshed = 0;

    public static LiftRecordBuilder builder() {
        return new LiftRecordBuilder();
    }

    public String getId() {
        return this.id;
    }

    public Date getCreateTime() {
        return this.createTime;
    }

    public String getPreSiteId() {
        return this.preSiteId;
    }

    public String getPutSiteId() {
        return this.putSiteId;
    }

    public String getPickSiteId() {
        return this.pickSiteId;
    }

    public String getLiftName() {
        return this.liftName;
    }

    public String getPickFloorArea() {
        return this.pickFloorArea;
    }

    public String getPutFloorArea() {
        return this.putFloorArea;
    }

    public String getTaskRecordId() {
        return this.taskRecordId;
    }

    public Integer getOprType() {
        return this.oprType;
    }

    public Integer getIsCrowed() {
        return this.isCrowed;
    }

    public Integer getIsInnerSite() {
        return this.isInnerSite;
    }

    public Integer getIsFinshed() {
        return this.isFinshed;
    }

    public void setId(String id) {
        this.id = id;
    }

    public void setCreateTime(Date createTime) {
        this.createTime = createTime;
    }

    public void setPreSiteId(String preSiteId) {
        this.preSiteId = preSiteId;
    }

    public void setPutSiteId(String putSiteId) {
        this.putSiteId = putSiteId;
    }

    public void setPickSiteId(String pickSiteId) {
        this.pickSiteId = pickSiteId;
    }

    public void setLiftName(String liftName) {
        this.liftName = liftName;
    }

    public void setPickFloorArea(String pickFloorArea) {
        this.pickFloorArea = pickFloorArea;
    }

    public void setPutFloorArea(String putFloorArea) {
        this.putFloorArea = putFloorArea;
    }

    public void setTaskRecordId(String taskRecordId) {
        this.taskRecordId = taskRecordId;
    }

    public void setOprType(Integer oprType) {
        this.oprType = oprType;
    }

    public void setIsCrowed(Integer isCrowed) {
        this.isCrowed = isCrowed;
    }

    public void setIsInnerSite(Integer isInnerSite) {
        this.isInnerSite = isInnerSite;
    }

    public void setIsFinshed(Integer isFinshed) {
        this.isFinshed = isFinshed;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof LiftRecord)) {
            return false;
        }
        LiftRecord other = (LiftRecord)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        Integer this$oprType = this.getOprType();
        Integer other$oprType = other.getOprType();
        if (this$oprType == null ? other$oprType != null : !((Object)this$oprType).equals(other$oprType)) {
            return false;
        }
        Integer this$isCrowed = this.getIsCrowed();
        Integer other$isCrowed = other.getIsCrowed();
        if (this$isCrowed == null ? other$isCrowed != null : !((Object)this$isCrowed).equals(other$isCrowed)) {
            return false;
        }
        Integer this$isInnerSite = this.getIsInnerSite();
        Integer other$isInnerSite = other.getIsInnerSite();
        if (this$isInnerSite == null ? other$isInnerSite != null : !((Object)this$isInnerSite).equals(other$isInnerSite)) {
            return false;
        }
        Integer this$isFinshed = this.getIsFinshed();
        Integer other$isFinshed = other.getIsFinshed();
        if (this$isFinshed == null ? other$isFinshed != null : !((Object)this$isFinshed).equals(other$isFinshed)) {
            return false;
        }
        String this$id = this.getId();
        String other$id = other.getId();
        if (this$id == null ? other$id != null : !this$id.equals(other$id)) {
            return false;
        }
        Date this$createTime = this.getCreateTime();
        Date other$createTime = other.getCreateTime();
        if (this$createTime == null ? other$createTime != null : !((Object)this$createTime).equals(other$createTime)) {
            return false;
        }
        String this$preSiteId = this.getPreSiteId();
        String other$preSiteId = other.getPreSiteId();
        if (this$preSiteId == null ? other$preSiteId != null : !this$preSiteId.equals(other$preSiteId)) {
            return false;
        }
        String this$putSiteId = this.getPutSiteId();
        String other$putSiteId = other.getPutSiteId();
        if (this$putSiteId == null ? other$putSiteId != null : !this$putSiteId.equals(other$putSiteId)) {
            return false;
        }
        String this$pickSiteId = this.getPickSiteId();
        String other$pickSiteId = other.getPickSiteId();
        if (this$pickSiteId == null ? other$pickSiteId != null : !this$pickSiteId.equals(other$pickSiteId)) {
            return false;
        }
        String this$liftName = this.getLiftName();
        String other$liftName = other.getLiftName();
        if (this$liftName == null ? other$liftName != null : !this$liftName.equals(other$liftName)) {
            return false;
        }
        String this$pickFloorArea = this.getPickFloorArea();
        String other$pickFloorArea = other.getPickFloorArea();
        if (this$pickFloorArea == null ? other$pickFloorArea != null : !this$pickFloorArea.equals(other$pickFloorArea)) {
            return false;
        }
        String this$putFloorArea = this.getPutFloorArea();
        String other$putFloorArea = other.getPutFloorArea();
        if (this$putFloorArea == null ? other$putFloorArea != null : !this$putFloorArea.equals(other$putFloorArea)) {
            return false;
        }
        String this$taskRecordId = this.getTaskRecordId();
        String other$taskRecordId = other.getTaskRecordId();
        return !(this$taskRecordId == null ? other$taskRecordId != null : !this$taskRecordId.equals(other$taskRecordId));
    }

    protected boolean canEqual(Object other) {
        return other instanceof LiftRecord;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        Integer $oprType = this.getOprType();
        result = result * 59 + ($oprType == null ? 43 : ((Object)$oprType).hashCode());
        Integer $isCrowed = this.getIsCrowed();
        result = result * 59 + ($isCrowed == null ? 43 : ((Object)$isCrowed).hashCode());
        Integer $isInnerSite = this.getIsInnerSite();
        result = result * 59 + ($isInnerSite == null ? 43 : ((Object)$isInnerSite).hashCode());
        Integer $isFinshed = this.getIsFinshed();
        result = result * 59 + ($isFinshed == null ? 43 : ((Object)$isFinshed).hashCode());
        String $id = this.getId();
        result = result * 59 + ($id == null ? 43 : $id.hashCode());
        Date $createTime = this.getCreateTime();
        result = result * 59 + ($createTime == null ? 43 : ((Object)$createTime).hashCode());
        String $preSiteId = this.getPreSiteId();
        result = result * 59 + ($preSiteId == null ? 43 : $preSiteId.hashCode());
        String $putSiteId = this.getPutSiteId();
        result = result * 59 + ($putSiteId == null ? 43 : $putSiteId.hashCode());
        String $pickSiteId = this.getPickSiteId();
        result = result * 59 + ($pickSiteId == null ? 43 : $pickSiteId.hashCode());
        String $liftName = this.getLiftName();
        result = result * 59 + ($liftName == null ? 43 : $liftName.hashCode());
        String $pickFloorArea = this.getPickFloorArea();
        result = result * 59 + ($pickFloorArea == null ? 43 : $pickFloorArea.hashCode());
        String $putFloorArea = this.getPutFloorArea();
        result = result * 59 + ($putFloorArea == null ? 43 : $putFloorArea.hashCode());
        String $taskRecordId = this.getTaskRecordId();
        result = result * 59 + ($taskRecordId == null ? 43 : $taskRecordId.hashCode());
        return result;
    }

    public String toString() {
        return "LiftRecord(id=" + this.getId() + ", createTime=" + this.getCreateTime() + ", preSiteId=" + this.getPreSiteId() + ", putSiteId=" + this.getPutSiteId() + ", pickSiteId=" + this.getPickSiteId() + ", liftName=" + this.getLiftName() + ", pickFloorArea=" + this.getPickFloorArea() + ", putFloorArea=" + this.getPutFloorArea() + ", taskRecordId=" + this.getTaskRecordId() + ", oprType=" + this.getOprType() + ", isCrowed=" + this.getIsCrowed() + ", isInnerSite=" + this.getIsInnerSite() + ", isFinshed=" + this.getIsFinshed() + ")";
    }

    public LiftRecord() {
    }

    public LiftRecord(String id, Date createTime, String preSiteId, String putSiteId, String pickSiteId, String liftName, String pickFloorArea, String putFloorArea, String taskRecordId, Integer oprType, Integer isCrowed, Integer isInnerSite, Integer isFinshed) {
        this.id = id;
        this.createTime = createTime;
        this.preSiteId = preSiteId;
        this.putSiteId = putSiteId;
        this.pickSiteId = pickSiteId;
        this.liftName = liftName;
        this.pickFloorArea = pickFloorArea;
        this.putFloorArea = putFloorArea;
        this.taskRecordId = taskRecordId;
        this.oprType = oprType;
        this.isCrowed = isCrowed;
        this.isInnerSite = isInnerSite;
        this.isFinshed = isFinshed;
    }
}

