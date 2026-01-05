/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.constant.OrderStatusEnum
 */
package com.seer.rds.constant;

/*
 * Exception performing whole class analysis ignored.
 */
public enum OrderStatusEnum {
    CREATED("CREATED", "agv.states.created"),
    TOBEDISPATCHED("TOBEDISPATCHED", "agv.states.tobedispatched"),
    RUNNING("RUNNING", "agv.states.running"),
    FINISHED("FINISHED", "agv.states.finished"),
    FAILED("FAILED", "agv.states.failed"),
    STOPPED("STOPPED", "agv.states.stopped"),
    Error("Error", "agv.states.error"),
    WAITING("WAITING", "agv.states.waiting");

    private String status;
    private String desc;

    public static String getOrderStatusDescByStatus(String status) {
        OrderStatusEnum[] values;
        for (OrderStatusEnum e : values = OrderStatusEnum.values()) {
            if (e.getStatus() != status) continue;
            return e.getDesc();
        }
        return null;
    }

    private OrderStatusEnum(String status, String desc) {
        this.status = status;
        this.desc = desc;
    }

    private OrderStatusEnum() {
    }

    public String getStatus() {
        return this.status;
    }

    public String getDesc() {
        return this.desc;
    }
}

