/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.model.device.PagerAddressRecord
 *  com.seer.rds.model.device.PagerAddressRecord$PagerAddressRecordBuilder
 *  javax.persistence.Entity
 *  javax.persistence.GeneratedValue
 *  javax.persistence.GenerationType
 *  javax.persistence.Id
 *  javax.persistence.Table
 *  javax.persistence.Temporal
 *  javax.persistence.TemporalType
 *  org.hibernate.annotations.CreationTimestamp
 *  org.hibernate.annotations.UpdateTimestamp
 */
package com.seer.rds.model.device;

import com.seer.rds.model.device.PagerAddressRecord;
import java.util.Date;
import javax.persistence.Entity;
import javax.persistence.GeneratedValue;
import javax.persistence.GenerationType;
import javax.persistence.Id;
import javax.persistence.Table;
import javax.persistence.Temporal;
import javax.persistence.TemporalType;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

@Entity
@Table(name="t_pageraddressrecord")
public class PagerAddressRecord {
    @Id
    @GeneratedValue(strategy=GenerationType.AUTO)
    private Long id;
    private Long pagerId;
    private Integer address;
    private Integer value;
    private String remark;
    private Integer lightAddress;
    private Integer lightValue;
    private String lightRemark;
    private String orderTask;
    private String cancelTask;
    @Temporal(value=TemporalType.TIMESTAMP)
    @CreationTimestamp
    private Date createTime;
    @Temporal(value=TemporalType.TIMESTAMP)
    @UpdateTimestamp
    private Date modifyTime;

    public PagerAddressRecord(Long pagerId, Integer address) {
        this.pagerId = pagerId;
        this.address = address;
    }

    public static PagerAddressRecordBuilder builder() {
        return new PagerAddressRecordBuilder();
    }

    public Long getId() {
        return this.id;
    }

    public Long getPagerId() {
        return this.pagerId;
    }

    public Integer getAddress() {
        return this.address;
    }

    public Integer getValue() {
        return this.value;
    }

    public String getRemark() {
        return this.remark;
    }

    public Integer getLightAddress() {
        return this.lightAddress;
    }

    public Integer getLightValue() {
        return this.lightValue;
    }

    public String getLightRemark() {
        return this.lightRemark;
    }

    public String getOrderTask() {
        return this.orderTask;
    }

    public String getCancelTask() {
        return this.cancelTask;
    }

    public Date getCreateTime() {
        return this.createTime;
    }

    public Date getModifyTime() {
        return this.modifyTime;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public void setPagerId(Long pagerId) {
        this.pagerId = pagerId;
    }

    public void setAddress(Integer address) {
        this.address = address;
    }

    public void setValue(Integer value) {
        this.value = value;
    }

    public void setRemark(String remark) {
        this.remark = remark;
    }

    public void setLightAddress(Integer lightAddress) {
        this.lightAddress = lightAddress;
    }

    public void setLightValue(Integer lightValue) {
        this.lightValue = lightValue;
    }

    public void setLightRemark(String lightRemark) {
        this.lightRemark = lightRemark;
    }

    public void setOrderTask(String orderTask) {
        this.orderTask = orderTask;
    }

    public void setCancelTask(String cancelTask) {
        this.cancelTask = cancelTask;
    }

    public void setCreateTime(Date createTime) {
        this.createTime = createTime;
    }

    public void setModifyTime(Date modifyTime) {
        this.modifyTime = modifyTime;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof PagerAddressRecord)) {
            return false;
        }
        PagerAddressRecord other = (PagerAddressRecord)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        Long this$id = this.getId();
        Long other$id = other.getId();
        if (this$id == null ? other$id != null : !((Object)this$id).equals(other$id)) {
            return false;
        }
        Long this$pagerId = this.getPagerId();
        Long other$pagerId = other.getPagerId();
        if (this$pagerId == null ? other$pagerId != null : !((Object)this$pagerId).equals(other$pagerId)) {
            return false;
        }
        Integer this$address = this.getAddress();
        Integer other$address = other.getAddress();
        if (this$address == null ? other$address != null : !((Object)this$address).equals(other$address)) {
            return false;
        }
        Integer this$value = this.getValue();
        Integer other$value = other.getValue();
        if (this$value == null ? other$value != null : !((Object)this$value).equals(other$value)) {
            return false;
        }
        Integer this$lightAddress = this.getLightAddress();
        Integer other$lightAddress = other.getLightAddress();
        if (this$lightAddress == null ? other$lightAddress != null : !((Object)this$lightAddress).equals(other$lightAddress)) {
            return false;
        }
        Integer this$lightValue = this.getLightValue();
        Integer other$lightValue = other.getLightValue();
        if (this$lightValue == null ? other$lightValue != null : !((Object)this$lightValue).equals(other$lightValue)) {
            return false;
        }
        String this$remark = this.getRemark();
        String other$remark = other.getRemark();
        if (this$remark == null ? other$remark != null : !this$remark.equals(other$remark)) {
            return false;
        }
        String this$lightRemark = this.getLightRemark();
        String other$lightRemark = other.getLightRemark();
        if (this$lightRemark == null ? other$lightRemark != null : !this$lightRemark.equals(other$lightRemark)) {
            return false;
        }
        String this$orderTask = this.getOrderTask();
        String other$orderTask = other.getOrderTask();
        if (this$orderTask == null ? other$orderTask != null : !this$orderTask.equals(other$orderTask)) {
            return false;
        }
        String this$cancelTask = this.getCancelTask();
        String other$cancelTask = other.getCancelTask();
        if (this$cancelTask == null ? other$cancelTask != null : !this$cancelTask.equals(other$cancelTask)) {
            return false;
        }
        Date this$createTime = this.getCreateTime();
        Date other$createTime = other.getCreateTime();
        if (this$createTime == null ? other$createTime != null : !((Object)this$createTime).equals(other$createTime)) {
            return false;
        }
        Date this$modifyTime = this.getModifyTime();
        Date other$modifyTime = other.getModifyTime();
        return !(this$modifyTime == null ? other$modifyTime != null : !((Object)this$modifyTime).equals(other$modifyTime));
    }

    protected boolean canEqual(Object other) {
        return other instanceof PagerAddressRecord;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        Long $id = this.getId();
        result = result * 59 + ($id == null ? 43 : ((Object)$id).hashCode());
        Long $pagerId = this.getPagerId();
        result = result * 59 + ($pagerId == null ? 43 : ((Object)$pagerId).hashCode());
        Integer $address = this.getAddress();
        result = result * 59 + ($address == null ? 43 : ((Object)$address).hashCode());
        Integer $value = this.getValue();
        result = result * 59 + ($value == null ? 43 : ((Object)$value).hashCode());
        Integer $lightAddress = this.getLightAddress();
        result = result * 59 + ($lightAddress == null ? 43 : ((Object)$lightAddress).hashCode());
        Integer $lightValue = this.getLightValue();
        result = result * 59 + ($lightValue == null ? 43 : ((Object)$lightValue).hashCode());
        String $remark = this.getRemark();
        result = result * 59 + ($remark == null ? 43 : $remark.hashCode());
        String $lightRemark = this.getLightRemark();
        result = result * 59 + ($lightRemark == null ? 43 : $lightRemark.hashCode());
        String $orderTask = this.getOrderTask();
        result = result * 59 + ($orderTask == null ? 43 : $orderTask.hashCode());
        String $cancelTask = this.getCancelTask();
        result = result * 59 + ($cancelTask == null ? 43 : $cancelTask.hashCode());
        Date $createTime = this.getCreateTime();
        result = result * 59 + ($createTime == null ? 43 : ((Object)$createTime).hashCode());
        Date $modifyTime = this.getModifyTime();
        result = result * 59 + ($modifyTime == null ? 43 : ((Object)$modifyTime).hashCode());
        return result;
    }

    public String toString() {
        return "PagerAddressRecord(id=" + this.getId() + ", pagerId=" + this.getPagerId() + ", address=" + this.getAddress() + ", value=" + this.getValue() + ", remark=" + this.getRemark() + ", lightAddress=" + this.getLightAddress() + ", lightValue=" + this.getLightValue() + ", lightRemark=" + this.getLightRemark() + ", orderTask=" + this.getOrderTask() + ", cancelTask=" + this.getCancelTask() + ", createTime=" + this.getCreateTime() + ", modifyTime=" + this.getModifyTime() + ")";
    }

    public PagerAddressRecord() {
    }

    public PagerAddressRecord(Long id, Long pagerId, Integer address, Integer value, String remark, Integer lightAddress, Integer lightValue, String lightRemark, String orderTask, String cancelTask, Date createTime, Date modifyTime) {
        this.id = id;
        this.pagerId = pagerId;
        this.address = address;
        this.value = value;
        this.remark = remark;
        this.lightAddress = lightAddress;
        this.lightValue = lightValue;
        this.lightRemark = lightRemark;
        this.orderTask = orderTask;
        this.cancelTask = cancelTask;
        this.createTime = createTime;
        this.modifyTime = modifyTime;
    }
}

