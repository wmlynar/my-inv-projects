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
 *  com.seer.rds.dao.WorkSiteMapper
 *  com.seer.rds.exception.EndErrorException
 *  com.seer.rds.exception.StopException
 *  com.seer.rds.listener.EventSource
 *  com.seer.rds.listener.WindEvent
 *  com.seer.rds.model.wind.BaseRecord
 *  com.seer.rds.model.wind.TaskRecord
 *  com.seer.rds.model.wind.WindBlockRecord
 *  com.seer.rds.model.worksite.WorkSite
 *  com.seer.rds.schedule.queryOrderListSchedule
 *  com.seer.rds.service.factory.RecordUpdaterFactory
 *  com.seer.rds.service.wind.AbstractBp
 *  com.seer.rds.service.wind.AbstratRootBp
 *  com.seer.rds.service.wind.RootBp
 *  com.seer.rds.service.wind.WindTaskAGV
 *  com.seer.rds.service.wind.WindTaskStatus
 *  com.seer.rds.service.wind.taskBp.CombinedOrderBp
 *  com.seer.rds.service.wind.vo.OrderInfo
 *  com.seer.rds.util.BlockStatusUtils
 *  com.seer.rds.util.OkHttpUtil
 *  com.seer.rds.util.server.DateUtils
 *  com.seer.rds.vo.WindBlockVo
 *  com.seer.rds.vo.wind.ParamPreField
 *  org.apache.commons.collections.CollectionUtils
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
import com.seer.rds.dao.WorkSiteMapper;
import com.seer.rds.exception.EndErrorException;
import com.seer.rds.exception.StopException;
import com.seer.rds.listener.EventSource;
import com.seer.rds.listener.WindEvent;
import com.seer.rds.model.wind.BaseRecord;
import com.seer.rds.model.wind.TaskRecord;
import com.seer.rds.model.wind.WindBlockRecord;
import com.seer.rds.model.worksite.WorkSite;
import com.seer.rds.schedule.queryOrderListSchedule;
import com.seer.rds.service.factory.RecordUpdaterFactory;
import com.seer.rds.service.wind.AbstractBp;
import com.seer.rds.service.wind.AbstratRootBp;
import com.seer.rds.service.wind.RootBp;
import com.seer.rds.service.wind.WindTaskAGV;
import com.seer.rds.service.wind.WindTaskStatus;
import com.seer.rds.service.wind.vo.OrderInfo;
import com.seer.rds.util.BlockStatusUtils;
import com.seer.rds.util.OkHttpUtil;
import com.seer.rds.util.server.DateUtils;
import com.seer.rds.vo.WindBlockVo;
import com.seer.rds.vo.wind.ParamPreField;
import java.io.IOException;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import org.apache.commons.collections.CollectionUtils;
import org.apache.commons.lang3.StringUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Scope;
import org.springframework.stereotype.Component;
import unitauto.JSON;

@Component(value="CombinedOrderBp")
@Scope(value="prototype")
public class CombinedOrderBp
extends AbstractBp<TaskRecord> {
    private static final Logger log = LoggerFactory.getLogger(CombinedOrderBp.class);
    private static final String ID = "id";
    private static final String FROMLOC = "fromLoc";
    private static final String TOLOC = "toLoc";
    private static final String VEHICLE = "vehicle";
    private static final String GROUP = "group";
    private static final String GOODSID = "goodsId";
    private static final String LOADPOSTACTION = "loadPostAction";
    private static final String UNLOADPOSTACTION = "unloadPostAction";
    private static final String CODE = "code";
    private static final String CONFIGID = "configId";
    private static final String MSG = "msg";
    private static final String FLAG = "flag";
    private static final String GOODSFLAG = "RDS";
    private static final String AGVID = "agvId";
    private static final String CONTAINERNAME = "containerName";
    private static final String TAG = "tag";
    private List<String> noticeFailed = new ArrayList();
    private List<String> noticeFinish = new ArrayList();
    @Autowired
    private WorkSiteMapper workSiteMapper;
    @Autowired
    private EventSource eventSource;

    protected void getInputParamsAndExecute(AbstratRootBp rootBp) throws Exception {
        WorkSite workSiteTo;
        WorkSite workSite;
        boolean blockage;
        JSONObject jsonObject2;
        JSONObject jsonObject;
        Object outputParams;
        this.blockRecord.setRemark(this.blockVo.getRemark());
        String blockState = BlockStatusUtils.getBlockStatus((BaseRecord)this.taskRecord, (WindBlockVo)this.blockVo);
        String orderId = UUID.randomUUID().toString();
        Date startOn = new Date();
        String orderIdPre = "";
        Map paramMap = (Map)((ConcurrentHashMap)AbstratRootBp.outputParamsMap.get()).get(ParamPreField.blocks);
        ConcurrentMap childParamMap = Maps.newConcurrentMap();
        ConcurrentHashMap cacheBlockIfResetMap = GlobalCacheConfig.getCacheBlockIfResetMap((String)((TaskRecord)this.taskRecord).getId());
        if (cacheBlockIfResetMap != null) {
            orderIdPre = (String)cacheBlockIfResetMap.get("orderId" + this.blockVo.getBlockId());
        }
        if ((outputParams = AbstratRootBp.outputParamsMap.get()) != null && (jsonObject = JSON.parseObject(outputParams).getJSONObject(ParamPreField.blocks)) != null && !jsonObject.isEmpty() && (jsonObject2 = jsonObject.getJSONObject(this.blockVo.getBlockName())) != null && !jsonObject2.isEmpty()) {
            this.noticeFailed = jsonObject2.getJSONArray("noticeFailed") == null ? new ArrayList() : jsonObject2.getJSONArray("noticeFailed").toJavaList(String.class);
            List list = this.noticeFinish = jsonObject2.getJSONArray("noticeFinish") == null ? new ArrayList() : jsonObject2.getJSONArray("noticeFinish").toJavaList(String.class);
        }
        orderId = blockState.equals("End") || blockState.equals("Running") && !orderIdPre.equals("") && orderIdPre != null ? orderIdPre : (StringUtils.isNotEmpty((CharSequence)this.blockRecord.getOrderId()) ? this.blockRecord.getOrderId() : UUID.randomUUID().toString());
        this.blockRecord.setOrderId(orderId);
        super.getWindService().saveBlockRecord(this.blockRecord, this.blockVo.getBlockId(), this.blockVo.getBlockType(), ((TaskRecord)this.taskRecord).getProjectId(), this.taskId, ((TaskRecord)this.taskRecord).getId(), null, startOn);
        log.info("CombinedOrderBp execute:taskDefId={},taskRecordId={},inputParams={},childDefaultArray={}", new Object[]{this.taskId, ((TaskRecord)this.taskRecord).getId(), this.inputParams, this.childDefaultArray});
        String fromLoc = (String)rootBp.getInputParamValue(this.taskId, this.inputParams, FROMLOC);
        String toLoc = (String)rootBp.getInputParamValue(this.taskId, this.inputParams, TOLOC);
        String vehicleID = (String)rootBp.getInputParamValue(this.taskId, this.inputParams, VEHICLE);
        String group = (String)rootBp.getInputParamValue(this.taskId, this.inputParams, GROUP);
        String goodsId = (String)rootBp.getInputParamValue(this.taskId, this.inputParams, GOODSID);
        String loadPostAction = (String)rootBp.getInputParamValue(this.taskId, this.inputParams, LOADPOSTACTION);
        String unloadPostAction = (String)rootBp.getInputParamValue(this.taskId, this.inputParams, UNLOADPOSTACTION);
        String tag = (String)rootBp.getInputParamValue(this.taskId, this.inputParams, TAG);
        Object filledObj = rootBp.getInputParamValue(this.taskId, this.inputParams, FLAG);
        boolean bl = blockage = filledObj != null ? Boolean.parseBoolean(filledObj.toString()) : true;
        if (StringUtils.isEmpty((CharSequence)fromLoc)) {
            throw new EndErrorException("@{wind.bp.combinedFromLoc}");
        }
        if (StringUtils.isEmpty((CharSequence)toLoc)) {
            throw new EndErrorException("@{wind.bp.combinedToLoc}");
        }
        List bySiteId = this.workSiteMapper.findBySiteId(fromLoc);
        if (bySiteId.size() > 0 && (workSite = (WorkSite)bySiteId.get(0)).getDisabled() != null && workSite.getDisabled() == 1) {
            throw new EndErrorException(fromLoc + "@{permission.disableWorksite}");
        }
        List bySiteIdTo = this.workSiteMapper.findBySiteId(toLoc);
        if (bySiteIdTo.size() > 0 && (workSiteTo = (WorkSite)bySiteIdTo.get(0)).getDisabled() != null && workSiteTo.getDisabled() == 1) {
            throw new EndErrorException(toLoc + "@{permission.disableWorksite}");
        }
        HashMap params = Maps.newHashMap();
        params.put(ID, orderId);
        params.put(FROMLOC, fromLoc);
        params.put(TOLOC, toLoc);
        if (StringUtils.isNotEmpty((CharSequence)vehicleID)) {
            params.put(VEHICLE, vehicleID);
        }
        if (StringUtils.isNotEmpty((CharSequence)group)) {
            params.put(GROUP, group);
        }
        if (StringUtils.isNotEmpty((CharSequence)goodsId)) {
            params.put(GOODSID, goodsId);
        }
        if (StringUtils.isNotEmpty((CharSequence)tag)) {
            params.put("label", tag);
        }
        if (StringUtils.isNotEmpty((CharSequence)loadPostAction)) {
            HashMap param1 = Maps.newHashMap();
            param1.put(CONFIGID, loadPostAction);
            params.put(LOADPOSTACTION, param1);
        }
        if (StringUtils.isNotEmpty((CharSequence)unloadPostAction)) {
            HashMap param2 = Maps.newHashMap();
            param2.put(CONFIGID, unloadPostAction);
            params.put(UNLOADPOSTACTION, param2);
        }
        String param = JSONObject.toJSONString((Object)params);
        log.info("CombinedOrderBp setOrder orderId={}, param={}", (Object)orderId, (Object)param);
        this.blockRecord.setOutputParams(JSONObject.toJSONString(AbstratRootBp.outputParamsMap.get()));
        this.blockRecord.setInputParams(JSONObject.toJSONString(AbstratRootBp.inputParamsMap.get()));
        this.blockRecord.setInternalVariables(JSONObject.toJSONString(AbstratRootBp.taskVariablesMap.get()));
        this.blockRecord.setBlockInputParams(this.inputParams.toJSONString());
        this.blockRecord.setOrderId(orderId);
        super.getWindService().saveBlockRecord(this.blockRecord, this.blockVo.getBlockId(), this.blockVo.getBlockType(), ((TaskRecord)this.taskRecord).getProjectId(), this.taskId, ((TaskRecord)this.taskRecord).getId(), null, startOn);
        this.saveLogInfo(String.format("@{wind.bp.combinedId}=%s, @{wind.bp.fromLoc}=%s, @{wind.bp.toLoc}=%s", orderId, fromLoc, toLoc));
        this.sendCombinedOrder(param);
        if (blockage) {
            this.monitorCombinedOrder(rootBp, (Map)childParamMap, fromLoc, toLoc, paramMap);
        }
    }

    private void monitorCombinedOrder(AbstratRootBp rootBp, Map<String, Object> childParamMap, String fromLoc, String toLoc, Map<String, Object> paramMap) throws InterruptedException {
        String orderId = this.blockRecord.getOrderId();
        int times = 0;
        boolean avgFlag = true;
        boolean taskStatus = true;
        while (true) {
            this.checkIfInterrupt();
            String res = queryOrderListSchedule.queryOrder((String)orderId, (Instant)Instant.now());
            try {
                if (res == null) {
                    res = OkHttpUtil.get((String)(RootBp.getUrl((String)ApiEnum.orderDetails.getUri()) + "/" + orderId));
                    log.info("query task block result,orderId={}, status={},from core", (Object)orderId, (Object)res);
                } else {
                    log.info("query task block result,orderId={}, status={},from cache", (Object)orderId, (Object)res);
                }
                String state = "";
                if (StringUtils.isEmpty((CharSequence)res) || "null".equals(res)) {
                    this.saveLogSuspend(String.format("@{wind.bp.robotQuery}", new Object[0]));
                    if (times == 3 || times % 500 == 0) {
                        this.blockRecord.setStatus(Integer.valueOf(TaskBlockStatusEnum.suspend.getStatus()));
                        this.blockRecord.setEndedReason(TaskBlockStatusEnum.suspend.getDesc() + ":blockRes=" + res);
                        super.getWindService().saveBlockRecord(this.blockRecord);
                    }
                } else {
                    Map paramMap1;
                    JSONObject resObj = JSONObject.parseObject((String)res);
                    state = resObj.getString("state");
                    String agvId = resObj.getString(VEHICLE);
                    HashMap target = Maps.newHashMap();
                    target.put(FROMLOC, resObj.getString(FROMLOC));
                    target.put(TOLOC, resObj.getString(TOLOC));
                    this.agvPath(resObj, agvId, fromLoc, toLoc);
                    if (avgFlag && StringUtils.isNotEmpty((CharSequence)agvId)) {
                        int firstExecutorTime = JSONObject.parseObject((String)res).getInteger("createTime");
                        this.updateTaskTimeAndAgv(rootBp, Integer.valueOf(firstExecutorTime), null, agvId);
                        if (firstExecutorTime > 0) {
                            avgFlag = false;
                        }
                    }
                    String loadState = resObj.getString("loadState");
                    String unloadState = resObj.getString("unloadState");
                    JSONArray err = resObj.getJSONArray("errors");
                    String errorMsg = "";
                    if (CollectionUtils.isNotEmpty((Collection)err)) {
                        errorMsg = ((JSONObject)err.get(0)).getString("desc");
                    }
                    if (!this.noticeFailed.contains(fromLoc) && "FAILED".equals(loadState)) {
                        this.notice(AgvActionStatusEnum.FAILED.getStatus(), (TaskRecord)this.taskRecord, this.blockRecord, this.blockVo, this.taskId, agvId, fromLoc);
                        this.noticeFailed.add(fromLoc);
                        childParamMap.put("noticeFailed", this.noticeFailed);
                        paramMap1 = (Map)((ConcurrentHashMap)AbstratRootBp.outputParamsMap.get()).get(ParamPreField.blocks);
                        paramMap1.put(this.blockVo.getBlockName(), childParamMap);
                        ((ConcurrentHashMap)AbstratRootBp.outputParamsMap.get()).put(ParamPreField.blocks, paramMap1);
                        this.blockRecord.setOutputParams(JSONObject.toJSONString(AbstratRootBp.outputParamsMap.get()));
                        super.getWindService().saveBlockRecord(this.blockRecord);
                    }
                    if (!this.noticeFailed.contains(toLoc) && "FAILED".equals(unloadState)) {
                        this.notice(AgvActionStatusEnum.FAILED.getStatus(), (TaskRecord)this.taskRecord, this.blockRecord, this.blockVo, this.taskId, agvId, toLoc);
                        this.noticeFailed.add(toLoc);
                        childParamMap.put("noticeFailed", this.noticeFailed);
                        paramMap1 = (Map)((ConcurrentHashMap)AbstratRootBp.outputParamsMap.get()).get(ParamPreField.blocks);
                        paramMap1.put(this.blockVo.getBlockName(), childParamMap);
                        ((ConcurrentHashMap)AbstratRootBp.outputParamsMap.get()).put(ParamPreField.blocks, paramMap1);
                        this.blockRecord.setOutputParams(JSONObject.toJSONString(AbstratRootBp.outputParamsMap.get()));
                        super.getWindService().saveBlockRecord(this.blockRecord);
                    }
                    if ("FAILED".equals(state)) {
                        this.saveLogSuspend(String.format("@{wind.bp.robotOperate}:\u3010@{wind.bp.fromLoc}\u3011= \u3010%s\u3011,\u3010@{wind.bp.toLoc}\u3011= \u3010%s\u3011,\u3010@{wind.bp.errorMsg}\u3011 = \u3010%s\u3011", loadState, unloadState, errorMsg));
                        this.blockRecord.setStatus(Integer.valueOf(TaskBlockStatusEnum.suspend.getStatus()));
                        this.blockRecord.setEndedReason(TaskBlockStatusEnum.suspend.getDesc() + ":blockState=" + state);
                        super.getWindService().saveBlockRecord(this.blockRecord);
                        ((TaskRecord)this.taskRecord).setEndedReason("[CombinedOrderBp] @{wind.bp.robotOperate}");
                        RecordUpdaterFactory.getUpdater((BaseRecord)this.taskRecord).updateRecord(this.taskRecord);
                    } else {
                        Integer createTime;
                        if ("STOPPED".equals(state)) {
                            createTime = resObj.getInteger("createTime");
                            Integer terminalTime = resObj.getInteger("terminalTime");
                            this.updateTaskTimeAndAgv(rootBp, null, Integer.valueOf(terminalTime - createTime), agvId);
                            Object taskStatusObj = GlobalCacheConfig.getCache((String)(this.taskId + ((TaskRecord)this.taskRecord).getId()));
                            boolean bl = taskStatus = taskStatusObj == null || ((Integer)taskStatusObj).intValue() == TaskStatusEnum.stop.getStatus();
                            if (!taskStatus) {
                                String reason = "";
                                String errorCode = "";
                                JSONObject jsonRes = JSONObject.parseObject((String)res);
                                JSONArray errArray = jsonRes.getJSONArray("errors");
                                if (CollectionUtils.isNotEmpty((Collection)errArray)) {
                                    reason = ((JSONObject)errArray.get(0)).getString("desc");
                                    errorCode = ((JSONObject)errArray.get(0)).getString(CODE);
                                }
                                this.windEvent = WindEvent.builder().type(Integer.valueOf(0)).status(String.valueOf(TaskStatusEnum.stop.getStatus())).taskId(this.taskId).taskRecord((TaskRecord)this.taskRecord).taskLabel(((TaskRecord)this.taskRecord).getDefLabel()).errorDesc(reason).errorCode(errorCode).build();
                                throw new EndErrorException(String.format("\u3010@{wind.bp.fromLoc}\u3011= \u3010%s\u3011,\u3010@{wind.bp.toLoc}\u3011= \u3010%s\u3011,\u3010@{wind.bp.errorMsg}\u3011 = \u3010%s\u3011", loadState, unloadState, errorMsg));
                            }
                            throw new StopException("@{wind.bp.stopHand}");
                        }
                        if ("CREATED".equals(state)) {
                            this.saveLogSuspend(String.format("\u3010@{wind.bp.fromLoc}\u3011= \u3010%s\u3011,\u3010@{wind.bp.toLoc}\u3011= \u3010%s\u3011", loadState, unloadState));
                            this.blockRecord.setStatus(Integer.valueOf(TaskBlockStatusEnum.running.getStatus()));
                            this.blockRecord.setEndedReason(TaskBlockStatusEnum.running.getDesc() + ":blockState=" + state);
                            super.getWindService().saveBlockRecord(this.blockRecord);
                            ((TaskRecord)this.taskRecord).setEndedReason("[CombinedOrderBp] @{wind.bp.create}");
                            RecordUpdaterFactory.getUpdater((BaseRecord)this.taskRecord).updateRecord(this.taskRecord);
                        } else if ("TOBEDISPATCHED".equals(state)) {
                            this.saveLogSuspend(String.format("\u3010@{wind.bp.fromLoc}\u3011= \u3010%s\u3011,\u3010@{wind.bp.toLoc}\u3011= \u3010%s\u3011", loadState, unloadState));
                            this.blockRecord.setStatus(Integer.valueOf(TaskBlockStatusEnum.running.getStatus()));
                            this.blockRecord.setEndedReason(TaskBlockStatusEnum.running.getDesc() + ":blockState=" + state);
                            super.getWindService().saveBlockRecord(this.blockRecord);
                            ((TaskRecord)this.taskRecord).setEndedReason("[CombinedOrderBp] @{wind.bp.dispatch}");
                            RecordUpdaterFactory.getUpdater((BaseRecord)this.taskRecord).updateRecord(this.taskRecord);
                        } else if ("RUNNING".equals(state)) {
                            this.saveLogSuspend(String.format("\u3010@{wind.bp.fromLoc}\u3011= \u3010%s\u3011,\u3010@{wind.bp.toLoc}\u3011= \u3010%s\u3011", loadState, unloadState));
                            childParamMap.put(AGVID, resObj.getString(VEHICLE));
                            childParamMap.put(CONTAINERNAME, resObj.getString(CONTAINERNAME) == null ? "" : resObj.getString(CONTAINERNAME));
                            this.blockRecord.setStatus(Integer.valueOf(TaskBlockStatusEnum.running.getStatus()));
                            this.blockRecord.setEndedReason(TaskBlockStatusEnum.running.getDesc() + ":blockState=" + state);
                            super.getWindService().saveBlockRecord(this.blockRecord);
                            ((TaskRecord)this.taskRecord).setEndedReason("[CombinedOrderBp] @{wind.bp.start}");
                            RecordUpdaterFactory.getUpdater((BaseRecord)this.taskRecord).updateRecord(this.taskRecord);
                            if (!this.noticeFinish.contains(fromLoc) && "FINISHED".equals(resObj.getString("loadState"))) {
                                this.notice(AgvActionStatusEnum.FINISHED.getStatus(), (TaskRecord)this.taskRecord, this.blockRecord, this.blockVo, this.taskId, agvId, toLoc);
                                this.noticeFinish.add(fromLoc);
                                childParamMap.put("noticeFinish", this.noticeFinish);
                                paramMap1 = (Map)((ConcurrentHashMap)AbstratRootBp.outputParamsMap.get()).get(ParamPreField.blocks);
                                paramMap1.put(this.blockVo.getBlockName(), childParamMap);
                                ((ConcurrentHashMap)AbstratRootBp.outputParamsMap.get()).put(ParamPreField.blocks, paramMap1);
                                this.blockRecord.setOutputParams(JSONObject.toJSONString(AbstratRootBp.outputParamsMap.get()));
                                super.getWindService().saveBlockRecord(this.blockRecord);
                            }
                        } else {
                            if ("FINISHED".equals(state)) {
                                this.saveLogSuspend(String.format("\u3010@{wind.bp.fromLoc}\u3011= \u3010%s\u3011,\u3010@{wind.bp.toLoc}\u3011= \u3010%s\u3011", loadState, unloadState));
                                this.notice(AgvActionStatusEnum.FINISHED.getStatus(), (TaskRecord)this.taskRecord, this.blockRecord, this.blockVo, this.taskId, agvId, toLoc);
                                createTime = JSONObject.parseObject((String)res).getInteger("createTime");
                                Integer terminalTime = JSONObject.parseObject((String)res).getInteger("terminalTime");
                                this.updateTaskTimeAndAgv(rootBp, null, Integer.valueOf(terminalTime - createTime), agvId);
                                RecordUpdaterFactory.getUpdater((BaseRecord)this.taskRecord).updateRecord(this.taskRecord);
                                break;
                            }
                            this.saveLogSuspend(String.format("@{wind.bp.combinedUnKnow}:\u3010@{wind.bp.fromLoc}\u3011= \u3010%s\u3011,\u3010@{wind.bp.toLoc}\u3011= \u3010%s\u3011,\u3010@{wind.bp.errorMsg}\u3011 = \u3010%s\u3011", loadState, unloadState, errorMsg));
                            this.blockRecord.setStatus(Integer.valueOf(TaskBlockStatusEnum.running.getStatus()));
                            this.blockRecord.setEndedReason(TaskBlockStatusEnum.running.getDesc() + ":blockState=" + state);
                            super.getWindService().saveBlockRecord(this.blockRecord);
                            ((TaskRecord)this.taskRecord).setEndedReason("[CombinedOrderBp] @{wind.bp.combinedUnKnow}");
                            RecordUpdaterFactory.getUpdater((BaseRecord)this.taskRecord).updateRecord(this.taskRecord);
                        }
                    }
                }
                WindTaskStatus.sendTaskEndErrorAndTaskStop((AbstractBp)this, (String)state);
                Thread.sleep(1500L);
                ++times;
            }
            catch (IOException e) {
                log.error("monitorCombinedOrder IOException", (Throwable)e);
            }
            catch (InterruptedException e) {
                log.error("monitorCombinedOrder InterruptedException", (Throwable)e);
            }
        }
        paramMap.put(this.blockVo.getBlockName(), childParamMap);
        ((ConcurrentHashMap)AbstratRootBp.outputParamsMap.get()).put(ParamPreField.blocks, paramMap);
    }

    private void agvPath(JSONObject resObj, String agvId, String fromLoc, String toLoc) {
        OrderInfo unloadOrder;
        OrderInfo loadOrder = (OrderInfo)resObj.getObject("loadOrder", OrderInfo.class);
        String startTime = "";
        String endTime = "";
        if (loadOrder != null && (loadOrder.getCreateTime() != 0 || loadOrder.getTerminateTime() != 0)) {
            startTime = loadOrder.getCreateTime() == 0 ? "" : DateUtils.parseCoreTimeStamp((Integer)loadOrder.getCreateTime(), (String)DateUtils.YYYY_MM_DD_HH_MM_SS);
            endTime = loadOrder.getTerminateTime() == 0 ? "" : DateUtils.parseCoreTimeStamp((Integer)loadOrder.getTerminateTime(), (String)DateUtils.YYYY_MM_DD_HH_MM_SS);
            WindTaskAGV.setAgvPath((String)startTime, (String)endTime, (String)agvId, (String)"", (String)fromLoc, (TaskRecord)((TaskRecord)this.taskRecord));
        }
        if ((unloadOrder = (OrderInfo)resObj.getObject("unloadOrder", OrderInfo.class)) != null && (unloadOrder.getCreateTime() != 0 || unloadOrder.getTerminateTime() != 0)) {
            startTime = unloadOrder.getCreateTime() == 0 ? "" : DateUtils.parseCoreTimeStamp((Integer)unloadOrder.getCreateTime(), (String)DateUtils.YYYY_MM_DD_HH_MM_SS);
            endTime = unloadOrder.getTerminateTime() == 0 ? "" : DateUtils.parseCoreTimeStamp((Integer)unloadOrder.getTerminateTime(), (String)DateUtils.YYYY_MM_DD_HH_MM_SS);
            WindTaskAGV.setAgvPath((String)startTime, (String)endTime, (String)agvId, (String)"", (String)toLoc, (TaskRecord)((TaskRecord)this.taskRecord));
        }
    }

    private void sendCombinedOrder(String param) throws Exception {
        boolean taskStatus = true;
        while (taskStatus) {
            this.checkIfInterrupt();
            Object taskStatusObj = GlobalCacheConfig.getCache((String)(this.taskId + ((TaskRecord)this.taskRecord).getId()));
            boolean bl = taskStatus = taskStatusObj == null || ((Integer)taskStatusObj).intValue() == TaskStatusEnum.running.getStatus();
            if (!taskStatus) {
                throw new StopException("@{wind.bp.stopHand}");
            }
            try {
                OkHttpUtil.postJsonParams((String)RootBp.getUrl((String)ApiEnum.setOrder.getUri()), (String)param);
                break;
            }
            catch (Exception e) {
                try {
                    Thread.sleep(3000L);
                }
                catch (InterruptedException ex) {
                    log.error("CombinedOrderBp InterruptedException error", (Throwable)ex);
                }
                log.error("CombinedOrderBp setOrder error,retry {}", (Object)e.getMessage());
            }
        }
    }

    private void notice(String blockState, TaskRecord taskRecord, WindBlockRecord blockRecord, WindBlockVo blockVo, String taskId, String agvId, String workSite) {
        WindEvent event = WindEvent.builder().type(Integer.valueOf(2)).status(blockState).taskRecord(taskRecord).blockRecord(blockRecord).blockVo(blockVo).taskId(taskId).taskLabel(taskRecord.getDefLabel()).agvId(agvId).workSite(workSite).build();
        this.eventSource.notify(event);
    }

    /*
     * WARNING - Removed try catching itself - possible behaviour change.
     */
    private void updateTaskTimeAndAgv(AbstratRootBp rootBp, Integer firstExecutorTime, Integer executeTime, String agvId) {
        AbstratRootBp abstratRootBp = rootBp;
        synchronized (abstratRootBp) {
            Object existAgvId;
            if (firstExecutorTime != null && firstExecutorTime > 0) {
                Date time = new Date((long)firstExecutorTime.intValue() * 1000L);
                if (((TaskRecord)this.taskRecord).getFirstExecutorTime() == null || ((TaskRecord)this.taskRecord).getFirstExecutorTime() != null && ((TaskRecord)this.taskRecord).getFirstExecutorTime().compareTo(time) > 0) {
                    ((TaskRecord)this.taskRecord).setFirstExecutorTime(time);
                }
            }
            if (StringUtils.isNotEmpty((CharSequence)(existAgvId = ((TaskRecord)this.taskRecord).getAgvId()))) {
                if (!((String)existAgvId).contains(agvId)) {
                    existAgvId = (String)existAgvId + "," + agvId;
                }
            } else {
                existAgvId = agvId;
            }
            ((TaskRecord)this.taskRecord).setAgvId((String)existAgvId);
            if (executeTime != null && executeTime > 0) {
                ((TaskRecord)this.taskRecord).setExecutorTime(Integer.valueOf((((TaskRecord)this.taskRecord).getExecutorTime() == null ? 0 : ((TaskRecord)this.taskRecord).getExecutorTime()) + executeTime));
            }
            RecordUpdaterFactory.getUpdater((BaseRecord)this.taskRecord).updateRecord(this.taskRecord);
        }
    }

    protected void setBlockInputParamsValue(AbstratRootBp rootBp) throws Exception {
    }

    public List<String> getNoticeFailed() {
        return this.noticeFailed;
    }

    public List<String> getNoticeFinish() {
        return this.noticeFinish;
    }

    public WorkSiteMapper getWorkSiteMapper() {
        return this.workSiteMapper;
    }

    public EventSource getEventSource() {
        return this.eventSource;
    }

    public void setNoticeFailed(List<String> noticeFailed) {
        this.noticeFailed = noticeFailed;
    }

    public void setNoticeFinish(List<String> noticeFinish) {
        this.noticeFinish = noticeFinish;
    }

    public void setWorkSiteMapper(WorkSiteMapper workSiteMapper) {
        this.workSiteMapper = workSiteMapper;
    }

    public void setEventSource(EventSource eventSource) {
        this.eventSource = eventSource;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof CombinedOrderBp)) {
            return false;
        }
        CombinedOrderBp other = (CombinedOrderBp)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        List this$noticeFailed = this.getNoticeFailed();
        List other$noticeFailed = other.getNoticeFailed();
        if (this$noticeFailed == null ? other$noticeFailed != null : !((Object)this$noticeFailed).equals(other$noticeFailed)) {
            return false;
        }
        List this$noticeFinish = this.getNoticeFinish();
        List other$noticeFinish = other.getNoticeFinish();
        if (this$noticeFinish == null ? other$noticeFinish != null : !((Object)this$noticeFinish).equals(other$noticeFinish)) {
            return false;
        }
        WorkSiteMapper this$workSiteMapper = this.getWorkSiteMapper();
        WorkSiteMapper other$workSiteMapper = other.getWorkSiteMapper();
        if (this$workSiteMapper == null ? other$workSiteMapper != null : !this$workSiteMapper.equals(other$workSiteMapper)) {
            return false;
        }
        EventSource this$eventSource = this.getEventSource();
        EventSource other$eventSource = other.getEventSource();
        return !(this$eventSource == null ? other$eventSource != null : !this$eventSource.equals(other$eventSource));
    }

    protected boolean canEqual(Object other) {
        return other instanceof CombinedOrderBp;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        List $noticeFailed = this.getNoticeFailed();
        result = result * 59 + ($noticeFailed == null ? 43 : ((Object)$noticeFailed).hashCode());
        List $noticeFinish = this.getNoticeFinish();
        result = result * 59 + ($noticeFinish == null ? 43 : ((Object)$noticeFinish).hashCode());
        WorkSiteMapper $workSiteMapper = this.getWorkSiteMapper();
        result = result * 59 + ($workSiteMapper == null ? 43 : $workSiteMapper.hashCode());
        EventSource $eventSource = this.getEventSource();
        result = result * 59 + ($eventSource == null ? 43 : $eventSource.hashCode());
        return result;
    }

    public String toString() {
        return "CombinedOrderBp(noticeFailed=" + this.getNoticeFailed() + ", noticeFinish=" + this.getNoticeFinish() + ", workSiteMapper=" + this.getWorkSiteMapper() + ", eventSource=" + this.getEventSource() + ")";
    }
}

