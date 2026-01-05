/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.alibaba.fastjson.JSON
 *  com.alibaba.fastjson.JSONArray
 *  com.alibaba.fastjson.JSONObject
 *  com.google.common.collect.Maps
 *  com.seer.rds.config.GlobalCacheConfig
 *  com.seer.rds.constant.ApiEnum
 *  com.seer.rds.constant.TaskStatusEnum
 *  com.seer.rds.exception.EndErrorException
 *  com.seer.rds.exception.StopException
 *  com.seer.rds.listener.WindEvent
 *  com.seer.rds.model.wind.BaseRecord
 *  com.seer.rds.model.wind.TaskRecord
 *  com.seer.rds.model.wind.WindBlockRecord
 *  com.seer.rds.schedule.queryOrderListSchedule
 *  com.seer.rds.service.agv.AgvApiService
 *  com.seer.rds.service.factory.RecordUpdaterFactory
 *  com.seer.rds.service.wind.AbstractBp
 *  com.seer.rds.service.wind.AbstratRootBp
 *  com.seer.rds.service.wind.RootBp
 *  com.seer.rds.service.wind.WindTaskStatus
 *  com.seer.rds.service.wind.taskBp.CSelectAgvBp
 *  com.seer.rds.util.BlockStatusUtils
 *  com.seer.rds.util.OkHttpUtil
 *  com.seer.rds.vo.WindBlockVo
 *  com.seer.rds.vo.wind.CSelectAgvBpField
 *  com.seer.rds.vo.wind.ParamPreField
 *  org.apache.commons.collections.CollectionUtils
 *  org.apache.commons.compress.utils.Lists
 *  org.apache.commons.lang3.StringUtils
 *  org.slf4j.Logger
 *  org.slf4j.LoggerFactory
 *  org.springframework.beans.factory.annotation.Autowired
 *  org.springframework.context.annotation.Scope
 *  org.springframework.stereotype.Component
 */
package com.seer.rds.service.wind.taskBp;

import com.alibaba.fastjson.JSON;
import com.alibaba.fastjson.JSONArray;
import com.alibaba.fastjson.JSONObject;
import com.google.common.collect.Maps;
import com.seer.rds.config.GlobalCacheConfig;
import com.seer.rds.constant.ApiEnum;
import com.seer.rds.constant.TaskStatusEnum;
import com.seer.rds.exception.EndErrorException;
import com.seer.rds.exception.StopException;
import com.seer.rds.listener.WindEvent;
import com.seer.rds.model.wind.BaseRecord;
import com.seer.rds.model.wind.TaskRecord;
import com.seer.rds.model.wind.WindBlockRecord;
import com.seer.rds.schedule.queryOrderListSchedule;
import com.seer.rds.service.agv.AgvApiService;
import com.seer.rds.service.factory.RecordUpdaterFactory;
import com.seer.rds.service.wind.AbstractBp;
import com.seer.rds.service.wind.AbstratRootBp;
import com.seer.rds.service.wind.RootBp;
import com.seer.rds.service.wind.WindTaskStatus;
import com.seer.rds.util.BlockStatusUtils;
import com.seer.rds.util.OkHttpUtil;
import com.seer.rds.vo.WindBlockVo;
import com.seer.rds.vo.wind.CSelectAgvBpField;
import com.seer.rds.vo.wind.ParamPreField;
import java.io.IOException;
import java.io.InterruptedIOException;
import java.time.Instant;
import java.util.Arrays;
import java.util.Collection;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
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

@Component
@Scope(value="prototype")
public class CSelectAgvBp
extends AbstractBp<TaskRecord> {
    private static final Logger log = LoggerFactory.getLogger(CSelectAgvBp.class);
    private String id;
    private Integer priority;
    private String vehicle;
    private String label;
    private String group;
    private List<String> keyRoute;
    private List<Object> blocks = Lists.newArrayList();
    private Boolean complete;
    private String externalId;
    private String selectedAgvId;
    private String keyTask;
    private Boolean prePointRedo;
    private Integer mapfPriority;
    private String keyGoodsId;
    private Integer loadBlockCount;
    @Autowired
    private AgvApiService agvApiService;

    protected void getInputParamsAndExecute(AbstratRootBp rootBp) throws Exception {
        String state = BlockStatusUtils.getBlockStatus((BaseRecord)this.taskRecord, (WindBlockVo)this.blockVo);
        String orderId = "";
        String orderIdPre = "";
        ConcurrentHashMap cacheBlockIfResetMap = GlobalCacheConfig.getCacheBlockIfResetMap((String)((TaskRecord)this.taskRecord).getId());
        if (cacheBlockIfResetMap != null) {
            orderIdPre = (String)cacheBlockIfResetMap.get("orderId" + this.blockVo.getBlockId());
        }
        orderId = "End".equals(state) || "Running".equals(state) && !"".equals(orderIdPre) && orderIdPre != null ? orderIdPre : (this.blockRecord != null && StringUtils.isNotEmpty((CharSequence)this.blockRecord.getOrderId()) ? this.blockRecord.getOrderId() : UUID.randomUUID().toString());
        this.blockRecord.setRemark(this.blockVo.getRemark());
        this.blockVo.setOperationParentBlockId(this.blockVo.getBlockId());
        this.blockRecord.setOrderId(orderId);
        super.getWindService().saveBlockRecord(this.blockRecord, this.blockVo.getBlockId(), this.blockVo.getBlockType(), ((TaskRecord)this.taskRecord).getProjectId(), this.taskId, ((TaskRecord)this.taskRecord).getId(), null, this.startOn);
        this.saveLogInfo(String.format("@{wind.bp.orderId}=%s", orderId));
        Object priorityObj = rootBp.getInputParamValue(this.taskId, this.inputParams, CSelectAgvBpField.priority);
        Integer priority = priorityObj != null ? Integer.parseInt(priorityObj.toString()) : 1;
        ((TaskRecord)this.taskRecord).setPriority(priority);
        RootBp.taskPriority.put(((TaskRecord)this.taskRecord).getId(), ((TaskRecord)this.taskRecord).getPriority());
        String vehicle = (String)rootBp.getInputParamValue(this.taskId, this.inputParams, CSelectAgvBpField.vehicle);
        String tag = (String)rootBp.getInputParamValue(this.taskId, this.inputParams, CSelectAgvBpField.tag);
        String group = (String)rootBp.getInputParamValue(this.taskId, this.inputParams, CSelectAgvBpField.group);
        String keyRouteStr = (String)rootBp.getInputParamValue(this.taskId, this.inputParams, CSelectAgvBpField.keyRoute);
        String keyTask = (String)rootBp.getInputParamValue(this.taskId, this.inputParams, CSelectAgvBpField.keyTask);
        Object prePointRedo = rootBp.getInputParamValue(this.taskId, this.inputParams, CSelectAgvBpField.prePointRedo);
        Object mapfObj = rootBp.getInputParamValue(this.taskId, this.inputParams, CSelectAgvBpField.mapfPriority);
        Object goodsIdObj = this.blockInputParamsValue.get(CSelectAgvBpField.keyGoodsId);
        Object loadBlockCount = this.blockInputParamsValue.get(CSelectAgvBpField.loadBlockCount);
        List<Object> keyRoute = Lists.newArrayList();
        if (!StringUtils.isNotEmpty((CharSequence)keyRouteStr)) {
            throw new EndErrorException("@{wind.bp.keyRouteEmpty}");
        }
        keyRoute = Arrays.asList(keyRouteStr.split(","));
        ((TaskRecord)this.taskRecord).getOrderId().set(orderId);
        CSelectAgvBp initObj = new CSelectAgvBp();
        initObj.setId(orderId);
        initObj.setPriority(priority);
        initObj.setVehicle(vehicle);
        initObj.setLabel(tag);
        initObj.setGroup(group);
        initObj.setKeyRoute((List)keyRoute);
        initObj.setExternalId(((TaskRecord)this.taskRecord).getId());
        initObj.setKeyTask(keyTask);
        if (goodsIdObj != null) {
            initObj.setKeyGoodsId(goodsIdObj.toString());
        }
        if (prePointRedo != null) {
            initObj.setPrePointRedo(Boolean.valueOf(Boolean.parseBoolean(prePointRedo.toString())));
        }
        if (mapfObj != null) {
            initObj.setMapfPriority(Integer.valueOf(Integer.parseInt(mapfObj.toString())));
        }
        if (loadBlockCount != null) {
            initObj.setLoadBlockCount(Integer.valueOf(Integer.parseInt(loadBlockCount.toString())));
        }
        String param = JSONObject.toJSONString((Object)initObj);
        log.info("CSelectAgvBp setOrder orderId={}, param={}", (Object)orderId, (Object)param);
        RecordUpdaterFactory.getUpdater((BaseRecord)this.taskRecord).updateRecord(this.taskRecord);
        boolean taskStatus = true;
        while (taskStatus) {
            this.checkIfInterrupt();
            Object taskStatusObj = GlobalCacheConfig.getCache((String)(this.taskId + ((TaskRecord)this.taskRecord).getId()));
            taskStatus = taskStatusObj == null || ((Integer)taskStatusObj).intValue() == TaskStatusEnum.running.getStatus();
            try {
                OkHttpUtil.postJsonParams((String)RootBp.getUrl((String)ApiEnum.setOrder.getUri()), (String)param);
                break;
            }
            catch (InterruptedIOException e) {
                this.saveLogError(e.getMessage());
                if (!"StopBranchKey".equals(GlobalCacheConfig.getCacheInterrupt((String)((TaskRecord)this.taskRecord).getId()))) continue;
                throw e;
            }
            catch (IOException e) {
                this.saveLogError(e.getMessage());
                Thread.sleep(3000L);
                log.error("setOrder error,retry", (Throwable)e);
            }
        }
        this.noticeSendOrderOk((Object)initObj);
        String agvId = this.querySelectAgv(rootBp, this.taskId, (TaskRecord)this.taskRecord, this.blockVo, this.blockRecord, this.inputParams, this.childDefaultArray, orderId, initObj);
        GlobalCacheConfig.clearTaskErrorCache((String)(((TaskRecord)this.taskRecord).getId() + "b" + this.blockRecord.getBlockConfigId()));
        this.sysAlarmService.deleteTaskAlarmAndNoticeWeb(((TaskRecord)this.taskRecord).getId() + "b" + this.blockRecord.getBlockConfigId());
        if (this.childDefaultArray != null) {
            JSONArray childArray = (JSONArray)this.childDefaultArray;
            rootBp.executeChild(rootBp, this.taskId, this.taskRecord, childArray, Boolean.valueOf(true));
        }
        this.orderMarkComplete();
        this.updateExecuteTime(rootBp);
        Object newAgvId = this.getBlockOutParamsValue(rootBp, this.blockRecord.getBlockConfigId(), CSelectAgvBpField.ctxSelectedAgvId);
        this.agvPath(newAgvId == null ? agvId : newAgvId.toString());
        RootBp.windTaskRecordMap.put(((TaskRecord)this.taskRecord).getId(), this.taskRecord);
        if (cacheBlockIfResetMap != null) {
            BlockStatusUtils.ClearBlockStaus((BaseRecord)this.taskRecord, (String)this.blockVo.getBlockId().toString());
            BlockStatusUtils.ClearBlockStaus((BaseRecord)this.taskRecord, (String)("orderId" + this.blockVo.getBlockId()));
        }
    }

    protected void runChildBlock(AbstratRootBp rootBp) {
    }

    /*
     * WARNING - Removed try catching itself - possible behaviour change.
     */
    private void updateExecuteTime(AbstratRootBp rootBp) throws InterruptedIOException, InterruptedException {
        while (true) {
            this.checkIfInterrupt();
            try {
                Thread.sleep(500L);
                String taskRes = OkHttpUtil.get((String)(RootBp.getUrl((String)ApiEnum.orderDetails.getUri()) + "/" + (String)((TaskRecord)this.taskRecord).getOrderId().get()));
                if (!StringUtils.isNotEmpty((CharSequence)taskRes) || !"STOPPED".equals(JSONObject.parseObject((String)taskRes).getString("state")) && !"FINISHED".equals(JSONObject.parseObject((String)taskRes).getString("state"))) continue;
                log.info("CSelectAgvBp setOrder orderId={}, result={}", ((TaskRecord)this.taskRecord).getOrderId().get(), (Object)taskRes);
                Integer createTime = JSONObject.parseObject((String)taskRes).getInteger("createTime");
                Integer terminalTime = JSONObject.parseObject((String)taskRes).getInteger("terminalTime");
                AbstratRootBp abstratRootBp = rootBp;
                synchronized (abstratRootBp) {
                    ((TaskRecord)this.taskRecord).setExecutorTime(Integer.valueOf((((TaskRecord)this.taskRecord).getExecutorTime() == null ? 0 : ((TaskRecord)this.taskRecord).getExecutorTime()) + (terminalTime - createTime)));
                }
                RecordUpdaterFactory.getUpdater((BaseRecord)this.taskRecord).updateRecord(this.taskRecord);
            }
            catch (InterruptedIOException e) {
                if (!"StopBranchKey".equals(GlobalCacheConfig.getCacheInterrupt((String)((TaskRecord)this.taskRecord).getId()))) continue;
                throw e;
            }
            catch (IOException e) {
                log.error("update ExecutorTime error\uff0corderId:{}\uff0cException:{}", (Object)((TaskRecord)this.taskRecord).getId(), (Object)e);
                continue;
            }
            catch (Exception e) {
                log.error("update ExecutorTime error\uff0corderId:{}\uff0cException:{}", (Object)((TaskRecord)this.taskRecord).getId(), (Object)e);
                continue;
            }
            break;
        }
    }

    private void orderMarkComplete() throws InterruptedException {
        JSONObject param = new JSONObject();
        Object orderCache = GlobalCacheConfig.getCache((String)(((TaskRecord)this.taskRecord).getId() + "Order"));
        if (orderCache != null) {
            param.put("id", orderCache);
            InheritableThreadLocal<String> order = new InheritableThreadLocal<String>();
            order.set(String.valueOf(orderCache));
            ((TaskRecord)this.taskRecord).setOrderId(order);
        } else if (((TaskRecord)this.taskRecord).getOrderId().get() != null) {
            param.put("id", ((TaskRecord)this.taskRecord).getOrderId().get());
        }
        this.blockRecord.setOrderId((String)((TaskRecord)this.taskRecord).getOrderId().get());
        super.getWindService().saveBlockRecord(this.blockRecord);
        boolean _taskStatus = true;
        while (_taskStatus) {
            Object taskStatusObj = GlobalCacheConfig.getCache((String)(this.taskId + ((TaskRecord)this.taskRecord).getId()));
            _taskStatus = taskStatusObj == null || ((Integer)taskStatusObj).intValue() == TaskStatusEnum.running.getStatus();
            try {
                String complete = OkHttpUtil.postJsonParams((String)RootBp.getUrl((String)ApiEnum.markComplete.getUri()), (String)param.toJSONString());
                log.info("complete task resp={}", (Object)complete);
                break;
            }
            catch (InterruptedIOException e) {
                Thread.currentThread().interrupt();
                this.checkIfInterrupt();
            }
            catch (IOException ee) {
                try {
                    Thread.sleep(3000L);
                }
                catch (InterruptedException ex) {
                    log.error("complete task sleep error {}", (Object)ex.getMessage());
                    Thread.currentThread().interrupt();
                    this.checkIfInterrupt();
                }
                log.error("complete task,retry taskRecordId = {}", (Object)((TaskRecord)this.taskRecord).getId());
            }
        }
    }

    /*
     * WARNING - Removed try catching itself - possible behaviour change.
     */
    private void agvPath(String agvId) {
        Map<String, String> onceOperationPath = new HashMap();
        String pathStr = ((TaskRecord)this.taskRecord).getPath();
        if (StringUtils.isNotEmpty((CharSequence)pathStr)) {
            JSONObject allVehiclePath = JSON.parseObject((String)pathStr);
            JSONArray specificAGVPathArray = allVehiclePath.getJSONArray(agvId);
            onceOperationPath = (Map)specificAGVPathArray.getObject(specificAGVPathArray.size() - 1, Map.class);
            Object startTime = specificAGVPathArray.getJSONObject(specificAGVPathArray.size() - 1).get((Object)"StartTime");
            onceOperationPath.put("StartTime", startTime != null ? startTime.toString() : "");
            Object load = onceOperationPath.get("load");
            onceOperationPath.put("load", load != null ? load.toString() : "");
            Object location = onceOperationPath.get("location");
            onceOperationPath.put("location", location != null ? location.toString() : "");
            Object endTime = onceOperationPath.get("endTime");
            onceOperationPath.put("endTime", endTime != null ? endTime.toString() : "");
            onceOperationPath.put("endSite", "END");
            specificAGVPathArray.remove(specificAGVPathArray.size() - 1);
            specificAGVPathArray.add(onceOperationPath);
            allVehiclePath.put(agvId, (Object)specificAGVPathArray);
            TaskRecord taskRecord = (TaskRecord)this.taskRecord;
            synchronized (taskRecord) {
                ((TaskRecord)this.taskRecord).setPath(RootBp.updatePathByAgvId((String)((TaskRecord)this.taskRecord).getPath(), (String)agvId, (List)specificAGVPathArray));
            }
            super.getWindService().updateTaskRecordPath((TaskRecord)this.taskRecord, agvId, (List)specificAGVPathArray);
        }
    }

    private String querySelectAgv(AbstratRootBp rootBp, String taskId, TaskRecord taskRecord, WindBlockVo blockVo, WindBlockRecord blockRecord, JSONObject inputParams, Object childDefaultArray, String orderId, CSelectAgvBp agvBp) throws InterruptedException {
        try {
            Thread.sleep(1000L);
        }
        catch (InterruptedException e) {
            log.error("CSelectAgvBp error", (Throwable)e);
        }
        String agvId = "";
        String orderState = "";
        int firstExecutorTime = 0;
        boolean taskStatus = true;
        String state = "";
        String errorCode = "";
        while (true) {
            this.checkIfInterrupt();
            try {
                String taskRes = queryOrderListSchedule.queryOrder((String)orderId, (Instant)Instant.now());
                if (taskRes == null) {
                    taskRes = OkHttpUtil.get((String)(RootBp.getUrl((String)ApiEnum.orderDetails.getUri()) + "/" + orderId));
                }
                if ((StringUtils.isEmpty((CharSequence)taskRes) || "null".equals(taskRes)) && StringUtils.equals((CharSequence)state, (CharSequence)orderState)) {
                    log.info("CSelectAgvBp setOrder orderId={},  result={},from core", (Object)orderId, (Object)taskRes);
                    state = "First";
                    Thread.sleep(1000L);
                    WindTaskStatus.sendTaskEndErrorAndTaskStop((AbstractBp)this, (String)orderState);
                    continue;
                }
                if (StringUtils.isNotEmpty((CharSequence)taskRes) && !"null".equals(taskRes)) {
                    JSONObject jsonRes = JSONObject.parseObject((String)taskRes);
                    orderState = jsonRes.getString("state");
                    if (!StringUtils.equals((CharSequence)state, (CharSequence)orderState)) {
                        log.info("CSelectAgvBp setOrder orderId={},  result={},from core", (Object)orderId, (Object)taskRes);
                        state = orderState;
                    }
                    if ("STOPPED".equals(orderState)) {
                        Object taskStatusObj = GlobalCacheConfig.getCache((String)(taskId + taskRecord.getId()));
                        taskStatus = taskStatusObj == null || ((Integer)taskStatusObj).intValue() == TaskStatusEnum.stop.getStatus();
                        Integer createTime = JSONObject.parseObject((String)taskRes).getInteger("createTime");
                        Integer terminalTime = JSONObject.parseObject((String)taskRes).getInteger("terminalTime");
                        firstExecutorTime = JSONObject.parseObject((String)taskRes).getInteger("createTime");
                        agvId = JSONObject.parseObject((String)taskRes).getString(CSelectAgvBpField.vehicle);
                        this.updateTaskTimeAndAgv(rootBp, Integer.valueOf(firstExecutorTime), Integer.valueOf(terminalTime - createTime), agvId);
                        if (!taskStatus) {
                            JSONArray errArray = jsonRes.getJSONArray("errors");
                            String reason = "";
                            if (CollectionUtils.isNotEmpty((Collection)errArray)) {
                                reason = ((JSONObject)errArray.get(0)).getString("desc");
                                errorCode = ((JSONObject)errArray.get(0)).getString("code");
                            }
                            this.windEvent = WindEvent.builder().type(Integer.valueOf(0)).status(String.valueOf(TaskStatusEnum.stop.getStatus())).taskId(taskId).taskRecord(taskRecord).taskLabel(taskRecord.getDefLabel()).errorDesc(reason).errorCode(errorCode).build();
                            throw new EndErrorException(String.format("@{wind.bp.orderStop}, @{wind.bp.orderId}=%s, @{wind.bp.reason}=%s", jsonRes.getString("id"), reason));
                        }
                        throw new StopException("@{wind.bp.stopHand}");
                    }
                }
                if (StringUtils.isNotEmpty((CharSequence)taskRes) && Objects.nonNull(JSONObject.parseObject((String)taskRes)) && JSONObject.parseObject((String)taskRes).containsKey((Object)CSelectAgvBpField.vehicle) && StringUtils.isNotEmpty((CharSequence)JSONObject.parseObject((String)taskRes).getString(CSelectAgvBpField.vehicle)) && ("WAITING".equals(orderState) || "FAILED".equals(orderState) || "FINISHED".equals(orderState))) {
                    agvId = JSONObject.parseObject((String)taskRes).getString(CSelectAgvBpField.vehicle);
                    log.info("CSelectAgvBp setOrder orderId={}, result={}", (Object)orderId, (Object)taskRes);
                    if (StringUtils.isNotEmpty((CharSequence)agvId)) {
                        firstExecutorTime = JSONObject.parseObject((String)taskRes).getInteger("createTime");
                        break;
                    }
                }
                if (StringUtils.isNotEmpty((CharSequence)taskRes)) {
                    JSONArray notArray = JSONObject.parseObject((String)taskRes).getJSONArray("notices");
                    String reason = "";
                    if (CollectionUtils.isNotEmpty((Collection)notArray)) {
                        reason = ((JSONObject)notArray.get(0)).getString("desc");
                        this.saveLogSuspend(reason);
                    }
                }
                WindTaskStatus.sendTaskEndErrorAndTaskStop((AbstractBp)this, (String)orderState);
                Thread.sleep(1000L);
                continue;
            }
            catch (IOException e) {
                log.error("SelectAgvBp query core error: {}", (Throwable)e);
                continue;
            }
            catch (InterruptedException e) {
                log.error("SelectAgvBp query core error: {}", (Throwable)e);
                continue;
            }
            catch (Exception e) {
                throw e;
            }
            break;
        }
        this.saveLogInfo(String.format("@{wind.bp.selectRobotResult}=%s", agvId));
        Map paramMap = (Map)((ConcurrentHashMap)AbstratRootBp.outputParamsMap.get()).get(ParamPreField.blocks);
        ConcurrentMap childParamMap = Maps.newConcurrentMap();
        childParamMap.put(CSelectAgvBpField.ctxSelectedAgvId, agvId);
        paramMap.put(blockVo.getBlockName(), childParamMap);
        ((ConcurrentHashMap)AbstratRootBp.outputParamsMap.get()).put(ParamPreField.blocks, paramMap);
        blockRecord.setOutputParams(JSONObject.toJSONString(AbstratRootBp.outputParamsMap.get()));
        blockRecord.setInputParams(JSONObject.toJSONString(AbstratRootBp.inputParamsMap.get()));
        blockRecord.setInternalVariables(JSONObject.toJSONString(AbstratRootBp.taskVariablesMap.get()));
        blockRecord.setBlockInputParams(inputParams != null ? inputParams.toJSONString() : null);
        agvBp.setSelectedAgvId(agvId);
        super.getWindService().saveBlockRecord(blockRecord);
        taskRecord.setEndedReason("[CSelectAgvBp]@{wind.bp.end}\uff0cagvId=" + agvId);
        this.updateTaskTimeAndAgv(rootBp, Integer.valueOf(firstExecutorTime), null, agvId);
        return agvId;
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

    private void noticeSendOrderOk(Object o) {
        WindEvent event = WindEvent.builder().type(Integer.valueOf(14)).taskRecord((TaskRecord)this.taskRecord).blockRecord(this.blockRecord).blockVo(this.blockVo).taskId(this.taskId).taskLabel(((TaskRecord)this.taskRecord).getDefLabel()).data(o).build();
        this.eventSource.notify(event);
    }

    public String getId() {
        return this.id;
    }

    public Integer getPriority() {
        return this.priority;
    }

    public String getVehicle() {
        return this.vehicle;
    }

    public String getLabel() {
        return this.label;
    }

    public String getGroup() {
        return this.group;
    }

    public List<String> getKeyRoute() {
        return this.keyRoute;
    }

    public List<Object> getBlocks() {
        return this.blocks;
    }

    public Boolean getComplete() {
        return this.complete;
    }

    public String getExternalId() {
        return this.externalId;
    }

    public String getSelectedAgvId() {
        return this.selectedAgvId;
    }

    public String getKeyTask() {
        return this.keyTask;
    }

    public Boolean getPrePointRedo() {
        return this.prePointRedo;
    }

    public Integer getMapfPriority() {
        return this.mapfPriority;
    }

    public String getKeyGoodsId() {
        return this.keyGoodsId;
    }

    public Integer getLoadBlockCount() {
        return this.loadBlockCount;
    }

    public AgvApiService getAgvApiService() {
        return this.agvApiService;
    }

    public void setId(String id) {
        this.id = id;
    }

    public void setPriority(Integer priority) {
        this.priority = priority;
    }

    public void setVehicle(String vehicle) {
        this.vehicle = vehicle;
    }

    public void setLabel(String label) {
        this.label = label;
    }

    public void setGroup(String group) {
        this.group = group;
    }

    public void setKeyRoute(List<String> keyRoute) {
        this.keyRoute = keyRoute;
    }

    public void setBlocks(List<Object> blocks) {
        this.blocks = blocks;
    }

    public void setComplete(Boolean complete) {
        this.complete = complete;
    }

    public void setExternalId(String externalId) {
        this.externalId = externalId;
    }

    public void setSelectedAgvId(String selectedAgvId) {
        this.selectedAgvId = selectedAgvId;
    }

    public void setKeyTask(String keyTask) {
        this.keyTask = keyTask;
    }

    public void setPrePointRedo(Boolean prePointRedo) {
        this.prePointRedo = prePointRedo;
    }

    public void setMapfPriority(Integer mapfPriority) {
        this.mapfPriority = mapfPriority;
    }

    public void setKeyGoodsId(String keyGoodsId) {
        this.keyGoodsId = keyGoodsId;
    }

    public void setLoadBlockCount(Integer loadBlockCount) {
        this.loadBlockCount = loadBlockCount;
    }

    public void setAgvApiService(AgvApiService agvApiService) {
        this.agvApiService = agvApiService;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof CSelectAgvBp)) {
            return false;
        }
        CSelectAgvBp other = (CSelectAgvBp)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        Integer this$priority = this.getPriority();
        Integer other$priority = other.getPriority();
        if (this$priority == null ? other$priority != null : !((Object)this$priority).equals(other$priority)) {
            return false;
        }
        Boolean this$complete = this.getComplete();
        Boolean other$complete = other.getComplete();
        if (this$complete == null ? other$complete != null : !((Object)this$complete).equals(other$complete)) {
            return false;
        }
        Boolean this$prePointRedo = this.getPrePointRedo();
        Boolean other$prePointRedo = other.getPrePointRedo();
        if (this$prePointRedo == null ? other$prePointRedo != null : !((Object)this$prePointRedo).equals(other$prePointRedo)) {
            return false;
        }
        Integer this$mapfPriority = this.getMapfPriority();
        Integer other$mapfPriority = other.getMapfPriority();
        if (this$mapfPriority == null ? other$mapfPriority != null : !((Object)this$mapfPriority).equals(other$mapfPriority)) {
            return false;
        }
        Integer this$loadBlockCount = this.getLoadBlockCount();
        Integer other$loadBlockCount = other.getLoadBlockCount();
        if (this$loadBlockCount == null ? other$loadBlockCount != null : !((Object)this$loadBlockCount).equals(other$loadBlockCount)) {
            return false;
        }
        String this$id = this.getId();
        String other$id = other.getId();
        if (this$id == null ? other$id != null : !this$id.equals(other$id)) {
            return false;
        }
        String this$vehicle = this.getVehicle();
        String other$vehicle = other.getVehicle();
        if (this$vehicle == null ? other$vehicle != null : !this$vehicle.equals(other$vehicle)) {
            return false;
        }
        String this$label = this.getLabel();
        String other$label = other.getLabel();
        if (this$label == null ? other$label != null : !this$label.equals(other$label)) {
            return false;
        }
        String this$group = this.getGroup();
        String other$group = other.getGroup();
        if (this$group == null ? other$group != null : !this$group.equals(other$group)) {
            return false;
        }
        List this$keyRoute = this.getKeyRoute();
        List other$keyRoute = other.getKeyRoute();
        if (this$keyRoute == null ? other$keyRoute != null : !((Object)this$keyRoute).equals(other$keyRoute)) {
            return false;
        }
        List this$blocks = this.getBlocks();
        List other$blocks = other.getBlocks();
        if (this$blocks == null ? other$blocks != null : !((Object)this$blocks).equals(other$blocks)) {
            return false;
        }
        String this$externalId = this.getExternalId();
        String other$externalId = other.getExternalId();
        if (this$externalId == null ? other$externalId != null : !this$externalId.equals(other$externalId)) {
            return false;
        }
        String this$selectedAgvId = this.getSelectedAgvId();
        String other$selectedAgvId = other.getSelectedAgvId();
        if (this$selectedAgvId == null ? other$selectedAgvId != null : !this$selectedAgvId.equals(other$selectedAgvId)) {
            return false;
        }
        String this$keyTask = this.getKeyTask();
        String other$keyTask = other.getKeyTask();
        if (this$keyTask == null ? other$keyTask != null : !this$keyTask.equals(other$keyTask)) {
            return false;
        }
        String this$keyGoodsId = this.getKeyGoodsId();
        String other$keyGoodsId = other.getKeyGoodsId();
        if (this$keyGoodsId == null ? other$keyGoodsId != null : !this$keyGoodsId.equals(other$keyGoodsId)) {
            return false;
        }
        AgvApiService this$agvApiService = this.getAgvApiService();
        AgvApiService other$agvApiService = other.getAgvApiService();
        return !(this$agvApiService == null ? other$agvApiService != null : !this$agvApiService.equals(other$agvApiService));
    }

    protected boolean canEqual(Object other) {
        return other instanceof CSelectAgvBp;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        Integer $priority = this.getPriority();
        result = result * 59 + ($priority == null ? 43 : ((Object)$priority).hashCode());
        Boolean $complete = this.getComplete();
        result = result * 59 + ($complete == null ? 43 : ((Object)$complete).hashCode());
        Boolean $prePointRedo = this.getPrePointRedo();
        result = result * 59 + ($prePointRedo == null ? 43 : ((Object)$prePointRedo).hashCode());
        Integer $mapfPriority = this.getMapfPriority();
        result = result * 59 + ($mapfPriority == null ? 43 : ((Object)$mapfPriority).hashCode());
        Integer $loadBlockCount = this.getLoadBlockCount();
        result = result * 59 + ($loadBlockCount == null ? 43 : ((Object)$loadBlockCount).hashCode());
        String $id = this.getId();
        result = result * 59 + ($id == null ? 43 : $id.hashCode());
        String $vehicle = this.getVehicle();
        result = result * 59 + ($vehicle == null ? 43 : $vehicle.hashCode());
        String $label = this.getLabel();
        result = result * 59 + ($label == null ? 43 : $label.hashCode());
        String $group = this.getGroup();
        result = result * 59 + ($group == null ? 43 : $group.hashCode());
        List $keyRoute = this.getKeyRoute();
        result = result * 59 + ($keyRoute == null ? 43 : ((Object)$keyRoute).hashCode());
        List $blocks = this.getBlocks();
        result = result * 59 + ($blocks == null ? 43 : ((Object)$blocks).hashCode());
        String $externalId = this.getExternalId();
        result = result * 59 + ($externalId == null ? 43 : $externalId.hashCode());
        String $selectedAgvId = this.getSelectedAgvId();
        result = result * 59 + ($selectedAgvId == null ? 43 : $selectedAgvId.hashCode());
        String $keyTask = this.getKeyTask();
        result = result * 59 + ($keyTask == null ? 43 : $keyTask.hashCode());
        String $keyGoodsId = this.getKeyGoodsId();
        result = result * 59 + ($keyGoodsId == null ? 43 : $keyGoodsId.hashCode());
        AgvApiService $agvApiService = this.getAgvApiService();
        result = result * 59 + ($agvApiService == null ? 43 : $agvApiService.hashCode());
        return result;
    }

    public String toString() {
        return "CSelectAgvBp(id=" + this.getId() + ", priority=" + this.getPriority() + ", vehicle=" + this.getVehicle() + ", label=" + this.getLabel() + ", group=" + this.getGroup() + ", keyRoute=" + this.getKeyRoute() + ", blocks=" + this.getBlocks() + ", complete=" + this.getComplete() + ", externalId=" + this.getExternalId() + ", selectedAgvId=" + this.getSelectedAgvId() + ", keyTask=" + this.getKeyTask() + ", prePointRedo=" + this.getPrePointRedo() + ", mapfPriority=" + this.getMapfPriority() + ", keyGoodsId=" + this.getKeyGoodsId() + ", loadBlockCount=" + this.getLoadBlockCount() + ", agvApiService=" + this.getAgvApiService() + ")";
    }
}

