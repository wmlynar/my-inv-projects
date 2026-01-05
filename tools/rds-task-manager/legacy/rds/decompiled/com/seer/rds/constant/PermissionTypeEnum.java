/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.constant.PermissionTypeEnum
 */
package com.seer.rds.constant;

public enum PermissionTypeEnum {
    WEB(Integer.valueOf(1), "web"),
    OPERATOR(Integer.valueOf(2), "operator"),
    INTERFACE(Integer.valueOf(3), "interface"),
    DATA(Integer.valueOf(4), "data");

    private Integer status;
    private String desc;

    private PermissionTypeEnum(Integer status, String desc) {
        this.status = status;
        this.desc = desc;
    }

    private PermissionTypeEnum() {
    }

    public Integer getStatus() {
        return this.status;
    }

    public String getDesc() {
        return this.desc;
    }
}

