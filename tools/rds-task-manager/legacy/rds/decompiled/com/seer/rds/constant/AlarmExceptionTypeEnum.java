/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.constant.AlarmExceptionTypeEnum
 */
package com.seer.rds.constant;

public enum AlarmExceptionTypeEnum {
    ERROR(1, "Error"),
    WARN(2, "Warn");

    private int status;
    private String desc;

    private AlarmExceptionTypeEnum(int status, String desc) {
        this.status = status;
        this.desc = desc;
    }

    private AlarmExceptionTypeEnum() {
    }

    public int getStatus() {
        return this.status;
    }

    public String getDesc() {
        return this.desc;
    }
}

