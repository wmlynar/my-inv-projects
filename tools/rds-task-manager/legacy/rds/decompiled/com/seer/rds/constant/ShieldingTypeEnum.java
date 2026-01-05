/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.constant.ShieldingTypeEnum
 */
package com.seer.rds.constant;

public enum ShieldingTypeEnum {
    NoShielding("npShielding"),
    NightShielding("nightShielding"),
    WeekendShield("weekendShield"),
    CustomShielding("customShielding");

    private String type;

    private ShieldingTypeEnum(String type) {
        this.type = type;
    }

    public String getType() {
        return this.type;
    }

    private ShieldingTypeEnum() {
    }
}

