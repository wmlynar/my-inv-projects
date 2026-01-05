/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.constant.UserStatusEnum
 */
package com.seer.rds.constant;

public enum UserStatusEnum {
    ENABLED(0, "enabled"),
    DISABLED(1, "disabled"),
    DELETED(2, "deleted");

    private int status;
    private String desc;

    private UserStatusEnum(int status, String desc) {
        this.status = status;
        this.desc = desc;
    }

    private UserStatusEnum() {
    }

    public int getStatus() {
        return this.status;
    }

    public String getDesc() {
        return this.desc;
    }
}

