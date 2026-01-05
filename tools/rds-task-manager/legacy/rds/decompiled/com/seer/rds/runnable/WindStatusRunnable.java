/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.config.GlobalCacheConfig
 *  com.seer.rds.config.PropConfig
 *  com.seer.rds.constant.TaskStatusEnum
 *  com.seer.rds.dao.WindBlockRecordMapper
 *  com.seer.rds.model.wind.BaseRecord
 *  com.seer.rds.model.wind.WindTaskRecord
 *  com.seer.rds.runnable.WindStatusRunnable
 *  com.seer.rds.service.agv.AgvApiService
 *  com.seer.rds.service.agv.WindService
 *  com.seer.rds.service.threadPool.LinkedBqThreadPool
 *  com.seer.rds.service.wind.TaskReloadService
 *  com.seer.rds.util.SpringUtil
 *  org.apache.commons.collections.CollectionUtils
 *  org.slf4j.Logger
 *  org.slf4j.LoggerFactory
 */
package com.seer.rds.runnable;

import com.seer.rds.config.GlobalCacheConfig;
import com.seer.rds.config.PropConfig;
import com.seer.rds.constant.TaskStatusEnum;
import com.seer.rds.dao.WindBlockRecordMapper;
import com.seer.rds.model.wind.BaseRecord;
import com.seer.rds.model.wind.WindTaskRecord;
import com.seer.rds.service.agv.AgvApiService;
import com.seer.rds.service.agv.WindService;
import com.seer.rds.service.threadPool.LinkedBqThreadPool;
import com.seer.rds.service.wind.TaskReloadService;
import com.seer.rds.util.SpringUtil;
import java.util.Arrays;
import java.util.Collection;
import java.util.Comparator;
import java.util.List;
import org.apache.commons.collections.CollectionUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class WindStatusRunnable
implements Runnable {
    private static final Logger log = LoggerFactory.getLogger(WindStatusRunnable.class);

    @Override
    public void run() {
        try {
            log.info("Start the task restart recovery");
            WindService windService = (WindService)SpringUtil.getBean(WindService.class);
            WindBlockRecordMapper blockRecordMapper = (WindBlockRecordMapper)SpringUtil.getBean(WindBlockRecordMapper.class);
            AgvApiService agvApiService = (AgvApiService)SpringUtil.getBean(AgvApiService.class);
            List<Integer> statuses = Arrays.asList(TaskStatusEnum.running.getStatus(), TaskStatusEnum.interrupt.getStatus(), TaskStatusEnum.interrupt_error.getStatus(), TaskStatusEnum.restart_error.getStatus());
            List taskRecords = windService.findByStatusIn(statuses);
            taskRecords.sort(Comparator.comparing(BaseRecord::getCreatedOn));
            if (CollectionUtils.isNotEmpty((Collection)taskRecords)) {
                LinkedBqThreadPool executorService = LinkedBqThreadPool.getInstance();
                for (WindTaskRecord taskRecord : taskRecords) {
                    boolean ifRecover = PropConfig.ifRestartRecover((WindTaskRecord)taskRecord);
                    log.info("Task id: " + taskRecord.getId() + " ifRecover: " + ifRecover);
                    if (GlobalCacheConfig.getCacheThread((String)taskRecord.getId()) != null) continue;
                    if (ifRecover) {
                        TaskReloadService taskReloadService = (TaskReloadService)SpringUtil.getBean(TaskReloadService.class);
                        taskReloadService.reloadAndRunTaskDef(taskRecord);
                    } else {
                        executorService.execute((Runnable)new /* Unavailable Anonymous Inner Class!! */);
                    }
                    Thread.sleep(500L);
                }
            }
        }
        catch (Exception e) {
            try {
                Thread.sleep(500L);
            }
            catch (InterruptedException interruptedException) {
                log.error("WindOrderRunnable interruptedException", (Throwable)interruptedException);
            }
            log.error("WindOrderRunnable error", (Throwable)e);
        }
    }
}

