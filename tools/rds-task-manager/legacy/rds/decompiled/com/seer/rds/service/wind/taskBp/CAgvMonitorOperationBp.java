/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.alibaba.fastjson.JSONArray
 *  com.alibaba.fastjson.JSONObject
 *  com.google.common.collect.Maps
 *  com.seer.rds.config.GlobalCacheConfig
 *  com.seer.rds.constant.AgvActionStatusEnum
 *  com.seer.rds.constant.ApiEnum
 *  com.seer.rds.constant.TaskBlockStatusEnum
 *  com.seer.rds.constant.TaskStatusEnum
 *  com.seer.rds.exception.BpRuntimeException
 *  com.seer.rds.exception.EndErrorException
 *  com.seer.rds.exception.ManualEndException
 *  com.seer.rds.exception.StopException
 *  com.seer.rds.listener.EventSource
 *  com.seer.rds.listener.WindEvent
 *  com.seer.rds.model.wind.BaseRecord
 *  com.seer.rds.model.wind.TaskRecord
 *  com.seer.rds.model.wind.WindBlockRecord
 *  com.seer.rds.schedule.queryOrderListSchedule
 *  com.seer.rds.service.agv.AgvApiService
 *  com.seer.rds.service.factory.RecordUpdaterFactory
 *  com.seer.rds.service.wind.AbstractBp
 *  com.seer.rds.service.wind.AbstratRootBp
 *  com.seer.rds.service.wind.ErrorHandleService
 *  com.seer.rds.service.wind.RootBp
 *  com.seer.rds.service.wind.WindTaskAGV
 *  com.seer.rds.service.wind.WindTaskStatus
 *  com.seer.rds.service.wind.taskBp.CAgvMonitorOperationBp
 *  com.seer.rds.util.OkHttpUtil
 *  com.seer.rds.util.server.DateUtils
 *  com.seer.rds.vo.WindBlockVo
 *  com.seer.rds.vo.req.ChangeDestinationReq
 *  com.seer.rds.vo.wind.CAgvMonitorOperationBpField
 *  com.seer.rds.vo.wind.ParamPreField
 *  org.apache.commons.collections.CollectionUtils
 *  org.apache.commons.lang3.StringUtils
 *  org.slf4j.Logger
 *  org.slf4j.LoggerFactory
 *  org.springframework.beans.factory.annotation.Autowired
 *  org.springframework.context.annotation.Scope
 *  org.springframework.stereotype.Component
 */
package com.seer.rds.service.wind.taskBp;

import com.alibaba.fastjson.JSONArray;
import com.alibaba.fastjson.JSONObject;
import com.google.common.collect.Maps;
import com.seer.rds.config.GlobalCacheConfig;
import com.seer.rds.constant.AgvActionStatusEnum;
import com.seer.rds.constant.ApiEnum;
import com.seer.rds.constant.TaskBlockStatusEnum;
import com.seer.rds.constant.TaskStatusEnum;
import com.seer.rds.exception.BpRuntimeException;
import com.seer.rds.exception.EndErrorException;
import com.seer.rds.exception.ManualEndException;
import com.seer.rds.exception.StopException;
import com.seer.rds.listener.EventSource;
import com.seer.rds.listener.WindEvent;
import com.seer.rds.model.wind.BaseRecord;
import com.seer.rds.model.wind.TaskRecord;
import com.seer.rds.model.wind.WindBlockRecord;
import com.seer.rds.schedule.queryOrderListSchedule;
import com.seer.rds.service.agv.AgvApiService;
import com.seer.rds.service.factory.RecordUpdaterFactory;
import com.seer.rds.service.wind.AbstractBp;
import com.seer.rds.service.wind.AbstratRootBp;
import com.seer.rds.service.wind.ErrorHandleService;
import com.seer.rds.service.wind.RootBp;
import com.seer.rds.service.wind.WindTaskAGV;
import com.seer.rds.service.wind.WindTaskStatus;
import com.seer.rds.util.OkHttpUtil;
import com.seer.rds.util.server.DateUtils;
import com.seer.rds.vo.WindBlockVo;
import com.seer.rds.vo.req.ChangeDestinationReq;
import com.seer.rds.vo.wind.CAgvMonitorOperationBpField;
import com.seer.rds.vo.wind.ParamPreField;
import java.io.IOException;
import java.io.InterruptedIOException;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.apache.commons.collections.CollectionUtils;
import org.apache.commons.lang3.StringUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Scope;
import org.springframework.stereotype.Component;

@Component
@Scope(value="prototype")
public class CAgvMonitorOperationBp
extends AbstractBp<TaskRecord> {
    private static final Logger log = LoggerFactory.getLogger(CAgvMonitorOperationBp.class);
    @Autowired
    private ErrorHandleService errorHandleService;
    private List<String> noticeFailed = new ArrayList();
    @Autowired
    private EventSource eventSource;
    private String agvId;
    private String targetSiteLabel;
    private String scriptName;

    protected void getInputParamsAndExecute(AbstratRootBp rootBp) throws Exception {
        Object orderId;
        String blockId = (String)this.blockInputParamsValue.get(CAgvMonitorOperationBpField.blockId);
        String distributeBpFrom = RootBp.distributeOrderCache.get(this.taskId + ((TaskRecord)this.taskRecord).getId()) != null ? (String)((InheritableThreadLocal)RootBp.distributeOrderCache.get(this.taskId + ((TaskRecord)this.taskRecord).getId())).get() : "";
        if (StringUtils.equals((CharSequence)distributeBpFrom, (CharSequence)(orderId = (String)((TaskRecord)this.taskRecord).getOrderId().get()))) {
            orderId = "fromOrder" + distributeBpFrom;
        }
        this.getBlockOthInfo(blockId);
        WindTaskAGV.setAgvPath((String)DateUtils.getTime(), (String)"", (String)this.agvId, (String)this.scriptName, (String)this.targetSiteLabel, (TaskRecord)((TaskRecord)this.taskRecord));
        HashMap childParamMap = Maps.newHashMap();
        childParamMap.put("containerName", "");
        this.monitorOperation(rootBp, (String)orderId, blockId, childParamMap);
        for (String s : childParamMap.keySet()) {
            this.blockOutParamsValue.put(s, childParamMap.get(s));
        }
    }

    private void getBlockOthInfo(String blockId) throws InterruptedException {
        while (true) {
            WindTaskStatus.monitorTaskEndErrorAndTaskStop((AbstractBp)this);
            try {
                String taskRes = OkHttpUtil.get((String)(RootBp.getUrl((String)ApiEnum.blockDetailsById.getUri()) + "/" + blockId));
                JSONObject jo = JSONObject.parseObject((String)taskRes);
                this.agvId = jo.getString("vehicle");
                this.targetSiteLabel = jo.getString("location");
                this.scriptName = StringUtils.isNotEmpty((CharSequence)jo.getString("binTask")) ? jo.getString("binTask") : (StringUtils.isNotEmpty((CharSequence)jo.getString("operation")) ? jo.getString("operation") : (StringUtils.isNotEmpty((CharSequence)jo.getString("script_name")) ? jo.getString("script_name") : (StringUtils.isNotEmpty((CharSequence)jo.getString("preBinTask")) ? jo.getString("preBinTask") : "")));
                return;
            }
            catch (Exception e) {
                log.info("blockId = {}, error = {}", (Object)blockId, (Object)e.getMessage());
                continue;
            }
            break;
        }
    }

    private void monitorOperation(AbstratRootBp rootBp, String orderId, String addBlockId, HashMap<String, Object> childParamMap) {
        int times = 0;
        boolean taskStatus = true;
        while (taskStatus) {
            this.checkIfInterrupt();
            ++times;
            Object taskStatusObj = GlobalCacheConfig.getCache((String)(this.taskId + ((TaskRecord)this.taskRecord).getId()));
            boolean bl = taskStatus = taskStatusObj == null || ((Integer)taskStatusObj).intValue() == TaskStatusEnum.running.getStatus();
            if (!((Boolean)RootBp.taskStatus.get(rootBp.taskId + rootBp.taskRecord.getId())).booleanValue()) {
                throw new StopException("@{wind.bp.stopHand}");
            }
            try {
                Thread.sleep(500L);
                if ("ManualEndKey".equals(GlobalCacheConfig.getCacheInterrupt((String)((TaskRecord)this.taskRecord).getId()))) {
                    this.errorHandleService.operationManualEnd(this.agvId);
                    throw new ManualEndException("manual End");
                }
                if ("RedoFailedOrder".equals(GlobalCacheConfig.getCacheInterrupt((String)((TaskRecord)this.taskRecord).getId()))) {
                    this.errorHandleService.operationRedoFailedOrder(this.agvId);
                }
                String res = queryOrderListSchedule.queryOrder((String)orderId, (Instant)Instant.now());
                String uuid = queryOrderListSchedule.queryUUID();
                if (res == null) {
                    Map response = OkHttpUtil.getAllResponse((String)(RootBp.getUrl((String)ApiEnum.orderDetails.getUri()) + "/" + orderId));
                    if (response != null) {
                        res = (String)response.get("body");
                        uuid = (String)response.get("UUID");
                    }
                    log.info("query task block result,orderId={}, UUID={},res={},from core", new Object[]{orderId, uuid, res});
                } else {
                    log.info("query task block result,orderId={}, UUID={},res={},from cache", new Object[]{orderId, uuid, res});
                }
                if (StringUtils.isEmpty((CharSequence)res)) {
                    this.saveLogSuspend("@{wind.bp.robotQuery}");
                    continue;
                }
                JSONObject resObj = JSONObject.parseObject((String)res);
                String stateOrder = resObj.getString("state");
                String changeAgv = this.checkAgvFromCore(rootBp, resObj, this.scriptName, this.targetSiteLabel);
                if (changeAgv != null) {
                    this.agvId = changeAgv;
                }
                if ("FAILED".equals(stateOrder)) {
                    JSONArray errArray = resObj.getJSONArray("errors");
                    String reason = "";
                    if (CollectionUtils.isNotEmpty((Collection)errArray)) {
                        reason = ((JSONObject)errArray.get(0)).getString("desc");
                    }
                    this.saveLogSuspend(String.format("@{wind.bp.robotOperate}, orderId=%s, @{wind.bp.reason}=%s", resObj.getString("id"), reason));
                    if (times == 1 || times % 500 == 0) {
                        this.blockRecord.setStatus(Integer.valueOf(TaskBlockStatusEnum.suspend.getStatus()));
                        this.blockRecord.setEndedReason(TaskBlockStatusEnum.suspend.getDesc() + ":blockState=" + this.state);
                        super.getWindService().saveBlockRecord(this.blockRecord);
                        ((TaskRecord)this.taskRecord).setEndedReason("[CAgvMonitorOperationBp]@{wind.bp.robotOperate}");
                        RecordUpdaterFactory.getUpdater((BaseRecord)this.taskRecord).updateRecord(this.taskRecord);
                    }
                    Map params = (Map)((ConcurrentHashMap)AbstratRootBp.inputParamsMap.get()).get(ParamPreField.taskInputs);
                    params.put("targetSiteLabel", this.targetSiteLabel);
                    ((ConcurrentHashMap)AbstratRootBp.inputParamsMap.get()).put(ParamPreField.taskInputs, params);
                    if (this.noticeFailed.contains(this.targetSiteLabel)) continue;
                    this.notice(AgvActionStatusEnum.FAILED.getStatus(), (TaskRecord)this.taskRecord, this.blockRecord, this.blockVo, this.taskId);
                    this.noticeFailed.add(this.targetSiteLabel);
                    childParamMap.put("noticeFailed", this.noticeFailed);
                    Map paramMap1 = (Map)((ConcurrentHashMap)AbstratRootBp.outputParamsMap.get()).get(ParamPreField.blocks);
                    paramMap1.put(this.blockVo.getBlockName(), childParamMap);
                    ((ConcurrentHashMap)AbstratRootBp.outputParamsMap.get()).put(ParamPreField.blocks, paramMap1);
                    this.blockRecord.setOutputParams(JSONObject.toJSONString(AbstratRootBp.outputParamsMap.get()));
                    super.getWindService().saveBlockRecord(this.blockRecord);
                    continue;
                }
                if ("STOPPED".equals(stateOrder)) {
                    taskStatusObj = GlobalCacheConfig.getCache((String)(this.taskId + ((TaskRecord)this.taskRecord).getId()));
                    Boolean taskStatusStop = taskStatusObj == null || ((Integer)taskStatusObj).intValue() == TaskStatusEnum.stop.getStatus() || ((Integer)taskStatusObj).intValue() == TaskStatusEnum.manual_end.getStatus();
                    if (!taskStatusStop.booleanValue()) {
                        JSONArray errArray = resObj.getJSONArray("errors");
                        boolean hasCode60019 = false;
                        for (int i = 0; i < errArray.size(); ++i) {
                            JSONObject jsonObject = errArray.getJSONObject(i);
                            if (jsonObject == null || !((Integer)jsonObject.get((Object)"code")).equals(60019)) continue;
                            hasCode60019 = true;
                            break;
                        }
                        if (hasCode60019) {
                            log.info("will change agv or change destination");
                            ChangeDestinationReq changeDestinationReq = (ChangeDestinationReq)AgvApiService.changeDestinationReq.get(((TaskRecord)this.taskRecord).getId());
                            if (changeDestinationReq != null) {
                                throw new BpRuntimeException("@{wind.CAgvMonitorOperationBp.noSupChangeDestination}");
                            }
                            throw new BpRuntimeException("@{wind.CAgvMonitorOperationBp.noSupChangeAgv}");
                        }
                        String reason = "";
                        String errorCode = "";
                        if (CollectionUtils.isNotEmpty((Collection)errArray)) {
                            reason = ((JSONObject)errArray.get(0)).getString("desc");
                            errorCode = ((JSONObject)errArray.get(0)).getString("code");
                        }
                        this.windEvent = WindEvent.builder().type(Integer.valueOf(0)).status(String.valueOf(TaskStatusEnum.stop.getStatus())).taskId(this.taskId).taskRecord((TaskRecord)this.taskRecord).taskLabel(((TaskRecord)this.taskRecord).getDefLabel()).errorDesc(reason).errorCode(errorCode).build();
                        throw new EndErrorException(String.format("@{wind.bp.orderId}=%s, @{wind.bp.reason}=%s", resObj.getString("id"), reason));
                    }
                    throw new StopException("@{wind.bp.stopHand}");
                }
                JSONArray blocksArr = resObj.getJSONArray("blocks");
                for (int i = 0; i < blocksArr.size(); ++i) {
                    Map params;
                    JSONObject blockObj = blocksArr.getJSONObject(i);
                    String blockId = blockObj.getString("blockId");
                    if (!addBlockId.equals(blockId)) continue;
                    childParamMap.put("containerName", blockObj.getString("containerName") == null ? "" : blockObj.getString("containerName"));
                    String blockState = blockObj.getString("state");
                    if (AgvActionStatusEnum.FINISHED.getStatus().equals(blockState) || AgvActionStatusEnum.MANUAL_FINISHED.getStatus().equals(blockState)) {
                        WindTaskAGV.setAgvPathEnd((String)DateUtils.getTime(), (String)this.agvId, (TaskRecord)((TaskRecord)this.taskRecord), (boolean)false);
                        params = (Map)((ConcurrentHashMap)AbstratRootBp.inputParamsMap.get()).get(ParamPreField.taskInputs);
                        params.put("targetSiteLabel", this.targetSiteLabel);
                        ((ConcurrentHashMap)AbstratRootBp.inputParamsMap.get()).put(ParamPreField.taskInputs, params);
                        this.notice(blockState, (TaskRecord)this.taskRecord, this.blockRecord, this.blockVo, this.taskId);
                        return;
                    }
                    if (AgvActionStatusEnum.FAILED.getStatus().equals(blockState)) {
                        params = (Map)((ConcurrentHashMap)AbstratRootBp.inputParamsMap.get()).get(ParamPreField.taskInputs);
                        params.put("targetSiteLabel", this.targetSiteLabel);
                        ((ConcurrentHashMap)AbstratRootBp.inputParamsMap.get()).put(ParamPreField.taskInputs, params);
                        this.notice(blockState, (TaskRecord)this.taskRecord, this.blockRecord, this.blockVo, this.taskId);
                        this.blockRecord.setStatus(Integer.valueOf(TaskBlockStatusEnum.end_error.getStatus()));
                        this.blockRecord.setEndedReason(TaskBlockStatusEnum.end_error.getDesc() + ":blockState=" + blockState);
                        super.getWindService().saveBlockRecord(this.blockRecord);
                        continue;
                    }
                    params = (Map)((ConcurrentHashMap)AbstratRootBp.inputParamsMap.get()).get(ParamPreField.taskInputs);
                    params.put("targetSiteLabel", this.targetSiteLabel);
                    ((ConcurrentHashMap)AbstratRootBp.inputParamsMap.get()).put(ParamPreField.taskInputs, params);
                }
            }
            catch (InterruptedIOException | InterruptedException e) {
                log.error("query task block status error", (Throwable)e);
                Thread.currentThread().interrupt();
                this.checkIfInterrupt();
            }
            catch (IOException e) {
                log.error("query task block status error", (Throwable)e);
                this.saveLogSuspend("@{response.code.robotStatusSycException}");
            }
        }
    }

    protected void setBlockInputParamsValue(AbstratRootBp rootBp) throws Exception {
    }

    private void notice(String blockState, TaskRecord taskRecord, WindBlockRecord blockRecord, WindBlockVo blockVo, String taskId) {
        WindEvent event = WindEvent.builder().type(Integer.valueOf(2)).status(blockState).taskRecord(taskRecord).blockRecord(blockRecord).blockVo(blockVo).taskId(taskId).taskLabel(taskRecord.getDefLabel()).agvId(this.agvId).workSite(this.targetSiteLabel).build();
        this.eventSource.notify(event);
    }
}

