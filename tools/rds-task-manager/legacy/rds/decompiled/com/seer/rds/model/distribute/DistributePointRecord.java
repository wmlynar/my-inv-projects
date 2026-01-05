/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.model.distribute.DistributePointRecord
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
@Table(name="t_distribute_point", indexes={@Index(name="distributepointdistributeid", columnList="distribute_id")})
public class DistributePointRecord {
    @Id
    @GenericGenerator(name="idGenerator", strategy="uuid")
    @GeneratedValue(generator="idGenerator")
    private String id;
    @Column(name="point_type")
    private Integer pointType;
    private String loc;
    @Column(name="\"mode\"")
    private Integer mode;
    @Column(name="distribute_id")
    private String distributeId;
    @Column(name="create_time")
    private Date createTime;
    @Transient
    private String pathStartTime;
    @Transient
    private String pathEndTime;

    public String getId() {
        return this.id;
    }

    public Integer getPointType() {
        return this.pointType;
    }

    public String getLoc() {
        return this.loc;
    }

    public Integer getMode() {
        return this.mode;
    }

    public String getDistributeId() {
        return this.distributeId;
    }

    public Date getCreateTime() {
        return this.createTime;
    }

    public String getPathStartTime() {
        return this.pathStartTime;
    }

    public String getPathEndTime() {
        return this.pathEndTime;
    }

    public void setId(String id) {
        this.id = id;
    }

    public void setPointType(Integer pointType) {
        this.pointType = pointType;
    }

    public void setLoc(String loc) {
        this.loc = loc;
    }

    public void setMode(Integer mode) {
        this.mode = mode;
    }

    public void setDistributeId(String distributeId) {
        this.distributeId = distributeId;
    }

    public void setCreateTime(Date createTime) {
        this.createTime = createTime;
    }

    public void setPathStartTime(String pathStartTime) {
        this.pathStartTime = pathStartTime;
    }

    public void setPathEndTime(String pathEndTime) {
        this.pathEndTime = pathEndTime;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof DistributePointRecord)) {
            return false;
        }
        DistributePointRecord other = (DistributePointRecord)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        Integer this$pointType = this.getPointType();
        Integer other$pointType = other.getPointType();
        if (this$pointType == null ? other$pointType != null : !((Object)this$pointType).equals(other$pointType)) {
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
        String this$loc = this.getLoc();
        String other$loc = other.getLoc();
        if (this$loc == null ? other$loc != null : !this$loc.equals(other$loc)) {
            return false;
        }
        String this$distributeId = this.getDistributeId();
        String other$distributeId = other.getDistributeId();
        if (this$distributeId == null ? other$distributeId != null : !this$distributeId.equals(other$distributeId)) {
            return false;
        }
        Date this$createTime = this.getCreateTime();
        Date other$createTime = other.getCreateTime();
        if (this$createTime == null ? other$createTime != null : !((Object)this$createTime).equals(other$createTime)) {
            return false;
        }
        String this$pathStartTime = this.getPathStartTime();
        String other$pathStartTime = other.getPathStartTime();
        if (this$pathStartTime == null ? other$pathStartTime != null : !this$pathStartTime.equals(other$pathStartTime)) {
            return false;
        }
        String this$pathEndTime = this.getPathEndTime();
        String other$pathEndTime = other.getPathEndTime();
        return !(this$pathEndTime == null ? other$pathEndTime != null : !this$pathEndTime.equals(other$pathEndTime));
    }

    protected boolean canEqual(Object other) {
        return other instanceof DistributePointRecord;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        Integer $pointType = this.getPointType();
        result = result * 59 + ($pointType == null ? 43 : ((Object)$pointType).hashCode());
        Integer $mode = this.getMode();
        result = result * 59 + ($mode == null ? 43 : ((Object)$mode).hashCode());
        String $id = this.getId();
        result = result * 59 + ($id == null ? 43 : $id.hashCode());
        String $loc = this.getLoc();
        result = result * 59 + ($loc == null ? 43 : $loc.hashCode());
        String $distributeId = this.getDistributeId();
        result = result * 59 + ($distributeId == null ? 43 : $distributeId.hashCode());
        Date $createTime = this.getCreateTime();
        result = result * 59 + ($createTime == null ? 43 : ((Object)$createTime).hashCode());
        String $pathStartTime = this.getPathStartTime();
        result = result * 59 + ($pathStartTime == null ? 43 : $pathStartTime.hashCode());
        String $pathEndTime = this.getPathEndTime();
        result = result * 59 + ($pathEndTime == null ? 43 : $pathEndTime.hashCode());
        return result;
    }

    public String toString() {
        return "DistributePointRecord(id=" + this.getId() + ", pointType=" + this.getPointType() + ", loc=" + this.getLoc() + ", mode=" + this.getMode() + ", distributeId=" + this.getDistributeId() + ", createTime=" + this.getCreateTime() + ", pathStartTime=" + this.getPathStartTime() + ", pathEndTime=" + this.getPathEndTime() + ")";
    }
}

