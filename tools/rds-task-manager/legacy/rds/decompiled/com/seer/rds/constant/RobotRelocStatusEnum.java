/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.constant.RobotRelocStatusEnum
 */
package com.seer.rds.constant;

/*
 * Exception performing whole class analysis ignored.
 */
public enum RobotRelocStatusEnum {
    FAILED(0, "agv.location.failed"),
    SUCCESS(1, "agv.location.success"),
    RELOCING(2, "agv.location.relocating"),
    COMPLETED(3, "agv.location.complete");

    private int status;
    private String desc;

    public static String getRobotRelocDescByStatus(int status) {
        RobotRelocStatusEnum[] values;
        for (RobotRelocStatusEnum e : values = RobotRelocStatusEnum.values()) {
            if (e.getStatus() != status) continue;
            return e.getDesc();
        }
        return null;
    }

    private RobotRelocStatusEnum(int status, String desc) {
        this.status = status;
        this.desc = desc;
    }

    private RobotRelocStatusEnum() {
    }

    public int getStatus() {
        return this.status;
    }

    public String getDesc() {
        return this.desc;
    }
}

