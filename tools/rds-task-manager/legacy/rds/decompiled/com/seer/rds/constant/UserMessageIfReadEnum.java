/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.constant.UserMessageIfReadEnum
 */
package com.seer.rds.constant;

public enum UserMessageIfReadEnum {
    UNREAD(1, "Unread"),
    READ(2, "Read");

    private int status;
    private String desc;

    private UserMessageIfReadEnum(int status, String desc) {
        this.status = status;
        this.desc = desc;
    }

    private UserMessageIfReadEnum() {
    }

    public int getStatus() {
        return this.status;
    }

    public String getDesc() {
        return this.desc;
    }
}

