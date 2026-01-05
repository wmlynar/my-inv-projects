/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.alibaba.fastjson.JSONArray
 *  com.alibaba.fastjson.JSONObject
 *  com.google.common.collect.Maps
 *  com.seer.rds.config.GlobalCacheConfig
 *  com.seer.rds.constant.ApiEnum
 *  com.seer.rds.constant.TaskBlockStatusEnum
 *  com.seer.rds.constant.TaskLogLevelEnum
 *  com.seer.rds.constant.TaskStatusEnum
 *  com.seer.rds.listener.EventSource
 *  com.seer.rds.listener.WindEvent
 *  com.seer.rds.model.wind.BaseRecord
 *  com.seer.rds.model.wind.TaskRecord
 *  com.seer.rds.model.wind.WindTaskLog
 *  com.seer.rds.model.wind.WindTaskRecord
 *  com.seer.rds.service.agv.AgvApiService
 *  com.seer.rds.service.factory.RecordUpdaterFactory
 *  com.seer.rds.service.wind.AbstractBp
 *  com.seer.rds.service.wind.AbstratRootBp
 *  com.seer.rds.service.wind.RootBp
 *  com.seer.rds.service.wind.taskBp.CAgvAreasToAreasBp
 *  com.seer.rds.service.wind.taskBp.CAgvAreasToAreasBp$Blocks
 *  com.seer.rds.util.OkHttpUtil
 *  com.seer.rds.vo.wind.CAgvAreasToAreasBpField
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
import com.seer.rds.constant.ApiEnum;
import com.seer.rds.constant.TaskBlockStatusEnum;
import com.seer.rds.constant.TaskLogLevelEnum;
import com.seer.rds.constant.TaskStatusEnum;
import com.seer.rds.listener.EventSource;
import com.seer.rds.listener.WindEvent;
import com.seer.rds.model.wind.BaseRecord;
import com.seer.rds.model.wind.TaskRecord;
import com.seer.rds.model.wind.WindTaskLog;
import com.seer.rds.model.wind.WindTaskRecord;
import com.seer.rds.service.agv.AgvApiService;
import com.seer.rds.service.factory.RecordUpdaterFactory;
import com.seer.rds.service.wind.AbstractBp;
import com.seer.rds.service.wind.AbstratRootBp;
import com.seer.rds.service.wind.RootBp;
import com.seer.rds.service.wind.taskBp.CAgvAreasToAreasBp;
import com.seer.rds.util.OkHttpUtil;
import com.seer.rds.vo.wind.CAgvAreasToAreasBpField;
import java.lang.invoke.CallSite;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import org.apache.commons.lang3.StringUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Scope;
import org.springframework.stereotype.Component;
import unitauto.JSON;

@Component(value="CAgvAreasToAreasBp")
@Scope(value="prototype")
public class CAgvAreasToAreasBp
extends AbstractBp<TaskRecord> {
    private static final Logger log = LoggerFactory.getLogger(CAgvAreasToAreasBp.class);
    private List fromBinAreasArray;
    private List toBinAreasArray;
    private String group;
    private String label;
    private String vehicle;
    private WindTaskLog windTaskLog;
    @Autowired
    private EventSource eventSource;
    @Autowired
    private AgvApiService agvApiService;

    protected void getInputParamsAndExecute(AbstratRootBp rootBp) throws Exception {
        Object fromBinAreas = rootBp.getInputParamValue(this.taskId, this.inputParams, CAgvAreasToAreasBpField.fromBinAreas);
        Object toBinAreas = rootBp.getInputParamValue(this.taskId, this.inputParams, CAgvAreasToAreasBpField.toBinAreas);
        this.group = (String)rootBp.getInputParamValue(this.taskId, this.inputParams, CAgvAreasToAreasBpField.group);
        this.label = (String)rootBp.getInputParamValue(this.taskId, this.inputParams, CAgvAreasToAreasBpField.label);
        this.vehicle = (String)rootBp.getInputParamValue(this.taskId, this.inputParams, CAgvAreasToAreasBpField.vehicle);
        if (fromBinAreas != null && toBinAreas != null) {
            try {
                Object parseFromArea = JSON.parse((Object)fromBinAreas);
                String parseFromAreaString = parseFromArea.toString();
                this.fromBinAreasArray = JSONObject.parseArray((String)parseFromAreaString);
                Object parseToArea = JSON.parse((Object)toBinAreas);
                String parseToAreaString = parseToArea.toString();
                this.toBinAreasArray = JSONObject.parseArray((String)parseToAreaString);
            }
            catch (Exception e) {
                throw new Exception("wrong array!", e);
            }
        } else {
            throw new RuntimeException("fromBinAreas or toBinAreas is null!");
        }
        HashMap params = Maps.newHashMap();
        params.put("group", this.group);
        params.put("label", this.label);
        params.put("vehicle", this.vehicle);
        params.put("fromBinAreas", this.fromBinAreasArray);
        params.put("toBinAreas", this.toBinAreasArray);
        params.put("externalId", ((TaskRecord)this.taskRecord).getId());
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
        this.windTaskLog = super.getWindService().saveLog(TaskLogLevelEnum.info.getLevel(), String.format("[CAgvAreasToAreasBp]@{wind.bp.start},fromBinAreas:%s,toBinAreas%s,group:%s,label:%s,vehicle:%s", this.fromBinAreasArray, this.toBinAreasArray, this.group, this.label, this.vehicle), ((TaskRecord)this.taskRecord).getProjectId(), this.taskId, ((TaskRecord)this.taskRecord).getId(), this.blockVo.getBlockId());
        params.put("id", orderId);
        String param = JSONObject.toJSONString((Object)params);
        boolean taskStatus = true;
        while (taskStatus) {
            this.checkIfInterrupt();
            Object taskStatusObj = GlobalCacheConfig.getCache((String)(this.taskId + ((TaskRecord)this.taskRecord).getId()));
            boolean bl = taskStatus = taskStatusObj == null || ((Integer)taskStatusObj).intValue() == TaskStatusEnum.running.getStatus();
            if (!taskStatus) {
                log.info("taskStatus is not allowed to execute");
                super.getWindService().saveLog(TaskLogLevelEnum.stop.getLevel(), String.format("[%s]@{wind.bp.unExecutable}", this.getClass().getSimpleName()), ((TaskRecord)this.taskRecord).getProjectId(), this.taskId, ((TaskRecord)this.taskRecord).getId(), this.blockVo.getBlockId());
                throw new RuntimeException("task is stop");
            }
            try {
                Map result = OkHttpUtil.postJson((String)RootBp.getUrl((String)ApiEnum.setOrder.getUri()), (String)param);
                if ("200".equals(result.get("code"))) {
                    break;
                }
            }
            catch (Exception e) {
                log.error("DistributeBp setOrder error,retry");
            }
            Thread.sleep(1000L);
        }
        this.windTaskLog = super.getWindService().saveLog(TaskLogLevelEnum.info.getLevel(), "[CAgvAreasToAreasBp]@{wind.bp.start} send order success", ((TaskRecord)this.taskRecord).getProjectId(), this.taskId, ((TaskRecord)this.taskRecord).getId(), this.blockVo.getBlockId());
        boolean terminateCount = false;
        String OrderGet = "";
        String OrderPut = "";
        while (true) {
            this.checkIfInterrupt();
            String taskRes = "";
            try {
                taskRes = OkHttpUtil.get((String)(RootBp.getUrl((String)ApiEnum.orderDetailsByExternalId.getUri()) + "/" + ((TaskRecord)this.taskRecord).getId()));
            }
            catch (Exception e) {
                log.error("query distributeOrderDetails error = {}", (Throwable)e);
            }
            Boolean taskStatusFlag = RootBp.taskStatus.get(this.taskId + ((TaskRecord)this.taskRecord).getId()) == null ? true : (Boolean)RootBp.taskStatus.get(this.taskId + ((TaskRecord)this.taskRecord).getId());
            int finishedCount = 0;
            if (StringUtils.isNotEmpty((CharSequence)taskRes)) {
                JSONArray jsonArray = JSONObject.parseArray((String)taskRes);
                int loopCount = 0;
                for (Object e : jsonArray) {
                    int time;
                    JSONObject resObj = (JSONObject)e;
                    String stateBp = resObj.getString("state");
                    if (++loopCount == 1) {
                        OrderGet = resObj.getString("id");
                    } else if (loopCount == 2) {
                        OrderPut = resObj.getString("id");
                    }
                    if ("FAILED".equals(stateBp)) {
                        this.windTaskLog.setLevel(TaskLogLevelEnum.error.getLevel());
                        this.windTaskLog.setMessage("[CAgvAreasToAreasBp]@{wind.bp.robotOperate}:" + taskRes);
                        this.windTaskLog.setCreateTime(new Date());
                        super.getWindService().saveLog(this.windTaskLog);
                        this.blockRecord.setStatus(Integer.valueOf(TaskBlockStatusEnum.suspend.getStatus()));
                        this.blockRecord.setEndedReason(TaskBlockStatusEnum.suspend.getDesc() + ":blockState=" + this.state);
                        super.getWindService().saveBlockRecord(this.blockRecord);
                        ((TaskRecord)this.taskRecord).setEndedReason("[CAgvAreasToAreasBp]@{wind.bp.robotOperate}");
                        RecordUpdaterFactory.getUpdater((BaseRecord)this.taskRecord).updateRecord(this.taskRecord);
                        continue;
                    }
                    if (!"FINISHED".equals(stateBp) && !"RUNNING".equals(stateBp) && !"STOPPED".equals(stateBp)) continue;
                    JSONObject loadOrder = resObj.getJSONObject("loadOrder");
                    String vehicle = resObj.getString("vehicle");
                    if (StringUtils.isNotEmpty((CharSequence)vehicle)) {
                        int createTime = resObj.getInteger("createTime");
                        this.updateVehicle(rootBp, vehicle, createTime);
                    }
                    this.windTaskLog.setLevel(TaskLogLevelEnum.info.getLevel());
                    if ("FINISHED".equals(stateBp)) {
                        this.windTaskLog.setMessage("[CAgvAreasToAreasBp]@{wind.bp.end}:");
                    } else if ("STOPPED".equals(stateBp)) {
                        time = resObj.getInteger("terminateTime") - resObj.getInteger("createTime");
                        ((TaskRecord)this.taskRecord).setExecutorTime(Integer.valueOf(time));
                        Object taskStatusObj = GlobalCacheConfig.getCache((String)(this.taskId + ((TaskRecord)this.taskRecord).getId()));
                        boolean bl = taskStatus = taskStatusObj == null || ((Integer)taskStatusObj).intValue() == TaskStatusEnum.stop.getStatus();
                        if (taskStatus) {
                            log.info("taskStatus is not allowed to execute");
                            super.getWindService().saveLog(TaskLogLevelEnum.info.getLevel(), String.format("[%s]@{wind.bp.unExecutable}", this.getClass().getSimpleName()), ((TaskRecord)this.taskRecord).getProjectId(), this.taskId, ((TaskRecord)this.taskRecord).getId(), this.blockVo.getBlockId());
                            ((TaskRecord)this.taskRecord).setStatus(Integer.valueOf(TaskStatusEnum.stop.getStatus()));
                            WindEvent event = WindEvent.builder().type(Integer.valueOf(0)).status(String.valueOf(TaskStatusEnum.stop.getStatus())).taskId(this.taskId).taskRecord((TaskRecord)this.taskRecord).taskLabel(((TaskRecord)this.taskRecord).getDefLabel()).build();
                            this.eventSource.notify(event);
                            ((TaskRecord)this.taskRecord).setStatus(Integer.valueOf(TaskStatusEnum.stop.getStatus()));
                            RecordUpdaterFactory.getUpdater((BaseRecord)this.taskRecord).updateRecord(this.taskRecord);
                            throw new RuntimeException("task stop");
                        }
                        super.getWindService().saveLog(TaskLogLevelEnum.error.getLevel(), String.format("@{wind.bp.stopError}[%s]", resObj.get((Object)"error") == null ? "" : JSONObject.toJSONString((Object)resObj.get((Object)"error"))), ((TaskRecord)this.taskRecord).getProjectId(), this.taskId, ((TaskRecord)this.taskRecord).getId(), this.blockVo.getBlockId());
                        ((TaskRecord)this.taskRecord).setStatus(Integer.valueOf(TaskStatusEnum.end_error.getStatus()));
                        ((TaskRecord)this.taskRecord).setEndedOn(new Date());
                        ((TaskRecord)this.taskRecord).setEndedReason("[CAgvAreasToAreasBp]@{wind.bp.stopError}\uff1atransport is stop error");
                        RecordUpdaterFactory.getUpdater((BaseRecord)this.taskRecord).updateRecord(this.taskRecord);
                        GlobalCacheConfig.cache((String)(((TaskRecord)this.taskRecord).getDefId() + ((TaskRecord)this.taskRecord).getId()), (Object)TaskStatusEnum.end_error.getStatus());
                        RootBp.taskStatus.put(((TaskRecord)this.taskRecord).getDefId() + ((TaskRecord)this.taskRecord).getId(), false);
                        RootBp.windTaskRecordMap.put(((TaskRecord)this.taskRecord).getId(), this.taskRecord);
                        throw new RuntimeException("task end_error");
                    }
                    this.windTaskLog.setCreateTime(new Date());
                    if (!"FINISHED".equals(stateBp)) continue;
                    time = resObj.getInteger("terminateTime") - resObj.getInteger("createTime");
                    ((TaskRecord)this.taskRecord).setExecutorTime(Integer.valueOf(time));
                    RecordUpdaterFactory.getUpdater((BaseRecord)this.taskRecord).updateRecord(this.taskRecord);
                    ++finishedCount;
                }
                if (finishedCount == 2) break;
            }
            if (!taskStatusFlag.booleanValue()) {
                this.agvApiService.terminate(OrderGet);
                this.agvApiService.terminate(OrderPut);
            }
            Thread.sleep(1500L);
        }
    }

    protected void runChildBlock(AbstratRootBp rootBp) {
        log.info("CAgvAreasToAreasBp runChildBlock do not execute");
    }

    protected void setBlockInputParamsValue(AbstratRootBp rootBp) throws Exception {
        Blocks bpData = new Blocks();
        bpData.setFromBinAreasArray(this.fromBinAreasArray);
        bpData.setToBinAreasArray(this.toBinAreasArray);
        bpData.setGroup(this.group);
        bpData.setLabel(this.label);
        bpData.setVehicle(this.vehicle);
        this.blockRecord.setBlockInputParamsValue(JSONObject.toJSONString((Object)bpData));
        super.getWindService().saveBlockRecord(this.blockRecord, this.blockVo.getBlockId(), this.blockVo.getBlockType(), ((TaskRecord)this.taskRecord).getProjectId(), this.taskId, ((TaskRecord)this.taskRecord).getId(), this.startOn);
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

    public List getFromBinAreasArray() {
        return this.fromBinAreasArray;
    }

    public List getToBinAreasArray() {
        return this.toBinAreasArray;
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

    public WindTaskLog getWindTaskLog() {
        return this.windTaskLog;
    }

    public EventSource getEventSource() {
        return this.eventSource;
    }

    public AgvApiService getAgvApiService() {
        return this.agvApiService;
    }

    public void setFromBinAreasArray(List fromBinAreasArray) {
        this.fromBinAreasArray = fromBinAreasArray;
    }

    public void setToBinAreasArray(List toBinAreasArray) {
        this.toBinAreasArray = toBinAreasArray;
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

    public void setWindTaskLog(WindTaskLog windTaskLog) {
        this.windTaskLog = windTaskLog;
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
        if (!(o instanceof CAgvAreasToAreasBp)) {
            return false;
        }
        CAgvAreasToAreasBp other = (CAgvAreasToAreasBp)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        List this$fromBinAreasArray = this.getFromBinAreasArray();
        List other$fromBinAreasArray = other.getFromBinAreasArray();
        if (this$fromBinAreasArray == null ? other$fromBinAreasArray != null : !((Object)this$fromBinAreasArray).equals(other$fromBinAreasArray)) {
            return false;
        }
        List this$toBinAreasArray = this.getToBinAreasArray();
        List other$toBinAreasArray = other.getToBinAreasArray();
        if (this$toBinAreasArray == null ? other$toBinAreasArray != null : !((Object)this$toBinAreasArray).equals(other$toBinAreasArray)) {
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
        WindTaskLog this$windTaskLog = this.getWindTaskLog();
        WindTaskLog other$windTaskLog = other.getWindTaskLog();
        if (this$windTaskLog == null ? other$windTaskLog != null : !this$windTaskLog.equals(other$windTaskLog)) {
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
        return other instanceof CAgvAreasToAreasBp;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        List $fromBinAreasArray = this.getFromBinAreasArray();
        result = result * 59 + ($fromBinAreasArray == null ? 43 : ((Object)$fromBinAreasArray).hashCode());
        List $toBinAreasArray = this.getToBinAreasArray();
        result = result * 59 + ($toBinAreasArray == null ? 43 : ((Object)$toBinAreasArray).hashCode());
        String $group = this.getGroup();
        result = result * 59 + ($group == null ? 43 : $group.hashCode());
        String $label = this.getLabel();
        result = result * 59 + ($label == null ? 43 : $label.hashCode());
        String $vehicle = this.getVehicle();
        result = result * 59 + ($vehicle == null ? 43 : $vehicle.hashCode());
        WindTaskLog $windTaskLog = this.getWindTaskLog();
        result = result * 59 + ($windTaskLog == null ? 43 : $windTaskLog.hashCode());
        EventSource $eventSource = this.getEventSource();
        result = result * 59 + ($eventSource == null ? 43 : $eventSource.hashCode());
        AgvApiService $agvApiService = this.getAgvApiService();
        result = result * 59 + ($agvApiService == null ? 43 : $agvApiService.hashCode());
        return result;
    }

    public String toString() {
        return "CAgvAreasToAreasBp(fromBinAreasArray=" + this.getFromBinAreasArray() + ", toBinAreasArray=" + this.getToBinAreasArray() + ", group=" + this.getGroup() + ", label=" + this.getLabel() + ", vehicle=" + this.getVehicle() + ", windTaskLog=" + this.getWindTaskLog() + ", eventSource=" + this.getEventSource() + ", agvApiService=" + this.getAgvApiService() + ")";
    }
}

