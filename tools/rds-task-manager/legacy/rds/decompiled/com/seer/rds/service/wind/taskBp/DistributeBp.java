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
 *  com.seer.rds.constant.DistributeEnum
 *  com.seer.rds.constant.TaskBlockStatusEnum
 *  com.seer.rds.constant.TaskLogLevelEnum
 *  com.seer.rds.constant.TaskStatusEnum
 *  com.seer.rds.dao.DistributePointRecordMapper
 *  com.seer.rds.dao.DistributeRecordMapper
 *  com.seer.rds.dao.WorkSiteMapper
 *  com.seer.rds.exception.EndErrorException
 *  com.seer.rds.exception.StopException
 *  com.seer.rds.listener.EventSource
 *  com.seer.rds.listener.WindEvent
 *  com.seer.rds.model.distribute.DistributePointRecord
 *  com.seer.rds.model.distribute.DistributeRecord
 *  com.seer.rds.model.wind.BaseRecord
 *  com.seer.rds.model.wind.TaskRecord
 *  com.seer.rds.model.wind.WindBlockRecord
 *  com.seer.rds.model.wind.WindTaskLog
 *  com.seer.rds.model.wind.WindTaskRecord
 *  com.seer.rds.service.agv.AgvApiService
 *  com.seer.rds.service.factory.RecordUpdaterFactory
 *  com.seer.rds.service.wind.AbstractBp
 *  com.seer.rds.service.wind.AbstratRootBp
 *  com.seer.rds.service.wind.RootBp
 *  com.seer.rds.service.wind.WindTaskAGV
 *  com.seer.rds.service.wind.WindTaskStatus
 *  com.seer.rds.service.wind.taskBp.CAgvOperationBp$Blocks
 *  com.seer.rds.service.wind.taskBp.DistributeBp
 *  com.seer.rds.service.wind.taskBp.DistributeBp$Blocks
 *  com.seer.rds.util.OkHttpUtil
 *  com.seer.rds.util.server.DateUtils
 *  com.seer.rds.vo.WindBlockVo
 *  com.seer.rds.vo.wind.DistributeBpField
 *  com.seer.rds.vo.wind.ParamPreField
 *  org.apache.commons.compress.utils.Lists
 *  org.apache.commons.lang3.StringUtils
 *  org.slf4j.Logger
 *  org.slf4j.LoggerFactory
 *  org.springframework.beans.factory.annotation.Autowired
 *  org.springframework.context.annotation.Scope
 *  org.springframework.stereotype.Component
 *  org.springframework.util.CollectionUtils
 *  unitauto.JSON
 */
package com.seer.rds.service.wind.taskBp;

import com.alibaba.fastjson.JSONArray;
import com.alibaba.fastjson.JSONObject;
import com.google.common.collect.Maps;
import com.seer.rds.config.GlobalCacheConfig;
import com.seer.rds.constant.AgvActionStatusEnum;
import com.seer.rds.constant.ApiEnum;
import com.seer.rds.constant.DistributeEnum;
import com.seer.rds.constant.TaskBlockStatusEnum;
import com.seer.rds.constant.TaskLogLevelEnum;
import com.seer.rds.constant.TaskStatusEnum;
import com.seer.rds.dao.DistributePointRecordMapper;
import com.seer.rds.dao.DistributeRecordMapper;
import com.seer.rds.dao.WorkSiteMapper;
import com.seer.rds.exception.EndErrorException;
import com.seer.rds.exception.StopException;
import com.seer.rds.listener.EventSource;
import com.seer.rds.listener.WindEvent;
import com.seer.rds.model.distribute.DistributePointRecord;
import com.seer.rds.model.distribute.DistributeRecord;
import com.seer.rds.model.wind.BaseRecord;
import com.seer.rds.model.wind.TaskRecord;
import com.seer.rds.model.wind.WindBlockRecord;
import com.seer.rds.model.wind.WindTaskLog;
import com.seer.rds.model.wind.WindTaskRecord;
import com.seer.rds.service.agv.AgvApiService;
import com.seer.rds.service.factory.RecordUpdaterFactory;
import com.seer.rds.service.wind.AbstractBp;
import com.seer.rds.service.wind.AbstratRootBp;
import com.seer.rds.service.wind.RootBp;
import com.seer.rds.service.wind.WindTaskAGV;
import com.seer.rds.service.wind.WindTaskStatus;
import com.seer.rds.service.wind.taskBp.CAgvOperationBp;
import com.seer.rds.service.wind.taskBp.DistributeBp;
import com.seer.rds.util.OkHttpUtil;
import com.seer.rds.util.server.DateUtils;
import com.seer.rds.vo.WindBlockVo;
import com.seer.rds.vo.wind.DistributeBpField;
import com.seer.rds.vo.wind.ParamPreField;
import java.io.IOException;
import java.io.InterruptedIOException;
import java.lang.invoke.CallSite;
import java.util.ArrayList;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import java.util.stream.Collectors;
import org.apache.commons.compress.utils.Lists;
import org.apache.commons.lang3.StringUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Scope;
import org.springframework.stereotype.Component;
import org.springframework.util.CollectionUtils;
import unitauto.JSON;

@Component(value="DistributeBp")
@Scope(value="prototype")
public class DistributeBp
extends AbstractBp<TaskRecord> {
    private static final Logger log = LoggerFactory.getLogger(DistributeBp.class);
    private static final String CODE = "code";
    private String fromLoc;
    private String returnLoc;
    private String group;
    private String label;
    private String vehicle;
    private JSONArray array;
    private Boolean ordered;
    private String loadPostAction;
    private JSONArray unloadPostActionList;
    private String returnPostAction;
    private static final String MSG = "msg";
    private WindTaskLog windTaskLog;
    private WindTaskLog windTaskLogFrom;
    private String scriptName;
    private List<String> noticeFailed = new ArrayList();
    private List<String> noticeFinish = new ArrayList();
    @Autowired
    private WorkSiteMapper workSiteMapper;
    @Autowired
    private EventSource eventSource;
    @Autowired
    private AgvApiService agvApiService;
    @Autowired
    private DistributeRecordMapper distributeRecordMapper;
    @Autowired
    private DistributePointRecordMapper distributePointRecordMapper;
    private DistributeRecord distributeRecord;
    private List<DistributePointRecord> pointsList = new ArrayList();

    /*
     * WARNING - Removed try catching itself - possible behaviour change.
     */
    protected void getInputParamsAndExecute(AbstratRootBp rootBp) throws Exception {
        JSONObject resObj;
        int createTime;
        String vehicle;
        String stateBp;
        JSONObject jsonObject2;
        JSONObject jsonObject32;
        String s;
        Object parse;
        this.fromLoc = (String)rootBp.getInputParamValue(this.taskId, this.inputParams, DistributeBpField.fromLoc);
        Object toLocList = rootBp.getInputParamValue(this.taskId, this.inputParams, DistributeBpField.toLocList);
        this.returnLoc = (String)rootBp.getInputParamValue(this.taskId, this.inputParams, DistributeBpField.returnLoc);
        this.group = (String)rootBp.getInputParamValue(this.taskId, this.inputParams, DistributeBpField.group);
        this.label = (String)rootBp.getInputParamValue(this.taskId, this.inputParams, DistributeBpField.label);
        this.vehicle = (String)rootBp.getInputParamValue(this.taskId, this.inputParams, DistributeBpField.vehicle);
        this.loadPostAction = (String)rootBp.getInputParamValue(this.taskId, this.inputParams, DistributeBpField.loadPostAction);
        Object unloadPostActionObject = rootBp.getInputParamValue(this.taskId, this.inputParams, DistributeBpField.unloadPostActionList);
        this.returnPostAction = (String)rootBp.getInputParamValue(this.taskId, this.inputParams, DistributeBpField.returnPostAction);
        Object orderFlag = rootBp.getInputParamValue(this.taskId, this.inputParams, DistributeBpField.ordered);
        this.scriptName = (String)rootBp.getInputParamValue(this.taskId, this.inputParams, DistributeBpField.scriptName);
        if (toLocList != null) {
            try {
                parse = JSON.parse((Object)toLocList);
                s = parse.toString();
                this.array = JSONObject.parseArray((String)s);
            }
            catch (Exception e) {
                throw new Exception(String.format("@{response.code.paramsError}:%s", toLocList), e);
            }
        }
        if (StringUtils.isEmpty((CharSequence)this.fromLoc)) {
            throw new EndErrorException("@{wind.bp.combinedFromLoc}");
        }
        if (this.array.isEmpty()) {
            throw new EndErrorException("@{wind.bp.distributeLoc}");
        }
        if (StringUtils.isEmpty((CharSequence)this.returnLoc)) {
            throw new EndErrorException("@{wind.bp.combinedToLoc}");
        }
        if (unloadPostActionObject != null) {
            try {
                parse = JSON.parse((Object)unloadPostActionObject);
                s = parse.toString();
                this.unloadPostActionList = JSONObject.parseArray((String)s);
            }
            catch (Exception e) {
                throw new Exception(String.format("@{response.code.paramsError}:%s", unloadPostActionObject), e);
            }
        }
        HashMap params = Maps.newHashMap();
        if (StringUtils.isEmpty((CharSequence)this.scriptName)) {
            params.put("fromLoc", this.fromLoc);
        }
        params.put("toLocList", this.array);
        params.put("returnLoc", this.returnLoc);
        params.put("externalId", ((TaskRecord)this.taskRecord).getId());
        if (StringUtils.isNotEmpty((CharSequence)this.group)) {
            params.put("group", this.group);
        }
        if (StringUtils.isNotEmpty((CharSequence)this.label)) {
            params.put("label", this.label);
        }
        if (StringUtils.isNotEmpty((CharSequence)this.vehicle)) {
            params.put("vehicle", this.vehicle);
        }
        if (this.unloadPostActionList != null && !this.unloadPostActionList.isEmpty()) {
            if (this.unloadPostActionList.size() != 1 && this.unloadPostActionList.size() != this.array.size()) {
                throw new RuntimeException("@{wind.bp.combinedLength}");
            }
            List toLocListString = JSONObject.parseArray((String)JSONArray.toJSONString((Object)this.array), String.class);
            List toLocPostString = JSONObject.parseArray((String)JSONArray.toJSONString((Object)this.unloadPostActionList), String.class);
            ArrayList<HashMap> locPost = new ArrayList<HashMap>();
            for (int s2 = 0; s2 < toLocListString.size(); ++s2) {
                String action;
                String string = action = toLocPostString.size() == 1 ? (String)toLocPostString.get(0) : (String)toLocPostString.get(s2);
                if (!StringUtils.isNotEmpty((CharSequence)action)) continue;
                HashMap unloadHashMap = Maps.newHashMap();
                unloadHashMap.put(DistributeBpField.toLoc, toLocListString.get(s2));
                HashMap unloadPostHashMap = Maps.newHashMap();
                unloadPostHashMap.put(DistributeBpField.configId, action);
                unloadHashMap.put(DistributeBpField.postAction, unloadPostHashMap);
                locPost.add(unloadHashMap);
            }
            if (!locPost.isEmpty()) {
                params.put(DistributeBpField.unloadPostActionList, locPost);
            }
        }
        params.put("ordered", true);
        if (orderFlag != null) {
            this.ordered = Boolean.parseBoolean(orderFlag.toString());
            params.put("ordered", this.ordered);
        }
        if (StringUtils.isNotEmpty((CharSequence)this.returnPostAction)) {
            HashMap returnPostMap = Maps.newHashMap();
            returnPostMap.put(DistributeBpField.configId, this.returnPostAction);
            params.put(DistributeBpField.returnPostAction, returnPostMap);
        }
        if (StringUtils.isNotEmpty((CharSequence)this.loadPostAction)) {
            HashMap loadPostMap = Maps.newHashMap();
            loadPostMap.put(DistributeBpField.configId, this.loadPostAction);
            params.put(DistributeBpField.loadPostAction, loadPostMap);
        }
        String orderId = UUID.randomUUID().toString();
        ConcurrentHashMap cacheBlockIfResetMap = GlobalCacheConfig.getCacheBlockIfResetMap((String)((TaskRecord)this.taskRecord).getId());
        if (cacheBlockIfResetMap != null) {
            if (cacheBlockIfResetMap.get("orderId" + this.blockVo.getBlockId()) == null) {
                cacheBlockIfResetMap.put("orderId" + this.blockVo.getBlockId(), orderId);
            }
            orderId = (String)cacheBlockIfResetMap.get("orderId" + this.blockVo.getBlockId());
        } else {
            ConcurrentHashMap<CallSite, String> newCacheTaskHashMap = new ConcurrentHashMap<CallSite, String>();
            newCacheTaskHashMap.put((CallSite)((Object)("orderId" + this.blockVo.getBlockId())), orderId);
            GlobalCacheConfig.cacheBlockIfResetMap((String)((TaskRecord)this.taskRecord).getId(), newCacheTaskHashMap);
        }
        if (StringUtils.isNotEmpty((CharSequence)this.scriptName)) {
            ArrayList blocks = Lists.newArrayList();
            CAgvOperationBp.Blocks block = new CAgvOperationBp.Blocks();
            block.setBlockId("block" + orderId);
            block.setLocation(this.fromLoc);
            if (StringUtils.isNotEmpty((CharSequence)this.loadPostAction)) {
                HashMap loadPostMap = Maps.newHashMap();
                loadPostMap.put(DistributeBpField.configId, this.loadPostAction);
                block.setPostAction((Map)loadPostMap);
            }
            WindTaskAGV.getAGVScript((String)this.taskId, (String)this.scriptName, (AbstratRootBp)rootBp, (JSONObject)this.inputParams, (CAgvOperationBp.Blocks)block);
            blocks.add(block);
            HashMap fromOrder = Maps.newHashMap();
            fromOrder.put("id", "fromOrder" + orderId);
            fromOrder.put("complete", this.childDefaultArray == null);
            fromOrder.put("blocks", blocks);
            if (StringUtils.isNotEmpty((CharSequence)this.group)) {
                fromOrder.put("group", this.group);
            }
            if (StringUtils.isNotEmpty((CharSequence)this.label)) {
                fromOrder.put("label", this.label);
            }
            if (StringUtils.isNotEmpty((CharSequence)this.vehicle)) {
                fromOrder.put("vehicle", this.vehicle);
            }
            fromOrder.put("externalId", ((TaskRecord)this.taskRecord).getId());
            params.put("fromOrder", fromOrder);
        }
        ((TaskRecord)this.taskRecord).getOrderId().set(orderId);
        Object outputParams = AbstratRootBp.outputParamsMap.get();
        if (outputParams != null && (jsonObject32 = JSON.parseObject(outputParams).getJSONObject(ParamPreField.blocks)) != null && !jsonObject32.isEmpty() && (jsonObject2 = jsonObject32.getJSONObject(this.blockVo.getBlockName())) != null && !jsonObject2.isEmpty()) {
            this.noticeFailed = jsonObject2.getJSONArray("noticeFailed") == null ? new ArrayList() : jsonObject2.getJSONArray("noticeFailed").toJavaList(String.class);
            this.noticeFinish = jsonObject2.getJSONArray("noticeFinish") == null ? new ArrayList() : jsonObject2.getJSONArray("noticeFinish").toJavaList(String.class);
        }
        params.put("id", orderId);
        AbstratRootBp jsonObject32 = rootBp;
        synchronized (jsonObject32) {
            InheritableThreadLocal cache = RootBp.distributeOrderCache.get(this.taskId + ((TaskRecord)this.taskRecord).getId()) != null ? (InheritableThreadLocal)RootBp.distributeOrderCache.get(this.taskId + ((TaskRecord)this.taskRecord).getId()) : new InheritableThreadLocal();
            cache.set(orderId);
            RootBp.distributeOrderCache.put(this.taskId + ((TaskRecord)this.taskRecord).getId(), cache);
        }
        String param = JSONObject.toJSONString((Object)params);
        this.saveLogInfo(String.format("@{wind.bp.distributeId}=%s", orderId));
        ArrayList<String> sites = new ArrayList<String>();
        sites.addAll(this.array.toJavaList(String.class));
        sites.add(this.fromLoc);
        sites.add(this.returnLoc);
        ArrayList disables = new ArrayList();
        this.workSiteMapper.findBySiteIdIn(sites).stream().filter(workSite -> workSite.getDisabled() != null).filter(workSite -> workSite.getDisabled() == 1).forEach(workSite -> disables.add(workSite.getSiteId()));
        if (!disables.isEmpty()) {
            throw new EndErrorException(disables.stream().map(String::valueOf).collect(Collectors.joining(",")) + " @{permission.disableWorksite} ");
        }
        this.blockRecord.setOrderId(orderId);
        super.getWindService().saveBlockRecord(this.blockRecord, this.blockVo.getBlockId(), this.blockVo.getBlockType(), ((TaskRecord)this.taskRecord).getProjectId(), this.taskId, ((TaskRecord)this.taskRecord).getId(), null, this.startOn);
        log.info("DistributeBp setOrder taskId = {}, taskRecord = {}, orderId = {}, param = {}", new Object[]{this.taskId, ((TaskRecord)this.taskRecord).getId(), orderId, params});
        boolean taskStatus = true;
        while (taskStatus) {
            this.checkIfInterrupt();
            Object taskStatusObj = GlobalCacheConfig.getCache((String)(this.taskId + ((TaskRecord)this.taskRecord).getId()));
            boolean bl = taskStatus = taskStatusObj == null || ((Integer)taskStatusObj).intValue() == TaskStatusEnum.running.getStatus();
            if (!taskStatus) {
                log.info("taskStatus is not allowed to execute");
                throw new StopException("@{wind.bp.stopHand}");
            }
            try {
                Map result = OkHttpUtil.postJson((String)RootBp.getUrl((String)ApiEnum.setOrder.getUri()), (String)param);
                break;
            }
            catch (Exception e) {
                log.error("DistributeBp setOrder error,retry");
                Thread.sleep(1000L);
            }
        }
        Boolean flag = true;
        int terminateCount = 0;
        String msg = "";
        if (StringUtils.isNotEmpty((CharSequence)this.scriptName)) {
            this.windTaskLogFrom = super.getWindService().saveLog(TaskLogLevelEnum.warn.getLevel(), "[DistributeBp]@{task.enum.blockSuspend}", ((TaskRecord)this.taskRecord).getProjectId(), this.taskId, ((TaskRecord)this.taskRecord).getId(), this.blockVo.getBlockId());
            Boolean returnWhileFlag = true;
            while (returnWhileFlag.booleanValue()) {
                this.checkIfInterrupt();
                ArrayList<String> backMsg = new ArrayList<String>();
                String taskRes = "";
                try {
                    taskRes = OkHttpUtil.get((String)(RootBp.getUrl((String)ApiEnum.orderDetails.getUri()) + "/fromOrder" + orderId));
                }
                catch (Exception e) {
                    log.error("query from distributeOrder error {}", (Throwable)e);
                }
                Boolean taskStatusFlag = RootBp.taskStatus.get(this.taskId + ((TaskRecord)this.taskRecord).getId()) == null ? true : (Boolean)RootBp.taskStatus.get(this.taskId + ((TaskRecord)this.taskRecord).getId());
                stateBp = "";
                if (StringUtils.isNotEmpty((CharSequence)taskRes)) {
                    this.dealPoint(taskRes, true);
                    JSONObject resObj2 = JSONObject.parseObject((String)taskRes);
                    stateBp = resObj2.getString("state");
                    if ("FAILED".equals(stateBp)) {
                        this.windTaskLogFrom.setMessage("[DistributeBp]@{task.enum.blockSuspend}:" + taskRes);
                        this.windTaskLogFrom.setCreateTime(new Date());
                        super.getWindService().saveLog(this.windTaskLogFrom);
                        this.blockRecord.setStatus(Integer.valueOf(TaskBlockStatusEnum.suspend.getStatus()));
                        this.blockRecord.setEndedReason(TaskBlockStatusEnum.suspend.getDesc() + ":blockState=" + this.state);
                        super.getWindService().saveBlockRecord(this.blockRecord);
                        ((TaskRecord)this.taskRecord).setEndedReason("[DistributeBp]@{wind.bp.robotOperate}");
                        RecordUpdaterFactory.getUpdater((BaseRecord)this.taskRecord).updateRecord(this.taskRecord);
                    } else {
                        if ("FINISHED".equals(stateBp) || "STOPPED".equals(stateBp)) {
                            vehicle = resObj2.getString("vehicle");
                            if (!StringUtils.isNotEmpty((CharSequence)vehicle)) break;
                            createTime = resObj2.getInteger("createTime");
                            this.updateVehicle(rootBp, vehicle, createTime);
                            break;
                        }
                        vehicle = resObj2.getString("vehicle");
                        if (StringUtils.isNotEmpty((CharSequence)vehicle) && flag.booleanValue()) {
                            int createTime2 = resObj2.getInteger("createTime");
                            this.updateVehicle(rootBp, vehicle, createTime2);
                            flag = false;
                        }
                        JSONArray blocksArr = resObj2.getJSONArray("blocks");
                        for (int i = 0; i < blocksArr.size(); ++i) {
                            JSONObject blockObj = blocksArr.getJSONObject(i);
                            if (!("block" + orderId).equals(blockObj.getString("blockId"))) continue;
                            String fromLocBlockState = blockObj.getString("state");
                            JSONObject json = new JSONObject();
                            json.put("state", (Object)fromLocBlockState);
                            json.put("vehicle", (Object)vehicle);
                            backMsg.add(this.handlerLoc(this.fromLoc, json, rootBp));
                            if (!"FINISHED".equals(blockObj.getString("state")) && !AgvActionStatusEnum.MANUAL_FINISHED.getStatus().equals(blockObj.getString("state"))) continue;
                            GlobalCacheConfig.clearTaskErrorCache((String)(((TaskRecord)this.taskRecord).getId() + "b" + this.blockRecord.getBlockConfigId()));
                            this.sysAlarmService.deleteTaskAlarmAndNoticeWeb(((TaskRecord)this.taskRecord).getId() + "b" + this.blockRecord.getBlockConfigId());
                            JSONArray childArray = (JSONArray)this.childDefaultArray;
                            rootBp.executeChild(rootBp, this.taskId, this.taskRecord, childArray, Boolean.valueOf(true));
                            this.markComplete("fromOrder" + orderId);
                            returnWhileFlag = false;
                            break;
                        }
                    }
                    String join = backMsg.stream().map(String::valueOf).collect(Collectors.joining(","));
                    if (!StringUtils.equals((CharSequence)join, (CharSequence)msg)) {
                        msg = join;
                        this.noticeMsg(backMsg, stateBp, (TaskRecord)this.taskRecord, this.blockRecord, this.blockVo, this.taskId, this.vehicle);
                        this.windTaskLogFrom.setLevel(TaskLogLevelEnum.info.getLevel());
                        this.windTaskLogFrom.setMessage("[DistributeBp]@{wind.bp.start}:" + join);
                        this.windTaskLogFrom.setCreateTime(new Date());
                        super.getWindService().saveLog(this.windTaskLogFrom);
                    }
                }
                if (!taskStatusFlag.booleanValue() && terminateCount == 0) {
                    this.agvApiService.terminate(orderId);
                    ++terminateCount;
                }
                WindTaskStatus.sendTaskEndErrorAndTaskStop((AbstractBp)this, (String)stateBp);
                Thread.sleep(1500L);
            }
        }
        this.windTaskLog = super.getWindService().saveLog(TaskLogLevelEnum.warn.getLevel(), "[DistributeBp]@{task.enum.blockSuspend}", ((TaskRecord)this.taskRecord).getProjectId(), this.taskId, ((TaskRecord)this.taskRecord).getId(), this.blockVo.getBlockId());
        terminateCount = 0;
        while (true) {
            this.checkIfInterrupt();
            ArrayList<String> backMsg = new ArrayList<String>();
            String taskRes = "";
            try {
                taskRes = OkHttpUtil.get((String)(RootBp.getUrl((String)ApiEnum.distributeOrderDetails.getUri()) + "/" + orderId));
            }
            catch (Exception e) {
                log.error("query distributeOrderDetails error = {}", (Throwable)e);
            }
            Boolean taskStatusFlag = RootBp.taskStatus.get(this.taskId + ((TaskRecord)this.taskRecord).getId()) == null ? true : (Boolean)RootBp.taskStatus.get(this.taskId + ((TaskRecord)this.taskRecord).getId());
            if (StringUtils.isNotEmpty((CharSequence)taskRes)) {
                this.dealPoint(taskRes, false);
                resObj = JSONObject.parseObject((String)taskRes);
                stateBp = resObj.getString("state");
                if ("FAILED".equals(stateBp)) {
                    this.windTaskLog.setMessage("[DistributeBp]@{task.enum.blockSuspend}:" + taskRes);
                    this.windTaskLog.setCreateTime(new Date());
                    super.getWindService().saveLog(this.windTaskLog);
                    this.blockRecord.setStatus(Integer.valueOf(TaskBlockStatusEnum.suspend.getStatus()));
                    this.blockRecord.setEndedReason(TaskBlockStatusEnum.suspend.getDesc() + ":blockState=" + this.state);
                    super.getWindService().saveBlockRecord(this.blockRecord);
                    ((TaskRecord)this.taskRecord).setEndedReason("[DistributeBp]@{wind.bp.robotOperate}");
                    RecordUpdaterFactory.getUpdater((BaseRecord)this.taskRecord).updateRecord(this.taskRecord);
                } else if ("FINISHED".equals(stateBp) || "RUNNING".equals(stateBp) || "STOPPED".equals(stateBp)) {
                    JSONObject loadOrder = resObj.getJSONObject("loadOrder");
                    vehicle = resObj.getString("vehicle");
                    if (StringUtils.isNotEmpty((CharSequence)vehicle) && flag.booleanValue()) {
                        createTime = resObj.getInteger("createTime");
                        this.updateVehicle(rootBp, vehicle, createTime);
                        flag = false;
                    }
                    backMsg.add(this.handlerLoc(this.fromLoc, loadOrder, rootBp));
                    JSONArray unloadOrderList = resObj.getJSONArray("unloadOrderMap");
                    for (int i = 0; i < unloadOrderList.size(); ++i) {
                        JSONObject jsonObject = unloadOrderList.getJSONObject(i);
                        JSONObject unloadOrder = jsonObject.getJSONArray("unloadOrderList").getJSONObject(jsonObject.getJSONArray("unloadOrderList").size() - 1);
                        String toLoc = jsonObject.getString("toLoc");
                        backMsg.add(this.handlerLoc(toLoc, unloadOrder, rootBp));
                    }
                    JSONObject returnOrder = resObj.getJSONObject("returnOrder");
                    backMsg.add(this.handlerLoc(this.returnLoc, returnOrder, rootBp));
                    String join = backMsg.stream().map(String::valueOf).collect(Collectors.joining(","));
                    if (!StringUtils.equals((CharSequence)msg, (CharSequence)join)) {
                        this.noticeMsg(backMsg, stateBp, (TaskRecord)this.taskRecord, this.blockRecord, this.blockVo, this.taskId, vehicle);
                    }
                    if ("FINISHED".equals(stateBp)) {
                        this.windTaskLog.setMessage("[DistributeBp]@{task.enum.blockSuspend}:" + join);
                    } else {
                        if ("STOPPED".equals(stateBp)) {
                            int time = resObj.getInteger("terminateTime") - resObj.getInteger("createTime");
                            ((TaskRecord)this.taskRecord).setExecutorTime(Integer.valueOf(time));
                            Object taskStatusObj = GlobalCacheConfig.getCache((String)(this.taskId + ((TaskRecord)this.taskRecord).getId()));
                            boolean bl = taskStatus = taskStatusObj == null || ((Integer)taskStatusObj).intValue() == TaskStatusEnum.stop.getStatus();
                            if (taskStatus) {
                                throw new StopException("@{wind.bp.stopHand}");
                            }
                            throw new EndErrorException("@{wind.bp.stopError}:" + (resObj.get((Object)"error") == null ? "" : JSONObject.toJSONString((Object)resObj.get((Object)"error"))));
                        }
                        this.windTaskLog.setMessage("[DistributeBp]@{task.enum.blockSuspend}:" + join);
                    }
                    this.windTaskLog.setCreateTime(new Date());
                    if (!StringUtils.equals((CharSequence)msg, (CharSequence)join)) {
                        msg = join;
                        super.getWindService().saveLog(this.windTaskLog);
                    }
                    if ("FINISHED".equals(stateBp)) break;
                }
            }
            if (!taskStatusFlag.booleanValue() && terminateCount == 0) {
                this.agvApiService.terminate(orderId);
                ++terminateCount;
            }
            Thread.sleep(1500L);
        }
        int time = resObj.getInteger("terminateTime") - resObj.getInteger("createTime");
        ((TaskRecord)this.taskRecord).setExecutorTime(Integer.valueOf(time));
        RecordUpdaterFactory.getUpdater((BaseRecord)this.taskRecord).updateRecord(this.taskRecord);
    }

    protected void runChildBlock(AbstratRootBp rootBp) {
        log.info("DistributeBp runChildBlock do not execute");
    }

    protected void setBlockInputParamsValue(AbstratRootBp rootBp) throws Exception {
        Blocks bpData = new Blocks();
        bpData.setFromLoc(this.fromLoc);
        bpData.setToLocList(this.array);
        bpData.setGroup(this.group);
        bpData.setLabel(this.label);
        bpData.setReturnLoc(this.returnLoc);
        bpData.setVehicle(this.vehicle);
        bpData.setOrdered(this.ordered);
        bpData.setLoadPostAction(this.loadPostAction);
        bpData.setUnloadPostActionList(this.unloadPostActionList);
        bpData.setReturnPostAction(this.returnPostAction);
        bpData.setScriptName(this.scriptName);
        this.blockRecord.setBlockInputParamsValue(JSONObject.toJSONString((Object)bpData));
        super.getWindService().saveBlockRecord(this.blockRecord, this.blockVo.getBlockId(), this.blockVo.getBlockType(), ((TaskRecord)this.taskRecord).getProjectId(), this.taskId, ((TaskRecord)this.taskRecord).getId(), this.startOn);
    }

    private String handlerLoc(String loc, JSONObject jsonObject, AbstratRootBp rootBp) {
        JSONArray blocks;
        String locState = jsonObject.getString("state");
        String vehicle = jsonObject.getString("vehicle");
        if (!(StringUtils.equals((CharSequence)this.fromLoc, (CharSequence)loc) || StringUtils.equals((CharSequence)this.returnLoc, (CharSequence)loc) || (blocks = jsonObject.getJSONArray("blocks")).isEmpty())) {
            String state = blocks.getJSONObject(0).getString("state");
            if ("RUNNING".equals(locState) && "WAITING".equals(state)) {
                locState = state;
            }
        }
        if (AgvActionStatusEnum.FINISHED.getStatus().equals(locState) && !this.noticeFinish.contains(loc)) {
            this.notice(Integer.valueOf(2), locState, (TaskRecord)this.taskRecord, this.blockRecord, this.blockVo, this.taskId, vehicle, loc);
            if (!StringUtils.equals((CharSequence)this.fromLoc, (CharSequence)loc) && !StringUtils.equals((CharSequence)this.returnLoc, (CharSequence)loc)) {
                this.notice(Integer.valueOf(7), locState, (TaskRecord)this.taskRecord, this.blockRecord, this.blockVo, this.taskId, vehicle, loc);
            }
            this.noticeFinish.add(loc);
        }
        if (AgvActionStatusEnum.FAILED.getStatus().equals(locState) && !this.noticeFailed.contains(loc)) {
            this.notice(Integer.valueOf(2), locState, (TaskRecord)this.taskRecord, this.blockRecord, this.blockVo, this.taskId, vehicle, loc);
            this.noticeFailed.add(loc);
        }
        ConcurrentMap childParamMap = Maps.newConcurrentMap();
        childParamMap.put(DistributeBpField.noticeFinish, this.noticeFinish);
        childParamMap.put(DistributeBpField.noticeFailed, this.noticeFailed);
        childParamMap.put(DistributeBpField.AGV, vehicle);
        Map paramMap = (Map)((ConcurrentHashMap)AbstratRootBp.outputParamsMap.get()).get(ParamPreField.blocks);
        paramMap.put(this.blockVo.getBlockName(), childParamMap);
        ((ConcurrentHashMap)AbstratRootBp.outputParamsMap.get()).put(ParamPreField.blocks, paramMap);
        this.blockRecord.setOutputParams(JSONObject.toJSONString(AbstratRootBp.outputParamsMap.get()));
        super.getWindService().saveBlockRecord(this.blockRecord);
        return String.format("%s:%s", loc, locState);
    }

    /*
     * WARNING - Removed try catching itself - possible behaviour change.
     */
    private void updateVehicle(AbstratRootBp rootBp, String vehicle, int createTime) {
        AbstratRootBp abstratRootBp = rootBp;
        synchronized (abstratRootBp) {
            WindTaskRecord updateRecord = super.getWindService().findByTaskIdAndTaskRecordId(this.taskId, ((TaskRecord)this.taskRecord).getId());
            Object existAgvId = "";
            if (updateRecord != null) {
                existAgvId = updateRecord.getAgvId();
            }
            if (StringUtils.isNotEmpty((CharSequence)existAgvId)) {
                if (!((String)existAgvId).contains(vehicle)) {
                    existAgvId = (String)existAgvId + "," + vehicle;
                }
            } else {
                existAgvId = vehicle;
            }
            ((TaskRecord)this.taskRecord).setAgvId((String)existAgvId);
            RecordUpdaterFactory.getUpdater((BaseRecord)this.taskRecord).updateRecord(this.taskRecord);
            if (createTime != 0) {
                Date time = new Date((long)createTime * 1000L);
                if (((TaskRecord)this.taskRecord).getFirstExecutorTime() == null) {
                    ((TaskRecord)this.taskRecord).setFirstExecutorTime(time);
                }
                super.getWindService().updateTaskRecordFirstExecutorTime(time, ((TaskRecord)this.taskRecord).getId());
            }
        }
    }

    private void notice(Integer type, String blockState, TaskRecord taskRecord, WindBlockRecord blockRecord, WindBlockVo blockVo, String taskId, String agvId, String targetSiteLabel) {
        WindEvent event = WindEvent.builder().type(type).status(blockState).taskRecord(taskRecord).blockRecord(blockRecord).blockVo(blockVo).taskId(taskId).taskLabel(taskRecord.getDefLabel()).agvId(agvId).workSite(targetSiteLabel).build();
        this.eventSource.notify(event);
    }

    private void noticeMsg(Object msg, String blockState, TaskRecord taskRecord, WindBlockRecord blockRecord, WindBlockVo blockVo, String taskId, String agvId) {
        WindEvent event = WindEvent.builder().type(Integer.valueOf(8)).status(blockState).taskRecord(taskRecord).blockRecord(blockRecord).blockVo(blockVo).taskId(taskId).taskLabel(taskRecord.getDefLabel()).agvId(agvId).data(msg).build();
        this.eventSource.notify(event);
    }

    private void markComplete(String orderId) {
        JSONObject param = new JSONObject();
        param.put("id", (Object)orderId);
        log.info("DistributeBp fromLoc complete task, orderId=" + orderId);
        while (true) {
            this.checkIfInterrupt();
            try {
                String complete = OkHttpUtil.postJsonParams((String)RootBp.getUrl((String)ApiEnum.markComplete.getUri()), (String)param.toJSONString());
            }
            catch (InterruptedIOException e) {
                Thread.currentThread().interrupt();
                this.checkIfInterrupt();
                continue;
            }
            catch (Exception e) {
                log.error("DistributeBp fromLoc complete task error = {}", (Throwable)e);
                try {
                    Thread.sleep(1500L);
                }
                catch (InterruptedException ex) {
                    log.error("DistributeBp fromLoc sleep error = {}", (Throwable)e);
                    Thread.currentThread().interrupt();
                    this.checkIfInterrupt();
                }
                continue;
            }
            break;
        }
    }

    private void dealPoint(String res, boolean flag) {
        List locs;
        JSONObject resObj;
        String stateBp;
        if (flag) {
            try {
                res = OkHttpUtil.get((String)(RootBp.getUrl((String)ApiEnum.distributeOrderDetails.getUri()) + "/" + this.blockRecord.getOrderId()));
            }
            catch (Exception e) {
                return;
            }
        }
        if (StringUtils.equals((CharSequence)"TOBEDISPATCHED", (CharSequence)(stateBp = (resObj = JSONObject.parseObject((String)res)).getString("state")))) {
            return;
        }
        String vehicle = resObj.getString("vehicle");
        JSONArray toLocList = resObj.getJSONArray("toLocList");
        int isEnd = 0;
        if ("FINISHED".equals(stateBp) || "STOPPED".equals(stateBp)) {
            isEnd = 1;
        }
        this.operationDistributeRecord(vehicle, isEnd);
        JSONObject loadOrder = resObj.getJSONObject("loadOrder");
        ArrayList tmps = new ArrayList();
        this.operationDistributePointRecord(loadOrder, 1, this.fromLoc, tmps);
        JSONArray unloadOrderList = resObj.getJSONArray("unloadOrderMap");
        for (int i = 0; i < unloadOrderList.size(); ++i) {
            JSONObject jsonObject = unloadOrderList.getJSONObject(i);
            JSONObject unloadOrder = jsonObject.getJSONArray("unloadOrderList").getJSONObject(jsonObject.getJSONArray("unloadOrderList").size() - 1);
            String toLoc = jsonObject.getString("toLoc");
            this.operationDistributePointRecord(unloadOrder, 3, toLoc, tmps);
        }
        this.checkDistribute(tmps);
        JSONObject returnOrder = resObj.getJSONObject("returnOrder");
        this.operationDistributePointRecord(returnOrder, 2, this.returnLoc, tmps);
        if (!CollectionUtils.isEmpty(tmps)) {
            List distributePointRecords = this.distributePointRecordMapper.saveAll(tmps);
            distributePointRecords.stream().forEach(it -> this.pointsList.add(it));
            this.agvPath(tmps, vehicle);
        }
        if (!(locs = this.pointsList.stream().filter(it -> !toLocList.contains((Object)it.getLoc()) && !StringUtils.equals((CharSequence)it.getLoc(), (CharSequence)this.fromLoc) && !StringUtils.equals((CharSequence)it.getLoc(), (CharSequence)this.returnLoc)).map(DistributePointRecord::getLoc).collect(Collectors.toList())).isEmpty()) {
            this.distributePointRecordMapper.deleteAllByLocIsIn(locs);
        }
    }

    private void agvPath(List<DistributePointRecord> tmps, String agvId) {
        Optional<DistributePointRecord> end;
        Optional<DistributePointRecord> distribute;
        Optional<DistributePointRecord> start = tmps.stream().filter(it -> it.getPointType() == 1).findFirst();
        if (!start.isEmpty() && (StringUtils.isNotEmpty((CharSequence)start.get().getPathEndTime()) || StringUtils.isNotEmpty((CharSequence)start.get().getPathStartTime()))) {
            WindTaskAGV.setAgvPath((String)start.get().getPathStartTime(), (String)start.get().getPathEndTime(), (String)agvId, (String)(this.scriptName == null ? "" : this.scriptName), (String)start.get().getLoc(), (TaskRecord)((TaskRecord)this.taskRecord));
        }
        if (!((distribute = tmps.stream().filter(it -> it.getPointType() == 3).findFirst()).isEmpty() || !StringUtils.isNotEmpty((CharSequence)distribute.get().getPathEndTime()) && !StringUtils.isNotEmpty((CharSequence)distribute.get().getPathStartTime()) || distribute.get().getMode().intValue() != DistributeEnum.WAIT.getType() && DistributeEnum.STOP.getType() != distribute.get().getMode().intValue() && DistributeEnum.FINISHED.getType() != distribute.get().getMode().intValue())) {
            WindTaskAGV.setAgvPath((String)distribute.get().getPathStartTime(), (String)distribute.get().getPathEndTime(), (String)agvId, (String)"", (String)distribute.get().getLoc(), (TaskRecord)((TaskRecord)this.taskRecord));
        }
        if (!(end = tmps.stream().filter(it -> it.getPointType() == 2).findFirst()).isEmpty() && (StringUtils.isNotEmpty((CharSequence)end.get().getPathEndTime()) || StringUtils.isNotEmpty((CharSequence)end.get().getPathStartTime()))) {
            WindTaskAGV.setAgvPath((String)end.get().getPathStartTime(), (String)end.get().getPathEndTime(), (String)agvId, (String)"", (String)end.get().getLoc(), (TaskRecord)((TaskRecord)this.taskRecord));
        }
    }

    private void operationDistributeRecord(String agvId, int isEnd) {
        if (this.distributeRecord == null) {
            DistributeRecord vo = this.distributeRecordMapper.findDistributeRecordByDistributeId(this.blockRecord.getOrderId());
            DistributeRecord distributeRecord = this.distributeRecord = vo == null ? new DistributeRecord() : vo;
        }
        if (StringUtils.equals((CharSequence)((TaskRecord)this.taskRecord).getId(), (CharSequence)this.distributeRecord.getTaskRecordId()) && StringUtils.equals((CharSequence)this.blockRecord.getOrderId(), (CharSequence)this.distributeRecord.getDistributeId()) && StringUtils.equals((CharSequence)agvId, (CharSequence)this.distributeRecord.getAgvId()) && isEnd == this.distributeRecord.getIsEnd()) {
            return;
        }
        this.distributeRecord.setDistributeId(this.blockRecord.getOrderId());
        this.distributeRecord.setTaskRecordId(((TaskRecord)this.taskRecord).getId());
        this.distributeRecord.setAgvId(agvId);
        this.distributeRecord.setIsEnd(Integer.valueOf(isEnd));
        this.distributeRecord.setCreateTime(this.blockRecord.getStartedOn());
        this.distributeRecord.setRemark(this.blockRecord.getRemark());
        this.distributeRecord.setDefLabel(((TaskRecord)this.taskRecord).getDefLabel());
        this.distributeRecordMapper.save((Object)this.distributeRecord);
    }

    private void operationDistributePointRecord(JSONObject jsonObject, int pointType, String loc, List<DistributePointRecord> tmps) {
        if (this.pointsList.isEmpty()) {
            List results = this.distributePointRecordMapper.findAllByDistributeId(this.blockRecord.getOrderId());
            results.stream().forEach(it -> this.pointsList.add(it));
        }
        String locState = jsonObject.getString("state");
        JSONArray blocks = jsonObject.getJSONArray("blocks");
        Integer pathStartTime = jsonObject.getInteger("createTime");
        Integer pathEndTime = jsonObject.getInteger("terminateTime");
        if (!blocks.isEmpty()) {
            String state = blocks.getJSONObject(0).getString("state");
            if ("RUNNING".equals(locState) && "WAITING".equals(state)) {
                locState = state;
                pathEndTime = (int)(System.currentTimeMillis() / 1000L);
            }
            if ("WAITING".equals(locState) && "FINISHED".equals(state)) {
                pathEndTime = (int)(System.currentTimeMillis() / 1000L);
            }
        }
        int mode = DistributeEnum.RUN.getType();
        if ("WAITING".equals(locState) && pointType == 3) {
            mode = DistributeEnum.WAIT.getType();
        } else if ("WAITING".equals(locState) && pointType == 1) {
            mode = DistributeEnum.FINISHED.getType();
        } else if ("TOBEDISPATCHED".equals(locState)) {
            mode = DistributeEnum.DISTRIBUTED.getType();
        } else if ("FINISHED".equals(locState)) {
            mode = DistributeEnum.FINISHED.getType();
        } else if ("STOPPED".equals(locState)) {
            mode = DistributeEnum.STOP.getType();
        }
        List collect = this.pointsList.stream().filter(it -> StringUtils.equals((CharSequence)it.getLoc(), (CharSequence)loc) && it.getPointType() == pointType).collect(Collectors.toList());
        if (!CollectionUtils.isEmpty(collect)) {
            if (((DistributePointRecord)collect.get(0)).getMode() == mode) {
                return;
            }
            ((DistributePointRecord)collect.get(0)).setMode(Integer.valueOf(mode));
            ((DistributePointRecord)collect.get(0)).setPathEndTime(pathEndTime == 0 ? "" : DateUtils.parseCoreTimeStamp((Integer)pathEndTime, (String)DateUtils.YYYY_MM_DD_HH_MM_SS));
            ((DistributePointRecord)collect.get(0)).setPathStartTime(pathStartTime == 0 ? "" : DateUtils.parseCoreTimeStamp((Integer)pathStartTime, (String)DateUtils.YYYY_MM_DD_HH_MM_SS));
            tmps.add((DistributePointRecord)collect.get(0));
            return;
        }
        DistributePointRecord tmp = new DistributePointRecord();
        tmp.setDistributeId(this.blockRecord.getOrderId());
        tmp.setMode(Integer.valueOf(mode));
        tmp.setPointType(Integer.valueOf(pointType));
        tmp.setLoc(loc);
        tmp.setCreateTime(new Date());
        tmp.setPathEndTime(pathEndTime == 0 ? "" : DateUtils.parseCoreTimeStamp((Integer)pathEndTime, (String)DateUtils.YYYY_MM_DD_HH_MM_SS));
        tmp.setPathStartTime(pathStartTime == 0 ? "" : DateUtils.parseCoreTimeStamp((Integer)pathStartTime, (String)DateUtils.YYYY_MM_DD_HH_MM_SS));
        tmps.add(tmp);
    }

    private void checkDistribute(List<DistributePointRecord> tmps) {
        String result = null;
        try {
            result = OkHttpUtil.get((String)(RootBp.getUrl((String)ApiEnum.distributeSiteStatus.getUri()) + "/" + this.blockRecord.getOrderId()));
        }
        catch (IOException e) {
            log.error("checkDistribute error {}", (Throwable)e);
        }
        if (StringUtils.isEmpty(result)) {
            return;
        }
        JSONObject jsonResult = JSONObject.parseObject((String)result);
        JSONArray siteStatusList = jsonResult.getJSONArray("siteStatusList");
        for (int i = 0; i < siteStatusList.size(); ++i) {
            JSONObject jo = siteStatusList.getJSONObject(i);
            String siteId = jo.getString("siteId");
            String siteIdStatus = jo.getString("status");
            List collect = this.pointsList.stream().filter(it -> StringUtils.equals((CharSequence)it.getLoc(), (CharSequence)siteId) && it.getPointType() == 3).collect(Collectors.toList());
            if (CollectionUtils.isEmpty(collect)) continue;
            Integer modeTmp = null;
            if ("full_order".equals(siteIdStatus) && ((DistributePointRecord)collect.get(0)).getMode().intValue() != DistributeEnum.HANG.getType()) {
                modeTmp = DistributeEnum.HANG.getType();
            } else if ("full".equals(siteIdStatus) && ((DistributePointRecord)collect.get(0)).getMode().intValue() != DistributeEnum.HANGALL.getType()) {
                modeTmp = DistributeEnum.HANGALL.getType();
            }
            if (modeTmp == null) continue;
            ((DistributePointRecord)collect.get(0)).setMode(modeTmp);
            if (!tmps.stream().filter(it -> StringUtils.equals((CharSequence)siteId, (CharSequence)it.getLoc())).collect(Collectors.toList()).isEmpty()) continue;
            tmps.add((DistributePointRecord)collect.get(0));
        }
    }

    public String getFromLoc() {
        return this.fromLoc;
    }

    public String getReturnLoc() {
        return this.returnLoc;
    }

    public String getGroup() {
        return this.group;
    }

    public String getLabel() {
        return this.label;
    }

    public String getVehicle() {
        return this.vehicle;
    }

    public JSONArray getArray() {
        return this.array;
    }

    public Boolean getOrdered() {
        return this.ordered;
    }

    public String getLoadPostAction() {
        return this.loadPostAction;
    }

    public JSONArray getUnloadPostActionList() {
        return this.unloadPostActionList;
    }

    public String getReturnPostAction() {
        return this.returnPostAction;
    }

    public WindTaskLog getWindTaskLog() {
        return this.windTaskLog;
    }

    public WindTaskLog getWindTaskLogFrom() {
        return this.windTaskLogFrom;
    }

    public String getScriptName() {
        return this.scriptName;
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

    public AgvApiService getAgvApiService() {
        return this.agvApiService;
    }

    public DistributeRecordMapper getDistributeRecordMapper() {
        return this.distributeRecordMapper;
    }

    public DistributePointRecordMapper getDistributePointRecordMapper() {
        return this.distributePointRecordMapper;
    }

    public DistributeRecord getDistributeRecord() {
        return this.distributeRecord;
    }

    public List<DistributePointRecord> getPointsList() {
        return this.pointsList;
    }

    public void setFromLoc(String fromLoc) {
        this.fromLoc = fromLoc;
    }

    public void setReturnLoc(String returnLoc) {
        this.returnLoc = returnLoc;
    }

    public void setGroup(String group) {
        this.group = group;
    }

    public void setLabel(String label) {
        this.label = label;
    }

    public void setVehicle(String vehicle) {
        this.vehicle = vehicle;
    }

    public void setArray(JSONArray array) {
        this.array = array;
    }

    public void setOrdered(Boolean ordered) {
        this.ordered = ordered;
    }

    public void setLoadPostAction(String loadPostAction) {
        this.loadPostAction = loadPostAction;
    }

    public void setUnloadPostActionList(JSONArray unloadPostActionList) {
        this.unloadPostActionList = unloadPostActionList;
    }

    public void setReturnPostAction(String returnPostAction) {
        this.returnPostAction = returnPostAction;
    }

    public void setWindTaskLog(WindTaskLog windTaskLog) {
        this.windTaskLog = windTaskLog;
    }

    public void setWindTaskLogFrom(WindTaskLog windTaskLogFrom) {
        this.windTaskLogFrom = windTaskLogFrom;
    }

    public void setScriptName(String scriptName) {
        this.scriptName = scriptName;
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

    public void setAgvApiService(AgvApiService agvApiService) {
        this.agvApiService = agvApiService;
    }

    public void setDistributeRecordMapper(DistributeRecordMapper distributeRecordMapper) {
        this.distributeRecordMapper = distributeRecordMapper;
    }

    public void setDistributePointRecordMapper(DistributePointRecordMapper distributePointRecordMapper) {
        this.distributePointRecordMapper = distributePointRecordMapper;
    }

    public void setDistributeRecord(DistributeRecord distributeRecord) {
        this.distributeRecord = distributeRecord;
    }

    public void setPointsList(List<DistributePointRecord> pointsList) {
        this.pointsList = pointsList;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof DistributeBp)) {
            return false;
        }
        DistributeBp other = (DistributeBp)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        Boolean this$ordered = this.getOrdered();
        Boolean other$ordered = other.getOrdered();
        if (this$ordered == null ? other$ordered != null : !((Object)this$ordered).equals(other$ordered)) {
            return false;
        }
        String this$fromLoc = this.getFromLoc();
        String other$fromLoc = other.getFromLoc();
        if (this$fromLoc == null ? other$fromLoc != null : !this$fromLoc.equals(other$fromLoc)) {
            return false;
        }
        String this$returnLoc = this.getReturnLoc();
        String other$returnLoc = other.getReturnLoc();
        if (this$returnLoc == null ? other$returnLoc != null : !this$returnLoc.equals(other$returnLoc)) {
            return false;
        }
        String this$group = this.getGroup();
        String other$group = other.getGroup();
        if (this$group == null ? other$group != null : !this$group.equals(other$group)) {
            return false;
        }
        String this$label = this.getLabel();
        String other$label = other.getLabel();
        if (this$label == null ? other$label != null : !this$label.equals(other$label)) {
            return false;
        }
        String this$vehicle = this.getVehicle();
        String other$vehicle = other.getVehicle();
        if (this$vehicle == null ? other$vehicle != null : !this$vehicle.equals(other$vehicle)) {
            return false;
        }
        JSONArray this$array = this.getArray();
        JSONArray other$array = other.getArray();
        if (this$array == null ? other$array != null : !this$array.equals(other$array)) {
            return false;
        }
        String this$loadPostAction = this.getLoadPostAction();
        String other$loadPostAction = other.getLoadPostAction();
        if (this$loadPostAction == null ? other$loadPostAction != null : !this$loadPostAction.equals(other$loadPostAction)) {
            return false;
        }
        JSONArray this$unloadPostActionList = this.getUnloadPostActionList();
        JSONArray other$unloadPostActionList = other.getUnloadPostActionList();
        if (this$unloadPostActionList == null ? other$unloadPostActionList != null : !this$unloadPostActionList.equals(other$unloadPostActionList)) {
            return false;
        }
        String this$returnPostAction = this.getReturnPostAction();
        String other$returnPostAction = other.getReturnPostAction();
        if (this$returnPostAction == null ? other$returnPostAction != null : !this$returnPostAction.equals(other$returnPostAction)) {
            return false;
        }
        WindTaskLog this$windTaskLog = this.getWindTaskLog();
        WindTaskLog other$windTaskLog = other.getWindTaskLog();
        if (this$windTaskLog == null ? other$windTaskLog != null : !this$windTaskLog.equals(other$windTaskLog)) {
            return false;
        }
        WindTaskLog this$windTaskLogFrom = this.getWindTaskLogFrom();
        WindTaskLog other$windTaskLogFrom = other.getWindTaskLogFrom();
        if (this$windTaskLogFrom == null ? other$windTaskLogFrom != null : !this$windTaskLogFrom.equals(other$windTaskLogFrom)) {
            return false;
        }
        String this$scriptName = this.getScriptName();
        String other$scriptName = other.getScriptName();
        if (this$scriptName == null ? other$scriptName != null : !this$scriptName.equals(other$scriptName)) {
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
        if (this$eventSource == null ? other$eventSource != null : !this$eventSource.equals(other$eventSource)) {
            return false;
        }
        AgvApiService this$agvApiService = this.getAgvApiService();
        AgvApiService other$agvApiService = other.getAgvApiService();
        if (this$agvApiService == null ? other$agvApiService != null : !this$agvApiService.equals(other$agvApiService)) {
            return false;
        }
        DistributeRecordMapper this$distributeRecordMapper = this.getDistributeRecordMapper();
        DistributeRecordMapper other$distributeRecordMapper = other.getDistributeRecordMapper();
        if (this$distributeRecordMapper == null ? other$distributeRecordMapper != null : !this$distributeRecordMapper.equals(other$distributeRecordMapper)) {
            return false;
        }
        DistributePointRecordMapper this$distributePointRecordMapper = this.getDistributePointRecordMapper();
        DistributePointRecordMapper other$distributePointRecordMapper = other.getDistributePointRecordMapper();
        if (this$distributePointRecordMapper == null ? other$distributePointRecordMapper != null : !this$distributePointRecordMapper.equals(other$distributePointRecordMapper)) {
            return false;
        }
        DistributeRecord this$distributeRecord = this.getDistributeRecord();
        DistributeRecord other$distributeRecord = other.getDistributeRecord();
        if (this$distributeRecord == null ? other$distributeRecord != null : !this$distributeRecord.equals(other$distributeRecord)) {
            return false;
        }
        List this$pointsList = this.getPointsList();
        List other$pointsList = other.getPointsList();
        return !(this$pointsList == null ? other$pointsList != null : !((Object)this$pointsList).equals(other$pointsList));
    }

    protected boolean canEqual(Object other) {
        return other instanceof DistributeBp;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        Boolean $ordered = this.getOrdered();
        result = result * 59 + ($ordered == null ? 43 : ((Object)$ordered).hashCode());
        String $fromLoc = this.getFromLoc();
        result = result * 59 + ($fromLoc == null ? 43 : $fromLoc.hashCode());
        String $returnLoc = this.getReturnLoc();
        result = result * 59 + ($returnLoc == null ? 43 : $returnLoc.hashCode());
        String $group = this.getGroup();
        result = result * 59 + ($group == null ? 43 : $group.hashCode());
        String $label = this.getLabel();
        result = result * 59 + ($label == null ? 43 : $label.hashCode());
        String $vehicle = this.getVehicle();
        result = result * 59 + ($vehicle == null ? 43 : $vehicle.hashCode());
        JSONArray $array = this.getArray();
        result = result * 59 + ($array == null ? 43 : $array.hashCode());
        String $loadPostAction = this.getLoadPostAction();
        result = result * 59 + ($loadPostAction == null ? 43 : $loadPostAction.hashCode());
        JSONArray $unloadPostActionList = this.getUnloadPostActionList();
        result = result * 59 + ($unloadPostActionList == null ? 43 : $unloadPostActionList.hashCode());
        String $returnPostAction = this.getReturnPostAction();
        result = result * 59 + ($returnPostAction == null ? 43 : $returnPostAction.hashCode());
        WindTaskLog $windTaskLog = this.getWindTaskLog();
        result = result * 59 + ($windTaskLog == null ? 43 : $windTaskLog.hashCode());
        WindTaskLog $windTaskLogFrom = this.getWindTaskLogFrom();
        result = result * 59 + ($windTaskLogFrom == null ? 43 : $windTaskLogFrom.hashCode());
        String $scriptName = this.getScriptName();
        result = result * 59 + ($scriptName == null ? 43 : $scriptName.hashCode());
        List $noticeFailed = this.getNoticeFailed();
        result = result * 59 + ($noticeFailed == null ? 43 : ((Object)$noticeFailed).hashCode());
        List $noticeFinish = this.getNoticeFinish();
        result = result * 59 + ($noticeFinish == null ? 43 : ((Object)$noticeFinish).hashCode());
        WorkSiteMapper $workSiteMapper = this.getWorkSiteMapper();
        result = result * 59 + ($workSiteMapper == null ? 43 : $workSiteMapper.hashCode());
        EventSource $eventSource = this.getEventSource();
        result = result * 59 + ($eventSource == null ? 43 : $eventSource.hashCode());
        AgvApiService $agvApiService = this.getAgvApiService();
        result = result * 59 + ($agvApiService == null ? 43 : $agvApiService.hashCode());
        DistributeRecordMapper $distributeRecordMapper = this.getDistributeRecordMapper();
        result = result * 59 + ($distributeRecordMapper == null ? 43 : $distributeRecordMapper.hashCode());
        DistributePointRecordMapper $distributePointRecordMapper = this.getDistributePointRecordMapper();
        result = result * 59 + ($distributePointRecordMapper == null ? 43 : $distributePointRecordMapper.hashCode());
        DistributeRecord $distributeRecord = this.getDistributeRecord();
        result = result * 59 + ($distributeRecord == null ? 43 : $distributeRecord.hashCode());
        List $pointsList = this.getPointsList();
        result = result * 59 + ($pointsList == null ? 43 : ((Object)$pointsList).hashCode());
        return result;
    }

    public String toString() {
        return "DistributeBp(fromLoc=" + this.getFromLoc() + ", returnLoc=" + this.getReturnLoc() + ", group=" + this.getGroup() + ", label=" + this.getLabel() + ", vehicle=" + this.getVehicle() + ", array=" + this.getArray() + ", ordered=" + this.getOrdered() + ", loadPostAction=" + this.getLoadPostAction() + ", unloadPostActionList=" + this.getUnloadPostActionList() + ", returnPostAction=" + this.getReturnPostAction() + ", windTaskLog=" + this.getWindTaskLog() + ", windTaskLogFrom=" + this.getWindTaskLogFrom() + ", scriptName=" + this.getScriptName() + ", noticeFailed=" + this.getNoticeFailed() + ", noticeFinish=" + this.getNoticeFinish() + ", workSiteMapper=" + this.getWorkSiteMapper() + ", eventSource=" + this.getEventSource() + ", agvApiService=" + this.getAgvApiService() + ", distributeRecordMapper=" + this.getDistributeRecordMapper() + ", distributePointRecordMapper=" + this.getDistributePointRecordMapper() + ", distributeRecord=" + this.getDistributeRecord() + ", pointsList=" + this.getPointsList() + ")";
    }
}

