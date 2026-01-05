/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.constant.RobotControlEnum
 */
package com.seer.rds.constant;

/*
 * Exception performing whole class analysis ignored.
 */
public enum RobotControlEnum {
    controlSeized(0, "agv.status.controlSeized"),
    controlSeizedByOthers(1, "agv.status.controlSeizedByOthers"),
    freeControl(2, "agv.status.freeControl");

    private int status;
    private String desc;

    public static String getRobotControlDescByStatus(int status) {
        RobotControlEnum[] values;
        for (RobotControlEnum e : values = RobotControlEnum.values()) {
            if (e.getStatus() != status) continue;
            return e.getDesc();
        }
        return null;
    }

    private RobotControlEnum(int status, String desc) {
        this.status = status;
        this.desc = desc;
    }

    private RobotControlEnum() {
    }

    public int getStatus() {
        return this.status;
    }

    public String getDesc() {
        return this.desc;
    }
}

