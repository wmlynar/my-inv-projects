/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.model.wind.WindTaskOrderId
 *  com.seer.rds.model.wind.WindTaskOrderId$WindTaskOrderIdBuilder
 *  javax.persistence.Entity
 *  javax.persistence.GeneratedValue
 *  javax.persistence.Id
 *  javax.persistence.Table
 *  javax.persistence.Temporal
 *  javax.persistence.TemporalType
 *  org.hibernate.annotations.CreationTimestamp
 *  org.hibernate.annotations.GenericGenerator
 */
package com.seer.rds.model.wind;

import com.seer.rds.model.wind.WindTaskOrderId;
import java.util.Date;
import javax.persistence.Entity;
import javax.persistence.GeneratedValue;
import javax.persistence.Id;
import javax.persistence.Table;
import javax.persistence.Temporal;
import javax.persistence.TemporalType;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.GenericGenerator;

@Entity
@Table(name="t_windtaskorderid")
public class WindTaskOrderId {
    @Id
    @GenericGenerator(name="idGenerator", strategy="uuid")
    @GeneratedValue(generator="idGenerator")
    private String id;
    private String orderId;
    private Integer blockId;
    private String blockName;
    private String taskId;
    private String taskRecordId;
    private Integer version;
    @CreationTimestamp
    @Temporal(value=TemporalType.TIMESTAMP)
    private Date createDate;

    public static WindTaskOrderIdBuilder builder() {
        return new WindTaskOrderIdBuilder();
    }

    public String getId() {
        return this.id;
    }

    public String getOrderId() {
        return this.orderId;
    }

    public Integer getBlockId() {
        return this.blockId;
    }

    public String getBlockName() {
        return this.blockName;
    }

    public String getTaskId() {
        return this.taskId;
    }

    public String getTaskRecordId() {
        return this.taskRecordId;
    }

    public Integer getVersion() {
        return this.version;
    }

    public Date getCreateDate() {
        return this.createDate;
    }

    public void setId(String id) {
        this.id = id;
    }

    public void setOrderId(String orderId) {
        this.orderId = orderId;
    }

    public void setBlockId(Integer blockId) {
        this.blockId = blockId;
    }

    public void setBlockName(String blockName) {
        this.blockName = blockName;
    }

    public void setTaskId(String taskId) {
        this.taskId = taskId;
    }

    public void setTaskRecordId(String taskRecordId) {
        this.taskRecordId = taskRecordId;
    }

    public void setVersion(Integer version) {
        this.version = version;
    }

    public void setCreateDate(Date createDate) {
        this.createDate = createDate;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof WindTaskOrderId)) {
            return false;
        }
        WindTaskOrderId other = (WindTaskOrderId)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        Integer this$blockId = this.getBlockId();
        Integer other$blockId = other.getBlockId();
        if (this$blockId == null ? other$blockId != null : !((Object)this$blockId).equals(other$blockId)) {
            return false;
        }
        Integer this$version = this.getVersion();
        Integer other$version = other.getVersion();
        if (this$version == null ? other$version != null : !((Object)this$version).equals(other$version)) {
            return false;
        }
        String this$id = this.getId();
        String other$id = other.getId();
        if (this$id == null ? other$id != null : !this$id.equals(other$id)) {
            return false;
        }
        String this$orderId = this.getOrderId();
        String other$orderId = other.getOrderId();
        if (this$orderId == null ? other$orderId != null : !this$orderId.equals(other$orderId)) {
            return false;
        }
        String this$blockName = this.getBlockName();
        String other$blockName = other.getBlockName();
        if (this$blockName == null ? other$blockName != null : !this$blockName.equals(other$blockName)) {
            return false;
        }
        String this$taskId = this.getTaskId();
        String other$taskId = other.getTaskId();
        if (this$taskId == null ? other$taskId != null : !this$taskId.equals(other$taskId)) {
            return false;
        }
        String this$taskRecordId = this.getTaskRecordId();
        String other$taskRecordId = other.getTaskRecordId();
        if (this$taskRecordId == null ? other$taskRecordId != null : !this$taskRecordId.equals(other$taskRecordId)) {
            return false;
        }
        Date this$createDate = this.getCreateDate();
        Date other$createDate = other.getCreateDate();
        return !(this$createDate == null ? other$createDate != null : !((Object)this$createDate).equals(other$createDate));
    }

    protected boolean canEqual(Object other) {
        return other instanceof WindTaskOrderId;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        Integer $blockId = this.getBlockId();
        result = result * 59 + ($blockId == null ? 43 : ((Object)$blockId).hashCode());
        Integer $version = this.getVersion();
        result = result * 59 + ($version == null ? 43 : ((Object)$version).hashCode());
        String $id = this.getId();
        result = result * 59 + ($id == null ? 43 : $id.hashCode());
        String $orderId = this.getOrderId();
        result = result * 59 + ($orderId == null ? 43 : $orderId.hashCode());
        String $blockName = this.getBlockName();
        result = result * 59 + ($blockName == null ? 43 : $blockName.hashCode());
        String $taskId = this.getTaskId();
        result = result * 59 + ($taskId == null ? 43 : $taskId.hashCode());
        String $taskRecordId = this.getTaskRecordId();
        result = result * 59 + ($taskRecordId == null ? 43 : $taskRecordId.hashCode());
        Date $createDate = this.getCreateDate();
        result = result * 59 + ($createDate == null ? 43 : ((Object)$createDate).hashCode());
        return result;
    }

    public String toString() {
        return "WindTaskOrderId(id=" + this.getId() + ", orderId=" + this.getOrderId() + ", blockId=" + this.getBlockId() + ", blockName=" + this.getBlockName() + ", taskId=" + this.getTaskId() + ", taskRecordId=" + this.getTaskRecordId() + ", version=" + this.getVersion() + ", createDate=" + this.getCreateDate() + ")";
    }

    public WindTaskOrderId() {
    }

    public WindTaskOrderId(String id, String orderId, Integer blockId, String blockName, String taskId, String taskRecordId, Integer version, Date createDate) {
        this.id = id;
        this.orderId = orderId;
        this.blockId = blockId;
        this.blockName = blockName;
        this.taskId = taskId;
        this.taskRecordId = taskRecordId;
        this.version = version;
        this.createDate = createDate;
    }
}

