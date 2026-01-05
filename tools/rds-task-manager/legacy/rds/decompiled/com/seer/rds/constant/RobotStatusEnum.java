/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.constant.RobotStatusEnum
 */
package com.seer.rds.constant;

/*
 * Exception performing whole class analysis ignored.
 */
public enum RobotStatusEnum {
    DISCONNECTED(0, "robot_disconnected", "agv.status.disconnected"),
    UNAVAILABLE(1, "robot_unavailable", "agv.status.unavailable"),
    ERROR(2, "robot_error", "agv.status.error"),
    EXECUTING(3, "robot_executing_business", "agv.status.execBusiness"),
    CHARGING(4, "robot_charging", "agv.status.charging"),
    IDLE(5, "robot_idle", "agv.status.idle");

    private int status;
    private String desc;
    private String internationalDesc;

    public static RobotStatusEnum getRobotStatusEnum(int status) {
        RobotStatusEnum[] values;
        for (RobotStatusEnum e : values = RobotStatusEnum.values()) {
            if (e.getStatus() != status) continue;
            return e;
        }
        return null;
    }

    public static int getRobotStatusByName(String name) {
        RobotStatusEnum value = RobotStatusEnum.valueOf((String)name);
        return value.getStatus();
    }

    public static String getInternationalDescEnum(int status) {
        RobotStatusEnum[] values;
        for (RobotStatusEnum e : values = RobotStatusEnum.values()) {
            if (e.getStatus() != status) continue;
            return e.getInternationalDesc();
        }
        return null;
    }

    private RobotStatusEnum(int status, String desc, String internationalDesc) {
        this.status = status;
        this.desc = desc;
        this.internationalDesc = internationalDesc;
    }

    private RobotStatusEnum() {
    }

    public int getStatus() {
        return this.status;
    }

    public String getDesc() {
        return this.desc;
    }

    public String getInternationalDesc() {
        return this.internationalDesc;
    }
}

