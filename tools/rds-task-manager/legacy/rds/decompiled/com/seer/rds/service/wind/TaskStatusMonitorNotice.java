/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.constant.TaskStatusEnum
 *  com.seer.rds.listener.EventSource
 *  com.seer.rds.listener.WindEvent
 *  com.seer.rds.model.wind.TaskRecord
 *  com.seer.rds.model.wind.WindBlockRecord
 *  com.seer.rds.service.wind.TaskStatusMonitorNotice
 *  com.seer.rds.util.SpringUtil
 *  com.seer.rds.vo.WindBlockVo
 */
package com.seer.rds.service.wind;

import com.seer.rds.constant.TaskStatusEnum;
import com.seer.rds.listener.EventSource;
import com.seer.rds.listener.WindEvent;
import com.seer.rds.model.wind.TaskRecord;
import com.seer.rds.model.wind.WindBlockRecord;
import com.seer.rds.util.SpringUtil;
import com.seer.rds.vo.WindBlockVo;

public class TaskStatusMonitorNotice {
    public static void taskFailedNotice(TaskRecord taskRecord, WindBlockRecord blockRecord, WindBlockVo blockVo, String taskId, String endedReason) {
        EventSource eventSource = (EventSource)SpringUtil.getBean(EventSource.class);
        WindEvent event = WindEvent.builder().type(Integer.valueOf(0)).status(String.valueOf(TaskStatusEnum.end_error.getStatus())).taskRecord(taskRecord).blockRecord(blockRecord).blockVo(blockVo).taskId(taskId).taskLabel(taskRecord.getDefLabel()).msg(endedReason).agvId(null).workSite(null).build();
        eventSource.notify(event);
    }

    public static void taskInterruptNotice(TaskRecord taskRecord, WindBlockRecord blockRecord, WindBlockVo blockVo, String taskId) {
        EventSource eventSource = (EventSource)SpringUtil.getBean(EventSource.class);
        WindEvent event = WindEvent.builder().type(Integer.valueOf(0)).status(String.valueOf(TaskStatusEnum.interrupt_error.getStatus())).taskRecord(taskRecord).blockRecord(blockRecord).blockVo(blockVo).taskId(taskId).taskLabel(taskRecord.getDefLabel()).agvId(null).workSite(null).build();
        eventSource.notify(event);
    }
}

