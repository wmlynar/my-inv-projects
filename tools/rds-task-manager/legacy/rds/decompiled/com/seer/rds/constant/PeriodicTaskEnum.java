/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.constant.PeriodicTaskEnum
 */
package com.seer.rds.constant;

public enum PeriodicTaskEnum {
    PeriodicTask(1, "PeriodicTask"),
    OrdinaryTask(0, "OrdinaryTask");

    private int status;
    private String desc;

    private PeriodicTaskEnum(int status, String desc) {
        this.status = status;
        this.desc = desc;
    }

    private PeriodicTaskEnum() {
    }

    public int getStatus() {
        return this.status;
    }

    public String getDesc() {
        return this.desc;
    }
}

