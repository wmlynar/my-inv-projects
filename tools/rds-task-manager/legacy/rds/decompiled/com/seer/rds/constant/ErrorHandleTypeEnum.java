/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.constant.ErrorHandleTypeEnum
 */
package com.seer.rds.constant;

public enum ErrorHandleTypeEnum {
    Task(0),
    Core(1);

    private int type;

    private ErrorHandleTypeEnum(int type) {
        this.type = type;
    }

    private ErrorHandleTypeEnum() {
    }

    public int getType() {
        return this.type;
    }
}

