/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.constant.UserTypeEnum
 */
package com.seer.rds.constant;

public enum UserTypeEnum {
    admin(1, "\u8d85\u7ea7\u7ba1\u7406\u5458"),
    common_user(2, "\u666e\u901a\u7528\u6237");

    private int status;
    private String desc;

    private UserTypeEnum(int status, String desc) {
        this.status = status;
        this.desc = desc;
    }

    private UserTypeEnum() {
    }

    public int getStatus() {
        return this.status;
    }

    public String getDesc() {
        return this.desc;
    }
}

