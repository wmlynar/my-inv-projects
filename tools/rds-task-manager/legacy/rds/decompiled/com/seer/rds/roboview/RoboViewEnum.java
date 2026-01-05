/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.roboview.RoboViewEnum
 */
package com.seer.rds.roboview;

public enum RoboViewEnum {
    rv_get_storage_status("rv_get_storage_status", "\u89c6\u89c9\u5e93\u4f4d\u72b6\u6001\u7684\u63a5\u53e3");

    private String funName;
    private String desc;

    private RoboViewEnum(String funName, String desc) {
        this.funName = funName;
        this.desc = desc;
    }

    private RoboViewEnum() {
    }

    public String getFunName() {
        return this.funName;
    }

    public String getDesc() {
        return this.desc;
    }
}

