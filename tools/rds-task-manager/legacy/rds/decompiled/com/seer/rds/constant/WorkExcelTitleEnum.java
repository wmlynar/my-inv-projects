/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.constant.WorkExcelTitleEnum
 */
package com.seer.rds.constant;

public enum WorkExcelTitleEnum {
    tags("Excel.workSite.tags"),
    siteId("Excel.workSite.siteId"),
    siteName("Excel.workSite.siteName"),
    working("Excel.workSite.working"),
    locked("Excel.workSite.locked"),
    preparing("Excel.workSite.preparing"),
    filled("Excel.workSite.filled"),
    disabled("Excel.workSite.disabled"),
    content("Excel.workSite.content"),
    groupName("Excel.workSite.groupName"),
    rowNum("Excel.workSite.rowNum"),
    colNum("Excel.workSite.colNum"),
    level("Excel.workSite.level"),
    depth("Excel.workSite.depth"),
    no("Excel.workSite.no"),
    type("Excel.workSite.type");

    private String code;

    private WorkExcelTitleEnum(String code) {
        this.code = code;
    }

    public String getCode() {
        return this.code;
    }

    private WorkExcelTitleEnum() {
    }
}

