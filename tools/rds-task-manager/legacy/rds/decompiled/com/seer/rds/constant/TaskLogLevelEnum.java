/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.constant.TaskLogLevelEnum
 */
package com.seer.rds.constant;

public enum TaskLogLevelEnum {
    info("1", "\u6b63\u5e38\u8fd0\u884c"),
    stop("2", "\u7ec8\u6b62"),
    error("3", "\u9519\u8bef"),
    warn("4", "\u8b66\u62a5");

    private String level;
    private String desc;

    private TaskLogLevelEnum(String level, String desc) {
        this.level = level;
        this.desc = desc;
    }

    private TaskLogLevelEnum() {
    }

    public String getLevel() {
        return this.level;
    }

    public String getDesc() {
        return this.desc;
    }
}

