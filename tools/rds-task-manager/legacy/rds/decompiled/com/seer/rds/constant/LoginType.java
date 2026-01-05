/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.constant.LoginType
 */
package com.seer.rds.constant;

public enum LoginType {
    NORMAL(1),
    SSO(2);

    private int type;

    private LoginType(int type) {
        this.type = type;
    }

    private LoginType() {
    }

    public int getType() {
        return this.type;
    }
}

