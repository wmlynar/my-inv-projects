/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.constant.AgvActionStatusEnum
 *  com.seer.rds.constant.TaskStatusEnum
 *  com.seer.rds.dao.EventDefMapper
 *  com.seer.rds.dao.GeneralBusinessMapper
 *  com.seer.rds.dao.ModbusWriteResetMapper
 *  com.seer.rds.listener.MoniterListener
 *  com.seer.rds.listener.WindEvent
 *  com.seer.rds.listener.impl.EventMonitorListener
 *  com.seer.rds.modbus.Modbus4jUtils
 *  com.seer.rds.model.general.ModbusWriteReset
 *  com.seer.rds.model.wind.EventDef
 *  com.seer.rds.model.wind.TaskRecord
 *  com.seer.rds.script.ScriptService
 *  com.seer.rds.service.threadPool.LinkedBqThreadPool
 *  com.seer.rds.service.wind.EventRootBp
 *  com.seer.rds.service.wind.RootBp
 *  com.seer.rds.vo.req.SetOrderReq
 *  org.graalvm.polyglot.Context
 *  org.slf4j.Logger
 *  org.slf4j.LoggerFactory
 *  org.springframework.beans.factory.annotation.Autowired
 *  org.springframework.stereotype.Component
 *  unitauto.JSON
 */
package com.seer.rds.listener.impl;

import com.seer.rds.constant.AgvActionStatusEnum;
import com.seer.rds.constant.TaskStatusEnum;
import com.seer.rds.dao.EventDefMapper;
import com.seer.rds.dao.GeneralBusinessMapper;
import com.seer.rds.dao.ModbusWriteResetMapper;
import com.seer.rds.listener.MoniterListener;
import com.seer.rds.listener.WindEvent;
import com.seer.rds.modbus.Modbus4jUtils;
import com.seer.rds.model.general.ModbusWriteReset;
import com.seer.rds.model.wind.EventDef;
import com.seer.rds.model.wind.TaskRecord;
import com.seer.rds.script.ScriptService;
import com.seer.rds.service.threadPool.LinkedBqThreadPool;
import com.seer.rds.service.wind.EventRootBp;
import com.seer.rds.service.wind.RootBp;
import com.seer.rds.vo.req.SetOrderReq;
import java.util.List;
import org.graalvm.polyglot.Context;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import unitauto.JSON;

@Component
public class EventMonitorListener
implements MoniterListener {
    private static final Logger log = LoggerFactory.getLogger(EventMonitorListener.class);
    @Autowired
    private ModbusWriteResetMapper mwr;
    @Autowired
    private GeneralBusinessMapper gbm;
    @Autowired
    private EventDefMapper eventDefMapper;
    @Autowired
    private EventRootBp rootBp;

    public void handlerEvent(WindEvent event) {
        String status = event.getStatus();
        Integer type = event.getType();
        if (type == 2) {
            this.handleAgvActionEvent(status, event);
        } else if (type == 0) {
            this.handleTaskEvent(status, event);
        } else {
            this.handleOtherEvent(type, event);
        }
    }

    private void handleAgvActionEvent(String status, WindEvent event) {
        if (AgvActionStatusEnum.FINISHED.getStatus().equals(status)) {
            this.executeFunctionIfPresent("agvActionDone", event);
        } else if (AgvActionStatusEnum.FAILED.getStatus().equals(status)) {
            this.executeFunctionIfPresent("agvActionFailed", event);
        }
    }

    private void handleTaskEvent(String status, WindEvent event) {
        if (String.valueOf(TaskStatusEnum.end.getStatus()).equals(status)) {
            this.executeFunctionIfPresent("taskDone", event);
        } else if (String.valueOf(TaskStatusEnum.stop.getStatus()).equals(status)) {
            this.executeFunctionIfPresent("taskStopped", event);
            this.resetGeneralModbus(event.getTaskRecord());
            this.closeContext(event.getTaskRecord().getId());
        } else if (String.valueOf(TaskStatusEnum.end_error.getStatus()).equals(status)) {
            this.executeFunctionIfPresent("taskFailed", event);
            this.closeContext(event.getTaskRecord().getId());
        } else if (String.valueOf(TaskStatusEnum.manual_end.getStatus()).equals(status)) {
            this.executeFunctionIfPresent("taskManualEnd", event);
        }
    }

    private void handleOtherEvent(Integer type, WindEvent event) {
        switch (type) {
            case 3: {
                this.executeFunctionIfPresent("workSiteChanged", event);
                break;
            }
            case 4: {
                this.executeFunctionIfPresent("robotsStatusInfoChanged", event);
                break;
            }
            case 5: {
                this.executeFunctionIfPresent("robotsStatusDispatchableChanged", event);
                break;
            }
            case 6: {
                this.executeFunctionIfPresent("listenTcpData", event);
                break;
            }
            case 7: {
                this.executeFunctionIfPresent("distributeDone", event);
                break;
            }
            case 8: {
                this.executeFunctionIfPresent("distributeStatus", event);
                break;
            }
            case 9: {
                this.executeFunctionIfPresent("robotAlarm", event.getData());
                break;
            }
            case 10: {
                this.executeFunctionIfPresent("onWebsocketMsg", event.getData());
                break;
            }
            default: {
                log.info("TaskStatusMonitorListener: function is not register");
            }
        }
    }

    private void executeFunctionIfPresent(String functionName, Object event) {
        EventDef res = this.eventDefMapper.findAllByLabel(functionName);
        if (res == null) {
            return;
        }
        if (!res.getIfEnable().booleanValue()) {
            return;
        }
        SetOrderReq setOrderReq = new SetOrderReq();
        setOrderReq.setTaskId(res.getId());
        setOrderReq.setEventDef(res);
        setOrderReq.setInputParams(JSON.toJSONString((Object)event));
        this.executeSetOrderRequest(setOrderReq);
    }

    private void executeFunctionIfPresent(String functionName, WindEvent event) {
        EventDef res = this.eventDefMapper.findAllByLabel(functionName);
        if (res == null) {
            return;
        }
        if (!res.getIfEnable().booleanValue()) {
            return;
        }
        SetOrderReq setOrderReq = new SetOrderReq();
        setOrderReq.setTaskId(res.getId());
        setOrderReq.setEventDef(res);
        setOrderReq.setInputParams(JSON.toJSONString((Object)event));
        setOrderReq.setTaskRecordId(event.getTaskRecord() != null ? event.getTaskRecord().getId() : "");
        this.executeSetOrderRequest(setOrderReq);
    }

    private void executeSetOrderRequest(SetOrderReq setOrderReq) {
        LinkedBqThreadPool taskPool = LinkedBqThreadPool.getInstance();
        int taskNum = taskPool.getTaskNum();
        log.info("current running task number is:" + taskNum);
        taskPool.execute(() -> this.rootBp.execute(setOrderReq));
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
}

