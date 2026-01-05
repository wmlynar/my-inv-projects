/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.alibaba.fastjson.JSON
 *  com.alibaba.fastjson.JSONArray
 *  com.alibaba.fastjson.JSONObject
 *  com.google.common.collect.Maps
 *  com.seer.rds.config.GlobalCacheConfig
 *  com.seer.rds.constant.AlarmExceptionTypeEnum
 *  com.seer.rds.constant.ApiEnum
 *  com.seer.rds.constant.CommonCodeEnum
 *  com.seer.rds.constant.PeriodicTaskEnum
 *  com.seer.rds.constant.TaskBlockStatusEnum
 *  com.seer.rds.constant.TaskLogLevelEnum
 *  com.seer.rds.constant.TaskStatusEnum
 *  com.seer.rds.exception.BpRuntimeException
 *  com.seer.rds.exception.EndErrorException
 *  com.seer.rds.exception.ManualEndException
 *  com.seer.rds.exception.RevertJumpException
 *  com.seer.rds.exception.StopBranchException
 *  com.seer.rds.exception.StopException
 *  com.seer.rds.exception.TaskBreakException
 *  com.seer.rds.exception.TaskErrorException
 *  com.seer.rds.listener.EventSource
 *  com.seer.rds.listener.WindEvent
 *  com.seer.rds.model.wind.BaseRecord
 *  com.seer.rds.model.wind.InterfaceHandleRecord
 *  com.seer.rds.model.wind.TaskRecord
 *  com.seer.rds.model.wind.WindBlockRecord
 *  com.seer.rds.model.wind.WindTaskLog
 *  com.seer.rds.model.wind.WindTaskRecord
 *  com.seer.rds.service.admin.SysAlarmService
 *  com.seer.rds.service.agv.AgvApiService
 *  com.seer.rds.service.agv.WindService
 *  com.seer.rds.service.factory.RecordUpdater
 *  com.seer.rds.service.factory.RecordUpdaterFactory
 *  com.seer.rds.service.wind.AbstractBp
 *  com.seer.rds.service.wind.AbstratRootBp
 *  com.seer.rds.service.wind.BlockExecutor
 *  com.seer.rds.service.wind.RootBp
 *  com.seer.rds.service.wind.TaskStatusMonitorNotice
 *  com.seer.rds.service.wind.WindTaskAGV
 *  com.seer.rds.service.wind.WindTaskStatus
 *  com.seer.rds.util.BlockStatusUtils
 *  com.seer.rds.util.OkHttpUtil
 *  com.seer.rds.util.server.DateUtils
 *  com.seer.rds.vo.ResultVo
 *  com.seer.rds.vo.WindBlockVo
 *  com.seer.rds.vo.wind.BlockField
 *  com.seer.rds.vo.wind.CSelectAgvBpField
 *  com.seer.rds.vo.wind.ParamPreField
 *  com.seer.rds.vo.wind.TaskErrorVo
 *  org.apache.commons.lang3.StringUtils
 *  org.slf4j.Logger
 *  org.slf4j.LoggerFactory
 *  org.springframework.beans.factory.annotation.Autowired
 *  org.springframework.context.annotation.Scope
 *  org.springframework.stereotype.Component
 */
package com.seer.rds.service.wind;

import com.alibaba.fastjson.JSON;
import com.alibaba.fastjson.JSONArray;
import com.alibaba.fastjson.JSONObject;
import com.google.common.collect.Maps;
import com.seer.rds.config.GlobalCacheConfig;
import com.seer.rds.constant.AlarmExceptionTypeEnum;
import com.seer.rds.constant.ApiEnum;
import com.seer.rds.constant.CommonCodeEnum;
import com.seer.rds.constant.PeriodicTaskEnum;
import com.seer.rds.constant.TaskBlockStatusEnum;
import com.seer.rds.constant.TaskLogLevelEnum;
import com.seer.rds.constant.TaskStatusEnum;
import com.seer.rds.exception.BpRuntimeException;
import com.seer.rds.exception.EndErrorException;
import com.seer.rds.exception.ManualEndException;
import com.seer.rds.exception.RevertJumpException;
import com.seer.rds.exception.StopBranchException;
import com.seer.rds.exception.StopException;
import com.seer.rds.exception.TaskBreakException;
import com.seer.rds.exception.TaskErrorException;
import com.seer.rds.listener.EventSource;
import com.seer.rds.listener.WindEvent;
import com.seer.rds.model.wind.BaseRecord;
import com.seer.rds.model.wind.InterfaceHandleRecord;
import com.seer.rds.model.wind.TaskRecord;
import com.seer.rds.model.wind.WindBlockRecord;
import com.seer.rds.model.wind.WindTaskLog;
import com.seer.rds.model.wind.WindTaskRecord;
import com.seer.rds.service.admin.SysAlarmService;
import com.seer.rds.service.agv.AgvApiService;
import com.seer.rds.service.agv.WindService;
import com.seer.rds.service.factory.RecordUpdater;
import com.seer.rds.service.factory.RecordUpdaterFactory;
import com.seer.rds.service.wind.AbstratRootBp;
import com.seer.rds.service.wind.BlockExecutor;
import com.seer.rds.service.wind.RootBp;
import com.seer.rds.service.wind.TaskStatusMonitorNotice;
import com.seer.rds.service.wind.WindTaskAGV;
import com.seer.rds.service.wind.WindTaskStatus;
import com.seer.rds.util.BlockStatusUtils;
import com.seer.rds.util.OkHttpUtil;
import com.seer.rds.util.server.DateUtils;
import com.seer.rds.vo.ResultVo;
import com.seer.rds.vo.WindBlockVo;
import com.seer.rds.vo.wind.BlockField;
import com.seer.rds.vo.wind.CSelectAgvBpField;
import com.seer.rds.vo.wind.ParamPreField;
import com.seer.rds.vo.wind.TaskErrorVo;
import java.io.IOException;
import java.io.InterruptedIOException;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import org.apache.commons.lang3.StringUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Scope;
import org.springframework.stereotype.Component;

@Component(value="AbstractBp")
@Scope(value="prototype")
public abstract class AbstractBp<T extends BaseRecord>
implements BlockExecutor<T> {
    private static final Logger log = LoggerFactory.getLogger(AbstractBp.class);
    @Autowired
    public WindService windService;
    protected String taskId;
    protected T taskRecord;
    protected WindBlockVo blockVo;
    protected JSONObject inputParams;
    protected Object childDefaultArray;
    protected Date startOn;
    protected WindBlockRecord blockRecord;
    protected String state;
    @Autowired
    public EventSource eventSource;
    protected Boolean interruptError = false;
    protected WindEvent windEvent;
    protected String blockInternalVariables;
    private WindTaskLog windTaskLog;
    private WindTaskLog windTaskLogError;
    private WindTaskLog windTaskLogStop;
    private WindTaskLog windTaskLogWait;
    @Autowired
    protected SysAlarmService sysAlarmService;
    protected Long maxTimeOut;
    protected String errorMsg;
    protected HashMap<String, Object> blockInputParamsValue = Maps.newHashMap();
    protected HashMap<String, Object> blockOutParamsValue = Maps.newHashMap();
    @Autowired
    protected AgvApiService agvApiService;

    public Object execute(AbstratRootBp rootBp, String taskId, T taskRecord, WindBlockVo blockVo, JSONObject inputParams, Object childDefaultArray) {
        this.taskId = taskId;
        this.taskRecord = taskRecord;
        this.blockVo = blockVo;
        this.inputParams = inputParams;
        this.childDefaultArray = childDefaultArray;
        this.state = BlockStatusUtils.getBlockStatus(taskRecord, (WindBlockVo)blockVo);
        this.startOn = new Date();
        String className = this.getClass().getSimpleName();
        log.info(String.format("%s , start run block\uff1a", className));
        this.blockRecord = this.blockRecord == null ? new WindBlockRecord() : this.blockRecord;
        this.blockRecord.setBlockOutParamsValue(JSONObject.toJSONString((Object)new Object()));
        this.blockRecord.setBlockInternalVariables(JSONObject.toJSONString((Object)new Object()));
        this.windEvent = null;
        try {
            this.checkIfInterrupt();
            if (!"End".equals(this.state) && !this.checkIfSkip()) {
                if (!((Boolean)AbstratRootBp.taskStatus.get(taskId + taskRecord.getId())).booleanValue()) {
                    log.info("taskStatus is not allowed to execute");
                    this.windService.saveLog(TaskLogLevelEnum.stop.getLevel(), String.format("[%s]@{wind.bp.unExecutable}", className), taskRecord.getProjectId(), taskId, taskRecord.getId(), blockVo.getBlockId());
                    return null;
                }
                this.blockRecord.setStatus(Integer.valueOf(TaskBlockStatusEnum.running.getStatus()));
                this.blockRecord.setRemark(blockVo.getRemark());
                this.windService.saveBlockRecord(this.blockRecord, blockVo.getBlockId(), blockVo.getBlockType(), taskRecord.getProjectId(), taskId, taskRecord.getId(), this.startOn);
                this.parseBlockInputParamsValue(rootBp);
                this.getInputParamsAndExecute(rootBp);
                this.blockRecord.setOutputParams(JSONObject.toJSONString(AbstratRootBp.outputParamsMap.get()));
                this.blockRecord.setInputParams(JSONObject.toJSONString(AbstratRootBp.inputParamsMap.get()));
                this.blockRecord.setInternalVariables(JSONObject.toJSONString(AbstratRootBp.taskVariablesMap.get()));
                this.blockRecord.setBlockInputParams(inputParams != null ? inputParams.toJSONString() : null);
                if (!this.blockOutParamsValue.isEmpty()) {
                    Map paramMap = (Map)((ConcurrentHashMap)AbstratRootBp.outputParamsMap.get()).get(ParamPreField.blocks);
                    paramMap.put(blockVo.getBlockName(), this.blockOutParamsValue);
                    ((ConcurrentHashMap)AbstratRootBp.outputParamsMap.get()).put(ParamPreField.blocks, paramMap);
                    this.blockRecord.setOutputParams(JSONObject.toJSONString(AbstratRootBp.outputParamsMap.get()));
                    this.windService.saveBlockRecord(this.blockRecord);
                }
                this.parseBlockOutParamsValue();
                this.parseBlockInternalVariables();
            } else {
                this.windService.saveLog(TaskLogLevelEnum.info.getLevel(), String.format("[%s][%s]@{wind.bp.skip}", className, blockVo.getBlockName()), taskRecord.getProjectId(), taskId, taskRecord.getId(), blockVo.getBlockId());
            }
            if (!"End".equals(this.state) && !this.checkIfSkip()) {
                this.runChildBlock(rootBp);
                this.blockRecord.setStatus(Integer.valueOf(TaskBlockStatusEnum.end.getStatus()));
                this.blockRecord.setEndedOn(new Date());
                this.blockRecord.setEndedReason(String.format("[%s]@{wind.bp.end}", className));
                this.windService.saveBlockRecord(this.blockRecord);
                RootBp.windTaskRecordMap.put(taskRecord.getId(), taskRecord);
            }
            log.info("check state finish will clear block status");
            ConcurrentHashMap cacheBlockIfResetMap = GlobalCacheConfig.getCacheBlockIfResetMap((String)taskRecord.getId());
            if (cacheBlockIfResetMap != null) {
                BlockStatusUtils.ClearBlockStaus(taskRecord, (String)blockVo.getBlockId().toString());
            }
            GlobalCacheConfig.clearTaskErrorCache((String)(taskRecord.getId() + "b" + this.blockRecord.getBlockConfigId()));
            this.sysAlarmService.deleteTaskAlarmAndNoticeWeb(taskRecord.getId() + "b" + this.blockRecord.getBlockConfigId());
        }
        catch (StopException e) {
            this.stopExceptionHandle(className, rootBp, e);
        }
        catch (EndErrorException e) {
            this.endErrorExceptionHandle(className, rootBp, e);
        }
        catch (BpRuntimeException e) {
            this.ExceptionHandle(className, rootBp, (Exception)((Object)e));
        }
        catch (TaskErrorException e) {
            throw e;
        }
        catch (TaskBreakException e) {
            this.blockRecord.setStatus(Integer.valueOf(TaskBlockStatusEnum.end.getStatus()));
            this.blockRecord.setEndedOn(new Date());
            this.blockRecord.setEndedReason(String.format("[%s]@{wind.bp.end}", className));
            this.windService.saveBlockRecord(this.blockRecord);
            AbstratRootBp.windTaskRecordMap.put(taskRecord.getId(), taskRecord);
            throw e;
        }
        catch (InterruptedIOException | InterruptedException e) {
            if ("StopBranchKey".equals(GlobalCacheConfig.getCacheInterrupt((String)taskRecord.getId()))) {
                this.blockRecord.setStatus(Integer.valueOf(TaskBlockStatusEnum.stop.getStatus()));
                this.blockRecord.setEndedReason(String.format("[%s]@{wind.bp.stopByOtherBranch}", className));
                this.windService.saveBlockRecord(this.blockRecord);
                GlobalCacheConfig.clearCacheInterrupt((String)taskRecord.getId());
                throw new StopBranchException("change destination");
            }
            if ("RevertJumpKey".equals(GlobalCacheConfig.getCacheInterrupt((String)taskRecord.getId()))) {
                GlobalCacheConfig.clearCacheInterrupt((String)taskRecord.getId());
                throw new RevertJumpException("revert jump");
            }
            log.error("AbstractBp InterruptedException Error", (Throwable)e);
            throw new BpRuntimeException(e.getMessage());
        }
        catch (ManualEndException e) {
            this.blockRecord.setStatus(Integer.valueOf(TaskBlockStatusEnum.manualEnd.getStatus()));
            this.windService.saveLog(TaskLogLevelEnum.info.getLevel(), String.format("[%s]@{wind.bp.manualEnd}", className), taskRecord.getProjectId(), taskId, taskRecord.getId(), blockVo.getBlockId());
            this.blockRecord.setEndedOn(new Date());
            this.blockRecord.setEndedReason(String.format("[%s]@{wind.bp.end}", className));
            this.windService.saveBlockRecord(this.blockRecord);
        }
        catch (StopBranchException e) {
            this.blockRecord.setStatus(Integer.valueOf(TaskBlockStatusEnum.stop.getStatus()));
            this.blockRecord.setEndedOn(new Date());
            this.blockRecord.setEndedReason(String.format("[%s]@{wind.bp.end}", className));
            this.windService.saveBlockRecord(this.blockRecord);
            GlobalCacheConfig.clearCacheInterrupt((String)taskRecord.getId());
            throw e;
        }
        catch (RevertJumpException e) {
            this.blockRecord.setStatus(Integer.valueOf(TaskBlockStatusEnum.stop.getStatus()));
            this.blockRecord.setEndedOn(new Date());
            this.blockRecord.setEndedReason(String.format("[%s]@{wind.bp.revert.jump}", className));
            this.windService.saveBlockRecord(this.blockRecord);
            GlobalCacheConfig.clearCacheInterrupt((String)taskRecord.getId());
            throw e;
        }
        catch (Exception e) {
            log.error("AbstractBp error", (Throwable)e);
            try {
                if (!(taskRecord instanceof WindTaskRecord)) {
                    throw new EndErrorException(e.getMessage());
                }
                WindTaskStatus.monitorTaskEndErrorAndTaskStop((AbstractBp)this);
            }
            catch (StopException ex) {
                this.stopExceptionHandle(className, rootBp, ex);
                return null;
            }
            catch (EndErrorException ex) {
                this.endErrorExceptionHandle(className, rootBp, ex);
                return null;
            }
            catch (Exception ex) {
                log.error("AbstractBp error monitorTaskEndErrorAndTaskStop", (Throwable)e);
            }
            this.ExceptionHandle(className, rootBp, e);
        }
        return null;
    }

    protected abstract void getInputParamsAndExecute(AbstratRootBp var1) throws Exception;

    protected abstract void setBlockInputParamsValue(AbstratRootBp var1) throws Exception;

    protected void runChildBlock(AbstratRootBp rootBp) {
        if (this.childDefaultArray != null && ((Boolean)RootBp.taskStatus.get(this.taskId + this.taskRecord.getId())).booleanValue()) {
            JSONArray childArray = (JSONArray)this.childDefaultArray;
            rootBp.executeChild(rootBp, this.taskId, this.taskRecord, childArray, Boolean.valueOf(true));
        }
    }

    private boolean checkIfSkip() {
        String skipComponentId = (String)GlobalCacheConfig.getCacheSkip((String)(this.taskId + this.taskRecord.getId()));
        if (StringUtils.isBlank((CharSequence)skipComponentId)) {
            return false;
        }
        if (skipComponentId.equalsIgnoreCase(String.valueOf(this.blockVo.getBlockName()))) {
            GlobalCacheConfig.clearCacheSkip((String)(this.taskId + this.taskRecord.getId()));
            return false;
        }
        return !this.ifContainChild(skipComponentId);
    }

    public boolean ifContainChild(String name) {
        Set strings;
        Map stringSetMap = (Map)AbstratRootBp.childrenMap.get(this.taskRecord.getId());
        if (stringSetMap != null && (strings = (Set)stringSetMap.get(this.blockVo.getBlockName())) != null) {
            return strings.stream().anyMatch(child -> child.equals(name));
        }
        return false;
    }

    protected void ExceptionHandle(String className, AbstratRootBp rootBp, Exception e) {
        this.saveLogError(e.getMessage());
        log.error("block run error", (Throwable)e);
        log.error(String.format("%s error\uff1a", className) + e);
        this.taskRecord.setEndedOn(new Date());
        this.taskRecord.setEndedReason(String.format("[%s]@{wind.bp.fail}", className) + e.getMessage());
        if (this.taskRecord instanceof WindTaskRecord) {
            if (!((WindTaskRecord)this.taskRecord).getPeriodicTask().equals(PeriodicTaskEnum.PeriodicTask.getStatus())) {
                this.taskRecord.setStatus(Integer.valueOf(TaskStatusEnum.interrupt_error.getStatus()));
                GlobalCacheConfig.cache((String)(this.taskId + this.taskRecord.getId()), (Object)TaskStatusEnum.interrupt_error.getStatus());
                TaskStatusMonitorNotice.taskFailedNotice((TaskRecord)((WindTaskRecord)this.taskRecord), (WindBlockRecord)this.blockRecord, (WindBlockVo)this.blockVo, (String)this.taskId, (String)String.format("[%s] Block Run Failure", className));
            } else {
                this.taskRecord.setStatus(Integer.valueOf(TaskStatusEnum.end_error.getStatus()));
            }
        } else {
            ((InterfaceHandleRecord)this.taskRecord).setResponseBody(JSON.toJSONString((Object)ResultVo.error((String)e.getMessage())));
            ((InterfaceHandleRecord)this.taskRecord).setCode(String.valueOf(400));
            this.taskRecord.setStatus(Integer.valueOf(TaskStatusEnum.end_error.getStatus()));
        }
        RecordUpdaterFactory.getUpdater((BaseRecord)this.taskRecord).updateRecord(this.taskRecord);
        RootBp.windTaskRecordMap.put(this.taskRecord.getId(), this.taskRecord);
        this.blockRecord.setOutputParams(JSONObject.toJSONString(AbstratRootBp.outputParamsMap.get()));
        this.blockRecord.setInputParams(JSONObject.toJSONString(AbstratRootBp.inputParamsMap.get()));
        this.blockRecord.setInternalVariables(JSONObject.toJSONString(AbstratRootBp.taskVariablesMap.get()));
        this.blockRecord.setBlockInputParams(this.inputParams != null ? this.inputParams.toJSONString() : null);
        this.windService.saveErrorBlockRecord(this.blockRecord, this.blockVo.getBlockId(), this.blockVo.getBlockType(), this.taskRecord.getProjectId(), this.taskId, this.taskRecord.getId(), this.startOn, e);
        if (this.taskRecord instanceof WindTaskRecord) {
            if (((WindTaskRecord)this.taskRecord).getPeriodicTask().equals(PeriodicTaskEnum.PeriodicTask.getStatus())) {
                this.endErrorExceptionHandle(className, rootBp, new EndErrorException(e.getMessage()));
                return;
            }
            this.windService.saveInterruptBlockRecord(this.blockRecord, this.blockVo.getBlockId(), this.blockVo.getBlockType(), this.taskRecord.getProjectId(), this.taskId, this.taskRecord.getId(), this.startOn, e);
            String title = TaskStatusEnum.interrupt_error.getDesc();
            String body = "[@{Excel.WindTaskRecord.id}:" + this.taskRecord.getId() + "], [" + className + "-b" + this.blockRecord.getBlockConfigId() + "], [" + e.getMessage() + "]";
            WindTaskStatus.noticeWindTask((String)title, (String)body);
            if (((Boolean)RootBp.taskStatus.get(this.taskId + this.taskRecord.getId())).booleanValue() && !((WindTaskRecord)this.taskRecord).getPeriodicTask().equals(PeriodicTaskEnum.PeriodicTask.getStatus())) {
                log.error(this.getClass().getSimpleName() + " failed to run!");
                throw new TaskErrorException(e.getMessage());
            }
        } else {
            GlobalCacheConfig.cache((String)(this.taskRecord.getDefId() + this.taskRecord.getId()), (Object)TaskStatusEnum.end_error.getStatus());
            AbstratRootBp.taskStatus.put(this.taskRecord.getDefId() + this.taskRecord.getId(), false);
            AbstratRootBp.windTaskRecordMap.put(this.taskRecord.getId(), this.taskRecord);
        }
    }

    protected void stopExceptionHandle(String className, AbstratRootBp rootBp, StopException e) {
        this.saveLogStop(e.getMessage());
        Object taskStatusObj = GlobalCacheConfig.getCache((String)(this.taskId + this.taskRecord.getId()));
        if (TaskStatusEnum.end_error.getStatus() == ((Integer)taskStatusObj).intValue()) {
            this.blockRecord.setStatus(Integer.valueOf(TaskBlockStatusEnum.end_error.getStatus()));
            this.blockRecord.setEndedReason(String.format("[%s]@{wind.bp.stopHand}", className));
        } else if (TaskStatusEnum.manual_end.getStatus() == ((Integer)taskStatusObj).intValue()) {
            this.blockRecord.setStatus(Integer.valueOf(TaskBlockStatusEnum.end.getStatus()));
            this.blockRecord.setEndedReason(String.format("[%s]@{wind.bp.end}", className));
        } else {
            this.blockRecord.setStatus(Integer.valueOf(TaskBlockStatusEnum.stop.getStatus()));
            this.blockRecord.setEndedReason(String.format("[%s]@{wind.bp.stopHand}", className));
        }
        this.blockRecord.setEndedOn(new Date());
        this.windService.saveBlockRecord(this.blockRecord);
        this.taskRecord.setStatus(Integer.valueOf(TaskStatusEnum.stop.getStatus()));
        this.taskRecord.setEndedOn(new Date());
        this.taskRecord.setEndedReason(String.format("[%s]@{wind.bp.stopHand}", className) + e.getMessage());
        RecordUpdater updater = RecordUpdaterFactory.getUpdater((BaseRecord)this.taskRecord);
        updater.updateRecord(this.taskRecord);
    }

    protected void endErrorExceptionHandle(String className, AbstratRootBp rootBp, EndErrorException e) {
        this.saveLogError(e.getMessage());
        this.blockRecord.setStatus(Integer.valueOf(TaskBlockStatusEnum.end_error.getStatus()));
        this.blockRecord.setEndedOn(new Date());
        this.blockRecord.setEndedReason(String.format("[%s]@{wind.bp.end}", className));
        this.windService.saveBlockRecord(this.blockRecord);
        GlobalCacheConfig.cache((String)(this.taskRecord.getDefId() + this.taskRecord.getId()), (Object)TaskStatusEnum.end_error.getStatus());
        AbstratRootBp.taskStatus.put(this.taskRecord.getDefId() + this.taskRecord.getId(), false);
        AbstratRootBp.windTaskRecordMap.put(this.taskRecord.getId(), this.taskRecord);
        this.taskRecord.setStatus(Integer.valueOf(TaskStatusEnum.end_error.getStatus()));
        this.taskRecord.setEndedOn(new Date());
        this.taskRecord.setEndedReason(String.format("[%s]@{wind.bp.fail}", className) + e.getMessage());
        RecordUpdaterFactory.getUpdater((BaseRecord)this.taskRecord).updateRecord(this.taskRecord);
        if (this.taskRecord instanceof WindTaskRecord) {
            this.eventTaskEndError(this.windEvent);
        }
        String title = TaskStatusEnum.end_error.getDesc();
        String body = "[@{Excel.WindTaskRecord.id}:" + this.taskRecord.getId() + "], [" + className + "-b" + this.blockRecord.getBlockConfigId() + "], [" + e.getMessage() + "]";
        WindTaskStatus.noticeWindTask((String)title, (String)body);
    }

    protected void eventTaskEndError(WindEvent event) {
        if (event == null) {
            event = WindEvent.builder().type(Integer.valueOf(0)).status(String.valueOf(TaskStatusEnum.stop.getStatus())).taskId(this.taskId).taskRecord((TaskRecord)((WindTaskRecord)this.taskRecord)).taskLabel(((WindTaskRecord)this.taskRecord).getDefLabel()).build();
        }
        TaskStatusMonitorNotice.taskFailedNotice((TaskRecord)((WindTaskRecord)this.taskRecord), (WindBlockRecord)this.blockRecord, (WindBlockVo)this.blockVo, (String)this.taskId, (String)"[CAgvOperationBp] transport is stopped");
        this.eventSource.notify(event);
    }

    protected void parseBlockInputParamsValue(AbstratRootBp rootBp) {
        Set keys = this.inputParams.keySet();
        for (String key : keys) {
            Object value = rootBp.getInputParamValue(this.taskId, this.inputParams, key);
            if (value == null) continue;
            this.blockInputParamsValue.put(key, value);
        }
        if (StringUtils.isNotEmpty((CharSequence)this.blockVo.getErrorMsg())) {
            this.errorMsg = String.valueOf(this.blockVo.getErrorMsg());
        }
        if (this.blockVo.getMaxTimeOut() != null) {
            this.maxTimeOut = Long.valueOf(String.valueOf(this.blockVo.getMaxTimeOut()));
        }
        this.blockRecord.setBlockInputParamsValue(JSONObject.toJSONString((Object)this.blockInputParamsValue));
        this.windService.saveBlockRecord(this.blockRecord, this.blockVo.getBlockId(), this.blockVo.getBlockType(), this.taskRecord.getProjectId(), this.taskId, this.taskRecord.getId(), this.startOn);
        log.info("windTask bp {} [{}] inputParamsValue {}", new Object[]{this.blockVo.getBlockType(), this.blockVo.getBlockName(), this.blockInputParamsValue});
    }

    protected void parseBlockOutParamsValue() {
        JSONObject jsonObject;
        JSONObject blocks;
        String outputParams = this.blockRecord.getOutputParams();
        if (StringUtils.isNotEmpty((CharSequence)outputParams) && (blocks = (jsonObject = JSONObject.parseObject((String)outputParams)).getJSONObject(ParamPreField.blocks).getJSONObject(this.blockVo.getBlockName())) != null) {
            this.blockRecord.setBlockOutParamsValue(JSONObject.toJSONString((Object)blocks));
            this.windService.saveBlockRecord(this.blockRecord);
            log.info("windTask bp {} [{}] outParamsValue {}", new Object[]{this.blockVo.getBlockType(), this.blockVo.getBlockName(), blocks});
        }
    }

    protected void updateBlockOutParamsValue(AbstratRootBp rootBp, String blockId, String key, Object obj) {
        Map paramMap = (Map)((ConcurrentHashMap)AbstratRootBp.outputParamsMap.get()).get(ParamPreField.blocks);
        Object object = paramMap.get("b" + blockId);
        Map<String, Object> stringObjectMap = object == null ? new HashMap() : (Map)object;
        stringObjectMap.put(key, obj);
        paramMap.put("b" + blockId, stringObjectMap);
        ((ConcurrentHashMap)AbstratRootBp.outputParamsMap.get()).put(ParamPreField.blocks, paramMap);
        this.blockRecord.setOutputParams(JSONObject.toJSONString(AbstratRootBp.outputParamsMap.get()));
        this.windService.saveBlockRecord(this.blockRecord);
    }

    protected Object getBlockOutParamsValue(AbstratRootBp rootBp, String blockId, String key) {
        Map paramMap = (Map)((ConcurrentHashMap)AbstratRootBp.outputParamsMap.get()).get(ParamPreField.blocks);
        Object object = paramMap.get("b" + blockId);
        if (object != null) {
            Map stringObjectMap = (Map)object;
            return stringObjectMap.get(key);
        }
        return null;
    }

    protected void parseBlockInternalVariables() {
        if (StringUtils.isNotEmpty((CharSequence)this.blockInternalVariables)) {
            this.blockRecord.setBlockInternalVariables(this.blockInternalVariables);
            this.windService.saveBlockRecord(this.blockRecord);
            log.info("save parseBlockInternalVariables finished");
        }
    }

    protected void saveLogSuspend(String msg) {
        String m = String.format("[%s][%s]@{task.enum.blockSuspend}@{wind.bp.reason}:%s", this.blockVo.getBlockType(), this.blockVo.getBlockName(), msg);
        if (this.windTaskLogWait == null) {
            this.windTaskLogWait = this.windService.saveLog(TaskLogLevelEnum.warn.getLevel(), m, this.taskRecord.getProjectId(), this.taskId, this.taskRecord.getId(), this.blockVo.getBlockId());
            this.sendTaskError(m, Integer.valueOf(AlarmExceptionTypeEnum.WARN.getStatus()));
            return;
        }
        String errorMsg = this.checkBlockDurationIfTimeOut(m);
        if (StringUtils.isNotEmpty((CharSequence)errorMsg)) {
            m = errorMsg;
        }
        if (StringUtils.equals((CharSequence)m, (CharSequence)this.windTaskLogWait.getMessage())) {
            return;
        }
        this.sendTaskError(m, Integer.valueOf(AlarmExceptionTypeEnum.WARN.getStatus()));
        this.windTaskLogWait.setCreateTime(new Date());
        this.windTaskLogWait.setMessage(m);
        this.windService.saveLog(this.windTaskLogWait);
        log.info("windTask bp {} suspend msg {}", (Object)this.blockVo.getBlockType(), (Object)msg);
    }

    protected void saveLogInfo(String msg) {
        String m = String.format("[%s][%s]@{wind.bp.start}, %s", this.blockVo.getBlockType(), this.blockVo.getBlockName(), msg);
        if (this.windTaskLog == null || !StringUtils.equals((CharSequence)m, (CharSequence)this.windTaskLog.getMessage())) {
            this.windTaskLog = this.windService.saveLog(TaskLogLevelEnum.info.getLevel(), m, this.taskRecord.getProjectId(), this.taskId, this.taskRecord.getId(), this.blockVo.getBlockId());
            log.info("windTask bp {} logInfo msg {}", (Object)this.blockVo.getBlockType(), (Object)msg);
        }
    }

    protected void saveLogResult(Object msg) {
        this.windService.saveLog(TaskLogLevelEnum.info.getLevel(), String.format("[%s][%s]@{wind.bp.result}: %s", this.blockVo.getBlockType(), this.blockVo.getBlockName(), msg), this.taskRecord.getProjectId(), this.taskId, this.taskRecord.getId(), this.blockVo.getBlockId());
    }

    protected void saveLogError(String errorReason) {
        String m = String.format("[%s][%s]@{agv.states.failed}, @{wind.bp.reason}: %s", this.blockVo.getBlockType(), this.blockVo.getBlockName(), errorReason);
        String errorMsg = this.checkBlockDurationIfTimeOut(m);
        if (StringUtils.isNotEmpty((CharSequence)errorMsg)) {
            m = errorMsg;
        }
        if (this.windTaskLogError == null || !StringUtils.equals((CharSequence)m, (CharSequence)this.windTaskLogError.getMessage())) {
            this.sendTaskError(m, Integer.valueOf(AlarmExceptionTypeEnum.ERROR.getStatus()));
            this.windTaskLogError = this.windService.saveLog(TaskLogLevelEnum.error.getLevel(), m, this.taskRecord.getProjectId(), this.taskId, this.taskRecord.getId(), this.blockVo.getBlockId());
            log.info("windTask bp {} error reason {}", (Object)this.blockVo.getBlockType(), (Object)errorReason);
        }
    }

    protected void saveLogStop(String warnReason) {
        String m = String.format("[%s][%s]@{permission.simpleOrderTerminate}, @{wind.bp.reason}, %s", this.blockVo.getBlockType(), this.blockVo.getBlockName(), warnReason);
        if (this.windTaskLogStop == null || !StringUtils.equals((CharSequence)m, (CharSequence)this.windTaskLogStop.getMessage())) {
            this.windTaskLogStop = this.windService.saveLog(TaskLogLevelEnum.stop.getLevel(), m, this.taskRecord.getProjectId(), this.taskId, this.taskRecord.getId(), this.blockVo.getBlockId());
            log.info("windTask bp {} stop {}", (Object)this.blockVo.getBlockType(), (Object)warnReason);
        }
    }

    public String checkBlockDurationIfTimeOut(String m) {
        Date date = new Date();
        long nowDuration = date.getTime() - this.blockRecord.getStartedOn().getTime();
        if (this.maxTimeOut == null || nowDuration <= this.maxTimeOut) {
            return m;
        }
        TaskErrorVo taskErrorCache = GlobalCacheConfig.getTaskErrorCache((String)(this.taskRecord.getId() + "b" + this.blockRecord.getBlockConfigId()));
        if (taskErrorCache == null || !m.equals(taskErrorCache)) {
            TaskErrorVo taskErrorVo = new TaskErrorVo();
            taskErrorVo.setCreateTime(new Date());
            taskErrorVo.setRecordId(this.taskRecord.getId());
            if (this.taskRecord instanceof WindTaskRecord) {
                taskErrorVo.setAgvId(((WindTaskRecord)this.taskRecord).getAgvId());
                taskErrorVo.setOutOrderId(((WindTaskRecord)this.taskRecord).getOutOrderNo());
            }
            taskErrorVo.setMislabeling(this.taskRecord.getId() + "b" + this.blockRecord.getBlockConfigId());
            if (StringUtils.isNotEmpty((CharSequence)this.errorMsg)) {
                log.info(this.errorMsg);
                taskErrorVo.setErrorMsg(this.errorMsg);
            } else {
                log.info(m);
                this.errorMsg = m;
                taskErrorVo.setErrorMsg(this.errorMsg);
            }
            GlobalCacheConfig.taskErrorCache((String)(this.taskRecord.getId() + "b" + this.blockRecord.getBlockConfigId()), (TaskErrorVo)taskErrorVo);
        }
        return this.errorMsg;
    }

    public void sendTaskError(String m, Integer level) {
        TaskErrorVo taskErrorVo = new TaskErrorVo();
        taskErrorVo.setCreateTime(new Date());
        taskErrorVo.setRecordId(this.taskRecord.getId());
        if (this.taskRecord instanceof WindTaskRecord) {
            taskErrorVo.setAgvId(((WindTaskRecord)this.taskRecord).getAgvId());
            taskErrorVo.setOutOrderId(((WindTaskRecord)this.taskRecord).getOutOrderNo());
        }
        taskErrorVo.setMislabeling(this.taskRecord.getId() + "b" + this.blockRecord.getBlockConfigId());
        taskErrorVo.setLabel(this.taskRecord.getDefLabel());
        taskErrorVo.setVersion(this.taskRecord.getDefVersion());
        Date date = new Date();
        long nowDuration = date.getTime() - this.blockRecord.getStartedOn().getTime();
        if (StringUtils.isNotEmpty((CharSequence)this.errorMsg) && nowDuration > this.maxTimeOut) {
            log.info(this.errorMsg);
            taskErrorVo.setErrorMsg(this.errorMsg);
        } else {
            log.info(m);
            taskErrorVo.setErrorMsg(m);
        }
        this.sysAlarmService.addTaskAlarmInfo(this.taskRecord.getId() + "b" + this.blockRecord.getBlockConfigId(), CommonCodeEnum.WS_MSG_TASK_ERROR.getCode().intValue(), JSONObject.toJSONString((Object)taskErrorVo), level.intValue());
    }

    public void checkIfInterrupt() {
        if (Thread.interrupted() && "StopBranchKey".equals(GlobalCacheConfig.getCacheInterrupt((String)this.taskRecord.getId()))) {
            log.info("will change destination");
            throw new StopBranchException("change destination");
        }
        if ("RevertJumpKey".equals(GlobalCacheConfig.getCacheInterrupt((String)this.taskRecord.getId()))) {
            log.info("revert jump");
            throw new RevertJumpException("revert jump");
        }
    }

    protected void sendBlock(String orderId, String addBlockParam, String addBlockId) throws Exception {
        boolean terminateStatus = true;
        while (terminateStatus) {
            this.checkIfInterrupt();
            Object terminateStatusObj = GlobalCacheConfig.getCache((String)(this.taskId + this.taskRecord.getId()));
            terminateStatus = terminateStatusObj == null || ((Integer)terminateStatusObj).intValue() == TaskStatusEnum.running.getStatus();
            try {
                log.info("addBlocks request, orderId={}, param={}", (Object)orderId, (Object)addBlockParam);
                String res = OkHttpUtil.postJsonParams((String)RootBp.getUrl((String)ApiEnum.addBlocks.getUri()), (String)addBlockParam);
                if (StringUtils.isNotEmpty((CharSequence)res)) {
                    JSONObject resObj = JSONObject.parseObject((String)res);
                    Integer code = resObj.getInteger("code");
                    String msg = resObj.getString("msg");
                    if (code != null) {
                        if (code.equals(0)) break;
                        if (code.equals(50001) && StringUtils.isNotEmpty((CharSequence)msg) && msg.contains("already exist")) {
                            log.info("{}---{} already exist.", (Object)orderId, (Object)addBlockId);
                            break;
                        }
                        if (code.equals(50003)) {
                            log.info("{} order is complete.", (Object)orderId);
                            throw new RuntimeException(String.format("@{wind.bp.robotOperateAdd}:orderId=%s,blockId=%s,@{wind.bp.reason}=@{wind.order.complete}", orderId, addBlockId));
                        }
                        log.info("{}---{} addBlocks return {}", new Object[]{orderId, addBlockId, res});
                        this.blockRecord.setStatus(Integer.valueOf(TaskBlockStatusEnum.suspend.getStatus()));
                        this.blockRecord.setEndedReason(TaskBlockStatusEnum.suspend.getDesc() + ",reason=" + msg);
                        this.getWindService().saveBlockRecord(this.blockRecord);
                        throw new RuntimeException(String.format("@{wind.bp.robotOperate}:orderId=%s,blockId=%s,@{wind.bp.reason}=%s", orderId, addBlockId, msg));
                    }
                    log.error("Core addBlocks:orderId---{},blockId---{} API return code null", (Object)orderId, (Object)addBlockId);
                } else {
                    log.error("Core addBlocks return empty, orderId---{},blockId---{}", (Object)orderId, (Object)addBlockId);
                }
                Thread.sleep(2000L);
            }
            catch (InterruptedIOException | InterruptedException e) {
                Thread.currentThread().interrupt();
                this.checkIfInterrupt();
            }
            catch (IOException ee) {
                try {
                    Thread.sleep(3000L);
                }
                catch (InterruptedException ex) {
                    log.error("Sleep Interrupted!", (Throwable)ex);
                }
                log.error("{}---{} addBlocks error,retry", (Object)orderId, (Object)addBlockId);
            }
        }
    }

    protected String checkAgvFromCore(AbstratRootBp rootBp, JSONObject resObj, String scriptName, String targetSiteLabel) {
        Boolean isReassignable = resObj.getBoolean("isReassignable");
        String reassignLog = resObj.getString("reassignLog");
        if (isReassignable != null && isReassignable.booleanValue() && StringUtils.isNotEmpty((CharSequence)reassignLog)) {
            String vehicleNew = resObj.getString("vehicle");
            String cSelectAgvBlockId = this.findCSelectAgvBlockId(rootBp);
            Object oldAgvId = this.getBlockOutParamsValue(rootBp, cSelectAgvBlockId, CSelectAgvBpField.ctxSelectedAgvId);
            if (oldAgvId != null && !StringUtils.equals((CharSequence)vehicleNew, (CharSequence)oldAgvId.toString())) {
                this.saveLogInfo(String.format("@{windBlock.core.changeAgv}=%s", vehicleNew));
                this.updateBlockOutParamsValue(rootBp, cSelectAgvBlockId, CSelectAgvBpField.ctxSelectedAgvId, (Object)vehicleNew);
                WindTaskAGV.setAgvPathEnd((String)DateUtils.getTime(), (String)oldAgvId.toString(), (TaskRecord)((TaskRecord)this.taskRecord), (boolean)false);
                WindTaskAGV.setAgvPath((String)DateUtils.getTime(), (String)"", (String)vehicleNew, (String)scriptName, (String)targetSiteLabel, (TaskRecord)((TaskRecord)this.taskRecord));
                WindTaskStatus.updateTaskTimeAndAgvAndCost(null, null, (String)vehicleNew, (AbstratRootBp)rootBp, (TaskRecord)((TaskRecord)this.taskRecord));
                return vehicleNew;
            }
        }
        return null;
    }

    private String findCSelectAgvBlockId(AbstratRootBp rootBp) {
        String detail = rootBp.detail;
        JSONObject jsonObject = JSONObject.parseObject((String)detail);
        JSONObject rootBlock = jsonObject.getJSONObject("rootBlock");
        JSONObject js = rootBlock.getJSONObject(BlockField.children);
        JSONArray jsonArray = js.getJSONArray(BlockField.childrenDefault);
        return this.findCSelectAgvBlockId(jsonArray, "CSelectAgvBp", this.blockRecord.getBlockConfigId(), "");
    }

    private String findCSelectAgvBlockId(JSONArray jsonArray, String className, String blockId, String value) {
        for (int i = 0; i < jsonArray.size(); ++i) {
            JSONObject jsonObject = jsonArray.getJSONObject(i);
            String blockType = jsonObject.getString(BlockField.blockType);
            String id = jsonObject.getString(BlockField.id);
            if (StringUtils.equals((CharSequence)id, (CharSequence)blockId)) {
                return value;
            }
            if (StringUtils.equals((CharSequence)blockType, (CharSequence)className)) {
                value = id;
            }
            JSONObject jo = jsonObject.getJSONObject(BlockField.children);
            for (String s : jo.keySet()) {
                JSONArray ja = jo.getJSONArray(s);
                String res = this.findCSelectAgvBlockId(ja, className, blockId, value);
                if (!StringUtils.isNotEmpty((CharSequence)res)) continue;
                return res;
            }
        }
        return "";
    }

    public WindService getWindService() {
        return this.windService;
    }

    public String getTaskId() {
        return this.taskId;
    }

    public T getTaskRecord() {
        return (T)this.taskRecord;
    }

    public WindBlockVo getBlockVo() {
        return this.blockVo;
    }

    public JSONObject getInputParams() {
        return this.inputParams;
    }

    public Object getChildDefaultArray() {
        return this.childDefaultArray;
    }

    public Date getStartOn() {
        return this.startOn;
    }

    public WindBlockRecord getBlockRecord() {
        return this.blockRecord;
    }

    public String getState() {
        return this.state;
    }

    public EventSource getEventSource() {
        return this.eventSource;
    }

    public Boolean getInterruptError() {
        return this.interruptError;
    }

    public WindEvent getWindEvent() {
        return this.windEvent;
    }

    public String getBlockInternalVariables() {
        return this.blockInternalVariables;
    }

    public WindTaskLog getWindTaskLog() {
        return this.windTaskLog;
    }

    public WindTaskLog getWindTaskLogError() {
        return this.windTaskLogError;
    }

    public WindTaskLog getWindTaskLogStop() {
        return this.windTaskLogStop;
    }

    public WindTaskLog getWindTaskLogWait() {
        return this.windTaskLogWait;
    }

    public SysAlarmService getSysAlarmService() {
        return this.sysAlarmService;
    }

    public Long getMaxTimeOut() {
        return this.maxTimeOut;
    }

    public String getErrorMsg() {
        return this.errorMsg;
    }

    public HashMap<String, Object> getBlockInputParamsValue() {
        return this.blockInputParamsValue;
    }

    public HashMap<String, Object> getBlockOutParamsValue() {
        return this.blockOutParamsValue;
    }

    public AgvApiService getAgvApiService() {
        return this.agvApiService;
    }

    public void setWindService(WindService windService) {
        this.windService = windService;
    }

    public void setTaskId(String taskId) {
        this.taskId = taskId;
    }

    public void setTaskRecord(T taskRecord) {
        this.taskRecord = taskRecord;
    }

    public void setBlockVo(WindBlockVo blockVo) {
        this.blockVo = blockVo;
    }

    public void setInputParams(JSONObject inputParams) {
        this.inputParams = inputParams;
    }

    public void setChildDefaultArray(Object childDefaultArray) {
        this.childDefaultArray = childDefaultArray;
    }

    public void setStartOn(Date startOn) {
        this.startOn = startOn;
    }

    public void setBlockRecord(WindBlockRecord blockRecord) {
        this.blockRecord = blockRecord;
    }

    public void setState(String state) {
        this.state = state;
    }

    public void setEventSource(EventSource eventSource) {
        this.eventSource = eventSource;
    }

    public void setInterruptError(Boolean interruptError) {
        this.interruptError = interruptError;
    }

    public void setWindEvent(WindEvent windEvent) {
        this.windEvent = windEvent;
    }

    public void setBlockInternalVariables(String blockInternalVariables) {
        this.blockInternalVariables = blockInternalVariables;
    }

    public void setWindTaskLog(WindTaskLog windTaskLog) {
        this.windTaskLog = windTaskLog;
    }

    public void setWindTaskLogError(WindTaskLog windTaskLogError) {
        this.windTaskLogError = windTaskLogError;
    }

    public void setWindTaskLogStop(WindTaskLog windTaskLogStop) {
        this.windTaskLogStop = windTaskLogStop;
    }

    public void setWindTaskLogWait(WindTaskLog windTaskLogWait) {
        this.windTaskLogWait = windTaskLogWait;
    }

    public void setSysAlarmService(SysAlarmService sysAlarmService) {
        this.sysAlarmService = sysAlarmService;
    }

    public void setMaxTimeOut(Long maxTimeOut) {
        this.maxTimeOut = maxTimeOut;
    }

    public void setErrorMsg(String errorMsg) {
        this.errorMsg = errorMsg;
    }

    public void setBlockOutParamsValue(HashMap<String, Object> blockOutParamsValue) {
        this.blockOutParamsValue = blockOutParamsValue;
    }

    public void setAgvApiService(AgvApiService agvApiService) {
        this.agvApiService = agvApiService;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof AbstractBp)) {
            return false;
        }
        AbstractBp other = (AbstractBp)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        Boolean this$interruptError = this.getInterruptError();
        Boolean other$interruptError = other.getInterruptError();
        if (this$interruptError == null ? other$interruptError != null : !((Object)this$interruptError).equals(other$interruptError)) {
            return false;
        }
        Long this$maxTimeOut = this.getMaxTimeOut();
        Long other$maxTimeOut = other.getMaxTimeOut();
        if (this$maxTimeOut == null ? other$maxTimeOut != null : !((Object)this$maxTimeOut).equals(other$maxTimeOut)) {
            return false;
        }
        WindService this$windService = this.getWindService();
        WindService other$windService = other.getWindService();
        if (this$windService == null ? other$windService != null : !this$windService.equals(other$windService)) {
            return false;
        }
        String this$taskId = this.getTaskId();
        String other$taskId = other.getTaskId();
        if (this$taskId == null ? other$taskId != null : !this$taskId.equals(other$taskId)) {
            return false;
        }
        BaseRecord this$taskRecord = this.getTaskRecord();
        BaseRecord other$taskRecord = other.getTaskRecord();
        if (this$taskRecord == null ? other$taskRecord != null : !this$taskRecord.equals(other$taskRecord)) {
            return false;
        }
        WindBlockVo this$blockVo = this.getBlockVo();
        WindBlockVo other$blockVo = other.getBlockVo();
        if (this$blockVo == null ? other$blockVo != null : !this$blockVo.equals(other$blockVo)) {
            return false;
        }
        JSONObject this$inputParams = this.getInputParams();
        JSONObject other$inputParams = other.getInputParams();
        if (this$inputParams == null ? other$inputParams != null : !this$inputParams.equals(other$inputParams)) {
            return false;
        }
        Object this$childDefaultArray = this.getChildDefaultArray();
        Object other$childDefaultArray = other.getChildDefaultArray();
        if (this$childDefaultArray == null ? other$childDefaultArray != null : !this$childDefaultArray.equals(other$childDefaultArray)) {
            return false;
        }
        Date this$startOn = this.getStartOn();
        Date other$startOn = other.getStartOn();
        if (this$startOn == null ? other$startOn != null : !((Object)this$startOn).equals(other$startOn)) {
            return false;
        }
        WindBlockRecord this$blockRecord = this.getBlockRecord();
        WindBlockRecord other$blockRecord = other.getBlockRecord();
        if (this$blockRecord == null ? other$blockRecord != null : !this$blockRecord.equals(other$blockRecord)) {
            return false;
        }
        String this$state = this.getState();
        String other$state = other.getState();
        if (this$state == null ? other$state != null : !this$state.equals(other$state)) {
            return false;
        }
        EventSource this$eventSource = this.getEventSource();
        EventSource other$eventSource = other.getEventSource();
        if (this$eventSource == null ? other$eventSource != null : !this$eventSource.equals(other$eventSource)) {
            return false;
        }
        WindEvent this$windEvent = this.getWindEvent();
        WindEvent other$windEvent = other.getWindEvent();
        if (this$windEvent == null ? other$windEvent != null : !this$windEvent.equals(other$windEvent)) {
            return false;
        }
        String this$blockInternalVariables = this.getBlockInternalVariables();
        String other$blockInternalVariables = other.getBlockInternalVariables();
        if (this$blockInternalVariables == null ? other$blockInternalVariables != null : !this$blockInternalVariables.equals(other$blockInternalVariables)) {
            return false;
        }
        WindTaskLog this$windTaskLog = this.getWindTaskLog();
        WindTaskLog other$windTaskLog = other.getWindTaskLog();
        if (this$windTaskLog == null ? other$windTaskLog != null : !this$windTaskLog.equals(other$windTaskLog)) {
            return false;
        }
        WindTaskLog this$windTaskLogError = this.getWindTaskLogError();
        WindTaskLog other$windTaskLogError = other.getWindTaskLogError();
        if (this$windTaskLogError == null ? other$windTaskLogError != null : !this$windTaskLogError.equals(other$windTaskLogError)) {
            return false;
        }
        WindTaskLog this$windTaskLogStop = this.getWindTaskLogStop();
        WindTaskLog other$windTaskLogStop = other.getWindTaskLogStop();
        if (this$windTaskLogStop == null ? other$windTaskLogStop != null : !this$windTaskLogStop.equals(other$windTaskLogStop)) {
            return false;
        }
        WindTaskLog this$windTaskLogWait = this.getWindTaskLogWait();
        WindTaskLog other$windTaskLogWait = other.getWindTaskLogWait();
        if (this$windTaskLogWait == null ? other$windTaskLogWait != null : !this$windTaskLogWait.equals(other$windTaskLogWait)) {
            return false;
        }
        SysAlarmService this$sysAlarmService = this.getSysAlarmService();
        SysAlarmService other$sysAlarmService = other.getSysAlarmService();
        if (this$sysAlarmService == null ? other$sysAlarmService != null : !this$sysAlarmService.equals(other$sysAlarmService)) {
            return false;
        }
        String this$errorMsg = this.getErrorMsg();
        String other$errorMsg = other.getErrorMsg();
        if (this$errorMsg == null ? other$errorMsg != null : !this$errorMsg.equals(other$errorMsg)) {
            return false;
        }
        HashMap this$blockInputParamsValue = this.getBlockInputParamsValue();
        HashMap other$blockInputParamsValue = other.getBlockInputParamsValue();
        if (this$blockInputParamsValue == null ? other$blockInputParamsValue != null : !((Object)this$blockInputParamsValue).equals(other$blockInputParamsValue)) {
            return false;
        }
        HashMap this$blockOutParamsValue = this.getBlockOutParamsValue();
        HashMap other$blockOutParamsValue = other.getBlockOutParamsValue();
        if (this$blockOutParamsValue == null ? other$blockOutParamsValue != null : !((Object)this$blockOutParamsValue).equals(other$blockOutParamsValue)) {
            return false;
        }
        AgvApiService this$agvApiService = this.getAgvApiService();
        AgvApiService other$agvApiService = other.getAgvApiService();
        return !(this$agvApiService == null ? other$agvApiService != null : !this$agvApiService.equals(other$agvApiService));
    }

    protected boolean canEqual(Object other) {
        return other instanceof AbstractBp;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        Boolean $interruptError = this.getInterruptError();
        result = result * 59 + ($interruptError == null ? 43 : ((Object)$interruptError).hashCode());
        Long $maxTimeOut = this.getMaxTimeOut();
        result = result * 59 + ($maxTimeOut == null ? 43 : ((Object)$maxTimeOut).hashCode());
        WindService $windService = this.getWindService();
        result = result * 59 + ($windService == null ? 43 : $windService.hashCode());
        String $taskId = this.getTaskId();
        result = result * 59 + ($taskId == null ? 43 : $taskId.hashCode());
        BaseRecord $taskRecord = this.getTaskRecord();
        result = result * 59 + ($taskRecord == null ? 43 : $taskRecord.hashCode());
        WindBlockVo $blockVo = this.getBlockVo();
        result = result * 59 + ($blockVo == null ? 43 : $blockVo.hashCode());
        JSONObject $inputParams = this.getInputParams();
        result = result * 59 + ($inputParams == null ? 43 : $inputParams.hashCode());
        Object $childDefaultArray = this.getChildDefaultArray();
        result = result * 59 + ($childDefaultArray == null ? 43 : $childDefaultArray.hashCode());
        Date $startOn = this.getStartOn();
        result = result * 59 + ($startOn == null ? 43 : ((Object)$startOn).hashCode());
        WindBlockRecord $blockRecord = this.getBlockRecord();
        result = result * 59 + ($blockRecord == null ? 43 : $blockRecord.hashCode());
        String $state = this.getState();
        result = result * 59 + ($state == null ? 43 : $state.hashCode());
        EventSource $eventSource = this.getEventSource();
        result = result * 59 + ($eventSource == null ? 43 : $eventSource.hashCode());
        WindEvent $windEvent = this.getWindEvent();
        result = result * 59 + ($windEvent == null ? 43 : $windEvent.hashCode());
        String $blockInternalVariables = this.getBlockInternalVariables();
        result = result * 59 + ($blockInternalVariables == null ? 43 : $blockInternalVariables.hashCode());
        WindTaskLog $windTaskLog = this.getWindTaskLog();
        result = result * 59 + ($windTaskLog == null ? 43 : $windTaskLog.hashCode());
        WindTaskLog $windTaskLogError = this.getWindTaskLogError();
        result = result * 59 + ($windTaskLogError == null ? 43 : $windTaskLogError.hashCode());
        WindTaskLog $windTaskLogStop = this.getWindTaskLogStop();
        result = result * 59 + ($windTaskLogStop == null ? 43 : $windTaskLogStop.hashCode());
        WindTaskLog $windTaskLogWait = this.getWindTaskLogWait();
        result = result * 59 + ($windTaskLogWait == null ? 43 : $windTaskLogWait.hashCode());
        SysAlarmService $sysAlarmService = this.getSysAlarmService();
        result = result * 59 + ($sysAlarmService == null ? 43 : $sysAlarmService.hashCode());
        String $errorMsg = this.getErrorMsg();
        result = result * 59 + ($errorMsg == null ? 43 : $errorMsg.hashCode());
        HashMap $blockInputParamsValue = this.getBlockInputParamsValue();
        result = result * 59 + ($blockInputParamsValue == null ? 43 : ((Object)$blockInputParamsValue).hashCode());
        HashMap $blockOutParamsValue = this.getBlockOutParamsValue();
        result = result * 59 + ($blockOutParamsValue == null ? 43 : ((Object)$blockOutParamsValue).hashCode());
        AgvApiService $agvApiService = this.getAgvApiService();
        result = result * 59 + ($agvApiService == null ? 43 : $agvApiService.hashCode());
        return result;
    }

    public String toString() {
        return "AbstractBp(windService=" + this.getWindService() + ", taskId=" + this.getTaskId() + ", taskRecord=" + this.getTaskRecord() + ", blockVo=" + this.getBlockVo() + ", inputParams=" + this.getInputParams() + ", childDefaultArray=" + this.getChildDefaultArray() + ", startOn=" + this.getStartOn() + ", blockRecord=" + this.getBlockRecord() + ", state=" + this.getState() + ", eventSource=" + this.getEventSource() + ", interruptError=" + this.getInterruptError() + ", windEvent=" + this.getWindEvent() + ", blockInternalVariables=" + this.getBlockInternalVariables() + ", windTaskLog=" + this.getWindTaskLog() + ", windTaskLogError=" + this.getWindTaskLogError() + ", windTaskLogStop=" + this.getWindTaskLogStop() + ", windTaskLogWait=" + this.getWindTaskLogWait() + ", sysAlarmService=" + this.getSysAlarmService() + ", maxTimeOut=" + this.getMaxTimeOut() + ", errorMsg=" + this.getErrorMsg() + ", blockInputParamsValue=" + this.getBlockInputParamsValue() + ", blockOutParamsValue=" + this.getBlockOutParamsValue() + ", agvApiService=" + this.getAgvApiService() + ")";
    }
}

