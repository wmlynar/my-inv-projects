/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.constant.UserMessageTypeEnum
 */
package com.seer.rds.constant;

public enum UserMessageTypeEnum {
    INFO(1, "Info"),
    WARN(2, "Warn"),
    ERROR(3, "Error");

    private int status;
    private String desc;

    private UserMessageTypeEnum(int status, String desc) {
        this.status = status;
        this.desc = desc;
    }

    private UserMessageTypeEnum() {
    }

    public int getStatus() {
        return this.status;
    }

    public String getDesc() {
        return this.desc;
    }
}

