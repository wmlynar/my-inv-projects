/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.constant.TaskDefStatusEnum
 */
package com.seer.rds.constant;

public enum TaskDefStatusEnum {
    run(0, "\u53ef\u8fd0\u884c"),
    stop(1, "\u4e0d\u53ef\u8fd0\u884c");

    private int status;
    private String desc;

    private TaskDefStatusEnum(int status, String desc) {
        this.status = status;
        this.desc = desc;
    }

    private TaskDefStatusEnum() {
    }

    public int getStatus() {
        return this.status;
    }

    public String getDesc() {
        return this.desc;
    }
}

