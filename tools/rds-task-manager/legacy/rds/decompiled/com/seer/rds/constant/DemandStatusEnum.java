/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.constant.DemandStatusEnum
 */
package com.seer.rds.constant;

public enum DemandStatusEnum {
    created(1, "demand.status.created"),
    dispatched(2, "demand.status.dispatched"),
    finished(3, "demand.status.finished"),
    deleted(4, "demand.status.deleted");

    private int status;
    private String desc;

    private DemandStatusEnum(int status, String desc) {
        this.status = status;
        this.desc = desc;
    }

    private DemandStatusEnum() {
    }

    public int getStatus() {
        return this.status;
    }

    public String getDesc() {
        return this.desc;
    }
}

