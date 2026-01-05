/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.constant.CorePoolSizeEnum
 */
package com.seer.rds.constant;

public enum CorePoolSizeEnum {
    NUMBER_EIGHT(8),
    NUMBER_SIXTEEN(16),
    NUMBER_THIRTY_TWO(32);

    private int num;

    private CorePoolSizeEnum(int num) {
        this.num = num;
    }

    public int getCorePoolSize() {
        return this.num;
    }

    public int getNum() {
        return this.num;
    }
}

