/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.constant.WindTaskRecordTitleEnum
 */
package com.seer.rds.constant;

public enum WindTaskRecordTitleEnum {
    id("Excel.WindTaskRecord.id"),
    status("Excel.WindTaskRecord.status"),
    agvId("Excel.WindTaskRecord.agvId"),
    defLabel("Excel.WindTaskRecord.defLabel"),
    stateDescription("Excel.WindTaskRecord.stateDescription"),
    createdOn("Excel.WindTaskRecord.createdOn"),
    endedOn("Excel.WindTaskRecord.endedOn"),
    firstExecutorTime("Excel.WindTaskRecord.firstExecutorTime"),
    executorTime("Excel.WindTaskRecord.executorTime"),
    endedReason("Excel.WindTaskRecord.endedReason"),
    path("Excel.WindTaskRecord.path"),
    defVersion("Excel.WindTaskRecord.defVersion"),
    outOrderNo("Excel.WindTaskRecord.outOrderNo"),
    callWorkType("Excel.WindTaskRecord.callWorkType"),
    callWorkStation("Excel.WindTaskRecord.callWorkStation");

    private String code;

    private WindTaskRecordTitleEnum(String code) {
        this.code = code;
    }

    public String getCode() {
        return this.code;
    }

    private WindTaskRecordTitleEnum() {
    }
}

