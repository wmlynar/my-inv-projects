/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.constant.SiteGroupTransferDemandStatus
 */
package com.seer.rds.constant;

public enum SiteGroupTransferDemandStatus {
    running(1000, "@{SiteGroupDemand.enum.running}"),
    stop(1001, "@{SiteGroupDemand.enum.stop}"),
    interrupt(1002, "@{SiteGroupDemand.enum.interrupt}");

    private int status;
    private String desc;

    private SiteGroupTransferDemandStatus(int status, String desc) {
        this.status = status;
        this.desc = desc;
    }

    private SiteGroupTransferDemandStatus() {
    }

    public int getStatus() {
        return this.status;
    }

    public String getDesc() {
        return this.desc;
    }
}

