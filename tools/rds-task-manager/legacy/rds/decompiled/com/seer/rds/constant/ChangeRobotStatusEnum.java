/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.constant.ChangeRobotStatusEnum
 */
package com.seer.rds.constant;

public enum ChangeRobotStatusEnum {
    choosingRobot(1000, "@{change.robot.choosing}"),
    choosingRobotError(1001, "@{change.robot.choosingError}"),
    assigned(1002, "@{change.robot.assigned}"),
    RobotActionFailure(1003, "@{change.robot.RobotActionFailure}"),
    WaitingForRelease(1004, "@{change.robot.WaitingForRelease}"),
    end(1005, "@{change.robot.end}"),
    restart(1006, "@{change.robot.restart}");

    private int status;
    private String desc;

    private ChangeRobotStatusEnum(int status, String desc) {
        this.status = status;
        this.desc = desc;
    }

    private ChangeRobotStatusEnum() {
    }

    public int getStatus() {
        return this.status;
    }

    public String getDesc() {
        return this.desc;
    }
}

