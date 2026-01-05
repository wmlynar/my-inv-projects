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
 *  com.seer.rds.dao.WindBlockRecordMapper
 *  com.seer.rds.dao.WindTaskRecordMapper
 *  com.seer.rds.dao.WorkSiteMapper
 *  com.seer.rds.exception.EndErrorException
 *  com.seer.rds.exception.ManualEndException
 *  com.seer.rds.exception.StopException
 *  com.seer.rds.listener.EventSource
 *  com.seer.rds.listener.WindEvent
 *  com.seer.rds.model.wind.BaseRecord
 *  com.seer.rds.model.wind.TaskRecord
 *  com.seer.rds.model.wind.WindBlockRecord
 *  com.seer.rds.model.wind.WindTaskRecord
 *  com.seer.rds.model.worksite.WorkSite
 *  com.seer.rds.schedule.queryOrderListSchedule
 *  com.seer.rds.service.agv.AgvApiService
 *  com.seer.rds.service.factory.RecordUpdaterFactory
 *  com.seer.rds.service.wind.AbstractBp
 *  com.seer.rds.service.wind.AbstratRootBp
 *  com.seer.rds.service.wind.ErrorHandleService
 *  com.seer.rds.service.wind.RootBp
 *  com.seer.rds.service.wind.WindTaskAGV
 *  com.seer.rds.service.wind.taskBp.CAgvOperationBp
 *  com.seer.rds.service.wind.taskBp.CAgvOperationBp$Blocks
 *  com.seer.rds.util.BlockStatusUtils
 *  com.seer.rds.util.OkHttpUtil
 *  com.seer.rds.util.server.DateUtils
 *  com.seer.rds.vo.WindBlockVo
 *  com.seer.rds.vo.req.ChangeDestinationReq
 *  com.seer.rds.vo.wind.CAgvOperationBpField
 *  com.seer.rds.vo.wind.ParamPreField
 *  org.apache.commons.collections.CollectionUtils
 *  org.apache.commons.compress.utils.Lists
 *  org.apache.commons.lang3.StringUtils
 *  org.slf4j.Logger
 *  org.slf4j.LoggerFactory
 *  org.springframework.beans.factory.annotation.Autowired
 *  org.springframework.context.annotation.Scope
 *  org.springframework.stereotype.Component
 *  unitauto.JSON
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
import com.seer.rds.dao.WindBlockRecordMapper;
import com.seer.rds.dao.WindTaskRecordMapper;
import com.seer.rds.dao.WorkSiteMapper;
import com.seer.rds.exception.EndErrorException;
import com.seer.rds.exception.ManualEndException;
import com.seer.rds.exception.StopException;
import com.seer.rds.listener.EventSource;
import com.seer.rds.listener.WindEvent;
import com.seer.rds.model.wind.BaseRecord;
import com.seer.rds.model.wind.TaskRecord;
import com.seer.rds.model.wind.WindBlockRecord;
import com.seer.rds.model.wind.WindTaskRecord;
import com.seer.rds.model.worksite.WorkSite;
import com.seer.rds.schedule.queryOrderListSchedule;
import com.seer.rds.service.agv.AgvApiService;
import com.seer.rds.service.factory.RecordUpdaterFactory;
import com.seer.rds.service.wind.AbstractBp;
import com.seer.rds.service.wind.AbstratRootBp;
import com.seer.rds.service.wind.ErrorHandleService;
import com.seer.rds.service.wind.RootBp;
import com.seer.rds.service.wind.WindTaskAGV;
import com.seer.rds.service.wind.taskBp.CAgvOperationBp;
import com.seer.rds.util.BlockStatusUtils;
import com.seer.rds.util.OkHttpUtil;
import com.seer.rds.util.server.DateUtils;
import com.seer.rds.vo.WindBlockVo;
import com.seer.rds.vo.req.ChangeDestinationReq;
import com.seer.rds.vo.wind.CAgvOperationBpField;
import com.seer.rds.vo.wind.ParamPreField;
import java.io.IOException;
import java.io.InterruptedIOException;
import java.text.SimpleDateFormat;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collection;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import org.apache.commons.collections.CollectionUtils;
import org.apache.commons.compress.utils.Lists;
import org.apache.commons.lang3.StringUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Scope;
import org.springframework.stereotype.Component;
import unitauto.JSON;

@Component
@Scope(value="prototype")
public class CAgvOperationBp
extends AbstractBp<TaskRecord> {
    private static final Logger log = LoggerFactory.getLogger(CAgvOperationBp.class);
    private String agvId;
    private String targetSiteLabel;
    private String scriptName;
    private String postAction;
    private Object isEndAction;
    private Double maxSpeed;
    private Double maxWSpeed;
    private Double maxAcc;
    private Double maxWAcc;
    private Boolean spin;
    private List<String> noticeFailed = new ArrayList();
    private boolean ifAddPath = true;
    @Autowired
    private WorkSiteMapper workSiteMapper;
    @Autowired
    private WindBlockRecordMapper windBlockRecordMapper;
    @Autowired
    private WindTaskRecordMapper windTaskRecordMapper;
    @Autowired
    private EventSource eventSource;
    @Autowired
    private ErrorHandleService errorHandleService;
    private static SimpleDateFormat format = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss");

    protected void getInputParamsAndExecute(AbstratRootBp rootBp) throws Exception {
        WorkSite workSite;
        JSONObject jsonObject2;
        JSONObject jsonObject;
        ConcurrentHashMap outputParams;
        Object adjustInfo;
        String spinS;
        String maxWAccS;
        String maxAccS;
        String maxWSpeedS;
        String maxSpeedS;
        String goodsId;
        String state = BlockStatusUtils.getBlockStatus((BaseRecord)this.taskRecord, (WindBlockVo)this.blockVo);
        HashMap paramMap = Maps.newHashMap();
        ChangeDestinationReq changeDestinationReq = (ChangeDestinationReq)AgvApiService.changeDestinationReq.get(((TaskRecord)this.taskRecord).getId());
        if (changeDestinationReq != null && changeDestinationReq.getOrderId() != null) {
            this.isEndAction = changeDestinationReq.getIsEndAction();
            this.targetSiteLabel = changeDestinationReq.getTargetSiteLabel();
            this.postAction = changeDestinationReq.getPostAction();
            goodsId = changeDestinationReq.getGoodsId();
            this.scriptName = changeDestinationReq.getScriptName();
            maxSpeedS = changeDestinationReq.getMaxSpeed();
            maxWSpeedS = changeDestinationReq.getMaxWSpeed();
            maxAccS = changeDestinationReq.getMaxAcc();
            maxWAccS = changeDestinationReq.getMaxWAcc();
            spinS = changeDestinationReq.getSpin();
            adjustInfo = changeDestinationReq.getAdjustInfo();
        } else {
            this.isEndAction = rootBp.getInputParamValue(this.taskId, this.inputParams, CAgvOperationBpField.isEndAction);
            this.targetSiteLabel = (String)rootBp.getInputParamValue(this.taskId, this.inputParams, CAgvOperationBpField.targetSiteLabel);
            this.postAction = (String)rootBp.getInputParamValue(this.taskId, this.inputParams, CAgvOperationBpField.postAction);
            goodsId = (String)rootBp.getInputParamValue(this.taskId, this.inputParams, CAgvOperationBpField.goodsId);
            this.scriptName = (String)rootBp.getInputParamValue(this.taskId, this.inputParams, CAgvOperationBpField.scriptName);
            maxSpeedS = (String)rootBp.getInputParamValue(this.taskId, this.inputParams, CAgvOperationBpField.maxSpeed);
            maxWSpeedS = (String)rootBp.getInputParamValue(this.taskId, this.inputParams, CAgvOperationBpField.maxWSpeed);
            maxAccS = (String)rootBp.getInputParamValue(this.taskId, this.inputParams, CAgvOperationBpField.maxAcc);
            maxWAccS = (String)rootBp.getInputParamValue(this.taskId, this.inputParams, CAgvOperationBpField.maxWAcc);
            spinS = (String)rootBp.getInputParamValue(this.taskId, this.inputParams, CAgvOperationBpField.spin);
            adjustInfo = this.blockInputParamsValue.get(CAgvOperationBpField.adjustInfo);
        }
        boolean isEndActionBoolean = this.isEndAction != null && Boolean.parseBoolean(this.isEndAction.toString());
        String addBlockId = "";
        String blockOrderIdPre = "";
        Blocks block = new Blocks();
        Date startOn = new Date();
        this.blockRecord.setRemark(this.blockVo.getRemark());
        ConcurrentHashMap cacheBlockIfResetMap = GlobalCacheConfig.getCacheBlockIfResetMap((String)((TaskRecord)this.taskRecord).getId());
        if (cacheBlockIfResetMap != null) {
            blockOrderIdPre = (String)cacheBlockIfResetMap.get("blockOrderId" + this.blockVo.getBlockId());
        }
        if ((outputParams = (ConcurrentHashMap)AbstratRootBp.outputParamsMap.get()) != null && (jsonObject = JSON.parseObject((Object)outputParams).getJSONObject(ParamPreField.blocks)) != null && !jsonObject.isEmpty() && (jsonObject2 = jsonObject.getJSONObject(this.blockVo.getBlockName())) != null && !jsonObject2.isEmpty()) {
            List list = this.noticeFailed = jsonObject2.getJSONArray("noticeFailed") == null ? new ArrayList() : jsonObject2.getJSONArray("noticeFailed").toJavaList(String.class);
        }
        if (changeDestinationReq == null) {
            addBlockId = "End".equals(state) || "Running".equals(state) && !"".equals(blockOrderIdPre) && blockOrderIdPre != null ? blockOrderIdPre : (StringUtils.isNotEmpty((CharSequence)this.blockRecord.getBlockId()) ? this.blockRecord.getBlockId() : UUID.randomUUID().toString());
        } else {
            paramMap.put("priority", 1000);
            paramMap.put("vehicle", ((TaskRecord)this.taskRecord).getAgvId());
            paramMap.put("externalId", ((TaskRecord)this.taskRecord).getId());
            addBlockId = UUID.randomUUID().toString();
        }
        ConcurrentMap childParamMap = Maps.newConcurrentMap();
        log.info("CAgvOperationBp execute:taskId={},inputParams={},childDefaultArray={}", new Object[]{this.taskId, this.inputParams, this.childDefaultArray});
        this.blockRecord.setBlockId(addBlockId);
        super.getWindService().saveBlockRecord(this.blockRecord, this.blockVo.getBlockId(), this.blockVo.getBlockType(), ((TaskRecord)this.taskRecord).getProjectId(), this.taskId, ((TaskRecord)this.taskRecord).getId(), startOn);
        if (StringUtils.isEmpty((CharSequence)this.targetSiteLabel)) {
            log.error("[CAgvOperationBp]targetSiteLabel is empty");
            throw new EndErrorException("@{wind.bp.emptyTargetSite}");
        }
        List bySiteId = this.workSiteMapper.findBySiteId(this.targetSiteLabel);
        if (bySiteId.size() > 0 && (workSite = (WorkSite)bySiteId.get(0)).getDisabled() != null && workSite.getDisabled() == 1) {
            throw new EndErrorException(this.targetSiteLabel + " @{permission.disableWorksite} ");
        }
        HashMap postActions = Maps.newHashMap();
        WindTaskAGV.getAGVScript((String)this.taskId, (String)this.scriptName, (AbstratRootBp)rootBp, (JSONObject)this.inputParams, (Blocks)block);
        block.setBlockId(addBlockId);
        block.setLocation(this.targetSiteLabel);
        ArrayList blocks = Lists.newArrayList();
        if (StringUtils.isNotEmpty((CharSequence)this.postAction)) {
            postActions.put("configId", this.postAction);
            block.setPostAction((Map)postActions);
        }
        if (StringUtils.isNotEmpty((CharSequence)goodsId)) {
            block.setGoodsId(goodsId);
        }
        HashMap robotMotionProfile = Maps.newHashMap();
        if (StringUtils.isNotEmpty((CharSequence)maxSpeedS)) {
            robotMotionProfile.put("max_speed", Double.valueOf(maxSpeedS));
        }
        if (StringUtils.isNotEmpty((CharSequence)maxWSpeedS)) {
            robotMotionProfile.put("max_wspeed", Double.valueOf(maxWSpeedS));
        }
        if (StringUtils.isNotEmpty((CharSequence)maxAccS)) {
            robotMotionProfile.put("max_acc", Double.valueOf(maxAccS));
        }
        if (StringUtils.isNotEmpty((CharSequence)maxWAccS)) {
            robotMotionProfile.put("max_wacc", Double.valueOf(maxWAccS));
        }
        if (StringUtils.isNotEmpty((CharSequence)spinS)) {
            robotMotionProfile.put("spin", Boolean.valueOf(spinS));
        }
        if (robotMotionProfile.size() != 0) {
            block.setRobotMotionProfile((Map)robotMotionProfile);
        }
        if (adjustInfo != null) {
            block.setAdjustInfo((List)JSONArray.parseArray((String)JSON.toJSONString((Object)adjustInfo)));
        }
        blocks.add(block);
        String distributeBpFrom = RootBp.distributeOrderCache.get(this.taskId + ((TaskRecord)this.taskRecord).getId()) != null ? (String)((InheritableThreadLocal)RootBp.distributeOrderCache.get(this.taskId + ((TaskRecord)this.taskRecord).getId())).get() : "";
        Object orderId = (String)((TaskRecord)this.taskRecord).getOrderId().get();
        if (StringUtils.equals((CharSequence)distributeBpFrom, (CharSequence)orderId)) {
            orderId = "fromOrder" + distributeBpFrom;
        }
        log.info("CAgvOperationBp orderId\uff1a" + (String)orderId);
        paramMap.put("id", orderId);
        paramMap.put("blocks", blocks);
        if (isEndActionBoolean) {
            log.info("isEndAction: {} , complete task when add block , orderId : {}", this.isEndAction, orderId);
            paramMap.put("complete", true);
        }
        String addBlockParam = JSONObject.toJSONString((Object)paramMap);
        this.blockRecord.setOutputParams(JSONObject.toJSONString(AbstratRootBp.outputParamsMap.get()));
        this.blockRecord.setInputParams(JSONObject.toJSONString(AbstratRootBp.inputParamsMap.get()));
        this.blockRecord.setInternalVariables(JSONObject.toJSONString(AbstratRootBp.taskVariablesMap.get()));
        this.blockRecord.setBlockInputParams(this.inputParams.toJSONString());
        this.blockRecord.setBlockId(addBlockId);
        this.blockRecord.setOrderId((String)orderId);
        super.getWindService().saveBlockRecord(this.blockRecord, this.blockVo.getBlockId(), this.blockVo.getBlockType(), ((TaskRecord)this.taskRecord).getProjectId(), this.taskId, ((TaskRecord)this.taskRecord).getId(), startOn);
        this.sendBlock((String)orderId, addBlockParam, addBlockId);
        this.agvApiService.dispatchable("dispatchable", Arrays.asList(((TaskRecord)this.taskRecord).getAgvId()));
        this.saveAgvPath((String)orderId);
        this.saveLogInfo(String.format("@{wind.bp.blockId}=%s, @{agv.export.uuid}=%s, @{wind.bp.working}=%s, %s", addBlockId, this.agvId, this.targetSiteLabel, WindTaskAGV.operationLog((Blocks)block)));
        this.monitorBlock((String)orderId, rootBp, addBlockId, (Map)childParamMap);
        Map out = (Map)((ConcurrentHashMap)AbstratRootBp.outputParamsMap.get()).get(ParamPreField.blocks);
        out.put(this.blockVo.getBlockName(), childParamMap);
        ((ConcurrentHashMap)AbstratRootBp.outputParamsMap.get()).put(ParamPreField.blocks, out);
    }

    private void monitorBlock(String orderId, AbstratRootBp rootBp, String addBlockId, Map<String, Object> childParamMap) throws InterruptedException, InterruptedIOException {
        int times = 0;
        boolean taskStatus = true;
        boolean returnFlag = false;
        childParamMap.put("containerName", "");
        while (taskStatus) {
            this.checkIfInterrupt();
            ++times;
            Object taskStatusObj = GlobalCacheConfig.getCache((String)(this.taskId + ((TaskRecord)this.taskRecord).getId()));
            boolean bl = taskStatus = taskStatusObj == null || ((Integer)taskStatusObj).intValue() == TaskStatusEnum.running.getStatus();
            if (!((Boolean)RootBp.taskStatus.get(rootBp.taskId + rootBp.taskRecord.getId())).booleanValue()) {
                throw new StopException("@{wind.bp.stopHand}");
            }
            try {
                if ("ManualEndKey".equals(GlobalCacheConfig.getCacheInterrupt((String)((TaskRecord)this.taskRecord).getId()))) {
                    this.errorHandleService.operationManualEnd(this.agvId);
                    throw new ManualEndException("manual End");
                }
                if ("RedoFailedOrder".equals(GlobalCacheConfig.getCacheInterrupt((String)((TaskRecord)this.taskRecord).getId()))) {
                    this.errorHandleService.operationRedoFailedOrder(this.agvId);
                }
                Thread.sleep(500L);
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
                this.state = resObj.getString("state");
                String newAgvId = this.checkAgvFromCore(rootBp, resObj, this.scriptName, this.targetSiteLabel);
                if (newAgvId != null) {
                    this.agvId = newAgvId;
                }
                if ("FAILED".equals(this.state)) {
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
                        ((TaskRecord)this.taskRecord).setEndedReason("[CAgvOperationBp]@{wind.bp.robotOperate}");
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
                if ("STOPPED".equals(this.state)) {
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
                                this.changeDestination(rootBp, changeDestinationReq.getOrderId());
                            } else {
                                this.changeCAgv(rootBp);
                            }
                            returnFlag = true;
                            return;
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
                        if (this.ifAddPath) {
                            WindTaskAGV.setAgvPathEnd((String)DateUtils.getTime(), (String)this.agvId, (TaskRecord)((TaskRecord)this.taskRecord), (boolean)false);
                        }
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

    private void changeDestination(AbstratRootBp rootBp, String orderId) {
        log.info("wait change changeDestination");
        List windBlockRecordByTaskRecordId = this.windBlockRecordMapper.findWindBlockRecordByTaskRecordIdOrderByEndedOnDesc(((TaskRecord)this.taskRecord).getId());
        windBlockRecordByTaskRecordId.forEach(e -> {
            if ("DistributeBp".equals(e.getBlockName()) || "CSelectAgvBp".equals(e.getBlockName()) || "CombinedOrderBp".equals(e.getBlockName())) {
                e.setOrderId(orderId);
                this.windBlockRecordMapper.saveAndFlush(e);
            }
        });
        Optional windTaskRecordById = this.windTaskRecordMapper.findById((Object)((TaskRecord)this.taskRecord).getId());
        boolean windTaskIfNull = windTaskRecordById.isPresent();
        if (windTaskIfNull) {
            InheritableThreadLocal<String> order = new InheritableThreadLocal<String>();
            order.set(orderId);
            ((TaskRecord)this.taskRecord).setOrderId(order);
            ((TaskRecord)this.taskRecord).setAgvId(((WindTaskRecord)windTaskRecordById.get()).getAgvId());
            GlobalCacheConfig.cache((String)(((TaskRecord)this.taskRecord).getId() + "Order"), (Object)orderId);
            if (this.ifAddPath) {
                WindTaskAGV.setAgvPathEnd((String)DateUtils.getTime(), (String)this.agvId, (TaskRecord)((TaskRecord)this.taskRecord), (boolean)false);
            }
            this.execute(rootBp, this.taskId, (BaseRecord)((TaskRecord)this.taskRecord), this.blockVo, this.inputParams, this.childDefaultArray);
        }
    }

    private void changeCAgv(AbstratRootBp rootBp) {
        String newOrderId = null;
        log.info("wait change agv finished");
        while (newOrderId == null) {
            boolean taskStatusStop;
            Object taskStatusObj = GlobalCacheConfig.getCache((String)(this.taskId + ((TaskRecord)this.taskRecord).getId()));
            boolean bl = taskStatusStop = taskStatusObj == null || ((Integer)taskStatusObj).intValue() == TaskStatusEnum.stop.getStatus();
            if (taskStatusStop) {
                RootBp.windTaskRecordMap.put(((TaskRecord)this.taskRecord).getId(), this.taskRecord);
                throw new StopException("@{wind.bp.stopHand}");
            }
            log.info("change agv finished,newOrderId is", newOrderId);
            newOrderId = (String)AgvApiService.changeRobotOrderId.get(((TaskRecord)this.taskRecord).getId());
            AgvApiService.changeRobotOrderId.remove(((TaskRecord)this.taskRecord).getId());
            try {
                Thread.sleep(2000L);
            }
            catch (InterruptedException e2) {
                log.error("ChangeCAgv Exception", (Throwable)e2);
            }
        }
        List windBlockRecordByTaskRecordId = this.windBlockRecordMapper.findWindBlockRecordByTaskRecordIdOrderByEndedOnDesc(((TaskRecord)this.taskRecord).getId());
        String finalNewOrderId = newOrderId;
        windBlockRecordByTaskRecordId.forEach(e -> {
            if ("DistributeBp".equals(e.getBlockName()) || "CSelectAgvBp".equals(e.getBlockName()) || "CombinedOrderBp".equals(e.getBlockName())) {
                e.setOrderId(finalNewOrderId);
                this.windBlockRecordMapper.saveAndFlush(e);
            }
        });
        Optional windTaskRecordById = this.windTaskRecordMapper.findById((Object)((TaskRecord)this.taskRecord).getId());
        boolean windTaskIfNull = windTaskRecordById.isPresent();
        if (windTaskIfNull) {
            InheritableThreadLocal<String> order = new InheritableThreadLocal<String>();
            order.set(newOrderId);
            ((TaskRecord)this.taskRecord).setOrderId(order);
            ((TaskRecord)this.taskRecord).setAgvId(((WindTaskRecord)windTaskRecordById.get()).getAgvId());
            GlobalCacheConfig.cache((String)(((TaskRecord)this.taskRecord).getId() + "Order"), (Object)newOrderId);
            if (this.ifAddPath) {
                WindTaskAGV.setAgvPathEnd((String)DateUtils.getTime(), (String)this.agvId, (TaskRecord)((TaskRecord)this.taskRecord), (boolean)true);
            }
            this.execute(rootBp, this.taskId, (BaseRecord)((TaskRecord)this.taskRecord), this.blockVo, this.inputParams, this.childDefaultArray);
        }
    }

    private void saveAgvPath(String orderId) throws IOException, InterruptedException {
        String vehicle;
        String res1 = "";
        while (StringUtils.isEmpty((CharSequence)res1)) {
            res1 = queryOrderListSchedule.queryOrder((String)orderId, (Instant)Instant.now());
            if (res1 == null) {
                res1 = OkHttpUtil.get((String)(RootBp.getUrl((String)ApiEnum.orderDetails.getUri()) + "/" + orderId));
            }
            if (res1 != null) break;
            try {
                Thread.sleep(500L);
            }
            catch (InterruptedException e) {
                log.error("interrupt", (Throwable)e);
                throw e;
            }
        }
        JSONObject resObj1 = JSONObject.parseObject((String)res1);
        this.agvId = vehicle = resObj1.getString("vehicle");
        String startTime = DateUtils.parseDateToStr((String)DateUtils.YYYY_MM_DD_HH_MM_SS, (Date)this.blockRecord.getStartedOn());
        WindTaskAGV.setAgvPath((String)startTime, (String)"", (String)this.agvId, (String)this.scriptName, (String)this.targetSiteLabel, (TaskRecord)((TaskRecord)this.taskRecord));
    }

    protected void setBlockInputParamsValue(AbstratRootBp rootBp) throws Exception {
    }

    private void notice(String blockState, TaskRecord taskRecord, WindBlockRecord blockRecord, WindBlockVo blockVo, String taskId) {
        WindEvent event = WindEvent.builder().type(Integer.valueOf(2)).status(blockState).taskRecord(taskRecord).blockRecord(blockRecord).blockVo(blockVo).taskId(taskId).taskLabel(taskRecord.getDefLabel()).agvId(this.agvId).workSite(this.targetSiteLabel).build();
        this.eventSource.notify(event);
    }

    public String getAgvId() {
        return this.agvId;
    }

    public String getTargetSiteLabel() {
        return this.targetSiteLabel;
    }

    public String getScriptName() {
        return this.scriptName;
    }

    public String getPostAction() {
        return this.postAction;
    }

    public Object getIsEndAction() {
        return this.isEndAction;
    }

    public Double getMaxSpeed() {
        return this.maxSpeed;
    }

    public Double getMaxWSpeed() {
        return this.maxWSpeed;
    }

    public Double getMaxAcc() {
        return this.maxAcc;
    }

    public Double getMaxWAcc() {
        return this.maxWAcc;
    }

    public Boolean getSpin() {
        return this.spin;
    }

    public List<String> getNoticeFailed() {
        return this.noticeFailed;
    }

    public boolean isIfAddPath() {
        return this.ifAddPath;
    }

    public WorkSiteMapper getWorkSiteMapper() {
        return this.workSiteMapper;
    }

    public WindBlockRecordMapper getWindBlockRecordMapper() {
        return this.windBlockRecordMapper;
    }

    public WindTaskRecordMapper getWindTaskRecordMapper() {
        return this.windTaskRecordMapper;
    }

    public EventSource getEventSource() {
        return this.eventSource;
    }

    public ErrorHandleService getErrorHandleService() {
        return this.errorHandleService;
    }

    public void setAgvId(String agvId) {
        this.agvId = agvId;
    }

    public void setTargetSiteLabel(String targetSiteLabel) {
        this.targetSiteLabel = targetSiteLabel;
    }

    public void setScriptName(String scriptName) {
        this.scriptName = scriptName;
    }

    public void setPostAction(String postAction) {
        this.postAction = postAction;
    }

    public void setIsEndAction(Object isEndAction) {
        this.isEndAction = isEndAction;
    }

    public void setMaxSpeed(Double maxSpeed) {
        this.maxSpeed = maxSpeed;
    }

    public void setMaxWSpeed(Double maxWSpeed) {
        this.maxWSpeed = maxWSpeed;
    }

    public void setMaxAcc(Double maxAcc) {
        this.maxAcc = maxAcc;
    }

    public void setMaxWAcc(Double maxWAcc) {
        this.maxWAcc = maxWAcc;
    }

    public void setSpin(Boolean spin) {
        this.spin = spin;
    }

    public void setNoticeFailed(List<String> noticeFailed) {
        this.noticeFailed = noticeFailed;
    }

    public void setIfAddPath(boolean ifAddPath) {
        this.ifAddPath = ifAddPath;
    }

    public void setWorkSiteMapper(WorkSiteMapper workSiteMapper) {
        this.workSiteMapper = workSiteMapper;
    }

    public void setWindBlockRecordMapper(WindBlockRecordMapper windBlockRecordMapper) {
        this.windBlockRecordMapper = windBlockRecordMapper;
    }

    public void setWindTaskRecordMapper(WindTaskRecordMapper windTaskRecordMapper) {
        this.windTaskRecordMapper = windTaskRecordMapper;
    }

    public void setEventSource(EventSource eventSource) {
        this.eventSource = eventSource;
    }

    public void setErrorHandleService(ErrorHandleService errorHandleService) {
        this.errorHandleService = errorHandleService;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof CAgvOperationBp)) {
            return false;
        }
        CAgvOperationBp other = (CAgvOperationBp)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        if (this.isIfAddPath() != other.isIfAddPath()) {
            return false;
        }
        Double this$maxSpeed = this.getMaxSpeed();
        Double other$maxSpeed = other.getMaxSpeed();
        if (this$maxSpeed == null ? other$maxSpeed != null : !((Object)this$maxSpeed).equals(other$maxSpeed)) {
            return false;
        }
        Double this$maxWSpeed = this.getMaxWSpeed();
        Double other$maxWSpeed = other.getMaxWSpeed();
        if (this$maxWSpeed == null ? other$maxWSpeed != null : !((Object)this$maxWSpeed).equals(other$maxWSpeed)) {
            return false;
        }
        Double this$maxAcc = this.getMaxAcc();
        Double other$maxAcc = other.getMaxAcc();
        if (this$maxAcc == null ? other$maxAcc != null : !((Object)this$maxAcc).equals(other$maxAcc)) {
            return false;
        }
        Double this$maxWAcc = this.getMaxWAcc();
        Double other$maxWAcc = other.getMaxWAcc();
        if (this$maxWAcc == null ? other$maxWAcc != null : !((Object)this$maxWAcc).equals(other$maxWAcc)) {
            return false;
        }
        Boolean this$spin = this.getSpin();
        Boolean other$spin = other.getSpin();
        if (this$spin == null ? other$spin != null : !((Object)this$spin).equals(other$spin)) {
            return false;
        }
        String this$agvId = this.getAgvId();
        String other$agvId = other.getAgvId();
        if (this$agvId == null ? other$agvId != null : !this$agvId.equals(other$agvId)) {
            return false;
        }
        String this$targetSiteLabel = this.getTargetSiteLabel();
        String other$targetSiteLabel = other.getTargetSiteLabel();
        if (this$targetSiteLabel == null ? other$targetSiteLabel != null : !this$targetSiteLabel.equals(other$targetSiteLabel)) {
            return false;
        }
        String this$scriptName = this.getScriptName();
        String other$scriptName = other.getScriptName();
        if (this$scriptName == null ? other$scriptName != null : !this$scriptName.equals(other$scriptName)) {
            return false;
        }
        String this$postAction = this.getPostAction();
        String other$postAction = other.getPostAction();
        if (this$postAction == null ? other$postAction != null : !this$postAction.equals(other$postAction)) {
            return false;
        }
        Object this$isEndAction = this.getIsEndAction();
        Object other$isEndAction = other.getIsEndAction();
        if (this$isEndAction == null ? other$isEndAction != null : !this$isEndAction.equals(other$isEndAction)) {
            return false;
        }
        List this$noticeFailed = this.getNoticeFailed();
        List other$noticeFailed = other.getNoticeFailed();
        if (this$noticeFailed == null ? other$noticeFailed != null : !((Object)this$noticeFailed).equals(other$noticeFailed)) {
            return false;
        }
        WorkSiteMapper this$workSiteMapper = this.getWorkSiteMapper();
        WorkSiteMapper other$workSiteMapper = other.getWorkSiteMapper();
        if (this$workSiteMapper == null ? other$workSiteMapper != null : !this$workSiteMapper.equals(other$workSiteMapper)) {
            return false;
        }
        WindBlockRecordMapper this$windBlockRecordMapper = this.getWindBlockRecordMapper();
        WindBlockRecordMapper other$windBlockRecordMapper = other.getWindBlockRecordMapper();
        if (this$windBlockRecordMapper == null ? other$windBlockRecordMapper != null : !this$windBlockRecordMapper.equals(other$windBlockRecordMapper)) {
            return false;
        }
        WindTaskRecordMapper this$windTaskRecordMapper = this.getWindTaskRecordMapper();
        WindTaskRecordMapper other$windTaskRecordMapper = other.getWindTaskRecordMapper();
        if (this$windTaskRecordMapper == null ? other$windTaskRecordMapper != null : !this$windTaskRecordMapper.equals(other$windTaskRecordMapper)) {
            return false;
        }
        EventSource this$eventSource = this.getEventSource();
        EventSource other$eventSource = other.getEventSource();
        if (this$eventSource == null ? other$eventSource != null : !this$eventSource.equals(other$eventSource)) {
            return false;
        }
        ErrorHandleService this$errorHandleService = this.getErrorHandleService();
        ErrorHandleService other$errorHandleService = other.getErrorHandleService();
        return !(this$errorHandleService == null ? other$errorHandleService != null : !this$errorHandleService.equals(other$errorHandleService));
    }

    protected boolean canEqual(Object other) {
        return other instanceof CAgvOperationBp;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        result = result * 59 + (this.isIfAddPath() ? 79 : 97);
        Double $maxSpeed = this.getMaxSpeed();
        result = result * 59 + ($maxSpeed == null ? 43 : ((Object)$maxSpeed).hashCode());
        Double $maxWSpeed = this.getMaxWSpeed();
        result = result * 59 + ($maxWSpeed == null ? 43 : ((Object)$maxWSpeed).hashCode());
        Double $maxAcc = this.getMaxAcc();
        result = result * 59 + ($maxAcc == null ? 43 : ((Object)$maxAcc).hashCode());
        Double $maxWAcc = this.getMaxWAcc();
        result = result * 59 + ($maxWAcc == null ? 43 : ((Object)$maxWAcc).hashCode());
        Boolean $spin = this.getSpin();
        result = result * 59 + ($spin == null ? 43 : ((Object)$spin).hashCode());
        String $agvId = this.getAgvId();
        result = result * 59 + ($agvId == null ? 43 : $agvId.hashCode());
        String $targetSiteLabel = this.getTargetSiteLabel();
        result = result * 59 + ($targetSiteLabel == null ? 43 : $targetSiteLabel.hashCode());
        String $scriptName = this.getScriptName();
        result = result * 59 + ($scriptName == null ? 43 : $scriptName.hashCode());
        String $postAction = this.getPostAction();
        result = result * 59 + ($postAction == null ? 43 : $postAction.hashCode());
        Object $isEndAction = this.getIsEndAction();
        result = result * 59 + ($isEndAction == null ? 43 : $isEndAction.hashCode());
        List $noticeFailed = this.getNoticeFailed();
        result = result * 59 + ($noticeFailed == null ? 43 : ((Object)$noticeFailed).hashCode());
        WorkSiteMapper $workSiteMapper = this.getWorkSiteMapper();
        result = result * 59 + ($workSiteMapper == null ? 43 : $workSiteMapper.hashCode());
        WindBlockRecordMapper $windBlockRecordMapper = this.getWindBlockRecordMapper();
        result = result * 59 + ($windBlockRecordMapper == null ? 43 : $windBlockRecordMapper.hashCode());
        WindTaskRecordMapper $windTaskRecordMapper = this.getWindTaskRecordMapper();
        result = result * 59 + ($windTaskRecordMapper == null ? 43 : $windTaskRecordMapper.hashCode());
        EventSource $eventSource = this.getEventSource();
        result = result * 59 + ($eventSource == null ? 43 : $eventSource.hashCode());
        ErrorHandleService $errorHandleService = this.getErrorHandleService();
        result = result * 59 + ($errorHandleService == null ? 43 : $errorHandleService.hashCode());
        return result;
    }

    public String toString() {
        return "CAgvOperationBp(agvId=" + this.getAgvId() + ", targetSiteLabel=" + this.getTargetSiteLabel() + ", scriptName=" + this.getScriptName() + ", postAction=" + this.getPostAction() + ", isEndAction=" + this.getIsEndAction() + ", maxSpeed=" + this.getMaxSpeed() + ", maxWSpeed=" + this.getMaxWSpeed() + ", maxAcc=" + this.getMaxAcc() + ", maxWAcc=" + this.getMaxWAcc() + ", spin=" + this.getSpin() + ", noticeFailed=" + this.getNoticeFailed() + ", ifAddPath=" + this.isIfAddPath() + ", workSiteMapper=" + this.getWorkSiteMapper() + ", windBlockRecordMapper=" + this.getWindBlockRecordMapper() + ", windTaskRecordMapper=" + this.getWindTaskRecordMapper() + ", eventSource=" + this.getEventSource() + ", errorHandleService=" + this.getErrorHandleService() + ")";
    }
}

