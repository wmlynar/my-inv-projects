/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.constant.DistributeEnum
 */
package com.seer.rds.constant;

public enum DistributeEnum {
    HANG(1),
    DISTRIBUTED(2),
    HANGALL(3),
    WAIT(4),
    RUN(5),
    FINISHED(6),
    STOP(7);

    private int type;

    private DistributeEnum(int type) {
        this.type = type;
    }

    private DistributeEnum() {
    }

    public int getType() {
        return this.type;
    }
}

