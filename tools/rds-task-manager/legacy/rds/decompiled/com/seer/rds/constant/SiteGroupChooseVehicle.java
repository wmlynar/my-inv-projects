/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.constant.SiteGroupChooseVehicle
 */
package com.seer.rds.constant;

public enum SiteGroupChooseVehicle {
    vehicleName(0),
    group(1),
    maxVehicle(2),
    noRestrictions(3);

    private int status;

    private SiteGroupChooseVehicle(int status) {
        this.status = status;
    }

    private SiteGroupChooseVehicle() {
    }

    public int getStatus() {
        return this.status;
    }
}

