/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.constant.PickUpModeEnum
 */
package com.seer.rds.constant;

public enum PickUpModeEnum {
    Artificial(0, "\u4eba\u5de5\u53d6\u8d27"),
    Automatic(1, "\u673a\u5668\u4eba\u81ea\u52a8\u53d6\u8d27");

    private int status;
    private String desc;

    private PickUpModeEnum(int status, String desc) {
        this.status = status;
        this.desc = desc;
    }

    private PickUpModeEnum() {
    }

    public int getStatus() {
        return this.status;
    }

    public String getDesc() {
        return this.desc;
    }
}

