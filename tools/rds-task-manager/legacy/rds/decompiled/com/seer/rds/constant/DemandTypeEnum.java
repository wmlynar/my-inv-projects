/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.constant.DemandTypeEnum
 */
package com.seer.rds.constant;

public enum DemandTypeEnum {
    TYPE("TYPE"),
    DEFLABEl("DEFLABEl");

    private String value;

    private DemandTypeEnum(String value) {
        this.value = value;
    }

    private DemandTypeEnum() {
    }

    public String getValue() {
        return this.value;
    }
}

