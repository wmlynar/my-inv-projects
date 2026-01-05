/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.alibaba.fastjson.JSONObject
 *  com.seer.rds.constant.TaskLogLevelEnum
 *  com.seer.rds.constant.TaskStatusEnum
 *  com.seer.rds.listener.MoniterListener
 *  com.seer.rds.listener.WindEvent
 *  com.seer.rds.listener.impl.TaskFinishMonitorListener
 *  com.seer.rds.script.ScriptService
 *  com.seer.rds.service.agv.WindService
 *  org.slf4j.Logger
 *  org.slf4j.LoggerFactory
 *  org.springframework.beans.factory.annotation.Autowired
 *  org.springframework.stereotype.Component
 */
package com.seer.rds.listener.impl;

import com.alibaba.fastjson.JSONObject;
import com.seer.rds.constant.TaskLogLevelEnum;
import com.seer.rds.constant.TaskStatusEnum;
import com.seer.rds.listener.MoniterListener;
import com.seer.rds.listener.WindEvent;
import com.seer.rds.script.ScriptService;
import com.seer.rds.service.agv.WindService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

@Component
public class TaskFinishMonitorListener
implements MoniterListener {
    private static final Logger log = LoggerFactory.getLogger(TaskFinishMonitorListener.class);
    @Autowired
    private ScriptService scriptService;
    @Autowired
    private WindService windService;
    private static final String taskFinished = "onTaskFinished";

    public void handlerEvent(WindEvent event) {
        block3: {
            try {
                String status = event.getStatus();
                Integer type = event.getType();
                if (type != 0 || !status.equals(String.valueOf(TaskStatusEnum.stop.getStatus())) && !status.equals(String.valueOf(TaskStatusEnum.end_error.getStatus())) && !status.equals(String.valueOf(TaskStatusEnum.end.getStatus())) || !event.getTaskRecord().getStatus().equals(TaskStatusEnum.end_error.getStatus()) && !event.getTaskRecord().getStatus().equals(TaskStatusEnum.stop.getStatus()) && !event.getTaskRecord().getStatus().equals(TaskStatusEnum.end.getStatus())) break block3;
                for (String func : ScriptService.taskEventFunctionList) {
                    if (!func.equals(taskFinished)) continue;
                    this.scriptService.execute(taskFinished, (Object)JSONObject.toJSONString((Object)event));
                    break;
                }
            }
            catch (Exception e) {
                log.error("TaskFinishMonitorListener:{}", (Throwable)e);
                this.windService.saveLog(TaskLogLevelEnum.info.getLevel(), "TaskFinishMonitorListener error:" + e.getMessage(), event.getTaskRecord().getProjectId(), event.getTaskId(), event.getTaskRecord().getId(), event.getBlockVo().getBlockId());
            }
        }
    }
}

