/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.dao.WindTaskDefMapper
 *  com.seer.rds.dao.WindTaskRecordMapper
 *  com.seer.rds.schedule.ClearDataSchedule
 *  com.seer.rds.util.SpringUtil
 *  org.slf4j.Logger
 *  org.slf4j.LoggerFactory
 *  org.springframework.context.annotation.Configuration
 *  org.springframework.scheduling.annotation.EnableScheduling
 *  org.springframework.scheduling.annotation.Scheduled
 */
package com.seer.rds.schedule;

import com.seer.rds.dao.WindTaskDefMapper;
import com.seer.rds.dao.WindTaskRecordMapper;
import com.seer.rds.util.SpringUtil;
import java.util.Date;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;

@Configuration
@EnableScheduling
public class ClearDataSchedule {
    private static final Logger log = LoggerFactory.getLogger(ClearDataSchedule.class);

    @Scheduled(fixedRate=3600000L)
    public void clear() {
        try {
            log.info("fixedRateLongTimeTask");
            WindTaskDefMapper windTaskDefMapper = (WindTaskDefMapper)SpringUtil.getBean(WindTaskDefMapper.class);
            WindTaskRecordMapper windTaskRecordMapper = (WindTaskRecordMapper)SpringUtil.getBean(WindTaskRecordMapper.class);
            List periodicTask = windTaskDefMapper.findPeriodicTask();
            Date now = new Date();
            long oneHour = 86400000L;
            Date oneHourAgo = new Date(now.getTime() - oneHour);
            periodicTask.forEach(e -> windTaskRecordMapper.deleteWindTaskRecordByDefId(e.getId(), oneHourAgo));
        }
        catch (Exception e2) {
            log.error("clear schedule data error", (Throwable)e2);
        }
    }
}

