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
 *  com.seer.rds.model.wind.BaseRecord
 *  com.seer.rds.model.wind.TestRecord
 *  com.seer.rds.service.agv.WindService
 *  com.seer.rds.service.factory.RecordUpdaterFactory
 *  com.seer.rds.service.wind.AbstratRootBp
 *  com.seer.rds.service.wind.TestRootBp
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
import com.seer.rds.model.wind.BaseRecord;
import com.seer.rds.model.wind.TestRecord;
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
public class TestRootBp
extends AbstratRootBp<TestRecord> {
    private static final Logger log = LoggerFactory.getLogger(TestRootBp.class);
    @Autowired
    private WindService windService;

    public Object exceptionHandle(Exception e) {
        Object status = GlobalCacheConfig.getCache((String)(this.taskId + ((TestRecord)this.taskRecord).getId()));
        log.error("TestRootBp error", (Throwable)e);
        this.windService.saveLog(TaskLogLevelEnum.error.getLevel(), "[TestRootBp]@{wind.bp.fail}:" + e.getMessage(), this.projectId, this.taskId, ((TestRecord)this.taskRecord).getId(), Integer.valueOf(-1));
        ((TestRecord)this.taskRecord).setEndedOn(new Date());
        ((TestRecord)this.taskRecord).setEndedReason("[TestRootBp]@{wind.bp.fail}:" + e.getMessage());
        ((TestRecord)this.taskRecord).setStatus(Integer.valueOf(TaskStatusEnum.end_error.getStatus()));
        RecordUpdaterFactory.getUpdater((BaseRecord)this.taskRecord).updateRecord(this.taskRecord);
        this.blockRecord.setOutputParams(JSONObject.toJSONString(outputParamsMap.get()));
        this.blockRecord.setInputParams(JSONObject.toJSONString(inputParamsMap.get()));
        this.blockRecord.setInternalVariables(JSONObject.toJSONString(taskVariablesMap.get()));
        this.windService.saveErrorBlockRecord(this.blockRecord, Integer.valueOf(-1), "TestRootBp", ((TestRecord)this.taskRecord).getProjectId(), this.taskId, ((TestRecord)this.taskRecord).getId(), new Date(), e);
        GlobalCacheConfig.cache((String)(this.taskId + ((TestRecord)this.taskRecord).getId()), (Object)TaskStatusEnum.end_error.getStatus());
        taskStatus.put(this.taskId + ((TestRecord)this.taskRecord).getId(), false);
        windTaskRecordMap.remove(((TestRecord)this.taskRecord).getId());
        return String.valueOf(CommonCodeEnum.TASK_RUN_FAILED.getCode());
    }

    public void clearCache() {
        inputParamsMap.remove();
        outputParamsMap.remove();
        taskVariablesMap.remove();
        taskStatus.remove(this.taskId + ((TestRecord)this.taskRecord).getId());
        windTaskRecordMap.remove(((TestRecord)this.taskRecord).getId());
        GlobalCacheConfig.clearCache((String)(this.taskId + ((TestRecord)this.taskRecord).getId()));
        WhileBp.ifWhilePrintLogs.remove(((TestRecord)this.taskRecord).getId() + Thread.currentThread().getId());
        GlobalCacheConfig.clearCacheSkip((String)(this.taskId + ((TestRecord)this.taskRecord).getId()));
    }

    public Object taskfinished(SetOrderReq req) {
        Object status = GlobalCacheConfig.getCache((String)(this.taskId + ((TestRecord)this.taskRecord).getId()));
        if (status == null || Integer.parseInt(status.toString()) == TaskStatusEnum.end.getStatus() || Integer.parseInt(status.toString()) == TaskStatusEnum.running.getStatus()) {
            ((TestRecord)this.taskRecord).setEndedOn(new Date());
            ((TestRecord)this.taskRecord).setEndedReason("[TestRootBp]@{wind.task.end}");
            ((TestRecord)this.taskRecord).setStatus(Integer.valueOf(TaskStatusEnum.end.getStatus()));
            RecordUpdaterFactory.getUpdater((BaseRecord)this.taskRecord).updateRecord(this.taskRecord);
            this.blockRecord.setEndedOn(new Date());
            this.blockRecord.setEndedReason("[TestRootBp]@{wind.task.end}");
            this.blockRecord.setStatus(Integer.valueOf(TaskBlockStatusEnum.end.getStatus()));
            this.windService.saveBlockRecord(this.blockRecord);
        }
        return String.valueOf(CommonCodeEnum.TASK_RUN_SUCCESS.getCode());
    }

    public JSONArray buildRecord(SetOrderReq req) {
        this.taskRecord = new TestRecord();
        this.detail = req.getDetail();
        JSONObject root = JSONObject.parseObject((String)req.getDetail());
        JSONObject rootBlock = root.getJSONObject(GlobalField.rootBlock);
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
        ((TestRecord)this.taskRecord).setCreatedOn(new Date());
        ((TestRecord)this.taskRecord).setProjectId(this.projectId);
        ((TestRecord)this.taskRecord).setDefLabel(req.getTaskLabel());
        ((TestRecord)this.taskRecord).setInputParams(taskInputParams.toJSONString());
        ((TestRecord)this.taskRecord).setStatus(Integer.valueOf(TaskStatusEnum.running.getStatus()));
        ((TestRecord)this.taskRecord).setTaskDefDetail(req.getDetail());
        ((TestRecord)this.taskRecord).setId(String.valueOf(UUID.randomUUID()));
        RecordUpdaterFactory.getUpdater((BaseRecord)this.taskRecord).updateRecord(this.taskRecord);
        windTaskRecordMap.put(((TestRecord)this.taskRecord).getId(), this.taskRecord);
        this.taskRecordID = ((TestRecord)this.taskRecord).getId();
        return taskInputParams;
    }
}

