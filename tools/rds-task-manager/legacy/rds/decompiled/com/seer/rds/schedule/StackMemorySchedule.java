/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.dao.StackMemInfoMapper
 *  com.seer.rds.schedule.StackMemorySchedule
 *  com.seer.rds.schedule.StackMemorySchedule$1
 *  com.seer.rds.service.system.impl.StackMemInfoServiceImpl
 *  com.seer.rds.web.config.ConfigFileController
 *  javax.annotation.PostConstruct
 *  org.slf4j.Logger
 *  org.slf4j.LoggerFactory
 *  org.springframework.beans.factory.annotation.Autowired
 *  org.springframework.context.annotation.Configuration
 *  org.springframework.scheduling.annotation.EnableScheduling
 *  org.springframework.scheduling.annotation.Scheduled
 */
package com.seer.rds.schedule;

import com.seer.rds.dao.StackMemInfoMapper;
import com.seer.rds.schedule.StackMemorySchedule;
import com.seer.rds.service.system.impl.StackMemInfoServiceImpl;
import com.seer.rds.web.config.ConfigFileController;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Date;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;
import javax.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;

@Configuration
@EnableScheduling
public class StackMemorySchedule {
    private static final Logger log = LoggerFactory.getLogger(StackMemorySchedule.class);
    @Autowired
    private StackMemInfoMapper stackMemInfoMapper;
    @Autowired
    private ConfigFileController configFileController;
    private final ScheduledExecutorService scheduler = Executors.newSingleThreadScheduledExecutor();
    @Autowired
    private StackMemInfoServiceImpl stackMemInfoServiceImpl;

    @PostConstruct
    public void init() {
        if (ConfigFileController.commonConfig != null && ConfigFileController.commonConfig.getIsStackMemoryDisplay() != null && ConfigFileController.commonConfig.getIsStackMemoryDisplay().booleanValue()) {
            this.scheduleTask();
        }
    }

    private void scheduleTask() {
        ArrayList StackMemList = new ArrayList();
        1 task = new /* Unavailable Anonymous Inner Class!! */;
        this.scheduler.scheduleWithFixedDelay((Runnable)task, 0L, 5L, TimeUnit.SECONDS);
    }

    @Scheduled(cron="0 0 10 * * MON")
    public void deleteHistoryMemDataOnMondays() {
        this.deleteHistoryData();
    }

    private void deleteHistoryData() {
        LocalDateTime currentTime = LocalDateTime.now();
        LocalDateTime oneWeeksAgo = currentTime.minusWeeks(1L);
        Date oneWeeksAgoWeeksAgoDate = Date.from(oneWeeksAgo.atZone(ZoneId.systemDefault()).toInstant());
        this.stackMemInfoMapper.deleteByRecordedOnBefore(oneWeeksAgoWeeksAgoDate);
    }
}

