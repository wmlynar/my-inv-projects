/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.constant.RobotNavigationStatusEnum
 */
package com.seer.rds.constant;

/*
 * Exception performing whole class analysis ignored.
 */
public enum RobotNavigationStatusEnum {
    NONE(0, "task.status.none"),
    WARM(1, "task.status.warm"),
    RUNNING(2, "task.status.running"),
    PAUSE(3, "task.status.pause"),
    COMPLETE(4, "task.status.complete"),
    FAILED(5, "task.status.failed"),
    CANCEL(6, "task.status.cancel");

    private int status;
    private String desc;

    public static String getRobotNavigationDescByStatus(int status) {
        RobotNavigationStatusEnum[] values;
        for (RobotNavigationStatusEnum e : values = RobotNavigationStatusEnum.values()) {
            if (e.getStatus() != status) continue;
            return e.getDesc();
        }
        return null;
    }

    private RobotNavigationStatusEnum(int status, String desc) {
        this.status = status;
        this.desc = desc;
    }

    private RobotNavigationStatusEnum() {
    }

    public int getStatus() {
        return this.status;
    }

    public String getDesc() {
        return this.desc;
    }
}

