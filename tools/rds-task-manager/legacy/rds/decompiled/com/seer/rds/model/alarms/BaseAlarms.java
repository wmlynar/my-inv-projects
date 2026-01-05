/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.model.alarms.BaseAlarms
 *  javax.persistence.Column
 *  javax.persistence.GeneratedValue
 *  javax.persistence.GenerationType
 *  javax.persistence.Id
 *  javax.persistence.Lob
 *  javax.persistence.MappedSuperclass
 *  javax.persistence.Temporal
 *  javax.persistence.TemporalType
 *  org.hibernate.annotations.CreationTimestamp
 *  org.springframework.data.annotation.CreatedDate
 */
package com.seer.rds.model.alarms;

import java.util.Date;
import java.util.Objects;
import javax.persistence.Column;
import javax.persistence.GeneratedValue;
import javax.persistence.GenerationType;
import javax.persistence.Id;
import javax.persistence.Lob;
import javax.persistence.MappedSuperclass;
import javax.persistence.Temporal;
import javax.persistence.TemporalType;
import org.hibernate.annotations.CreationTimestamp;
import org.springframework.data.annotation.CreatedDate;

@MappedSuperclass
public class BaseAlarms {
    @Id
    @GeneratedValue(strategy=GenerationType.AUTO)
    private Long id;
    private Integer code;
    @Lob
    @Column(name="send_msg")
    private String sendMsg;
    @Column(name="error_time")
    private Integer errorTime;
    @Column(name="\"level\"")
    private String level;
    @CreatedDate
    @Temporal(value=TemporalType.TIMESTAMP)
    @CreationTimestamp
    @Column(name="create_time")
    private Date createTime;
    @Column(name="is_ok", columnDefinition="INT default 0")
    private Integer isOk;
    @Column(name="current_no", columnDefinition="INT default 0")
    private Integer currentNo;
    @CreatedDate
    @Temporal(value=TemporalType.TIMESTAMP)
    @CreationTimestamp
    @Column(name="update_time")
    private Date updateTime;
    @Column(name="record_mark")
    private Integer recordMark;

    public boolean equals(Object o) {
        if (this == o) {
            return true;
        }
        if (!(o instanceof BaseAlarms)) {
            return false;
        }
        BaseAlarms that = (BaseAlarms)o;
        return Objects.equals(this.id, that.id) && Objects.equals(this.code, that.code) && Objects.equals(this.sendMsg, that.sendMsg) && Objects.equals(this.errorTime, that.errorTime) && Objects.equals(this.level, that.level) && Objects.equals(this.createTime, that.createTime) && Objects.equals(this.isOk, that.isOk) && Objects.equals(this.currentNo, that.currentNo) && Objects.equals(this.updateTime, that.updateTime) && Objects.equals(this.recordMark, that.recordMark);
    }

    public int hashCode() {
        return Objects.hash(this.id, this.code, this.sendMsg, this.errorTime, this.level, this.createTime, this.isOk, this.currentNo, this.updateTime, this.recordMark);
    }

    public Long getId() {
        return this.id;
    }

    public Integer getCode() {
        return this.code;
    }

    public String getSendMsg() {
        return this.sendMsg;
    }

    public Integer getErrorTime() {
        return this.errorTime;
    }

    public String getLevel() {
        return this.level;
    }

    public Date getCreateTime() {
        return this.createTime;
    }

    public Integer getIsOk() {
        return this.isOk;
    }

    public Integer getCurrentNo() {
        return this.currentNo;
    }

    public Date getUpdateTime() {
        return this.updateTime;
    }

    public Integer getRecordMark() {
        return this.recordMark;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public void setCode(Integer code) {
        this.code = code;
    }

    public void setSendMsg(String sendMsg) {
        this.sendMsg = sendMsg;
    }

    public void setErrorTime(Integer errorTime) {
        this.errorTime = errorTime;
    }

    public void setLevel(String level) {
        this.level = level;
    }

    public void setCreateTime(Date createTime) {
        this.createTime = createTime;
    }

    public void setIsOk(Integer isOk) {
        this.isOk = isOk;
    }

    public void setCurrentNo(Integer currentNo) {
        this.currentNo = currentNo;
    }

    public void setUpdateTime(Date updateTime) {
        this.updateTime = updateTime;
    }

    public void setRecordMark(Integer recordMark) {
        this.recordMark = recordMark;
    }

    public String toString() {
        return "BaseAlarms(id=" + this.getId() + ", code=" + this.getCode() + ", sendMsg=" + this.getSendMsg() + ", errorTime=" + this.getErrorTime() + ", level=" + this.getLevel() + ", createTime=" + this.getCreateTime() + ", isOk=" + this.getIsOk() + ", currentNo=" + this.getCurrentNo() + ", updateTime=" + this.getUpdateTime() + ", recordMark=" + this.getRecordMark() + ")";
    }
}

