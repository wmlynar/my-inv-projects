/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.constant.SiteStatusEnum
 */
package com.seer.rds.constant;

public enum SiteStatusEnum {
    unlock(0, "\u672a\u9501\u5b9a"),
    lock(1, "\u9501\u5b9a"),
    unworking(0, "\u505c\u6b62\u5de5\u4f5c"),
    working(1, "\u5de5\u4f5c\u4e2d"),
    disabled(1, "\u4e0d\u53ef\u7528"),
    undisabled(0, "\u53ef\u7528"),
    unpreparing(1, "\u672a\u51c6\u5907"),
    preparing(0, "\u5df2\u51c6\u5907"),
    unfilled(0, "\u65e0\u8d27"),
    filled(1, "\u6709\u8d27"),
    synnofailed(0, "\u5e93\u4f4d\u6570\u636e\u540c\u6b65\u6210\u529f"),
    syncFailed(1, "\u5e93\u4f4d\u6570\u636e\u540c\u6b65\u5931\u8d25"),
    holdByRds(0, "rds\u5360\u7528"),
    holdByCore(1, "core\u5360\u7528");

    private int status;
    private String desc;

    private SiteStatusEnum(int status, String desc) {
        this.status = status;
        this.desc = desc;
    }

    private SiteStatusEnum() {
    }

    public int getStatus() {
        return this.status;
    }

    public String getDesc() {
        return this.desc;
    }
}

