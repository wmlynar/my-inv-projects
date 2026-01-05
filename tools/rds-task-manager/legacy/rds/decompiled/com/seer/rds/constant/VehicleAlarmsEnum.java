/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.constant.VehicleAlarmsEnum
 */
package com.seer.rds.constant;

public enum VehicleAlarmsEnum {
    VehicleErrors("errors"),
    VehicleFatals("fatals"),
    VehicleNotices("notices"),
    VehicleWarnings("warnings");

    private String level;

    private VehicleAlarmsEnum(String level) {
        this.level = level;
    }

    public String getLevel() {
        return this.level;
    }

    private VehicleAlarmsEnum() {
    }
}

