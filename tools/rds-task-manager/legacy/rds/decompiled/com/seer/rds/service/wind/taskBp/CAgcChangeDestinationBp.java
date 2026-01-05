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
 *  com.seer.rds.service.wind.RootBp
 *  com.seer.rds.service.wind.WindTaskAGV
 *  com.seer.rds.service.wind.taskBp.CAgcChangeDestinationBp
 *  com.seer.rds.service.wind.taskBp.CAgvOperationBp$Blocks
 *  com.seer.rds.util.BlockStatusUtils
 *  com.seer.rds.util.OkHttpUtil
 *  com.seer.rds.vo.WindBlockVo
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
import com.seer.rds.service.wind.RootBp;
import com.seer.rds.service.wind.WindTaskAGV;
import com.seer.rds.service.wind.taskBp.CAgvOperationBp;
import com.seer.rds.util.BlockStatusUtils;
import com.seer.rds.util.OkHttpUtil;
import com.seer.rds.vo.WindBlockVo;
import com.seer.rds.vo.wind.CAgvOperationBpField;
import com.seer.rds.vo.wind.ParamPreField;
import java.io.IOException;
import java.io.InterruptedIOException;
import java.text.SimpleDateFormat;
import java.time.Instant;
import java.util.ArrayList;
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
public class CAgcChangeDestinationBp
extends AbstractBp<TaskRecord> {
    private static final Logger log = LoggerFactory.getLogger(CAgcChangeDestinationBp.class);
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
    private Boolean ifFirstRun = true;
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
    private AgvApiService agvApiService;
    private static SimpleDateFormat format = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss");

    protected void getInputParamsAndExecute(AbstratRootBp rootBp) throws Exception {
        WorkSite workSite;
        JSONObject jsonObject2;
        JSONObject jsonObject;
        ConcurrentHashMap outputParams;
        String state = BlockStatusUtils.getBlockStatus((BaseRecord)this.taskRecord, (WindBlockVo)this.blockVo);
        this.isEndAction = rootBp.getInputParamValue(this.taskId, this.inputParams, CAgvOperationBpField.isEndAction);
        boolean isEndActionBoolean = this.isEndAction != null && Boolean.parseBoolean(this.isEndAction.toString());
        String addBlockId = "";
        String blockOrderIdPre = "";
        CAgvOperationBp.Blocks block = new CAgvOperationBp.Blocks();
        Date startOn = new Date();
        this.blockRecord.setRemark(this.blockVo.getRemark());
        ConcurrentHashMap cacheBlockIfResetMap = GlobalCacheConfig.getCacheBlockIfResetMap((String)((TaskRecord)this.taskRecord).getId());
        if (cacheBlockIfResetMap != null) {
            blockOrderIdPre = (String)cacheBlockIfResetMap.get("blockOrderId" + this.blockVo.getBlockId());
        }
        if ((outputParams = (ConcurrentHashMap)AbstratRootBp.outputParamsMap.get()) != null && (jsonObject = JSON.parseObject((Object)outputParams).getJSONObject(ParamPreField.blocks)) != null && !jsonObject.isEmpty() && (jsonObject2 = jsonObject.getJSONObject(this.blockVo.getBlockName())) != null && !jsonObject2.isEmpty()) {
            List list = this.noticeFailed = jsonObject2.getJSONArray("noticeFailed") == null ? new ArrayList() : jsonObject2.getJSONArray("noticeFailed").toJavaList(String.class);
        }
        addBlockId = "End".equals(state) || "Running".equals(state) && !"".equals(blockOrderIdPre) && blockOrderIdPre != null ? blockOrderIdPre : (StringUtils.isNotEmpty((CharSequence)this.blockRecord.getBlockId()) ? this.blockRecord.getBlockId() : UUID.randomUUID().toString());
        ConcurrentMap childParamMap = Maps.newConcurrentMap();
        log.info("CAgvOperationBp execute:taskId={},inputParams={},childDefaultArray={}", new Object[]{this.taskId, this.inputParams, this.childDefaultArray});
        this.blockRecord.setBlockId(addBlockId);
        super.getWindService().saveBlockRecord(this.blockRecord, this.blockVo.getBlockId(), this.blockVo.getBlockType(), ((TaskRecord)this.taskRecord).getProjectId(), this.taskId, ((TaskRecord)this.taskRecord).getId(), startOn);
        this.targetSiteLabel = (String)rootBp.getInputParamValue(this.taskId, this.inputParams, CAgvOperationBpField.targetSiteLabel);
        if (StringUtils.isEmpty((CharSequence)this.targetSiteLabel)) {
            log.error("[CAgvOperationBp]targetSiteLabel is empty");
            throw new EndErrorException("@{wind.bp.emptyTargetSite}");
        }
        List bySiteId = this.workSiteMapper.findBySiteId(this.targetSiteLabel);
        if (bySiteId.size() > 0 && (workSite = (WorkSite)bySiteId.get(0)).getDisabled() != null && workSite.getDisabled() == 1) {
            throw new EndErrorException(this.targetSiteLabel + " @{permission.disableWorksite} ");
        }
        this.postAction = (String)rootBp.getInputParamValue(this.taskId, this.inputParams, CAgvOperationBpField.postAction);
        HashMap postActions = Maps.newHashMap();
        String goodsId = (String)rootBp.getInputParamValue(this.taskId, this.inputParams, CAgvOperationBpField.goodsId);
        this.scriptName = (String)rootBp.getInputParamValue(this.taskId, this.inputParams, CAgvOperationBpField.scriptName);
        WindTaskAGV.getAGVScript((String)this.taskId, (String)this.scriptName, (AbstratRootBp)rootBp, (JSONObject)this.inputParams, (CAgvOperationBp.Blocks)block);
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
        String maxSpeedS = (String)rootBp.getInputParamValue(this.taskId, this.inputParams, CAgvOperationBpField.maxSpeed);
        String maxWSpeedS = (String)rootBp.getInputParamValue(this.taskId, this.inputParams, CAgvOperationBpField.maxWSpeed);
        String maxAccS = (String)rootBp.getInputParamValue(this.taskId, this.inputParams, CAgvOperationBpField.maxAcc);
        String maxWAccS = (String)rootBp.getInputParamValue(this.taskId, this.inputParams, CAgvOperationBpField.maxWAcc);
        String spinS = (String)rootBp.getInputParamValue(this.taskId, this.inputParams, CAgvOperationBpField.spin);
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
        blocks.add(block);
        HashMap paramMap = Maps.newHashMap();
        String distributeBpFrom = RootBp.distributeOrderCache.get(this.taskId + ((TaskRecord)this.taskRecord).getId()) != null ? (String)((InheritableThreadLocal)RootBp.distributeOrderCache.get(this.taskId + ((TaskRecord)this.taskRecord).getId())).get() : "";
        Object orderId = this.ifFirstRun != false ? UUID.randomUUID().toString() : (String)((TaskRecord)this.taskRecord).getOrderId().get();
        if (StringUtils.equals((CharSequence)distributeBpFrom, (CharSequence)orderId)) {
            orderId = "fromOrder" + distributeBpFrom;
        }
        log.info("CAgvOperationBp orderId\uff1a" + (String)orderId);
        paramMap.put("id", orderId);
        paramMap.put("priority", 1000);
        paramMap.put("vehicle", ((TaskRecord)this.taskRecord).getAgvId());
        paramMap.put("blocks", blocks);
        paramMap.put("externalId", ((TaskRecord)this.taskRecord).getId());
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
        this.blockRecord.setBlockInputParamsValue(addBlockParam);
        super.getWindService().saveBlockRecord(this.blockRecord, this.blockVo.getBlockId(), this.blockVo.getBlockType(), ((TaskRecord)this.taskRecord).getProjectId(), this.taskId, ((TaskRecord)this.taskRecord).getId(), startOn);
        this.sendBlock((String)orderId, addBlockParam, addBlockId);
        this.agvApiService.terminateAndCanTakeOrders((String)((TaskRecord)this.taskRecord).getOrderId().get());
        InheritableThreadLocal<Object> order = new InheritableThreadLocal<Object>();
        order.set(orderId);
        ((TaskRecord)this.taskRecord).setOrderId(order);
        GlobalCacheConfig.cache((String)(((TaskRecord)this.taskRecord).getId() + "Order"), (Object)orderId);
        RecordUpdaterFactory.getUpdater((BaseRecord)this.taskRecord).updateRecord(this.taskRecord);
        ArrayList specificAGVPathArray = new ArrayList();
        HashMap onceOperationPath = new HashMap();
        JSONObject allVehiclePath = new JSONObject();
        this.saveAgvPath((String)orderId, addBlockId, specificAGVPathArray, onceOperationPath, allVehiclePath);
        String str = "@{wind.bp.cAgvnoneOperation}";
        if (StringUtils.isNotEmpty((CharSequence)block.getOperation()) && StringUtils.isEmpty((CharSequence)block.getScriptName())) {
            str = String.format("@{wind.bp.cAgvOperation}=%s,@{wind.bp.cAgvparams}=%s", block.getOperation(), block.getOperationArgs() == null ? "" : JSONObject.toJSONString((Object)block.getOperationArgs()));
        } else if (StringUtils.isNotEmpty((CharSequence)block.getScriptName())) {
            str = String.format("@{wind.bp.cAgvScript}=%s,@{wind.bp.cAgvparams}=%s", block.getScriptName(), block.getScriptArgs() == null ? "" : JSONObject.toJSONString((Object)block.getScriptArgs()));
        } else if (StringUtils.isNotEmpty((CharSequence)block.getPreBinTask())) {
            str = String.format("preBinTask=%s", block.getPreBinTask() == null ? "" : block.getPreBinTask());
        } else if (StringUtils.isNotEmpty((CharSequence)block.getBinTask())) {
            str = String.format("binTask=%s", block.getBinTask() == null ? "" : block.getBinTask());
        }
        this.saveLogInfo(String.format("@{wind.bp.orderId}=%s,@{wind.bp.blockId}=%s, @{agv.export.uuid}=%s, @{wind.bp.working}=%s, %s", orderId, addBlockId, this.agvId, this.targetSiteLabel, str));
        if (this.monitorBlock((String)orderId, rootBp, addBlockId, specificAGVPathArray, onceOperationPath, allVehiclePath)) {
            return;
        }
        Map out = (Map)((ConcurrentHashMap)AbstratRootBp.outputParamsMap.get()).get(ParamPreField.blocks);
        out.put(this.blockVo.getBlockName(), childParamMap);
        ((ConcurrentHashMap)AbstratRootBp.outputParamsMap.get()).put(ParamPreField.blocks, out);
    }

    private void stopBlock(String orderId) {
        this.agvApiService.terminateAndCanTakeOrders(orderId);
    }

    /*
     * WARNING - Removed try catching itself - possible behaviour change.
     */
    private boolean monitorBlock(String orderId, AbstratRootBp rootBp, String addBlockId, List<Map> specificAGVPathArray, Map<String, String> onceOperationPath, JSONObject allVehiclePath) throws InterruptedException {
        int times = 0;
        boolean taskStatus = true;
        ConcurrentMap childParamMap = Maps.newConcurrentMap();
        boolean returnFlag = false;
        while (taskStatus) {
            this.checkIfInterrupt();
            ++times;
            Object taskStatusObj = GlobalCacheConfig.getCache((String)(this.taskId + ((TaskRecord)this.taskRecord).getId()));
            taskStatus = taskStatusObj == null || ((Integer)taskStatusObj).intValue() == TaskStatusEnum.running.getStatus();
            try {
                Thread.sleep(500L);
                String res = queryOrderListSchedule.queryOrder((String)orderId, (Instant)Instant.now());
                String uuid = queryOrderListSchedule.queryUUID();
                if (res == null) {
                    Map response = OkHttpUtil.getAllResponse((String)(AbstratRootBp.getUrl((String)ApiEnum.orderDetails.getUri()) + "/" + orderId));
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
                        Integer code = null;
                        if (CollectionUtils.isNotEmpty((Collection)errArray)) {
                            JSONObject jsonObject = errArray.getJSONObject(0);
                            Integer n = code = jsonObject == null ? null : (Integer)jsonObject.get((Object)"code");
                        }
                        if (code != null && code.equals(60019)) {
                            this.changeCAgv(rootBp, specificAGVPathArray, onceOperationPath, allVehiclePath);
                            returnFlag = true;
                            return returnFlag;
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
                            Date dataEnd = new Date();
                            specificAGVPathArray.remove(specificAGVPathArray.size() - 1);
                            onceOperationPath.put("endTime", format.format(dataEnd));
                            specificAGVPathArray.add(onceOperationPath);
                            allVehiclePath.put(this.agvId, specificAGVPathArray);
                            TaskRecord taskRecord = (TaskRecord)this.taskRecord;
                            synchronized (taskRecord) {
                                ((TaskRecord)this.taskRecord).setPath(RootBp.updatePathByAgvId((String)((TaskRecord)this.taskRecord).getPath(), (String)this.agvId, specificAGVPathArray));
                            }
                            super.getWindService().updateTaskRecordPath((TaskRecord)this.taskRecord, this.agvId, specificAGVPathArray);
                        }
                        params = (Map)((ConcurrentHashMap)AbstratRootBp.inputParamsMap.get()).get(ParamPreField.taskInputs);
                        params.put("targetSiteLabel", this.targetSiteLabel);
                        ((ConcurrentHashMap)AbstratRootBp.inputParamsMap.get()).put(ParamPreField.taskInputs, params);
                        this.notice(blockState, (TaskRecord)this.taskRecord, this.blockRecord, this.blockVo, this.taskId);
                        return returnFlag;
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
                Thread.currentThread().interrupt();
                this.checkIfInterrupt();
            }
            catch (IOException e) {
                log.error("query task block status error", (Throwable)e);
                this.saveLogSuspend("@{response.code.robotStatusSycException}");
            }
        }
        return returnFlag;
    }

    /*
     * WARNING - Removed try catching itself - possible behaviour change.
     */
    private void changeCAgv(AbstratRootBp rootBp, List<Map> specificAGVPathArray, Map<String, String> onceOperationPath, JSONObject allVehiclePath) {
        String newOrderId = null;
        while (newOrderId == null) {
            boolean taskStatusStop;
            Object taskStatusObj = GlobalCacheConfig.getCache((String)(this.taskId + ((TaskRecord)this.taskRecord).getId()));
            boolean bl = taskStatusStop = taskStatusObj == null || ((Integer)taskStatusObj).intValue() == TaskStatusEnum.stop.getStatus();
            if (taskStatusStop) {
                RootBp.windTaskRecordMap.put(((TaskRecord)this.taskRecord).getId(), this.taskRecord);
                throw new StopException("@{wind.bp.stopHand}");
            }
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
            if (this.ifAddPath) {
                Date changeAGVTime = new Date();
                specificAGVPathArray.get(specificAGVPathArray.size() - 1).put("changeAGVTime", format.format(changeAGVTime));
                allVehiclePath.put(this.agvId, specificAGVPathArray);
                TaskRecord taskRecord = (TaskRecord)this.taskRecord;
                synchronized (taskRecord) {
                    ((TaskRecord)this.taskRecord).setPath(RootBp.updatePathByAgvId((String)((TaskRecord)this.taskRecord).getPath(), (String)this.agvId, specificAGVPathArray));
                }
                super.getWindService().updateTaskRecordPath((TaskRecord)this.taskRecord, this.agvId, specificAGVPathArray);
            }
            this.execute(rootBp, this.taskId, (BaseRecord)((TaskRecord)this.taskRecord), this.blockVo, this.inputParams, this.childDefaultArray);
        }
    }

    private void saveAgvPath(String orderId, String addBlockId, List<Map> specificAGVPathArray, Map<String, String> onceOperationPath, JSONObject allVehiclePath) throws IOException {
        String vehicle;
        Date dataStart = new Date();
        String res1 = "";
        while (StringUtils.isEmpty((CharSequence)res1)) {
            res1 = queryOrderListSchedule.queryOrder((String)orderId, (Instant)Instant.now());
            if (res1 == null) {
                res1 = OkHttpUtil.get((String)(RootBp.getUrl((String)ApiEnum.orderDetails.getUri()) + "/" + orderId));
            }
            try {
                Thread.sleep(2000L);
            }
            catch (InterruptedException e) {
                log.error("interrupt", (Throwable)e);
            }
        }
        JSONObject resObj1 = JSONObject.parseObject((String)res1);
        this.agvId = vehicle = resObj1.getString("vehicle");
        String path = ((TaskRecord)this.taskRecord).getPath();
        if (StringUtils.isEmpty((CharSequence)path)) {
            this.saveNewAGVOperationPath((TaskRecord)this.taskRecord, dataStart, format, vehicle, specificAGVPathArray, onceOperationPath, allVehiclePath);
        } else {
            allVehiclePath.clear();
            allVehiclePath.putAll((Map)JSON.parseObject((String)((TaskRecord)this.taskRecord).getPath()));
            if (allVehiclePath.getJSONArray(vehicle) != null) {
                specificAGVPathArray.clear();
                specificAGVPathArray.addAll(allVehiclePath.getJSONArray(vehicle).toJavaList(Map.class));
            }
            this.saveNewAGVOperationPath((TaskRecord)this.taskRecord, dataStart, format, vehicle, specificAGVPathArray, onceOperationPath, allVehiclePath);
        }
        super.getWindService().updateTaskRecordPath((TaskRecord)this.taskRecord, this.agvId, specificAGVPathArray);
    }

    /*
     * WARNING - Removed try catching itself - possible behaviour change.
     */
    private void saveNewAGVOperationPath(TaskRecord taskRecord, Date dataStart, SimpleDateFormat format, String vehicle, List<Map> specificAGVPathArray, Map<String, String> onceOperationPath, JSONObject allVehiclePath) {
        Integer number = (Integer)RootBp.pathCache.get(taskRecord.getId());
        if (number == null || number < 20) {
            number = number == null ? Integer.valueOf(1) : Integer.valueOf(number + 1);
            RootBp.pathCache.put(taskRecord.getId(), number);
            onceOperationPath.put("StartTime", format.format(dataStart));
            onceOperationPath.put("load", this.scriptName);
            onceOperationPath.put("location", this.targetSiteLabel);
            specificAGVPathArray.add(onceOperationPath);
            allVehiclePath.put(vehicle, specificAGVPathArray);
            TaskRecord taskRecord2 = taskRecord;
            synchronized (taskRecord2) {
                taskRecord.setPath(RootBp.updatePathByAgvId((String)taskRecord.getPath(), (String)this.agvId, specificAGVPathArray));
            }
            this.ifAddPath = true;
        } else {
            this.ifAddPath = false;
        }
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

    public Boolean getIfFirstRun() {
        return this.ifFirstRun;
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

    public AgvApiService getAgvApiService() {
        return this.agvApiService;
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

    public void setIfFirstRun(Boolean ifFirstRun) {
        this.ifFirstRun = ifFirstRun;
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

    public void setAgvApiService(AgvApiService agvApiService) {
        this.agvApiService = agvApiService;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof CAgcChangeDestinationBp)) {
            return false;
        }
        CAgcChangeDestinationBp other = (CAgcChangeDestinationBp)o;
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
        Boolean this$ifFirstRun = this.getIfFirstRun();
        Boolean other$ifFirstRun = other.getIfFirstRun();
        if (this$ifFirstRun == null ? other$ifFirstRun != null : !((Object)this$ifFirstRun).equals(other$ifFirstRun)) {
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
        AgvApiService this$agvApiService = this.getAgvApiService();
        AgvApiService other$agvApiService = other.getAgvApiService();
        return !(this$agvApiService == null ? other$agvApiService != null : !this$agvApiService.equals(other$agvApiService));
    }

    protected boolean canEqual(Object other) {
        return other instanceof CAgcChangeDestinationBp;
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
        Boolean $ifFirstRun = this.getIfFirstRun();
        result = result * 59 + ($ifFirstRun == null ? 43 : ((Object)$ifFirstRun).hashCode());
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
        AgvApiService $agvApiService = this.getAgvApiService();
        result = result * 59 + ($agvApiService == null ? 43 : $agvApiService.hashCode());
        return result;
    }

    public String toString() {
        return "CAgcChangeDestinationBp(agvId=" + this.getAgvId() + ", targetSiteLabel=" + this.getTargetSiteLabel() + ", scriptName=" + this.getScriptName() + ", postAction=" + this.getPostAction() + ", isEndAction=" + this.getIsEndAction() + ", maxSpeed=" + this.getMaxSpeed() + ", maxWSpeed=" + this.getMaxWSpeed() + ", maxAcc=" + this.getMaxAcc() + ", maxWAcc=" + this.getMaxWAcc() + ", spin=" + this.getSpin() + ", ifFirstRun=" + this.getIfFirstRun() + ", noticeFailed=" + this.getNoticeFailed() + ", ifAddPath=" + this.isIfAddPath() + ", workSiteMapper=" + this.getWorkSiteMapper() + ", windBlockRecordMapper=" + this.getWindBlockRecordMapper() + ", windTaskRecordMapper=" + this.getWindTaskRecordMapper() + ", eventSource=" + this.getEventSource() + ", agvApiService=" + this.getAgvApiService() + ")";
    }
}

