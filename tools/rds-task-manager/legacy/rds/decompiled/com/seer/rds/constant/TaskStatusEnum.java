/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.constant.TaskStatusEnum
 */
package com.seer.rds.constant;

/*
 * Exception performing whole class analysis ignored.
 */
public enum TaskStatusEnum {
    running(1000, "@{task.enum.running}"),
    stop(1001, "@{task.enum.stop}"),
    interrupt(1002, "@{task.enum.interrupt}"),
    end(1003, "@{task.enum.end}"),
    end_error(1004, "@{task.enum.endError}"),
    restart_error(1005, "@{task.enum.restartError}"),
    interrupt_error(1006, "@{task.enum.interruptError}"),
    manual_end(1007, "@{task.enum.ManualEnd}");

    private int status;
    private String desc;

    public static TaskStatusEnum getTaskStatusEnum(int status) {
        TaskStatusEnum[] values;
        for (TaskStatusEnum e : values = TaskStatusEnum.values()) {
            if (e.getStatus() != status) continue;
            return e;
        }
        return null;
    }

    public static int getTaskStatusByName(String name) {
        TaskStatusEnum value = TaskStatusEnum.valueOf((String)name);
        return value.getStatus();
    }

    public static void main(String[] args) {
        TaskStatusEnum taskStatusEnum = TaskStatusEnum.getTaskStatusEnum((int)1000);
        System.out.println(taskStatusEnum.getDesc());
    }

    private TaskStatusEnum(int status, String desc) {
        this.status = status;
        this.desc = desc;
    }

    private TaskStatusEnum() {
    }

    public int getStatus() {
        return this.status;
    }

    public String getDesc() {
        return this.desc;
    }
}

