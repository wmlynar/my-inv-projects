/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.alibaba.fastjson.JSONArray
 *  com.alibaba.fastjson.JSONObject
 *  com.google.common.collect.Maps
 *  com.seer.rds.config.GlobalCacheConfig
 *  com.seer.rds.constant.TaskLogLevelEnum
 *  com.seer.rds.constant.TaskStatusEnum
 *  com.seer.rds.exception.BpRuntimeException
 *  com.seer.rds.exception.TaskBreakException
 *  com.seer.rds.model.wind.WindTaskLog
 *  com.seer.rds.service.agv.WindService
 *  com.seer.rds.service.wind.AbstractBp
 *  com.seer.rds.service.wind.AbstratRootBp
 *  com.seer.rds.service.wind.WindTaskStatus
 *  com.seer.rds.service.wind.commonBp.WhileBp
 *  com.seer.rds.vo.wind.ParamPreField
 *  com.seer.rds.vo.wind.WhileBpField
 *  org.apache.commons.lang3.StringUtils
 *  org.slf4j.Logger
 *  org.slf4j.LoggerFactory
 *  org.springframework.beans.factory.annotation.Autowired
 *  org.springframework.context.annotation.Scope
 *  org.springframework.stereotype.Component
 */
package com.seer.rds.service.wind.commonBp;

import com.alibaba.fastjson.JSONArray;
import com.alibaba.fastjson.JSONObject;
import com.google.common.collect.Maps;
import com.seer.rds.config.GlobalCacheConfig;
import com.seer.rds.constant.TaskLogLevelEnum;
import com.seer.rds.constant.TaskStatusEnum;
import com.seer.rds.exception.BpRuntimeException;
import com.seer.rds.exception.TaskBreakException;
import com.seer.rds.model.wind.WindTaskLog;
import com.seer.rds.service.agv.WindService;
import com.seer.rds.service.wind.AbstractBp;
import com.seer.rds.service.wind.AbstratRootBp;
import com.seer.rds.service.wind.WindTaskStatus;
import com.seer.rds.vo.wind.ParamPreField;
import com.seer.rds.vo.wind.WhileBpField;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import java.util.stream.Collectors;
import org.apache.commons.lang3.StringUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Scope;
import org.springframework.stereotype.Component;

@Component(value="WhileBp")
@Scope(value="prototype")
public class WhileBp
extends AbstractBp {
    private static final Logger log = LoggerFactory.getLogger(WhileBp.class);
    @Autowired
    private WindService windService;
    private Object loopCondition;
    private Object retryPeriodObj;
    private Object runOnce;
    private Object printContinuously;
    private String logId = null;
    public static ConcurrentHashMap<String, Boolean> ifWhilePrintLogs = new ConcurrentHashMap();

    protected void getInputParamsAndExecute(AbstratRootBp rootBp) throws Exception {
        this.runOnce = rootBp.getInputParamValue(this.taskId, this.inputParams, WhileBpField.runOnce);
        boolean runOnceBool = this.runOnce != null && Boolean.parseBoolean(this.runOnce.toString());
        Map paramMap = (Map)((ConcurrentHashMap)AbstratRootBp.outputParamsMap.get()).get(ParamPreField.blocks);
        ConcurrentMap childParamMap = Maps.newConcurrentMap();
        childParamMap.put(this.blockVo.getBlockName() + "while-child", true);
        paramMap.put(this.blockVo.getBlockName(), childParamMap);
        ((ConcurrentHashMap)AbstratRootBp.outputParamsMap.get()).put(ParamPreField.blocks, paramMap);
        this.blockRecord.setOutputParams(JSONObject.toJSONString(AbstratRootBp.outputParamsMap.get()));
        this.windService.saveBlockRecord(this.blockRecord, this.blockVo.getBlockId(), this.blockVo.getBlockType(), this.taskRecord.getProjectId(), this.taskId, this.taskRecord.getId(), this.startOn);
        if (this.childDefaultArray != null && runOnceBool) {
            JSONArray childArray = (JSONArray)this.childDefaultArray;
            try {
                rootBp.executeChild(rootBp, this.taskId, this.taskRecord, childArray, Boolean.valueOf(true));
            }
            catch (TaskBreakException e) {
                log.error("{} break", (Object)this.getClass().getSimpleName());
                log.error(e.getMessage());
                return;
            }
        }
        this.loopCondition = rootBp.getInputParamValue(this.taskId, this.inputParams, WhileBpField.loopCondition);
        if (this.loopCondition == null) {
            throw new BpRuntimeException("@{wind.bp.nonexistentCondition}");
        }
        this.loopCondition = rootBp.getInputParamValue(this.taskId, this.inputParams, WhileBpField.loopCondition);
        this.retryPeriodObj = rootBp.getInputParamValue(this.taskId, this.inputParams, WhileBpField.retryPeriod);
        this.printContinuously = rootBp.getInputParamValue(this.taskId, this.inputParams, WhileBpField.printContinuously);
        boolean printContinuouslyBool = this.printContinuously != null && Boolean.parseBoolean(this.printContinuously.toString());
        Object taskStatusObj = GlobalCacheConfig.getCache((String)(this.taskId + this.taskRecord.getId()));
        boolean taskStatus = taskStatusObj == null || ((Integer)taskStatusObj).intValue() == TaskStatusEnum.running.getStatus();
        boolean loopCon = Boolean.parseBoolean(this.loopCondition.toString());
        int numberOfCycles = 1;
        long threadId = Thread.currentThread().getId();
        super.parseBlockInputParamsValue(rootBp);
        while (taskStatus && loopCon) {
            Set strings;
            WindTaskStatus.monitorTaskEndErrorAndTaskStop((AbstractBp)this);
            Map stringSetMap = (Map)AbstratRootBp.childrenMap.get(this.taskRecord.getId());
            if (stringSetMap != null && (strings = (Set)stringSetMap.get("b" + this.blockRecord.getBlockConfigId())) != null) {
                List c = strings.stream().map(s -> s.substring(1)).collect(Collectors.toList());
                this.windService.clearChildrenRecord(this.taskRecord.getId(), c);
            }
            JSONArray childArray = (JSONArray)this.childDefaultArray;
            try {
                rootBp.executeChild(rootBp, this.taskId, this.taskRecord, childArray, Boolean.valueOf(true));
            }
            catch (TaskBreakException e) {
                log.error("{} break", (Object)this.getClass().getSimpleName());
                log.error(e.getMessage());
                break;
            }
            taskStatusObj = GlobalCacheConfig.getCache((String)(this.taskId + this.taskRecord.getId()));
            taskStatus = taskStatusObj == null || ((Integer)taskStatusObj).intValue() == TaskStatusEnum.running.getStatus();
            this.loopCondition = rootBp.getInputParamValue(this.taskId, this.inputParams, WhileBpField.loopCondition);
            loopCon = Boolean.parseBoolean(this.loopCondition.toString());
            try {
                Thread.sleep(this.retryPeriodObj != null ? Long.parseLong(this.retryPeriodObj.toString()) : 1000L);
            }
            catch (InterruptedException e) {
                log.error("WhileBp InterruptedException", (Throwable)e);
            }
            this.handlePrintContinuously(printContinuouslyBool, numberOfCycles, threadId);
            ++numberOfCycles;
        }
        super.parseBlockInputParamsValue(rootBp);
        ((ConcurrentHashMap)AbstratRootBp.outputParamsMap.get()).remove(this.blockVo.getBlockName() + "while-child");
        this.blockRecord.setOutputParams(JSONObject.toJSONString(AbstratRootBp.outputParamsMap.get()));
        this.windService.saveBlockRecord(this.blockRecord, this.blockVo.getBlockId(), this.blockVo.getBlockType(), this.taskRecord.getProjectId(), this.taskId, this.taskRecord.getId(), this.startOn);
        ifWhilePrintLogs.put(this.taskRecord.getId() + threadId, true);
    }

    protected void runChildBlock(AbstratRootBp rootBp) {
    }

    protected void setBlockInputParamsValue(AbstratRootBp rootBp) throws Exception {
        WhileBp bpData = new WhileBp();
        bpData.setLoopCondition(this.loopCondition);
        bpData.setRetryPeriodObj(this.retryPeriodObj);
        this.blockRecord.setBlockInputParamsValue(JSONObject.toJSONString((Object)bpData));
        this.windService.saveBlockRecord(this.blockRecord, this.blockVo.getBlockId(), this.blockVo.getBlockType(), this.taskRecord.getProjectId(), this.taskId, this.taskRecord.getId(), this.startOn);
    }

    protected void parseBlockInputParamsValue(AbstratRootBp rootBp) {
    }

    private void clearChildrenRecords(AbstratRootBp rootBp) {
        Set strings;
        Map stringSetMap = (Map)AbstratRootBp.childrenMap.get(this.taskRecord.getId());
        if (stringSetMap != null && (strings = (Set)stringSetMap.get("b" + this.blockRecord.getBlockConfigId())) != null) {
            ArrayList<String> stringList = new ArrayList<String>();
            for (String s : strings) {
                String removedB = s.replace("b", "");
                stringList.add(removedB);
            }
            this.windService.clearChildrenRecord(this.taskRecord.getId(), stringList);
        }
    }

    private void handlePrintContinuously(boolean printContinuouslyBool, int numberOfCycles, long threadId) {
        if (!printContinuouslyBool && numberOfCycles >= 100) {
            if (numberOfCycles == 100) {
                this.windService.saveLog(TaskLogLevelEnum.info.getLevel(), "[WhileBp]@{wind.bp.start}, @{wind.bp.whileBpTip}", this.taskRecord.getProjectId(), this.taskId, this.taskRecord.getId(), this.blockVo.getBlockId());
                ifWhilePrintLogs.put(this.taskRecord.getId() + threadId, false);
            } else if (numberOfCycles % 100 == 0) {
                ifWhilePrintLogs.put(this.taskRecord.getId() + threadId, true);
                if (StringUtils.isEmpty((CharSequence)this.logId)) {
                    WindTaskLog windTaskLog = this.windService.saveLog(TaskLogLevelEnum.info.getLevel(), "[WhileBp]@{wind.bp.start}, @{wind.bp.whileBpTip}", this.taskRecord.getProjectId(), this.taskId, this.taskRecord.getId(), this.blockVo.getBlockId());
                    this.logId = windTaskLog.getId();
                } else {
                    this.windService.saveOrUpdateLog(this.logId, TaskLogLevelEnum.info.getLevel(), "[WhileBp]@{wind.bp.start}, @{wind.bp.whileBpTip}", this.taskRecord.getProjectId(), this.taskId, this.taskRecord.getId(), this.blockVo.getBlockId());
                }
                ifWhilePrintLogs.put(this.taskRecord.getId() + threadId, false);
            }
        }
    }

    public WindService getWindService() {
        return this.windService;
    }

    public Object getLoopCondition() {
        return this.loopCondition;
    }

    public Object getRetryPeriodObj() {
        return this.retryPeriodObj;
    }

    public Object getRunOnce() {
        return this.runOnce;
    }

    public Object getPrintContinuously() {
        return this.printContinuously;
    }

    public String getLogId() {
        return this.logId;
    }

    public void setWindService(WindService windService) {
        this.windService = windService;
    }

    public void setLoopCondition(Object loopCondition) {
        this.loopCondition = loopCondition;
    }

    public void setRetryPeriodObj(Object retryPeriodObj) {
        this.retryPeriodObj = retryPeriodObj;
    }

    public void setRunOnce(Object runOnce) {
        this.runOnce = runOnce;
    }

    public void setPrintContinuously(Object printContinuously) {
        this.printContinuously = printContinuously;
    }

    public void setLogId(String logId) {
        this.logId = logId;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof WhileBp)) {
            return false;
        }
        WhileBp other = (WhileBp)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        WindService this$windService = this.getWindService();
        WindService other$windService = other.getWindService();
        if (this$windService == null ? other$windService != null : !this$windService.equals(other$windService)) {
            return false;
        }
        Object this$loopCondition = this.getLoopCondition();
        Object other$loopCondition = other.getLoopCondition();
        if (this$loopCondition == null ? other$loopCondition != null : !this$loopCondition.equals(other$loopCondition)) {
            return false;
        }
        Object this$retryPeriodObj = this.getRetryPeriodObj();
        Object other$retryPeriodObj = other.getRetryPeriodObj();
        if (this$retryPeriodObj == null ? other$retryPeriodObj != null : !this$retryPeriodObj.equals(other$retryPeriodObj)) {
            return false;
        }
        Object this$runOnce = this.getRunOnce();
        Object other$runOnce = other.getRunOnce();
        if (this$runOnce == null ? other$runOnce != null : !this$runOnce.equals(other$runOnce)) {
            return false;
        }
        Object this$printContinuously = this.getPrintContinuously();
        Object other$printContinuously = other.getPrintContinuously();
        if (this$printContinuously == null ? other$printContinuously != null : !this$printContinuously.equals(other$printContinuously)) {
            return false;
        }
        String this$logId = this.getLogId();
        String other$logId = other.getLogId();
        return !(this$logId == null ? other$logId != null : !this$logId.equals(other$logId));
    }

    protected boolean canEqual(Object other) {
        return other instanceof WhileBp;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        WindService $windService = this.getWindService();
        result = result * 59 + ($windService == null ? 43 : $windService.hashCode());
        Object $loopCondition = this.getLoopCondition();
        result = result * 59 + ($loopCondition == null ? 43 : $loopCondition.hashCode());
        Object $retryPeriodObj = this.getRetryPeriodObj();
        result = result * 59 + ($retryPeriodObj == null ? 43 : $retryPeriodObj.hashCode());
        Object $runOnce = this.getRunOnce();
        result = result * 59 + ($runOnce == null ? 43 : $runOnce.hashCode());
        Object $printContinuously = this.getPrintContinuously();
        result = result * 59 + ($printContinuously == null ? 43 : $printContinuously.hashCode());
        String $logId = this.getLogId();
        result = result * 59 + ($logId == null ? 43 : $logId.hashCode());
        return result;
    }

    public String toString() {
        return "WhileBp(windService=" + this.getWindService() + ", loopCondition=" + this.getLoopCondition() + ", retryPeriodObj=" + this.getRetryPeriodObj() + ", runOnce=" + this.getRunOnce() + ", printContinuously=" + this.getPrintContinuously() + ", logId=" + this.getLogId() + ")";
    }
}

