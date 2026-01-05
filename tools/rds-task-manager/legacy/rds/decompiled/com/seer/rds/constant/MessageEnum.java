/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.constant.MessageEnum
 */
package com.seer.rds.constant;

public enum MessageEnum {
    ERROR(3),
    WARN(2),
    INFO(1);

    private int code;

    private MessageEnum(int code) {
        this.code = code;
    }

    private MessageEnum() {
    }

    public int getCode() {
        return this.code;
    }
}

