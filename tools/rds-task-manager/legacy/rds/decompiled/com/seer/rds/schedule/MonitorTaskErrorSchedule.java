/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.constant.TaskStatusEnum
 *  com.seer.rds.dao.SysAlarmMapper
 *  com.seer.rds.model.admin.SysAlarm
 *  com.seer.rds.model.stat.RobotItem
 *  com.seer.rds.model.stat.RobotStatusRecord
 *  com.seer.rds.model.wind.WindTaskRecord
 *  com.seer.rds.schedule.MonitorTaskErrorSchedule
 *  com.seer.rds.service.admin.SysAlarmService
 *  com.seer.rds.service.agv.WindService
 *  org.slf4j.Logger
 *  org.slf4j.LoggerFactory
 *  org.springframework.beans.factory.annotation.Autowired
 *  org.springframework.context.annotation.Configuration
 *  org.springframework.scheduling.annotation.EnableScheduling
 *  org.springframework.scheduling.annotation.Scheduled
 */
package com.seer.rds.schedule;

import com.seer.rds.constant.TaskStatusEnum;
import com.seer.rds.dao.SysAlarmMapper;
import com.seer.rds.model.admin.SysAlarm;
import com.seer.rds.model.stat.RobotItem;
import com.seer.rds.model.stat.RobotStatusRecord;
import com.seer.rds.model.wind.WindTaskRecord;
import com.seer.rds.service.admin.SysAlarmService;
import com.seer.rds.service.agv.WindService;
import java.util.Arrays;
import java.util.List;
import java.util.Queue;
import java.util.concurrent.ConcurrentLinkedQueue;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;

@Configuration
@EnableScheduling
public class MonitorTaskErrorSchedule {
    private static final Logger log = LoggerFactory.getLogger(MonitorTaskErrorSchedule.class);
    @Autowired
    private WindService windService;
    @Autowired
    private SysAlarmMapper sysAlarmMapper;
    @Autowired
    private SysAlarmService sysAlarmService;
    private final Queue<RobotStatusRecord> tempStatusRecords = new ConcurrentLinkedQueue();
    private final Queue<RobotItem> tempItemRecords = new ConcurrentLinkedQueue();

    @Scheduled(cron="0/3 * * * * ?")
    public void recordVehicleStatus() {
        List<Integer> statuses = Arrays.asList(TaskStatusEnum.running.getStatus(), TaskStatusEnum.interrupt.getStatus(), TaskStatusEnum.interrupt_error.getStatus(), TaskStatusEnum.restart_error.getStatus());
        List taskRecords = this.windService.findByStatusIn(statuses);
        List sysAlarmMapperAll = this.sysAlarmMapper.findAll();
        for (SysAlarm sysAlarm : sysAlarmMapperAll) {
            boolean foundMatch = false;
            for (WindTaskRecord taskRecord : taskRecords) {
                if (!sysAlarm.getIdentification().contains(taskRecord.getId())) continue;
                foundMatch = true;
                break;
            }
            if (foundMatch) continue;
            this.sysAlarmMapper.delete((Object)sysAlarm);
        }
        this.sysAlarmService.noticeWebWithTaskAlarmInfo();
    }
}

