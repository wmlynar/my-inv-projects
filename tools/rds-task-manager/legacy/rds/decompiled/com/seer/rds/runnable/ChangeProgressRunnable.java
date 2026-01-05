/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.constant.ChangeRobotStatusEnum
 *  com.seer.rds.dao.ChangeAgvProgressMapper
 *  com.seer.rds.runnable.ChangeProgressRunnable
 *  com.seer.rds.service.agv.AgvApiService
 *  com.seer.rds.service.threadPool.LinkedBqThreadPool
 *  com.seer.rds.util.SpringUtil
 *  org.slf4j.Logger
 *  org.slf4j.LoggerFactory
 */
package com.seer.rds.runnable;

import com.seer.rds.constant.ChangeRobotStatusEnum;
import com.seer.rds.dao.ChangeAgvProgressMapper;
import com.seer.rds.service.agv.AgvApiService;
import com.seer.rds.service.threadPool.LinkedBqThreadPool;
import com.seer.rds.util.SpringUtil;
import java.util.Arrays;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class ChangeProgressRunnable
implements Runnable {
    private static final Logger log = LoggerFactory.getLogger(ChangeProgressRunnable.class);

    @Override
    public void run() {
        log.info("start handle restart recovery changeProgress");
        ChangeAgvProgressMapper changeAgvProgressMapper = (ChangeAgvProgressMapper)SpringUtil.getBean(ChangeAgvProgressMapper.class);
        AgvApiService agvApiService = (AgvApiService)SpringUtil.getBean(AgvApiService.class);
        List<Integer> statuses = Arrays.asList(ChangeRobotStatusEnum.choosingRobot.getStatus(), ChangeRobotStatusEnum.WaitingForRelease.getStatus(), ChangeRobotStatusEnum.assigned.getStatus());
        List byStatusIn = changeAgvProgressMapper.findByStatusIn(statuses);
        byStatusIn.stream().forEach(changeAgvProgress -> {
            LinkedBqThreadPool executorService = LinkedBqThreadPool.getInstance();
            executorService.execute((Runnable)new /* Unavailable Anonymous Inner Class!! */);
        });
    }
}

