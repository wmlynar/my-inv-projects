/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.constant.MapIfErrorTypeEnum
 */
package com.seer.rds.constant;

public enum MapIfErrorTypeEnum {
    ERROR_dispatch(1, "ErrorDispatch"),
    Normal(2, "Normal");

    private int status;
    private String desc;

    private MapIfErrorTypeEnum(int status, String desc) {
        this.status = status;
        this.desc = desc;
    }

    private MapIfErrorTypeEnum() {
    }

    public int getStatus() {
        return this.status;
    }

    public String getDesc() {
        return this.desc;
    }
}

