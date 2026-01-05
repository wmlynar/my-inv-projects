/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.vo.response.BootJsFileRes
 */
package com.seer.rds.vo.response;

public class BootJsFileRes {
    private int id;
    private int orderNum;
    private String bootName;
    private String createDate;

    public int getId() {
        return this.id;
    }

    public int getOrderNum() {
        return this.orderNum;
    }

    public String getBootName() {
        return this.bootName;
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

    public void setBootName(String bootName) {
        this.bootName = bootName;
    }

    public void setCreateDate(String createDate) {
        this.createDate = createDate;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof BootJsFileRes)) {
            return false;
        }
        BootJsFileRes other = (BootJsFileRes)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        if (this.getId() != other.getId()) {
            return false;
        }
        if (this.getOrderNum() != other.getOrderNum()) {
            return false;
        }
        String this$bootName = this.getBootName();
        String other$bootName = other.getBootName();
        if (this$bootName == null ? other$bootName != null : !this$bootName.equals(other$bootName)) {
            return false;
        }
        String this$createDate = this.getCreateDate();
        String other$createDate = other.getCreateDate();
        return !(this$createDate == null ? other$createDate != null : !this$createDate.equals(other$createDate));
    }

    protected boolean canEqual(Object other) {
        return other instanceof BootJsFileRes;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        result = result * 59 + this.getId();
        result = result * 59 + this.getOrderNum();
        String $bootName = this.getBootName();
        result = result * 59 + ($bootName == null ? 43 : $bootName.hashCode());
        String $createDate = this.getCreateDate();
        result = result * 59 + ($createDate == null ? 43 : $createDate.hashCode());
        return result;
    }

    public String toString() {
        return "BootJsFileRes(id=" + this.getId() + ", orderNum=" + this.getOrderNum() + ", bootName=" + this.getBootName() + ", createDate=" + this.getCreateDate() + ")";
    }
}

