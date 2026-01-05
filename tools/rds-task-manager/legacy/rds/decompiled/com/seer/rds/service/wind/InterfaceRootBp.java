/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.alibaba.fastjson.JSONArray
 *  com.alibaba.fastjson.JSONObject
 *  com.google.common.collect.Maps
 *  com.seer.rds.config.GlobalCacheConfig
 *  com.seer.rds.constant.TaskBlockStatusEnum
 *  com.seer.rds.constant.TaskLogLevelEnum
 *  com.seer.rds.constant.TaskStatusEnum
 *  com.seer.rds.model.wind.BaseRecord
 *  com.seer.rds.model.wind.InterfaceHandleRecord
 *  com.seer.rds.model.wind.InterfacePreHandle
 *  com.seer.rds.model.wind.WindBlockRecord
 *  com.seer.rds.service.agv.WindService
 *  com.seer.rds.service.factory.RecordUpdaterFactory
 *  com.seer.rds.service.wind.AbstratRootBp
 *  com.seer.rds.service.wind.InterfaceRootBp
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
import com.google.common.collect.Maps;
import com.seer.rds.config.GlobalCacheConfig;
import com.seer.rds.constant.TaskBlockStatusEnum;
import com.seer.rds.constant.TaskLogLevelEnum;
import com.seer.rds.constant.TaskStatusEnum;
import com.seer.rds.model.wind.BaseRecord;
import com.seer.rds.model.wind.InterfaceHandleRecord;
import com.seer.rds.model.wind.InterfacePreHandle;
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
import java.util.HashMap;
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
public class InterfaceRootBp
extends AbstratRootBp<InterfaceHandleRecord> {
    private static final Logger log = LoggerFactory.getLogger(InterfaceRootBp.class);
    @Autowired
    private WindService windService;
    public Object body;
    public Object code;

    public Object exceptionHandle(Exception e) {
        ((InterfaceHandleRecord)this.taskRecord).setResponseBody(String.valueOf(e));
        Object status = GlobalCacheConfig.getCache((String)(this.taskId + ((InterfaceHandleRecord)this.taskRecord).getId()));
        log.error("InterfaceRootBp error", (Throwable)e);
        this.windService.saveLog(TaskLogLevelEnum.error.getLevel(), "[InterfaceRootBp]@{wind.bp.fail}:" + e.getMessage(), this.projectId, this.taskId, ((InterfaceHandleRecord)this.taskRecord).getId(), Integer.valueOf(-1));
        ((InterfaceHandleRecord)this.taskRecord).setEndedOn(new Date());
        ((InterfaceHandleRecord)this.taskRecord).setEndedReason("[RootBp]@{wind.bp.fail}:" + e.getMessage());
        ((InterfaceHandleRecord)this.taskRecord).setStatus(Integer.valueOf(TaskStatusEnum.end_error.getStatus()));
        RecordUpdaterFactory.getUpdater((BaseRecord)this.taskRecord).updateRecord(this.taskRecord);
        this.blockRecord.setOutputParams(JSONObject.toJSONString(outputParamsMap.get()));
        this.blockRecord.setInputParams(JSONObject.toJSONString(inputParamsMap.get()));
        this.blockRecord.setInternalVariables(JSONObject.toJSONString(taskVariablesMap.get()));
        this.windService.saveErrorBlockRecord(this.blockRecord, Integer.valueOf(-1), "InterfaceRootBp", ((InterfaceHandleRecord)this.taskRecord).getProjectId(), this.taskId, ((InterfaceHandleRecord)this.taskRecord).getId(), new Date(), e);
        GlobalCacheConfig.cache((String)(this.taskId + ((InterfaceHandleRecord)this.taskRecord).getId()), (Object)TaskStatusEnum.end_error.getStatus());
        taskStatus.put(this.taskId + ((InterfaceHandleRecord)this.taskRecord).getId(), false);
        windTaskRecordMap.remove(((InterfaceHandleRecord)this.taskRecord).getId());
        HashMap resp = Maps.newHashMap();
        resp.put("code", 500);
        resp.put("body", ((InterfaceHandleRecord)this.taskRecord).getResponseBody());
        return resp;
    }

    public void clearCache() {
        inputParamsMap.remove();
        outputParamsMap.remove();
        taskVariablesMap.remove();
        taskStatus.remove(this.taskId + ((InterfaceHandleRecord)this.taskRecord).getId());
        windTaskRecordMap.remove(((InterfaceHandleRecord)this.taskRecord).getId());
        GlobalCacheConfig.clearCache((String)(this.taskId + ((InterfaceHandleRecord)this.taskRecord).getId()));
        WhileBp.ifWhilePrintLogs.remove(((InterfaceHandleRecord)this.taskRecord).getId() + Thread.currentThread().getId());
        GlobalCacheConfig.clearCacheSkip((String)(this.taskId + ((InterfaceHandleRecord)this.taskRecord).getId()));
    }

    public JSONArray buildRecord(SetOrderReq req) {
        Date startOn = new Date();
        String projectId = "";
        this.taskRecord = new InterfaceHandleRecord();
        WindBlockRecord blockRecord = new WindBlockRecord();
        this.taskLabel = req.getTaskLabel();
        Integer rootblockId = null;
        InterfacePreHandle res = req.getInterfacePreHandle();
        this.taskId = res.getId();
        log.info("InterfaceRootBp taskId={}, taskLabel={}.", (Object)this.taskId, (Object)this.taskLabel);
        projectId = res.getProjectId();
        this.detail = res.getDetail();
        log.info("InterfaceRootBp detail={}", (Object)this.detail);
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
        ((InterfaceHandleRecord)this.taskRecord).setCreatedOn(new Date());
        ((InterfaceHandleRecord)this.taskRecord).setProjectId(projectId);
        ((InterfaceHandleRecord)this.taskRecord).setUrl(res.getUrl());
        ((InterfaceHandleRecord)this.taskRecord).setMethod(res.getMethod());
        ((InterfaceHandleRecord)this.taskRecord).setDefLabel(res.getTaskDefLabel());
        ((InterfaceHandleRecord)this.taskRecord).setInputParams(taskInputParams.toJSONString());
        ((InterfaceHandleRecord)this.taskRecord).setStatus(Integer.valueOf(TaskStatusEnum.running.getStatus()));
        ((InterfaceHandleRecord)this.taskRecord).setId(String.valueOf(UUID.randomUUID()));
        ((InterfaceHandleRecord)this.taskRecord).setDefVersion(res.getVersion());
        ((InterfaceHandleRecord)this.taskRecord).setDefId(res.getId());
        RecordUpdaterFactory.getUpdater((BaseRecord)this.taskRecord).updateRecord(this.taskRecord);
        windTaskRecordMap.put(((InterfaceHandleRecord)this.taskRecord).getId(), this.taskRecord);
        this.taskRecordID = ((InterfaceHandleRecord)this.taskRecord).getId();
        return taskInputParams;
    }

    public Object taskfinished(SetOrderReq req) {
        Object status = GlobalCacheConfig.getCache((String)(this.taskId + ((InterfaceHandleRecord)this.taskRecord).getId()));
        if (status == null || Integer.parseInt(status.toString()) == TaskStatusEnum.end.getStatus() || Integer.parseInt(status.toString()) == TaskStatusEnum.running.getStatus()) {
            ((InterfaceHandleRecord)this.taskRecord).setEndedOn(new Date());
            ((InterfaceHandleRecord)this.taskRecord).setEndedReason("[RootBp]@{wind.task.end}");
            ((InterfaceHandleRecord)this.taskRecord).setStatus(Integer.valueOf(TaskStatusEnum.end.getStatus()));
            RecordUpdaterFactory.getUpdater((BaseRecord)this.taskRecord).updateRecord(this.taskRecord);
            this.blockRecord.setEndedOn(new Date());
            this.blockRecord.setEndedReason("[RootBp]@{wind.task.end}");
            this.blockRecord.setStatus(Integer.valueOf(TaskBlockStatusEnum.end.getStatus()));
            this.windService.saveBlockRecord(this.blockRecord);
        }
        HashMap resp = Maps.newHashMap();
        resp.put("code", ((InterfaceHandleRecord)this.taskRecord).getCode() == null ? Integer.valueOf(200) : ((InterfaceHandleRecord)this.taskRecord).getCode());
        resp.put("body", ((InterfaceHandleRecord)this.taskRecord).getResponseBody() == null ? "" : ((InterfaceHandleRecord)this.taskRecord).getResponseBody());
        return resp;
    }
}

