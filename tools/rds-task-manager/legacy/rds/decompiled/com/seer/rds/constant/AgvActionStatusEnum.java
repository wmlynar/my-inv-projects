/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.constant.AgvActionStatusEnum
 */
package com.seer.rds.constant;

public enum AgvActionStatusEnum {
    FINISHED("FINISHED", "\u52a8\u4f5c\u6210\u529f\u5b8c\u6210"),
    MANUAL_FINISHED("MANUAL_FINISHED", "\u4eba\u5de5\u5c06\u52a8\u4f5c\u5b8c\u6210"),
    FAILED("FAILED", "\u52a8\u4f5c\u5931\u8d25"),
    STOPPED("STOPPED", "\u52a8\u4f5c\u505c\u6b62");

    private String status;
    private String msg;

    private AgvActionStatusEnum(String status, String msg) {
        this.status = status;
        this.msg = msg;
    }

    private AgvActionStatusEnum() {
    }

    public String getStatus() {
        return this.status;
    }

    public String getMsg() {
        return this.msg;
    }
}

