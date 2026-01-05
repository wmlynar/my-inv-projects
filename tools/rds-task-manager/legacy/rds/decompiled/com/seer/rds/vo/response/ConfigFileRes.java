/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.vo.response.ConfigFileRes
 */
package com.seer.rds.vo.response;

public class ConfigFileRes {
    private int id;
    private int orderNum;
    private String configName;
    private String createDate;

    public int getId() {
        return this.id;
    }

    public int getOrderNum() {
        return this.orderNum;
    }

    public String getConfigName() {
        return this.configName;
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

    public void setConfigName(String configName) {
        this.configName = configName;
    }

    public void setCreateDate(String createDate) {
        this.createDate = createDate;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof ConfigFileRes)) {
            return false;
        }
        ConfigFileRes other = (ConfigFileRes)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        if (this.getId() != other.getId()) {
            return false;
        }
        if (this.getOrderNum() != other.getOrderNum()) {
            return false;
        }
        String this$configName = this.getConfigName();
        String other$configName = other.getConfigName();
        if (this$configName == null ? other$configName != null : !this$configName.equals(other$configName)) {
            return false;
        }
        String this$createDate = this.getCreateDate();
        String other$createDate = other.getCreateDate();
        return !(this$createDate == null ? other$createDate != null : !this$createDate.equals(other$createDate));
    }

    protected boolean canEqual(Object other) {
        return other instanceof ConfigFileRes;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        result = result * 59 + this.getId();
        result = result * 59 + this.getOrderNum();
        String $configName = this.getConfigName();
        result = result * 59 + ($configName == null ? 43 : $configName.hashCode());
        String $createDate = this.getCreateDate();
        result = result * 59 + ($createDate == null ? 43 : $createDate.hashCode());
        return result;
    }

    public String toString() {
        return "ConfigFileRes(id=" + this.getId() + ", orderNum=" + this.getOrderNum() + ", configName=" + this.getConfigName() + ", createDate=" + this.getCreateDate() + ")";
    }
}

