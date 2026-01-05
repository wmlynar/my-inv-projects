/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.vo.response.ApplicationBizFileRes
 */
package com.seer.rds.vo.response;

public class ApplicationBizFileRes {
    private int id;
    private int orderNum;
    private String bizName;
    private String createDate;

    public int getId() {
        return this.id;
    }

    public int getOrderNum() {
        return this.orderNum;
    }

    public String getBizName() {
        return this.bizName;
    }

    public String getCreateDate() {
        return this.createDate;
    }

    public void setId(int id) {
        this.id = id;
    }

    public void setOrderNum(int orderNum) {
        this.orderNum = orderNum;
    }

    public void setBizName(String bizName) {
        this.bizName = bizName;
    }

    public void setCreateDate(String createDate) {
        this.createDate = createDate;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof ApplicationBizFileRes)) {
            return false;
        }
        ApplicationBizFileRes other = (ApplicationBizFileRes)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        if (this.getId() != other.getId()) {
            return false;
        }
        if (this.getOrderNum() != other.getOrderNum()) {
            return false;
        }
        String this$bizName = this.getBizName();
        String other$bizName = other.getBizName();
        if (this$bizName == null ? other$bizName != null : !this$bizName.equals(other$bizName)) {
            return false;
        }
        String this$createDate = this.getCreateDate();
        String other$createDate = other.getCreateDate();
        return !(this$createDate == null ? other$createDate != null : !this$createDate.equals(other$createDate));
    }

    protected boolean canEqual(Object other) {
        return other instanceof ApplicationBizFileRes;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        result = result * 59 + this.getId();
        result = result * 59 + this.getOrderNum();
        String $bizName = this.getBizName();
        result = result * 59 + ($bizName == null ? 43 : $bizName.hashCode());
        String $createDate = this.getCreateDate();
        result = result * 59 + ($createDate == null ? 43 : $createDate.hashCode());
        return result;
    }

    public String toString() {
        return "ApplicationBizFileRes(id=" + this.getId() + ", orderNum=" + this.getOrderNum() + ", bizName=" + this.getBizName() + ", createDate=" + this.getCreateDate() + ")";
    }
}

