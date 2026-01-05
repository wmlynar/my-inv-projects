/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.model.device.PagerTaskRecord
 *  com.seer.rds.model.device.PagerTaskRecord$PagerTaskRecordBuilder
 *  javax.persistence.Entity
 *  javax.persistence.GeneratedValue
 *  javax.persistence.GenerationType
 *  javax.persistence.Id
 *  javax.persistence.Index
 *  javax.persistence.Table
 */
package com.seer.rds.model.device;

import com.seer.rds.model.device.PagerTaskRecord;
import javax.persistence.Entity;
import javax.persistence.GeneratedValue;
import javax.persistence.GenerationType;
import javax.persistence.Id;
import javax.persistence.Index;
import javax.persistence.Table;

@Entity
@Table(name="t_pagertaskrecord", indexes={@Index(name="pIdx", columnList="pagerInfo"), @Index(name="tIdx", columnList="taskRecordId")})
public class PagerTaskRecord {
    @Id
    @GeneratedValue(strategy=GenerationType.AUTO)
    private Long id;
    private String pagerInfo;
    private String taskRecordId;
    private Boolean isDel;

    public static PagerTaskRecordBuilder builder() {
        return new PagerTaskRecordBuilder();
    }

    public Long getId() {
        return this.id;
    }

    public String getPagerInfo() {
        return this.pagerInfo;
    }

    public String getTaskRecordId() {
        return this.taskRecordId;
    }

    public Boolean getIsDel() {
        return this.isDel;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public void setPagerInfo(String pagerInfo) {
        this.pagerInfo = pagerInfo;
    }

    public void setTaskRecordId(String taskRecordId) {
        this.taskRecordId = taskRecordId;
    }

    public void setIsDel(Boolean isDel) {
        this.isDel = isDel;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof PagerTaskRecord)) {
            return false;
        }
        PagerTaskRecord other = (PagerTaskRecord)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        Long this$id = this.getId();
        Long other$id = other.getId();
        if (this$id == null ? other$id != null : !((Object)this$id).equals(other$id)) {
            return false;
        }
        Boolean this$isDel = this.getIsDel();
        Boolean other$isDel = other.getIsDel();
        if (this$isDel == null ? other$isDel != null : !((Object)this$isDel).equals(other$isDel)) {
            return false;
        }
        String this$pagerInfo = this.getPagerInfo();
        String other$pagerInfo = other.getPagerInfo();
        if (this$pagerInfo == null ? other$pagerInfo != null : !this$pagerInfo.equals(other$pagerInfo)) {
            return false;
        }
        String this$taskRecordId = this.getTaskRecordId();
        String other$taskRecordId = other.getTaskRecordId();
        return !(this$taskRecordId == null ? other$taskRecordId != null : !this$taskRecordId.equals(other$taskRecordId));
    }

    protected boolean canEqual(Object other) {
        return other instanceof PagerTaskRecord;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        Long $id = this.getId();
        result = result * 59 + ($id == null ? 43 : ((Object)$id).hashCode());
        Boolean $isDel = this.getIsDel();
        result = result * 59 + ($isDel == null ? 43 : ((Object)$isDel).hashCode());
        String $pagerInfo = this.getPagerInfo();
        result = result * 59 + ($pagerInfo == null ? 43 : $pagerInfo.hashCode());
        String $taskRecordId = this.getTaskRecordId();
        result = result * 59 + ($taskRecordId == null ? 43 : $taskRecordId.hashCode());
        return result;
    }

    public String toString() {
        return "PagerTaskRecord(id=" + this.getId() + ", pagerInfo=" + this.getPagerInfo() + ", taskRecordId=" + this.getTaskRecordId() + ", isDel=" + this.getIsDel() + ")";
    }

    public PagerTaskRecord() {
    }

    public PagerTaskRecord(Long id, String pagerInfo, String taskRecordId, Boolean isDel) {
        this.id = id;
        this.pagerInfo = pagerInfo;
        this.taskRecordId = taskRecordId;
        this.isDel = isDel;
    }
}

