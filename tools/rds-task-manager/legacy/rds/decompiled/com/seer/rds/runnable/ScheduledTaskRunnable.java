/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.dao.WindTaskDefMapper
 *  com.seer.rds.model.wind.WindTaskDef
 *  com.seer.rds.runnable.ScheduledTaskRunnable
 *  com.seer.rds.runnable.SerialScheduledExecutorService
 *  com.seer.rds.service.agv.WindTaskDefService
 *  com.seer.rds.util.SpringUtil
 *  org.slf4j.Logger
 *  org.slf4j.LoggerFactory
 */
package com.seer.rds.runnable;

import com.seer.rds.dao.WindTaskDefMapper;
import com.seer.rds.model.wind.WindTaskDef;
import com.seer.rds.runnable.SerialScheduledExecutorService;
import com.seer.rds.service.agv.WindTaskDefService;
import com.seer.rds.util.SpringUtil;
import java.util.List;
import java.util.concurrent.TimeUnit;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class ScheduledTaskRunnable
implements Runnable {
    private static final Logger log = LoggerFactory.getLogger(ScheduledTaskRunnable.class);
    private SerialScheduledExecutorService executorService = null;

    @Override
    public void run() {
        SerialScheduledExecutorService scheduledExecutorService;
        WindTaskDefMapper windTaskDefMapper = (WindTaskDefMapper)SpringUtil.getBean(WindTaskDefMapper.class);
        this.executorService = scheduledExecutorService = new SerialScheduledExecutorService(10);
        List periodicTask = windTaskDefMapper.findPeriodicTask();
        List periodicTaskAndEnable = windTaskDefMapper.findPeriodicTaskAndEnable();
        WindTaskDefService.PeriodicTaskList.addAll(periodicTask);
        WindTaskDefService.PeriodicEnableTaskList.addAll(periodicTaskAndEnable);
        for (WindTaskDef windTaskDef : periodicTask) {
            this.executorService.scheduleAtFixedRate((Runnable)new /* Unavailable Anonymous Inner Class!! */, windTaskDef.getDelay(), windTaskDef.getPeriod(), TimeUnit.MILLISECONDS);
        }
    }
}

