/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.alibaba.fastjson.JSONArray
 *  com.alibaba.fastjson.JSONObject
 *  com.seer.rds.config.GlobalCacheConfig
 *  com.seer.rds.constant.CommonCodeEnum
 *  com.seer.rds.constant.TaskBlockStatusEnum
 *  com.seer.rds.constant.TaskLogLevelEnum
 *  com.seer.rds.constant.TaskStatusEnum
 *  com.seer.rds.dao.EventRecordMapper
 *  com.seer.rds.model.wind.BaseRecord
 *  com.seer.rds.model.wind.EventDef
 *  com.seer.rds.model.wind.EventRecord
 *  com.seer.rds.model.wind.WindBlockRecord
 *  com.seer.rds.service.agv.WindService
 *  com.seer.rds.service.factory.RecordUpdaterFactory
 *  com.seer.rds.service.wind.AbstratRootBp
 *  com.seer.rds.service.wind.EventRootBp
 *  com.seer.rds.service.wind.commonBp.WhileBp
 *  com.seer.rds.vo.req.SetOrderReq
 *  com.seer.rds.vo.wind.BlockField
 *  com.seer.rds.vo.wind.GlobalField
 *  com.seer.rds.vo.wind.GlobalFieldInputParams
 *  org.apache.commons.lang3.StringUtils
 *  org.slf4j.Logger
 *  org.slf4j.LoggerFactory
 *  org.springframework.beans.factory.annotation.Autowired
 *  org.springframework.context.annotation.Scope
 *  org.springframework.context.annotation.ScopedProxyMode
 *  org.springframework.stereotype.Component
 */
package com.seer.rds.service.wind;

import com.alibaba.fastjson.JSONArray;
import com.alibaba.fastjson.JSONObject;
import com.seer.rds.config.GlobalCacheConfig;
import com.seer.rds.constant.CommonCodeEnum;
import com.seer.rds.constant.TaskBlockStatusEnum;
import com.seer.rds.constant.TaskLogLevelEnum;
import com.seer.rds.constant.TaskStatusEnum;
import com.seer.rds.dao.EventRecordMapper;
import com.seer.rds.model.wind.BaseRecord;
import com.seer.rds.model.wind.EventDef;
import com.seer.rds.model.wind.EventRecord;
import com.seer.rds.model.wind.WindBlockRecord;
import com.seer.rds.service.agv.WindService;
import com.seer.rds.service.factory.RecordUpdaterFactory;
import com.seer.rds.service.wind.AbstratRootBp;
import com.seer.rds.service.wind.commonBp.WhileBp;
import com.seer.rds.vo.req.SetOrderReq;
import com.seer.rds.vo.wind.BlockField;
import com.seer.rds.vo.wind.GlobalField;
import com.seer.rds.vo.wind.GlobalFieldInputParams;
import java.util.Date;
import java.util.Map;
import java.util.UUID;
import org.apache.commons.lang3.StringUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Scope;
import org.springframework.context.annotation.ScopedProxyMode;
import org.springframework.stereotype.Component;

@Component
@Scope(value="prototype", proxyMode=ScopedProxyMode.TARGET_CLASS)
public class EventRootBp
extends AbstratRootBp<EventRecord> {
    private static final Logger log = LoggerFactory.getLogger(EventRootBp.class);
    @Autowired
    private WindService windService;
    @Autowired
    private EventRecordMapper eventRecordMapper;

    public Object exceptionHandle(Exception e) {
        Object status = GlobalCacheConfig.getCache((String)(this.taskId + ((EventRecord)this.taskRecord).getId()));
        log.error("EventRootBp error", (Throwable)e);
        this.windService.saveLog(TaskLogLevelEnum.error.getLevel(), "[EventRootBp]@{wind.bp.fail}:" + e.getMessage(), this.projectId, this.taskId, ((EventRecord)this.taskRecord).getId(), Integer.valueOf(-1));
        ((EventRecord)this.taskRecord).setEndedOn(new Date());
        ((EventRecord)this.taskRecord).setEndedReason("[EventRootBp]@{wind.bp.fail}:" + e.getMessage());
        ((EventRecord)this.taskRecord).setStatus(Integer.valueOf(TaskStatusEnum.end_error.getStatus()));
        RecordUpdaterFactory.getUpdater((BaseRecord)this.taskRecord).updateRecord(this.taskRecord);
        this.blockRecord.setOutputParams(JSONObject.toJSONString(outputParamsMap.get()));
        this.blockRecord.setInputParams(JSONObject.toJSONString(inputParamsMap.get()));
        this.blockRecord.setInternalVariables(JSONObject.toJSONString(taskVariablesMap.get()));
        this.windService.saveErrorBlockRecord(this.blockRecord, Integer.valueOf(-1), "InterfaceRootBp", ((EventRecord)this.taskRecord).getProjectId(), this.taskId, ((EventRecord)this.taskRecord).getId(), new Date(), e);
        GlobalCacheConfig.cache((String)(this.taskId + ((EventRecord)this.taskRecord).getId()), (Object)TaskStatusEnum.end_error.getStatus());
        taskStatus.put(this.taskId + ((EventRecord)this.taskRecord).getId(), false);
        windTaskRecordMap.remove(((EventRecord)this.taskRecord).getId());
        return String.valueOf(CommonCodeEnum.TASK_RUN_FAILED.getCode());
    }

    public void clearCache() {
        inputParamsMap.remove();
        outputParamsMap.remove();
        taskVariablesMap.remove();
        windTaskRecordMap.remove(((EventRecord)this.taskRecord).getId());
        taskStatus.remove(this.taskId + ((EventRecord)this.taskRecord).getId());
        GlobalCacheConfig.clearCache((String)(this.taskId + ((EventRecord)this.taskRecord).getId()));
        WhileBp.ifWhilePrintLogs.remove(((EventRecord)this.taskRecord).getId() + Thread.currentThread().getId());
        GlobalCacheConfig.clearCacheSkip((String)(this.taskId + ((EventRecord)this.taskRecord).getId()));
    }

    public Object taskfinished(SetOrderReq req) {
        Object status = GlobalCacheConfig.getCache((String)(this.taskId + ((EventRecord)this.taskRecord).getId()));
        if (status == null || Integer.parseInt(status.toString()) == TaskStatusEnum.end.getStatus() || Integer.parseInt(status.toString()) == TaskStatusEnum.running.getStatus()) {
            ((EventRecord)this.taskRecord).setEndedOn(new Date());
            ((EventRecord)this.taskRecord).setEndedReason("[EventRootBp]@{wind.task.end}");
            ((EventRecord)this.taskRecord).setStatus(Integer.valueOf(TaskStatusEnum.end.getStatus()));
            RecordUpdaterFactory.getUpdater((BaseRecord)this.taskRecord).updateRecord(this.taskRecord);
            this.blockRecord.setEndedOn(new Date());
            this.blockRecord.setEndedReason("[EventRootBp]@{wind.task.end}");
            this.blockRecord.setStatus(Integer.valueOf(TaskBlockStatusEnum.end.getStatus()));
            this.windService.saveBlockRecord(this.blockRecord);
        }
        return String.valueOf(CommonCodeEnum.TASK_RUN_SUCCESS.getCode());
    }

    public JSONArray buildRecord(SetOrderReq req) {
        String projectId = "";
        this.taskRecord = new EventRecord();
        WindBlockRecord blockRecord = new WindBlockRecord();
        this.taskLabel = req.getTaskLabel();
        Integer rootblockId = null;
        EventDef res = req.getEventDef();
        this.taskId = res.getId();
        log.info("eventRootBp taskId={}, taskLabel={}.", (Object)this.taskId, (Object)this.taskLabel);
        projectId = res.getProjectId();
        this.detail = res.getDetail();
        log.info("EventRootBp detail={}", (Object)this.detail);
        JSONObject root = JSONObject.parseObject((String)this.detail);
        JSONObject rootBlock = root.getJSONObject(GlobalField.rootBlock);
        rootblockId = rootBlock.getInteger(GlobalField.id);
        JSONObject children = rootBlock.getJSONObject(BlockField.children);
        this.childrenDefault = children.getJSONArray(BlockField.childrenDefault);
        JSONArray taskInputParams = null;
        if (StringUtils.isEmpty((CharSequence)req.getInputParams())) {
            taskInputParams = root.getJSONArray(GlobalField.inputParams);
        } else {
            taskInputParams = root.getJSONArray(GlobalField.inputParams);
            JSONObject reqInputParams = JSONObject.parseObject((String)req.getInputParams());
            for (Map.Entry next : reqInputParams.entrySet()) {
                String reqName = (String)next.getKey();
                Object value = next.getValue();
                for (int i = 0; i < taskInputParams.size(); ++i) {
                    JSONObject param = taskInputParams.getJSONObject(i);
                    String name = param.getString(GlobalFieldInputParams.name);
                    if (!reqName.equals(name)) continue;
                    param.put(GlobalFieldInputParams.defaultValue, value);
                }
            }
        }
        ((EventRecord)this.taskRecord).setCreatedOn(new Date());
        ((EventRecord)this.taskRecord).setProjectId(projectId);
        ((EventRecord)this.taskRecord).setDefLabel(res.getLabel());
        ((EventRecord)this.taskRecord).setInputParams(taskInputParams.toJSONString());
        ((EventRecord)this.taskRecord).setStatus(Integer.valueOf(TaskStatusEnum.running.getStatus()));
        ((EventRecord)this.taskRecord).setId(String.valueOf(UUID.randomUUID()));
        ((EventRecord)this.taskRecord).setDefId(res.getId());
        ((EventRecord)this.taskRecord).setDefVersion(res.getVersion());
        ((EventRecord)this.taskRecord).setTaskRecordId(req.getTaskRecordId());
        RecordUpdaterFactory.getUpdater((BaseRecord)this.taskRecord).updateRecord(this.taskRecord);
        windTaskRecordMap.put(((EventRecord)this.taskRecord).getId(), this.taskRecord);
        this.taskRecordID = ((EventRecord)this.taskRecord).getId();
        return taskInputParams;
    }
}

