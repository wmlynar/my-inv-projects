/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.constant.popWindowsTypeEnum
 */
package com.seer.rds.constant;

public enum popWindowsTypeEnum {
    PopWindow(1, "PopWindow"),
    UNPopWindow(2, "UNPopWindow");

    private int status;
    private String desc;

    private popWindowsTypeEnum(int status, String desc) {
        this.status = status;
        this.desc = desc;
    }

    private popWindowsTypeEnum() {
    }

    public int getStatus() {
        return this.status;
    }

    public String getDesc() {
        return this.desc;
    }
}

