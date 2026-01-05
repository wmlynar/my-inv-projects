/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.alibaba.fastjson.JSONObject
 *  com.seer.rds.config.GlobalCacheConfig
 *  com.seer.rds.constant.AgvActionStatusEnum
 *  com.seer.rds.constant.TaskLogLevelEnum
 *  com.seer.rds.constant.TaskStatusEnum
 *  com.seer.rds.dao.GeneralBusinessMapper
 *  com.seer.rds.dao.ModbusWriteResetMapper
 *  com.seer.rds.listener.MoniterListener
 *  com.seer.rds.listener.WindEvent
 *  com.seer.rds.listener.impl.TaskStatusMonitorListener
 *  com.seer.rds.modbus.Modbus4jUtils
 *  com.seer.rds.model.general.ModbusWriteReset
 *  com.seer.rds.model.wind.TaskRecord
 *  com.seer.rds.script.ScriptService
 *  com.seer.rds.service.agv.WindService
 *  com.seer.rds.service.agv.WorkSiteService
 *  com.seer.rds.service.wind.RootBp
 *  org.apache.commons.collections.CollectionUtils
 *  org.graalvm.polyglot.Context
 *  org.slf4j.Logger
 *  org.slf4j.LoggerFactory
 *  org.springframework.beans.factory.annotation.Autowired
 *  org.springframework.stereotype.Component
 */
package com.seer.rds.listener.impl;

import com.alibaba.fastjson.JSONObject;
import com.seer.rds.config.GlobalCacheConfig;
import com.seer.rds.constant.AgvActionStatusEnum;
import com.seer.rds.constant.TaskLogLevelEnum;
import com.seer.rds.constant.TaskStatusEnum;
import com.seer.rds.dao.GeneralBusinessMapper;
import com.seer.rds.dao.ModbusWriteResetMapper;
import com.seer.rds.listener.MoniterListener;
import com.seer.rds.listener.WindEvent;
import com.seer.rds.modbus.Modbus4jUtils;
import com.seer.rds.model.general.ModbusWriteReset;
import com.seer.rds.model.wind.TaskRecord;
import com.seer.rds.script.ScriptService;
import com.seer.rds.service.agv.WindService;
import com.seer.rds.service.agv.WorkSiteService;
import com.seer.rds.service.wind.RootBp;
import java.util.Collection;
import java.util.List;
import java.util.Set;
import org.apache.commons.collections.CollectionUtils;
import org.graalvm.polyglot.Context;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

@Component
public class TaskStatusMonitorListener
implements MoniterListener {
    private static final Logger log = LoggerFactory.getLogger(TaskStatusMonitorListener.class);
    @Autowired
    private ScriptService scriptService;
    @Autowired
    private WindService windService;
    @Autowired
    private WorkSiteService workSiteService;
    @Autowired
    private ModbusWriteResetMapper mwr;
    @Autowired
    private GeneralBusinessMapper gbm;
    public static final String agvActionDone = "agvActionDone";
    @Deprecated
    public static final String agvActionStopped = "agvActionStopped";
    public static final String agvActionFailed = "agvActionFailed";
    public static final String taskDone = "taskDone";
    public static final String taskStopped = "taskStopped";
    public static final String taskFailed = "taskFailed";
    public static final String taskManualEnd = "taskManualEnd";
    public static final String workSiteChanged = "workSiteChanged";
    public static final String robotsStatusInfoChanged = "robotsStatusInfoChanged";
    public static final String robotsStatusDispatchableChanged = "robotsStatusDispatchableChanged";
    public static final String listenTcpData = "listenTcpData";
    public static final String distributeDone = "distributeDone";
    public static final String distributeStatus = "distributeStatus";
    public static final String robotAlarm = "robotAlarm";
    public static final String onWebsocketMsg = "onWebsocketMsg";
    public static final String robotAlarmCancel = "robotAlarmCancel";
    public static final String coreAlarm = "coreAlarm";
    public static final String coreAlarmCancel = "coreAlarmCancel";
    public static final String coreOrderSendSucceed = "coreOrderSendSucceed";

    /*
     * WARNING - Removed try catching itself - possible behaviour change.
     */
    public void handlerEvent(WindEvent event) {
        block41: {
            try {
                String status = event.getStatus();
                Integer type = event.getType();
                Boolean isAgvActionDone = (Boolean)GlobalCacheConfig.getCache((String)"isAgvActionDone");
                if (type == 2 && (isAgvActionDone == null || isAgvActionDone.booleanValue())) {
                    if (AgvActionStatusEnum.FINISHED.getStatus().equals(status)) {
                        this.execute(agvActionDone, (Object)JSONObject.toJSONString((Object)event));
                    }
                    if (AgvActionStatusEnum.STOPPED.getStatus().equals(status)) {
                        this.execute(agvActionStopped, (Object)JSONObject.toJSONString((Object)event));
                    }
                    if (AgvActionStatusEnum.FAILED.getStatus().equals(status)) {
                        this.execute(agvActionFailed, (Object)JSONObject.toJSONString((Object)event));
                    }
                    break block41;
                }
                if (type == 0 && (isAgvActionDone == null || isAgvActionDone.booleanValue())) {
                    if (String.valueOf(TaskStatusEnum.end.getStatus()).equals(status)) {
                        this.execute(taskDone, (Object)JSONObject.toJSONString((Object)event));
                    }
                    if (String.valueOf(TaskStatusEnum.stop.getStatus()).equals(status)) {
                        try {
                            this.execute(taskStopped, (Object)JSONObject.toJSONString((Object)event));
                            this.resetGeneralModbus(event.getTaskRecord());
                        }
                        finally {
                            this.closeContext(event.getTaskRecord().getId());
                        }
                    }
                    if (String.valueOf(TaskStatusEnum.end_error.getStatus()).equals(status)) {
                        try {
                            this.execute(taskFailed, (Object)JSONObject.toJSONString((Object)event));
                        }
                        finally {
                            this.closeContext(event.getTaskRecord().getId());
                        }
                    }
                    if (String.valueOf(TaskStatusEnum.manual_end.getStatus()).equals(status)) {
                        this.execute(taskManualEnd, (Object)JSONObject.toJSONString((Object)event));
                    }
                    break block41;
                }
                if (type == 3) {
                    this.execute(workSiteChanged, (Object)JSONObject.toJSONString((Object)event));
                } else if (type == 4) {
                    this.execute(robotsStatusInfoChanged, (Object)JSONObject.toJSONString((Object)event));
                } else if (type == 5) {
                    this.execute(robotsStatusDispatchableChanged, (Object)JSONObject.toJSONString((Object)event));
                } else if (type == 6) {
                    this.execute(listenTcpData, (Object)JSONObject.toJSONString((Object)event));
                } else if (type == 7) {
                    this.execute(distributeDone, (Object)JSONObject.toJSONString((Object)event));
                } else if (type == 8) {
                    this.execute(distributeStatus, (Object)JSONObject.toJSONString((Object)event));
                } else if (type == 9) {
                    this.execute(robotAlarm, (Object)JSONObject.toJSONString((Object)event.getData()));
                } else if (type == 10) {
                    this.execute(onWebsocketMsg, event.getData());
                } else if (type == 11) {
                    this.execute(coreAlarmCancel, (Object)JSONObject.toJSONString((Object)event.getData()));
                } else if (type == 12) {
                    this.execute(coreAlarm, (Object)JSONObject.toJSONString((Object)event.getData()));
                } else if (type == 13) {
                    this.execute(robotAlarmCancel, (Object)JSONObject.toJSONString((Object)event.getData()));
                } else if (type == 14) {
                    this.execute(coreOrderSendSucceed, (Object)JSONObject.toJSONString((Object)event));
                } else {
                    log.info("TaskStatusMonitorListener: function is not register");
                }
            }
            catch (Exception e) {
                log.error("TaskStatusMonitorListener:{}", (Throwable)e);
                this.windService.saveLog(TaskLogLevelEnum.info.getLevel(), "TaskStatusMonitorListener error:" + e.getMessage(), event.getTaskRecord().getProjectId(), event.getTaskId(), event.getTaskRecord().getId(), event.getBlockVo() == null ? null : event.getBlockVo().getBlockId());
            }
        }
    }

    private void resetGeneralModbus(TaskRecord task) {
        String defLabel = task.getDefLabel();
        List resultList = this.gbm.findAllByLabel(defLabel);
        if (resultList.isEmpty()) {
            return;
        }
        List result = this.mwr.findAllByTaskRecordId(task.getId());
        for (ModbusWriteReset m : result) {
            try {
                Number value = Modbus4jUtils.readSingleValue((String)m.getAddrType(), (String)m.getIp(), (int)m.getPort(), (int)m.getSlaveId(), (int)m.getAddrNo(), (String)"resetGeneralModbus");
                if (value.intValue() != m.getWriteValue().intValue() || m.getWriteValue() == 0) continue;
                Modbus4jUtils.writeSingleValue((Integer)0, (String)m.getAddrType(), (String)m.getIp(), (int)m.getPort(), (int)m.getSlaveId(), (int)m.getAddrNo(), (String)"resetGeneralModbus");
                log.info("resetGeneralModbus success modbus: {}", (Object)m);
                m.setWriteValue(Integer.valueOf(0));
                this.mwr.save((Object)m);
            }
            catch (Exception e) {
                log.error("resetGeneralModbus error : {}, modbus: {}", (Object)e, (Object)m);
            }
        }
    }

    private void closeContext(String taskRecordId) {
        try {
            List contexts = (List)RootBp.contextMap.get(taskRecordId);
            if (contexts != null) {
                contexts.stream().forEach(it -> ScriptService.closeContextForced((Context)it, (String)"task-stop"));
            }
        }
        catch (Exception e) {
            log.error("closeContext taskRecordId = {}, error {}", (Object)taskRecordId, (Object)e);
        }
    }

    private void execute(String taskEventFun, Object params) {
        Set keys = ScriptService.taskEventFunctionListMap.keySet();
        for (String key : keys) {
            List strings = (List)ScriptService.taskEventFunctionListMap.get(key);
            if (CollectionUtils.isEmpty((Collection)strings) || !strings.contains(taskEventFun)) continue;
            this.scriptService.execute(key, taskEventFun, params);
        }
    }
}

