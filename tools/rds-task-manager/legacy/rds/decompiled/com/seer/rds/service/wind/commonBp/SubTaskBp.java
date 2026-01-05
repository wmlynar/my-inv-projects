/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.alibaba.fastjson.JSONObject
 *  com.seer.rds.config.GlobalCacheConfig
 *  com.seer.rds.constant.TaskStatusEnum
 *  com.seer.rds.dao.WindTaskDefMapper
 *  com.seer.rds.model.wind.BaseRecord
 *  com.seer.rds.model.wind.InterfaceHandleRecord
 *  com.seer.rds.model.wind.WindTaskDef
 *  com.seer.rds.model.wind.WindTaskRecord
 *  com.seer.rds.service.agv.WindService
 *  com.seer.rds.service.factory.RecordUpdaterFactory
 *  com.seer.rds.service.threadPool.LinkedBqThreadPool
 *  com.seer.rds.service.wind.AbstractBp
 *  com.seer.rds.service.wind.AbstratRootBp
 *  com.seer.rds.service.wind.RootBp
 *  com.seer.rds.service.wind.commonBp.SubTaskBp
 *  com.seer.rds.util.SpringUtil
 *  com.seer.rds.vo.req.SetOrderReq
 *  org.apache.commons.lang3.StringUtils
 *  org.slf4j.Logger
 *  org.slf4j.LoggerFactory
 *  org.springframework.beans.factory.annotation.Autowired
 *  org.springframework.context.annotation.Scope
 *  org.springframework.stereotype.Component
 */
package com.seer.rds.service.wind.commonBp;

import com.alibaba.fastjson.JSONObject;
import com.seer.rds.config.GlobalCacheConfig;
import com.seer.rds.constant.TaskStatusEnum;
import com.seer.rds.dao.WindTaskDefMapper;
import com.seer.rds.model.wind.BaseRecord;
import com.seer.rds.model.wind.InterfaceHandleRecord;
import com.seer.rds.model.wind.WindTaskDef;
import com.seer.rds.model.wind.WindTaskRecord;
import com.seer.rds.service.agv.WindService;
import com.seer.rds.service.factory.RecordUpdaterFactory;
import com.seer.rds.service.threadPool.LinkedBqThreadPool;
import com.seer.rds.service.wind.AbstractBp;
import com.seer.rds.service.wind.AbstratRootBp;
import com.seer.rds.service.wind.RootBp;
import com.seer.rds.util.SpringUtil;
import com.seer.rds.vo.req.SetOrderReq;
import java.util.Date;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.Executor;
import org.apache.commons.lang3.StringUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Scope;
import org.springframework.stereotype.Component;

@Component(value="SubTaskBp")
@Scope(value="prototype")
public class SubTaskBp
extends AbstractBp {
    private static final Logger log = LoggerFactory.getLogger(SubTaskBp.class);
    @Autowired
    private WindService windService;
    private String subTaskId;
    private String inputParamsSelf;
    private JSONObject convertInputParams;
    @Autowired
    private WindTaskDefMapper windTaskDefMapper;
    private Boolean ifAsync;
    private String taskRecordId;

    protected void getInputParamsAndExecute(AbstratRootBp rootBp) throws Exception {
        String blockType = this.blockVo.getBlockType();
        this.subTaskId = blockType.split("::")[1];
        SetOrderReq subTask = new SetOrderReq();
        subTask.setTaskId(this.subTaskId);
        this.convertInputParams = new JSONObject();
        TreeMap inputParamsMap = (TreeMap)JSONObject.parseObject((String)this.inputParams.toJSONString(), TreeMap.class);
        this.taskRecordId = String.valueOf(rootBp.getInputParamValue(this.taskId, this.inputParams, "taskRecordId"));
        Object ifAsyncObj = rootBp.getInputParamValue(this.taskId, this.inputParams, "ifAsync");
        this.ifAsync = false;
        if (ifAsyncObj != null) {
            this.ifAsync = Boolean.parseBoolean(ifAsyncObj.toString());
        }
        for (Map.Entry next : inputParamsMap.entrySet()) {
            String key = (String)next.getKey();
            if ("taskRecordId".equals(key) || "ifAsync".equals(key)) continue;
            Object inputParamValue = rootBp.getInputParamValue(this.taskId, this.inputParams, key);
            this.convertInputParams.put(key, inputParamValue);
        }
        subTask.setInputParams(this.convertInputParams.toJSONString());
        WindTaskDef subTaskDef = this.windTaskDefMapper.findById((Object)this.subTaskId).orElse(null);
        if (subTaskDef == null) {
            throw new RuntimeException("@{wind.bp.subTaskNo}");
        }
        if (this.taskRecord instanceof WindTaskRecord) {
            ((WindTaskRecord)this.taskRecord).setIfHaveChildTask(Boolean.valueOf(true));
            subTask.setRootTaskRecordId(((WindTaskRecord)this.taskRecord).getRootTaskRecordId());
        } else if (StringUtils.isNotEmpty((CharSequence)this.taskRecordId) && this.taskRecordId != "null") {
            if (StringUtils.isEmpty((CharSequence)((InterfaceHandleRecord)this.taskRecord).getTaskRecordId())) {
                ((InterfaceHandleRecord)this.taskRecord).setTaskRecordId(this.taskRecordId);
            } else {
                String taskRecordIdBefore = ((InterfaceHandleRecord)this.taskRecord).getTaskRecordId();
                ((InterfaceHandleRecord)this.taskRecord).setTaskRecordId(taskRecordIdBefore + "," + this.taskRecordId);
            }
            subTask.setTaskRecordId(this.taskRecordId);
        } else {
            String uuid = UUID.randomUUID().toString();
            if (StringUtils.isEmpty((CharSequence)((InterfaceHandleRecord)this.taskRecord).getTaskRecordId())) {
                ((InterfaceHandleRecord)this.taskRecord).setTaskRecordId(uuid);
            } else {
                String taskRecordIdBefore = ((InterfaceHandleRecord)this.taskRecord).getTaskRecordId();
                ((InterfaceHandleRecord)this.taskRecord).setTaskRecordId(taskRecordIdBefore + " , " + uuid);
            }
            subTask.setTaskRecordId(uuid);
        }
        RecordUpdaterFactory.getUpdater((BaseRecord)this.taskRecord).updateRecord(this.taskRecord);
        RootBp.windTaskRecordMap.put(this.taskRecord.getId(), this.taskRecord);
        subTask.setParentTaskRecordId(this.taskRecord.getId());
        if (StringUtils.isNotEmpty((CharSequence)this.taskRecordId) && this.taskRecordId != "null") {
            subTask.setTaskRecordId(this.taskRecordId);
        }
        subTask.setWindTaskDef(subTaskDef);
        LinkedBqThreadPool taskPool = LinkedBqThreadPool.getInstance();
        CompletableFuture<Void> cf = CompletableFuture.runAsync(() -> {
            RootBp rootBpExecutor = (RootBp)SpringUtil.getBean(RootBp.class);
            rootBpExecutor.execute(subTask);
        }, (Executor)taskPool);
        if (!this.ifAsync.booleanValue()) {
            cf.get();
            List subTaskRecords = this.windService.findByParentId(this.taskRecord.getId());
            for (WindTaskRecord e : subTaskRecords) {
                if (!e.getStatus().equals(TaskStatusEnum.stop.getStatus()) && !e.getStatus().equals(TaskStatusEnum.manual_end.getStatus()) && !e.getStatus().equals(TaskStatusEnum.end_error.getStatus())) continue;
                RootBp.taskStatus.put(this.taskId + this.taskRecord.getId(), false);
                GlobalCacheConfig.cache((String)(this.taskId + this.taskRecord.getId()), (Object)e.getStatus());
                this.taskRecord.setStatus(e.getStatus());
                this.taskRecord.setEndedOn(new Date());
                this.taskRecord.setEndedReason("sub Task Error");
                break;
            }
            RecordUpdaterFactory.getUpdater((BaseRecord)this.taskRecord).updateRecord(this.taskRecord);
        }
    }

    protected void setBlockInputParamsValue(AbstratRootBp rootBp) {
        SubTaskBp subTaskBp = new SubTaskBp();
        subTaskBp.setSubTaskId(this.subTaskId);
        subTaskBp.setTaskRecordId(this.taskRecordId);
        subTaskBp.setSubTaskId(this.ifAsync.toString());
        subTaskBp.setInputParamsSelf(this.convertInputParams.toJSONString());
        this.blockRecord.setBlockInputParamsValue(JSONObject.toJSONString((Object)subTaskBp));
        this.windService.saveBlockRecord(this.blockRecord, this.blockVo.getBlockId(), this.blockVo.getBlockType(), this.taskRecord.getProjectId(), this.taskId, this.taskRecord.getId(), this.startOn);
    }

    public WindService getWindService() {
        return this.windService;
    }

    public String getSubTaskId() {
        return this.subTaskId;
    }

    public String getInputParamsSelf() {
        return this.inputParamsSelf;
    }

    public JSONObject getConvertInputParams() {
        return this.convertInputParams;
    }

    public WindTaskDefMapper getWindTaskDefMapper() {
        return this.windTaskDefMapper;
    }

    public Boolean getIfAsync() {
        return this.ifAsync;
    }

    public String getTaskRecordId() {
        return this.taskRecordId;
    }

    public void setWindService(WindService windService) {
        this.windService = windService;
    }

    public void setSubTaskId(String subTaskId) {
        this.subTaskId = subTaskId;
    }

    public void setInputParamsSelf(String inputParamsSelf) {
        this.inputParamsSelf = inputParamsSelf;
    }

    public void setConvertInputParams(JSONObject convertInputParams) {
        this.convertInputParams = convertInputParams;
    }

    public void setWindTaskDefMapper(WindTaskDefMapper windTaskDefMapper) {
        this.windTaskDefMapper = windTaskDefMapper;
    }

    public void setIfAsync(Boolean ifAsync) {
        this.ifAsync = ifAsync;
    }

    public void setTaskRecordId(String taskRecordId) {
        this.taskRecordId = taskRecordId;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof SubTaskBp)) {
            return false;
        }
        SubTaskBp other = (SubTaskBp)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        Boolean this$ifAsync = this.getIfAsync();
        Boolean other$ifAsync = other.getIfAsync();
        if (this$ifAsync == null ? other$ifAsync != null : !((Object)this$ifAsync).equals(other$ifAsync)) {
            return false;
        }
        WindService this$windService = this.getWindService();
        WindService other$windService = other.getWindService();
        if (this$windService == null ? other$windService != null : !this$windService.equals(other$windService)) {
            return false;
        }
        String this$subTaskId = this.getSubTaskId();
        String other$subTaskId = other.getSubTaskId();
        if (this$subTaskId == null ? other$subTaskId != null : !this$subTaskId.equals(other$subTaskId)) {
            return false;
        }
        String this$inputParamsSelf = this.getInputParamsSelf();
        String other$inputParamsSelf = other.getInputParamsSelf();
        if (this$inputParamsSelf == null ? other$inputParamsSelf != null : !this$inputParamsSelf.equals(other$inputParamsSelf)) {
            return false;
        }
        JSONObject this$convertInputParams = this.getConvertInputParams();
        JSONObject other$convertInputParams = other.getConvertInputParams();
        if (this$convertInputParams == null ? other$convertInputParams != null : !this$convertInputParams.equals(other$convertInputParams)) {
            return false;
        }
        WindTaskDefMapper this$windTaskDefMapper = this.getWindTaskDefMapper();
        WindTaskDefMapper other$windTaskDefMapper = other.getWindTaskDefMapper();
        if (this$windTaskDefMapper == null ? other$windTaskDefMapper != null : !this$windTaskDefMapper.equals(other$windTaskDefMapper)) {
            return false;
        }
        String this$taskRecordId = this.getTaskRecordId();
        String other$taskRecordId = other.getTaskRecordId();
        return !(this$taskRecordId == null ? other$taskRecordId != null : !this$taskRecordId.equals(other$taskRecordId));
    }

    protected boolean canEqual(Object other) {
        return other instanceof SubTaskBp;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        Boolean $ifAsync = this.getIfAsync();
        result = result * 59 + ($ifAsync == null ? 43 : ((Object)$ifAsync).hashCode());
        WindService $windService = this.getWindService();
        result = result * 59 + ($windService == null ? 43 : $windService.hashCode());
        String $subTaskId = this.getSubTaskId();
        result = result * 59 + ($subTaskId == null ? 43 : $subTaskId.hashCode());
        String $inputParamsSelf = this.getInputParamsSelf();
        result = result * 59 + ($inputParamsSelf == null ? 43 : $inputParamsSelf.hashCode());
        JSONObject $convertInputParams = this.getConvertInputParams();
        result = result * 59 + ($convertInputParams == null ? 43 : $convertInputParams.hashCode());
        WindTaskDefMapper $windTaskDefMapper = this.getWindTaskDefMapper();
        result = result * 59 + ($windTaskDefMapper == null ? 43 : $windTaskDefMapper.hashCode());
        String $taskRecordId = this.getTaskRecordId();
        result = result * 59 + ($taskRecordId == null ? 43 : $taskRecordId.hashCode());
        return result;
    }

    public String toString() {
        return "SubTaskBp(windService=" + this.getWindService() + ", subTaskId=" + this.getSubTaskId() + ", inputParamsSelf=" + this.getInputParamsSelf() + ", convertInputParams=" + this.getConvertInputParams() + ", windTaskDefMapper=" + this.getWindTaskDefMapper() + ", ifAsync=" + this.getIfAsync() + ", taskRecordId=" + this.getTaskRecordId() + ")";
    }
}

