/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.constant.TaskBlockStatusEnum
 */
package com.seer.rds.constant;

public enum TaskBlockStatusEnum {
    running(1000, "@{task.enum.blockRunning}"),
    stop(1001, "@{task.enum.blockStop}"),
    interrupt(1002, "@{task.enum.blockInterrupt}"),
    end(1003, "@{wind.bp.end}"),
    end_error(1004, "@{wind.bp.stopError}"),
    unexecuted(1005, "@{task.enum.blockUnexecuted}"),
    end_parallel(1006, "@{task.enum.blockEndParallel}"),
    suspend(1007, "@{task.enum.blockSuspend}"),
    manualEnd(1008, "@{task.enum.manualEnd}");

    private int status;
    private String desc;

    private TaskBlockStatusEnum(int status, String desc) {
        this.status = status;
        this.desc = desc;
    }

    private TaskBlockStatusEnum() {
    }

    public int getStatus() {
        return this.status;
    }

    public String getDesc() {
        return this.desc;
    }
}

