/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.constant.ScriptEnum
 */
package com.seer.rds.constant;

public enum ScriptEnum {
    ENABLED(0),
    DISABLED(1);

    private int status;

    private ScriptEnum(int status) {
        this.status = status;
    }

    private ScriptEnum() {
    }

    public int getStatus() {
        return this.status;
    }
}

