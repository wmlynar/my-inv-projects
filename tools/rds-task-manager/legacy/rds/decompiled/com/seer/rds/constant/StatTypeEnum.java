/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.constant.RobotStatusEnum
 *  com.seer.rds.constant.StatTypeEnum
 *  com.seer.rds.constant.TaskStatusEnum
 */
package com.seer.rds.constant;

import com.seer.rds.constant.RobotStatusEnum;
import com.seer.rds.constant.TaskStatusEnum;
import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

/*
 * Exception performing whole class analysis ignored.
 */
public enum StatTypeEnum {
    VehicleOfflineTime(RobotStatusEnum.DISCONNECTED.name()),
    VehicleErrorTime(RobotStatusEnum.ERROR.name()),
    VehicleUnavailableTime(RobotStatusEnum.UNAVAILABLE.name()),
    VehicleExecutingTime(RobotStatusEnum.EXECUTING.name()),
    VehicleChargingTime(RobotStatusEnum.CHARGING.name()),
    VehicleIdleTime(RobotStatusEnum.IDLE.name()),
    OrderBusinessOdo("FINISHED"),
    OrderCreatedNum,
    OrderTakingNum,
    OrderFinishedNum("FINISHED"),
    OrderStoppedNum("STOPPED"),
    WindTaskAvgCostTime,
    WindTaskCreatedNum,
    WindTaskFinishedNum(TaskStatusEnum.end.name()),
    WindTaskStoppedNum(TaskStatusEnum.stop.name()),
    WindTaskExceptionNum,
    WorkTypeTaskCreatedNum,
    WorkTypeTaskFinishedNum(TaskStatusEnum.end.name()),
    WorkTypeTaskStoppedNum(TaskStatusEnum.stop.name()),
    WorkTypeTaskExceptionNum(TaskStatusEnum.end_error.name()),
    WorkStationTaskCreatedNum,
    WorkStationTaskFinishedNum(TaskStatusEnum.end.name()),
    WorkStationTaskStoppedNum(TaskStatusEnum.stop.name()),
    WorkStationTaskExceptionNum(TaskStatusEnum.end_error.name()),
    AlarmsErrorsTime("errors"),
    AlarmsWarningsTime("warnings"),
    AlarmsFatalsTime("fatals"),
    AlarmsErrorsNum("errors"),
    AlarmsWarningsNum("warnings"),
    AlarmsFatalsNum("fatals");

    private String statusName;

    public static List<StatTypeEnum> getVehicleStatusEnum() {
        return Arrays.stream(StatTypeEnum.values()).filter(s -> s.name().startsWith("Vehicle")).collect(Collectors.toList());
    }

    public static List<StatTypeEnum> getCoreOrderEnum() {
        return Arrays.stream(StatTypeEnum.values()).filter(s -> s.name().startsWith("Order")).collect(Collectors.toList());
    }

    public static List<StatTypeEnum> getWindTaskEnum() {
        return Arrays.stream(StatTypeEnum.values()).filter(s -> s.name().startsWith("WindTask")).collect(Collectors.toList());
    }

    public static List<StatTypeEnum> getAlarmsTimeEnum() {
        return Arrays.stream(StatTypeEnum.values()).filter(s -> s.name().matches("Alarms(.*)Time")).collect(Collectors.toList());
    }

    public static List<StatTypeEnum> getAlarmsNumEnum() {
        return Arrays.stream(StatTypeEnum.values()).filter(s -> s.name().matches("Alarms(.*)Num")).collect(Collectors.toList());
    }

    public static List<StatTypeEnum> getAlarmsEnum() {
        return Arrays.stream(StatTypeEnum.values()).filter(s -> s.name().matches("Alarms(.*)")).collect(Collectors.toList());
    }

    public static List<StatTypeEnum> getWindTaskTypeOrStationEnum() {
        return Arrays.stream(StatTypeEnum.values()).filter(s -> s.name().matches("WorkStationTask(.*)") || s.name().matches("WorkTypeTask(.*)")).collect(Collectors.toList());
    }

    private StatTypeEnum(String statusName) {
        this.statusName = statusName;
    }

    public String getStatusName() {
        return this.statusName;
    }

    private StatTypeEnum() {
    }
}

