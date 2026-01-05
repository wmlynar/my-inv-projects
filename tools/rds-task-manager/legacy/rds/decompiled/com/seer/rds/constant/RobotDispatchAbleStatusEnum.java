/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.constant.RobotDispatchAbleStatusEnum
 */
package com.seer.rds.constant;

/*
 * Exception performing whole class analysis ignored.
 */
public enum RobotDispatchAbleStatusEnum {
    Dispatchable(true, "agv.status.dispatchable"),
    Undispatchable(false, "agv.status.undispatchable");

    private boolean status;
    private String desc;

    public static String getRobotDispacheDescByStatus(boolean status) {
        RobotDispatchAbleStatusEnum[] values;
        for (RobotDispatchAbleStatusEnum e : values = RobotDispatchAbleStatusEnum.values()) {
            if (e.isStatus() != status) continue;
            return e.getDesc();
        }
        return null;
    }

    private RobotDispatchAbleStatusEnum(boolean status, String desc) {
        this.status = status;
        this.desc = desc;
    }

    private RobotDispatchAbleStatusEnum() {
    }

    public boolean isStatus() {
        return this.status;
    }

    public String getDesc() {
        return this.desc;
    }
}

