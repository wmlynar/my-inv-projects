/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.constant.UserConfigEnum
 */
package com.seer.rds.constant;

public enum UserConfigEnum {
    cache_name("cache_name", "rds"),
    cache_stats_layout("cache_stats_layout", ""),
    cache_task_stats_layout("cache_task_stats_layout", ""),
    Scene_Element_Style("Scene_Element_Style", "");

    private String key;
    private String value;

    private UserConfigEnum(String key, String value) {
        this.key = key;
        this.value = value;
    }

    private UserConfigEnum() {
    }

    public String getKey() {
        return this.key;
    }

    public String getValue() {
        return this.value;
    }
}

