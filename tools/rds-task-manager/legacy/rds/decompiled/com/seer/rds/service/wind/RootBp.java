/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.alibaba.fastjson.JSONArray
 *  com.alibaba.fastjson.JSONObject
 *  com.seer.rds.config.GlobalCacheConfig
 *  com.seer.rds.constant.CommonCodeEnum
 *  com.seer.rds.constant.TaskBlockStatusEnum
 *  com.seer.rds.constant.TaskLogLevelEnum
 *  com.seer.rds.constant.TaskStatusEnum
 *  com.seer.rds.dao.WindTaskRecordMapper
 *  com.seer.rds.exception.RevertJumpException
 *  com.seer.rds.exception.TaskErrorException
 *  com.seer.rds.listener.EventSource
 *  com.seer.rds.listener.WindEvent
 *  com.seer.rds.model.wind.TaskRecord
 *  com.seer.rds.model.wind.WindBlockRecord
 *  com.seer.rds.model.wind.WindTaskDef
 *  com.seer.rds.model.wind.WindTaskRecord
 *  com.seer.rds.service.admin.SysAlarmService
 *  com.seer.rds.service.agv.AgvApiService
 *  com.seer.rds.service.agv.WindService
 *  com.seer.rds.service.agv.WindTaskService
 *  com.seer.rds.service.agv.WorkSiteService
 *  com.seer.rds.service.wind.AbstratRootBp
 *  com.seer.rds.service.wind.RootBp
 *  com.seer.rds.service.wind.TaskReloadService
 *  com.seer.rds.service.wind.TaskStatusMonitorNotice
 *  com.seer.rds.service.wind.commonBp.WhileBp
 *  com.seer.rds.util.SpringUtil
 *  com.seer.rds.util.device.PagerUtil
 *  com.seer.rds.vo.req.SetOrderReq
 *  com.seer.rds.vo.wind.BlockField
 *  com.seer.rds.vo.wind.GlobalField
 *  com.seer.rds.vo.wind.ParamPreField
 *  org.apache.commons.compress.utils.Lists
 *  org.apache.commons.lang3.StringUtils
 *  org.slf4j.Logger
 *  org.slf4j.LoggerFactory
 *  org.springframework.beans.factory.annotation.Autowired
 *  org.springframework.context.annotation.Scope
 *  org.springframework.context.annotation.ScopedProxyMode
 *  org.springframework.stereotype.Component
 */
package com.seer.rds.service.wind;

import com.alibaba.fastjson.JSONArray;
import com.alibaba.fastjson.JSONObject;
import com.seer.rds.config.GlobalCacheConfig;
import com.seer.rds.constant.CommonCodeEnum;
import com.seer.rds.constant.TaskBlockStatusEnum;
import com.seer.rds.constant.TaskLogLevelEnum;
import com.seer.rds.constant.TaskStatusEnum;
import com.seer.rds.dao.WindTaskRecordMapper;
import com.seer.rds.exception.RevertJumpException;
import com.seer.rds.exception.TaskErrorException;
import com.seer.rds.listener.EventSource;
import com.seer.rds.listener.WindEvent;
import com.seer.rds.model.wind.TaskRecord;
import com.seer.rds.model.wind.WindBlockRecord;
import com.seer.rds.model.wind.WindTaskDef;
import com.seer.rds.model.wind.WindTaskRecord;
import com.seer.rds.service.admin.SysAlarmService;
import com.seer.rds.service.agv.AgvApiService;
import com.seer.rds.service.agv.WindService;
import com.seer.rds.service.agv.WindTaskService;
import com.seer.rds.service.agv.WorkSiteService;
import com.seer.rds.service.wind.AbstratRootBp;
import com.seer.rds.service.wind.TaskReloadService;
import com.seer.rds.service.wind.TaskStatusMonitorNotice;
import com.seer.rds.service.wind.commonBp.WhileBp;
import com.seer.rds.util.SpringUtil;
import com.seer.rds.util.device.PagerUtil;
import com.seer.rds.vo.req.SetOrderReq;
import com.seer.rds.vo.wind.BlockField;
import com.seer.rds.vo.wind.GlobalField;
import com.seer.rds.vo.wind.ParamPreField;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Date;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import org.apache.commons.compress.utils.Lists;
import org.apache.commons.lang3.StringUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Scope;
import org.springframework.context.annotation.ScopedProxyMode;
import org.springframework.stereotype.Component;

/*
 * Exception performing whole class analysis ignored.
 */
@Component
@Scope(value="prototype", proxyMode=ScopedProxyMode.TARGET_CLASS)
public class RootBp
extends AbstratRootBp<WindTaskRecord> {
    private static final Logger log = LoggerFactory.getLogger(RootBp.class);
    @Autowired
    private WindTaskService windTaskService;
    @Autowired
    private WindService windService;
    @Autowired
    private EventSource eventSource;
    @Autowired
    private WindTaskRecordMapper windTaskRecordMapper;
    @Autowired
    private WorkSiteService workSiteService;
    @Autowired
    private TaskReloadService taskReloadService;
    @Autowired
    private SysAlarmService sysAlarmService;
    private Boolean ifRevertJump = false;

    /*
     * WARNING - Removed try catching itself - possible behaviour change.
     */
    public JSONArray buildRecord(SetOrderReq req) {
        Date startOn = new Date();
        String projectId = "";
        this.taskRecord = new WindTaskRecord();
        WindBlockRecord blockRecord = new WindBlockRecord();
        Integer rootblockId = null;
        WindTaskDef res = req.getWindTaskDef();
        this.taskId = res.getId();
        this.taskLabel = res.getLabel();
        log.info("rootBp taskId={}, taskLabel={}.", (Object)this.taskId, (Object)this.taskLabel);
        projectId = res.getProjectId();
        this.detail = res.getDetail();
        JSONObject root = JSONObject.parseObject((String)this.detail);
        JSONObject rootBlock = root.getJSONObject(GlobalField.rootBlock);
        rootblockId = rootBlock.getInteger(GlobalField.id);
        JSONObject children = rootBlock.getJSONObject(BlockField.children);
        this.childrenDefault = children.getJSONArray(BlockField.childrenDefault);
        String taskRecordId = req.getTaskRecordId();
        log.info("taskRecordId: " + taskRecordId);
        if (taskRecordId != "" && taskRecordId != null) {
            this.cacheBlockIfResetMap = GlobalCacheConfig.getCacheBlockIfResetMap((String)taskRecordId);
            if (this.cacheBlockIfResetMap != null) {
                log.info("cacheBlockIfResetMap is not null");
                String restart = (String)this.cacheBlockIfResetMap.get("restart");
                log.info("restart: " + restart);
                String rootblockState = (String)this.cacheBlockIfResetMap.get(rootblockId.toString());
                log.info("rootblockState: " + rootblockState);
                if (("restart".equals(restart) || "revert".equals(restart)) && !"Start".equals(rootblockState) && rootblockState != null) {
                    this.ifReset = true;
                }
            }
        }
        JSONArray taskInputParams = this.getTaskInputParams(req.getInputParams(), root);
        if (!this.ifReset) {
            if (req.getParentTaskRecordId() != null) {
                ((WindTaskRecord)this.taskRecord).setParentTaskRecordId(req.getParentTaskRecordId());
                ((WindTaskRecord)this.taskRecord).setRootTaskRecordId(req.getRootTaskRecordId());
            }
            if (StringUtils.isNotEmpty((CharSequence)req.getTaskRecordId())) {
                WindTaskRecord existRecord = this.windService.findById(req.getTaskRecordId());
                if (existRecord != null) {
                    log.error("WindTaskRecord exist id");
                    throw new RuntimeException("WindTaskRecord exist id");
                }
                ((WindTaskRecord)this.taskRecord).setId(req.getTaskRecordId());
                if (req.getParentTaskRecordId() == null) {
                    ((WindTaskRecord)this.taskRecord).setRootTaskRecordId(req.getTaskRecordId());
                }
            } else {
                Object taskUUId = "";
                taskUUId = res.getPeriodicTask() == 1 ? "period" + UUID.randomUUID().toString() : UUID.randomUUID().toString();
                if (req.getParentTaskRecordId() != null) {
                    taskUUId = "child-" + (String)taskUUId;
                }
                ((WindTaskRecord)this.taskRecord).setId((String)taskUUId);
                if (req.getParentTaskRecordId() == null) {
                    ((WindTaskRecord)this.taskRecord).setRootTaskRecordId((String)taskUUId);
                }
            }
            if (res.getPeriodicTask() == 1) {
                ((WindTaskRecord)this.taskRecord).setPeriodicTask(Integer.valueOf(1));
            } else {
                ((WindTaskRecord)this.taskRecord).setPeriodicTask(Integer.valueOf(0));
            }
            ((WindTaskRecord)this.taskRecord).setCallWorkStation(req.getCallWorkStation());
            ((WindTaskRecord)this.taskRecord).setCallWorkType(req.getCallWorkType());
            ((WindTaskRecord)this.taskRecord).setCreatedOn(new Date());
            ((WindTaskRecord)this.taskRecord).setDefId(this.taskId);
            ((WindTaskRecord)this.taskRecord).setDefLabel(res.getLabel());
            ((WindTaskRecord)this.taskRecord).setDefVersion(res.getVersion());
            ((WindTaskRecord)this.taskRecord).setInputParams(taskInputParams.toJSONString());
            ((WindTaskRecord)this.taskRecord).setProjectId(projectId);
            ((WindTaskRecord)this.taskRecord).setStatus(Integer.valueOf(TaskStatusEnum.running.getStatus()));
            ((WindTaskRecord)this.taskRecord).setIsDel(Integer.valueOf(0));
            ((WindTaskRecord)this.taskRecord).setPriority(Integer.valueOf(1));
            if (req.getPriority() != null) {
                ((WindTaskRecord)this.taskRecord).setPriority(req.getPriority());
            }
            taskPriority.put(((WindTaskRecord)this.taskRecord).getId(), ((WindTaskRecord)this.taskRecord).getPriority());
        } else {
            WindService windService = (WindService)SpringUtil.getBean(WindService.class);
            this.taskRecord = windService.findById(req.getTaskRecordId());
            ((WindTaskRecord)this.taskRecord).setStatus(Integer.valueOf(TaskStatusEnum.running.getStatus()));
            taskPriority.put(((WindTaskRecord)this.taskRecord).getId(), ((WindTaskRecord)this.taskRecord).getPriority());
        }
        log.info("rootBp taskId={}, taskLabel={}, taskRecordId = {}, taskInputParams = {}", new Object[]{this.taskId, this.taskLabel, ((WindTaskRecord)this.taskRecord).getId(), taskInputParams});
        log.info("rootBp detail = {}", (Object)this.detail);
        windTaskRecordMap.put(((WindTaskRecord)this.taskRecord).getId(), this.taskRecord);
        this.taskRecordID = ((WindTaskRecord)this.taskRecord).getId();
        Thread thread = Thread.currentThread();
        ConcurrentHashMap concurrentHashMap = GlobalCacheConfig.cacheThreadMap;
        synchronized (concurrentHashMap) {
            List cacheThreadSet = GlobalCacheConfig.getCacheThread((String)((WindTaskRecord)this.taskRecord).getId());
            if (cacheThreadSet == null) {
                ArrayList<Thread> ThreadSet = new ArrayList<Thread>();
                ThreadSet.add(thread);
                GlobalCacheConfig.cacheThread((String)((WindTaskRecord)this.taskRecord).getId(), ThreadSet);
            } else {
                cacheThreadSet.add(thread);
                GlobalCacheConfig.cacheThread((String)((WindTaskRecord)this.taskRecord).getId(), (List)cacheThreadSet);
            }
        }
        this.windService.saveTaskRecord((WindTaskRecord)this.taskRecord);
        return taskInputParams;
    }

    public void setParam(JSONArray taskInputParams) {
        super.setParam(taskInputParams);
        if (this.ifReset) {
            Object paramVariable;
            Object outputParams = this.cacheBlockIfResetMap.get("outputParams");
            if (outputParams != null) {
                ((ConcurrentHashMap)outputParamsMap.get()).put(ParamPreField.blocks, this.cacheBlockIfResetMap.get("outputParams"));
            }
            if ((paramVariable = this.cacheBlockIfResetMap.get("paramVariable")) != null) {
                ((ConcurrentHashMap)taskVariablesMap.get()).put(ParamPreField.task, this.cacheBlockIfResetMap.get("paramVariable"));
            }
        }
    }

    public Object exceptionHandle(Exception e) {
        if (e instanceof RevertJumpException) {
            this.ifRevertJump = true;
        }
        if (e instanceof TaskErrorException) {
            return null;
        }
        Object status = GlobalCacheConfig.getCache((String)(this.taskId + ((WindTaskRecord)this.taskRecord).getId()));
        log.error("RootBp error", (Throwable)e);
        this.windService.saveLog(TaskLogLevelEnum.error.getLevel(), "[RootBp]@{wind.bp.fail}:" + e.getMessage(), this.projectId, this.taskId, ((WindTaskRecord)this.taskRecord).getId(), Integer.valueOf(-1));
        if (StringUtils.isEmpty((CharSequence)((WindTaskRecord)this.taskRecord).getId())) {
            ((WindTaskRecord)this.taskRecord).setDefId(this.taskId);
        }
        ((WindTaskRecord)this.taskRecord).setEndedOn(new Date());
        ((WindTaskRecord)this.taskRecord).setEndedReason("[RootBp]@{wind.bp.fail}:" + e.getMessage());
        ((WindTaskRecord)this.taskRecord).setStatus(Integer.valueOf(TaskStatusEnum.end_error.getStatus()));
        this.windService.updateTaskRecord((WindTaskRecord)this.taskRecord);
        this.blockRecord.setOutputParams(JSONObject.toJSONString(outputParamsMap.get()));
        this.blockRecord.setInputParams(JSONObject.toJSONString(inputParamsMap.get()));
        this.blockRecord.setInternalVariables(JSONObject.toJSONString(taskVariablesMap.get()));
        this.windService.saveErrorBlockRecord(this.blockRecord, Integer.valueOf(-1), "RootBp", ((WindTaskRecord)this.taskRecord).getProjectId(), this.taskId, ((WindTaskRecord)this.taskRecord).getId(), ((WindTaskRecord)this.taskRecord).getCreatedOn(), e);
        TaskStatusMonitorNotice.taskFailedNotice((TaskRecord)((TaskRecord)this.taskRecord), (WindBlockRecord)this.blockRecord, null, (String)(this.taskId == null ? "NullTask" : this.taskId), (String)("[RootBp] Block Run Failure\uff1a" + e.getMessage()));
        GlobalCacheConfig.cache((String)(this.taskId + ((WindTaskRecord)this.taskRecord).getId()), (Object)TaskStatusEnum.end_error.getStatus());
        taskStatus.put(this.taskId + ((WindTaskRecord)this.taskRecord).getId(), false);
        this.sysAlarmService.deleteTaskAlarmAndNoticeWeb(((WindTaskRecord)this.taskRecord).getId() + "b");
        return String.valueOf(CommonCodeEnum.TASK_RUN_FAILED.getCode());
    }

    public void clearCache() {
        if (((WindTaskRecord)this.taskRecord).getId() != null) {
            GlobalCacheConfig.clearCache((String)(this.taskId + ((WindTaskRecord)this.taskRecord).getId()));
            windTaskRecordMap.remove(((WindTaskRecord)this.taskRecord).getId());
            taskStatus.remove(this.taskId + ((WindTaskRecord)this.taskRecord).getId());
            distributeOrderCache.remove(this.taskId + ((WindTaskRecord)this.taskRecord).getId());
            taskPriority.remove(((WindTaskRecord)this.taskRecord).getId());
            taskThreadMap.remove(this.taskId + ((WindTaskRecord)this.taskRecord).getId());
            GlobalCacheConfig.clearCacheThread((String)((WindTaskRecord)this.taskRecord).getId());
            GlobalCacheConfig.clearCacheInterrupt((String)((WindTaskRecord)this.taskRecord).getId());
            WhileBp.ifWhilePrintLogs.remove(((WindTaskRecord)this.taskRecord).getId() + Thread.currentThread().getId());
            AgvApiService.changeRobotOrderId.remove(((WindTaskRecord)this.taskRecord).getId());
            if (pathCache.get(((WindTaskRecord)this.taskRecord).getId()) != null) {
                pathCache.remove(((WindTaskRecord)this.taskRecord).getId());
            }
        }
        AgvApiService.changeDestinationReq.remove(((WindTaskRecord)this.taskRecord).getId());
        inputParamsMap.remove();
        outputParamsMap.remove();
        taskVariablesMap.remove();
        if (((WindTaskRecord)this.taskRecord).getId().startsWith("pager-start-")) {
            PagerUtil.resetPagerValue((String)this.taskLabel, (String)((WindTaskRecord)this.taskRecord).getId());
        }
        if (this.ifRevertJump.booleanValue()) {
            this.taskReloadService.reloadAndRunTaskDefSeri((WindTaskRecord)this.taskRecord);
        }
        GlobalCacheConfig.clearCacheSkip((String)(this.taskId + ((WindTaskRecord)this.taskRecord).getId()));
    }

    public Object taskfinished(SetOrderReq req) {
        WindTaskDef windTaskDef = req.getWindTaskDef();
        Boolean releaseSites = windTaskDef.getReleaseSites();
        Object status = GlobalCacheConfig.getCache((String)(this.taskId + ((WindTaskRecord)this.taskRecord).getId()));
        if (status == null || Integer.parseInt(status.toString()) == TaskStatusEnum.end.getStatus() || Integer.parseInt(status.toString()) == TaskStatusEnum.running.getStatus()) {
            ((WindTaskRecord)this.taskRecord).setEndedReason("[RootBp]@{wind.task.end}");
            ((WindTaskRecord)this.taskRecord).setStatus(Integer.valueOf(TaskStatusEnum.end.getStatus()));
            this.windService.updateTaskRecord((WindTaskRecord)this.taskRecord);
            this.blockRecord.setEndedOn(new Date());
            this.blockRecord.setEndedReason("[RootBp]@{wind.task.end}");
            this.blockRecord.setStatus(Integer.valueOf(TaskBlockStatusEnum.end.getStatus()));
            this.windService.saveBlockRecord(this.blockRecord);
            if (TaskStatusEnum.end.getStatus() == ((WindTaskRecord)this.taskRecord).getStatus().intValue()) {
                WindEvent event = WindEvent.builder().type(Integer.valueOf(0)).status(String.valueOf(TaskStatusEnum.end.getStatus())).taskRecord((TaskRecord)this.taskRecord).blockRecord(this.blockRecord).blockVo(null).taskId(this.taskId).taskLabel(((WindTaskRecord)this.taskRecord).getDefLabel()).agvId(null).workSite(null).build();
                this.eventSource.notify(event);
            }
        } else if (Integer.parseInt(status.toString()) == TaskStatusEnum.stop.getStatus()) {
            this.blockRecord.setEndedOn(new Date());
            this.blockRecord.setEndedReason("[RootBp]@{wind.task.endHand}");
            this.blockRecord.setStatus(Integer.valueOf(TaskBlockStatusEnum.stop.getStatus()));
            this.windService.saveBlockRecord(this.blockRecord);
            if (releaseSites != null && releaseSites.booleanValue()) {
                this.workSiteService.updateSiteUnlockedByLockedBy(this.taskRecordID);
            }
        } else if (Integer.parseInt(status.toString()) == TaskStatusEnum.end_error.getStatus()) {
            this.blockRecord.setEndedOn(new Date());
            this.blockRecord.setEndedReason("[RootBp]@{task.enum.endError}");
            this.blockRecord.setStatus(Integer.valueOf(TaskBlockStatusEnum.end_error.getStatus()));
            this.windService.saveBlockRecord(this.blockRecord);
            if (releaseSites != null && releaseSites.booleanValue()) {
                this.workSiteService.updateSiteUnlockedByLockedBy(this.taskRecordID);
            }
        } else if (Integer.parseInt(status.toString()) == TaskStatusEnum.manual_end.getStatus()) {
            this.blockRecord.setEndedOn(new Date());
            this.blockRecord.setEndedReason("[RootBp]@{task.enum.ManualEnd}");
            this.blockRecord.setStatus(Integer.valueOf(TaskBlockStatusEnum.end.getStatus()));
            this.windService.saveBlockRecord(this.blockRecord);
            if (releaseSites != null && releaseSites.booleanValue()) {
                this.workSiteService.updateSiteUnlockedByLockedBy(this.taskRecordID);
            }
        }
        this.windTaskRecordMapper.updateTaskRecordEndTime(new Date(), ((WindTaskRecord)this.taskRecord).getId());
        return String.valueOf(CommonCodeEnum.TASK_RUN_SUCCESS.getCode());
    }

    private static void clearParams() {
        extInputParamsMap.clear();
        taskStatus.clear();
    }

    public static void main(String[] args) {
        String detail = "{\"inputParams\":[{\"name\":\"message\",\"type\":\"String\",\"label\":\"\u5a11\u581f\u4f05\",\"required\":false,\"defaultValue\":\"DEFAULT MESSAGE\"}],\"outputParams\":[],\"rootBlock\":{\"id\":-1,\"name\":\"-1\",\"blockType\":\"RootBp\",\"children\":{\"default\":[{\"id\":1,\"name\":\"b1\",\"blockType\":\"SerialFlowBp\",\"children\":{\"default\":[{\"id\":8,\"name\":\"b8\",\"blockType\":\"RepeatNumBp\",\"children\":{\"default\":[{\"id\":9,\"name\":\"b9\",\"blockType\":\"PrintBp\",\"children\":{},\"inputParams\":{\"message\":{\"type\":\"Simple\",\"value\":\"test\"}},\"refTaskDefId\":\"\",\"selected\":false},{\"id\":10,\"name\":\"b10\",\"blockType\":\"TimestampBp\",\"children\":{},\"inputParams\":{},\"refTaskDefId\":\"\",\"selected\":false},{\"id\":11,\"name\":\"b11\",\"blockType\":\"IfBp\",\"children\":{\"default\":[{\"id\":12,\"name\":\"b12\",\"blockType\":\"PrintBp\",\"children\":{},\"inputParams\":{\"message\":{\"type\":\"Simple\",\"value\":\"test12\"}},\"refTaskDefId\":\"\",\"selected\":false}]},\"inputParams\":{\"condition\":{\"type\":\"Simple\",\"value\":true}},\"refTaskDefId\":\"\",\"selected\":false}]},\"inputParams\":{\"num\":{\"type\":\"Simple\",\"value\":\"3\"}},\"refTaskDefId\":\"\",\"selected\":false},{\"id\":6,\"name\":\"b6\",\"blockType\":\"CSelectAgvBp\",\"children\":{\"default\":[{\"id\":7,\"name\":\"b7\",\"blockType\":\"CAgvOperationBp\",\"children\":{},\"inputParams\":{\"agvId\":{\"type\":\"Simple\",\"value\":\"agv123\"},\"targetSiteLabel\":{\"type\":\"Simple\",\"value\":\"s1\"}},\"refTaskDefId\":\"\",\"selected\":false}]},\"inputParams\":{\"vehicle\":{\"type\":\"Simple\",\"value\":\"agv123\"}},\"refTaskDefId\":\"\",\"selected\":false}]},\"inputParams\":{},\"refTaskDefId\":\"\",\"selected\":false}]},\"selected\":false,\"refTaskDefId\":\"\",\"inputParams\":{}}}";
        JSONObject root = JSONObject.parseObject((String)detail);
        JSONObject rootBlock = root.getJSONObject(GlobalField.rootBlock);
        Integer rootBlockId = rootBlock.getInteger(GlobalField.id);
        JSONObject children = rootBlock.getJSONObject(BlockField.children);
        JSONArray childrenDefault = children.getJSONArray(BlockField.childrenDefault);
        ArrayList list = Lists.newArrayList();
        Collections.sort(RootBp.convert((List)list, (int)rootBlockId, (JSONObject)children, (boolean)false));
        System.out.println(list);
    }
}

