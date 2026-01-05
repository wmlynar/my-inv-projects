/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.constant.ErrorReportPlatformNameEnum
 */
package com.seer.rds.constant;

public enum ErrorReportPlatformNameEnum {
    WeChat("WeChat", 0),
    Mail("Mail", 1),
    Api("Api", 2),
    Lark("Lark", 3),
    DingTalk("DingTalk", 4);

    private String name;
    private int type;

    private ErrorReportPlatformNameEnum(String name, int type) {
        this.name = name;
        this.type = type;
    }

    private ErrorReportPlatformNameEnum() {
    }

    public String getName() {
        return this.name;
    }

    public int getType() {
        return this.type;
    }
}

