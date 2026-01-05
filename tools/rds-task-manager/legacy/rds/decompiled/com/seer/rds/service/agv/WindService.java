/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.alibaba.fastjson.JSONObject
 *  com.seer.rds.config.GlobalCacheConfig
 *  com.seer.rds.constant.ApiEnum
 *  com.seer.rds.constant.TaskBlockStatusEnum
 *  com.seer.rds.constant.TaskLogLevelEnum
 *  com.seer.rds.constant.TaskStatusEnum
 *  com.seer.rds.dao.DistributeRecordMapper
 *  com.seer.rds.dao.EventRecordMapper
 *  com.seer.rds.dao.TestRecordMapper
 *  com.seer.rds.dao.WindBlockRecordMapper
 *  com.seer.rds.dao.WindDataCacheMapper
 *  com.seer.rds.dao.WindDataCacheSplitMapper
 *  com.seer.rds.dao.WindTaskDefMapper
 *  com.seer.rds.dao.WindTaskLogMapper
 *  com.seer.rds.dao.WindTaskRecordMapper
 *  com.seer.rds.listener.EventSource
 *  com.seer.rds.model.wind.BaseRecord
 *  com.seer.rds.model.wind.EventRecord
 *  com.seer.rds.model.wind.TaskRecord
 *  com.seer.rds.model.wind.TestRecord
 *  com.seer.rds.model.wind.WindBlockRecord
 *  com.seer.rds.model.wind.WindDataCache
 *  com.seer.rds.model.wind.WindDataCacheSplit
 *  com.seer.rds.model.wind.WindTaskDef
 *  com.seer.rds.model.wind.WindTaskLog
 *  com.seer.rds.model.wind.WindTaskRecord
 *  com.seer.rds.service.admin.SysAlarmService
 *  com.seer.rds.service.agv.AgvApiService
 *  com.seer.rds.service.agv.WindService
 *  com.seer.rds.service.agv.WindTaskService
 *  com.seer.rds.service.wind.AbstratRootBp
 *  com.seer.rds.service.wind.RootBp
 *  com.seer.rds.service.wind.TaskReloadService
 *  com.seer.rds.service.wind.commonBp.CacheDataBp
 *  com.seer.rds.service.wind.commonBp.WhileBp
 *  com.seer.rds.util.OkHttpUtil
 *  com.seer.rds.vo.ResultVo
 *  com.seer.rds.vo.StopAllTaskReq$StopTask
 *  org.apache.commons.collections.CollectionUtils
 *  org.apache.commons.compress.utils.Lists
 *  org.apache.commons.lang3.StringUtils
 *  org.slf4j.Logger
 *  org.slf4j.LoggerFactory
 *  org.springframework.beans.factory.annotation.Autowired
 *  org.springframework.dao.DataIntegrityViolationException
 *  org.springframework.data.domain.Page
 *  org.springframework.data.domain.PageRequest
 *  org.springframework.data.domain.Pageable
 *  org.springframework.stereotype.Service
 *  org.springframework.transaction.annotation.Transactional
 */
package com.seer.rds.service.agv;

import com.alibaba.fastjson.JSONObject;
import com.seer.rds.config.GlobalCacheConfig;
import com.seer.rds.constant.ApiEnum;
import com.seer.rds.constant.TaskBlockStatusEnum;
import com.seer.rds.constant.TaskLogLevelEnum;
import com.seer.rds.constant.TaskStatusEnum;
import com.seer.rds.dao.DistributeRecordMapper;
import com.seer.rds.dao.EventRecordMapper;
import com.seer.rds.dao.TestRecordMapper;
import com.seer.rds.dao.WindBlockRecordMapper;
import com.seer.rds.dao.WindDataCacheMapper;
import com.seer.rds.dao.WindDataCacheSplitMapper;
import com.seer.rds.dao.WindTaskDefMapper;
import com.seer.rds.dao.WindTaskLogMapper;
import com.seer.rds.dao.WindTaskRecordMapper;
import com.seer.rds.listener.EventSource;
import com.seer.rds.model.wind.BaseRecord;
import com.seer.rds.model.wind.EventRecord;
import com.seer.rds.model.wind.TaskRecord;
import com.seer.rds.model.wind.TestRecord;
import com.seer.rds.model.wind.WindBlockRecord;
import com.seer.rds.model.wind.WindDataCache;
import com.seer.rds.model.wind.WindDataCacheSplit;
import com.seer.rds.model.wind.WindTaskDef;
import com.seer.rds.model.wind.WindTaskLog;
import com.seer.rds.model.wind.WindTaskRecord;
import com.seer.rds.service.admin.SysAlarmService;
import com.seer.rds.service.agv.AgvApiService;
import com.seer.rds.service.agv.WindTaskService;
import com.seer.rds.service.wind.AbstratRootBp;
import com.seer.rds.service.wind.RootBp;
import com.seer.rds.service.wind.TaskReloadService;
import com.seer.rds.service.wind.commonBp.CacheDataBp;
import com.seer.rds.service.wind.commonBp.WhileBp;
import com.seer.rds.util.OkHttpUtil;
import com.seer.rds.vo.ResultVo;
import com.seer.rds.vo.StopAllTaskReq;
import java.io.IOException;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collection;
import java.util.Date;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.locks.LockSupport;
import java.util.stream.Collectors;
import org.apache.commons.collections.CollectionUtils;
import org.apache.commons.compress.utils.Lists;
import org.apache.commons.lang3.StringUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class WindService {
    private static final Logger log = LoggerFactory.getLogger(WindService.class);
    @Autowired
    private TestRecordMapper testRecordMapper;
    @Autowired
    private WindTaskRecordMapper windTaskRecordMapper;
    @Autowired
    private EventRecordMapper eventRecordMapper;
    @Autowired
    private WindTaskDefMapper windTaskDefMapper;
    @Autowired
    private WindBlockRecordMapper windBlockRecordMapper;
    @Autowired
    private AgvApiService agvApiService;
    @Autowired
    private WindDataCacheMapper windDataCacheMapper;
    @Autowired
    private WindDataCacheSplitMapper windDataCacheSplitMapper;
    @Autowired
    private WindTaskLogMapper windTaskLogMapper;
    @Autowired
    private EventSource eventSource;
    @Autowired
    private DistributeRecordMapper distributeRecordMapper;
    @Autowired
    private TaskReloadService taskReloadService;
    @Autowired
    private SysAlarmService sysAlarmService;

    public List<WindTaskRecord> findByStatus(Integer status) {
        return this.windTaskRecordMapper.findByStatus(status);
    }

    public List<WindTaskRecord> findByStatusIn(List<Integer> status) {
        return this.windTaskRecordMapper.findByStatusIn(status);
    }

    public WindTaskRecord findById(String taskRecordId) {
        return this.windTaskRecordMapper.findById((Object)taskRecordId).orElse(null);
    }

    public List<WindTaskLog> findLogByTaskRecordId(String taskRecordId) {
        return this.windTaskLogMapper.findAllByTaskRecordId(taskRecordId);
    }

    public Page<WindTaskLog> findLogByTaskRecordIdAndLevelIn(String taskRecordId, List<String> levels, int page, int size) {
        PageRequest pageable = PageRequest.of((int)(page - 1), (int)size);
        if (CollectionUtils.isEmpty(levels)) {
            return this.windTaskLogMapper.findLogByTaskRecordId(taskRecordId, (Pageable)pageable);
        }
        return this.windTaskLogMapper.findLogByTaskRecordIdAndLevelIn(taskRecordId, levels, (Pageable)pageable);
    }

    public WindTaskDef findTaskDefById(String id) {
        return this.windTaskDefMapper.findById((Object)id).orElse(null);
    }

    public WindTaskDef findTaskDefByDefName(String name) {
        return this.windTaskDefMapper.findAllByLabel(name);
    }

    public WindTaskRecord findByOutOrderNo(String outOrderNo) {
        return this.windTaskRecordMapper.findByOutOrderNo(outOrderNo);
    }

    public List<WindTaskDef> findAllWindTaskDef() {
        return this.windTaskDefMapper.findAll();
    }

    public List<WindTaskDef> findWindTaskDefUserTemplate() {
        return this.windTaskDefMapper.findAllTaskUserTemplate();
    }

    public List<String> findDefIdsByLabel(String label) {
        return this.windTaskDefMapper.findDefIdsByLabel(label + "%");
    }

    public List<WindTaskDef> findIdAndLabelFromUserTemplate() {
        return this.windTaskDefMapper.findIdAndLabelFromUserTemplate();
    }

    @Transactional
    public void saveTask(WindTaskDef record) throws DataIntegrityViolationException {
        this.windTaskDefMapper.save((Object)record);
    }

    @Transactional
    public synchronized void updateTaskRecordPath(TaskRecord taskRecord, String agvId, List path) {
        TestRecord testRecord;
        if (taskRecord instanceof WindTaskRecord) {
            WindTaskRecord windTaskRecord = (WindTaskRecord)this.windTaskRecordMapper.findById((Object)taskRecord.getId()).get();
            if (windTaskRecord != null) {
                RootBp.updatePathByAgvId((String)windTaskRecord.getPath(), (String)agvId, (List)path);
                this.windTaskRecordMapper.updateTaskRecordPath(taskRecord.getId(), RootBp.updatePathByAgvId((String)windTaskRecord.getPath(), (String)agvId, (List)path));
            }
        } else if (taskRecord instanceof TestRecord && (testRecord = (TestRecord)this.testRecordMapper.findById((Object)taskRecord.getId()).get()) != null) {
            RootBp.updatePathByAgvId((String)testRecord.getPath(), (String)agvId, (List)path);
            this.testRecordMapper.updateTaskRecordPath(taskRecord.getId(), RootBp.updatePathByAgvId((String)testRecord.getPath(), (String)agvId, (List)path));
        }
    }

    @Transactional
    public void saveBlockRecord(WindBlockRecord record) {
        this.windBlockRecordMapper.save((Object)record);
    }

    @Transactional
    public void saveTaskRecord(WindTaskRecord record) {
        this.windTaskRecordMapper.save((Object)record);
    }

    @Transactional
    public WindTaskLog saveLog(WindTaskLog log) {
        return (WindTaskLog)this.windTaskLogMapper.save((Object)log);
    }

    @Transactional
    public void updateTaskRecord(WindTaskRecord record) {
        this.windTaskRecordMapper.save((Object)record);
    }

    public WindTaskRecord findByTaskIdAndTaskRecordId(String taskId, String taskRecordId) {
        List tr = this.windTaskRecordMapper.findByDefIdAndIdOrderByCreatedOnDesc(taskId, taskRecordId);
        if (CollectionUtils.isNotEmpty((Collection)tr)) {
            return (WindTaskRecord)tr.get(0);
        }
        return null;
    }

    @Transactional
    public WindTaskLog saveLog(String level, String message, String projectId, String taskId, String taskRecordId, Integer blockId) {
        WindTaskLog logOut = WindTaskLog.builder().createTime(new Date()).level(level).message(message).projectId(projectId).taskId(taskId).taskRecordId(taskRecordId).taskBlockId(blockId).build();
        Boolean ifCanPrint = (Boolean)WhileBp.ifWhilePrintLogs.get(taskRecordId + Thread.currentThread().getId());
        if (ifCanPrint != null && !ifCanPrint.booleanValue() && !TaskLogLevelEnum.error.getLevel().equals(level)) {
            switch (level) {
                case "1": 
                case "2": {
                    log.info("taskRecordId: {}, taskId: {}, message: {}", new Object[]{taskRecordId, taskId, message});
                    break;
                }
                case "3": {
                    log.error("taskRecordId: {}, taskId: {}, message: {}", new Object[]{taskRecordId, taskId, message});
                    break;
                }
                case "4": {
                    log.warn("taskRecordId: {}, taskId: {}, message: {}", new Object[]{taskRecordId, taskId, message});
                }
            }
            return null;
        }
        return this.saveLog(logOut);
    }

    @Transactional
    public WindTaskLog saveOrUpdateLog(String id, String level, String message, String projectId, String taskId, String taskRecordId, Integer blockId) {
        WindTaskLog logOut = WindTaskLog.builder().id(id).createTime(new Date()).level(level).message(message).projectId(projectId).taskId(taskId).taskRecordId(taskRecordId).taskBlockId(blockId).build();
        return this.saveLog(logOut);
    }

    @Transactional
    public void saveBlockRecord(WindBlockRecord blockRecord, Integer blockId, String blockType, String projectId, String taskId, String taskRecordId, String outputParams, Date startDate) {
        blockRecord.setId(blockRecord.getId());
        blockRecord.setBlockConfigId(String.valueOf(blockId));
        blockRecord.setBlockName(blockType);
        blockRecord.setProjectId(projectId);
        blockRecord.setTaskId(taskId);
        blockRecord.setTaskRecordId(taskRecordId);
        blockRecord.setVersion(Integer.valueOf(blockRecord.getVersion() != null ? blockRecord.getVersion() + 1 : 1));
        blockRecord.setStatus(Integer.valueOf(TaskBlockStatusEnum.running.getStatus()));
        blockRecord.setEndedOn(new Date());
        blockRecord.setEndedReason(TaskBlockStatusEnum.running.getDesc());
        blockRecord.setOutputParams(outputParams);
        blockRecord.setStartedOn(startDate);
        this.saveBlockRecord(blockRecord);
    }

    @Transactional
    public void saveErrorBlockRecord(WindBlockRecord blockRecord, Integer blockId, String blockType, String projectId, String taskId, String taskRecordId, String outputParams, Date startDate, Exception e) {
        blockRecord.setId(blockRecord.getId());
        blockRecord.setBlockConfigId(String.valueOf(blockId));
        blockRecord.setBlockName(blockType);
        blockRecord.setProjectId(projectId);
        blockRecord.setTaskId(taskId);
        blockRecord.setTaskRecordId(taskRecordId);
        blockRecord.setVersion(Integer.valueOf(blockRecord.getVersion() != null ? blockRecord.getVersion() + 1 : 1));
        blockRecord.setStatus(Integer.valueOf(TaskBlockStatusEnum.end_error.getStatus()));
        blockRecord.setEndedOn(new Date());
        blockRecord.setEndedReason(TaskBlockStatusEnum.end_error.getDesc() + ":" + e.getMessage());
        blockRecord.setOutputParams(outputParams);
        blockRecord.setStartedOn(startDate);
        this.saveBlockRecord(blockRecord);
    }

    @Transactional
    public void saveBlockRecord(WindBlockRecord blockRecord, Integer blockId, String blockType, String projectId, String taskId, String taskRecordId, Date startDate) {
        blockRecord.setId(blockRecord.getId());
        blockRecord.setBlockConfigId(String.valueOf(blockId));
        blockRecord.setBlockName(blockType);
        blockRecord.setProjectId(projectId);
        blockRecord.setTaskId(taskId);
        blockRecord.setTaskRecordId(taskRecordId);
        blockRecord.setVersion(Integer.valueOf(blockRecord.getVersion() != null ? blockRecord.getVersion() + 1 : 1));
        blockRecord.setStatus(Integer.valueOf(TaskBlockStatusEnum.running.getStatus()));
        blockRecord.setEndedOn(new Date());
        blockRecord.setEndedReason(TaskBlockStatusEnum.running.getDesc());
        blockRecord.setStartedOn(startDate);
        this.saveBlockRecord(blockRecord);
    }

    @Transactional
    public void saveErrorBlockRecord(WindBlockRecord blockRecord, Integer blockId, String blockType, String projectId, String taskId, String taskRecordId, Date startDate, Exception e) {
        blockRecord.setId(blockRecord.getId());
        blockRecord.setBlockConfigId(String.valueOf(blockId));
        blockRecord.setBlockName(blockType);
        blockRecord.setProjectId(projectId);
        blockRecord.setTaskId(taskId);
        blockRecord.setTaskRecordId(taskRecordId);
        blockRecord.setVersion(Integer.valueOf(blockRecord.getVersion() != null ? blockRecord.getVersion() + 1 : 1));
        blockRecord.setStatus(Integer.valueOf(TaskBlockStatusEnum.end_error.getStatus()));
        blockRecord.setEndedOn(new Date());
        blockRecord.setEndedReason(TaskBlockStatusEnum.end_error.getDesc() + ":" + e.getMessage());
        blockRecord.setStartedOn(startDate);
        this.saveBlockRecord(blockRecord);
    }

    @Transactional
    public void saveInterruptBlockRecord(WindBlockRecord blockRecord, Integer blockId, String blockType, String projectId, String taskId, String taskRecordId, Date startDate, Exception e) {
        blockRecord.setId(blockRecord.getId());
        blockRecord.setBlockConfigId(String.valueOf(blockId));
        blockRecord.setBlockName(blockType);
        blockRecord.setProjectId(projectId);
        blockRecord.setTaskId(taskId);
        blockRecord.setTaskRecordId(taskRecordId);
        blockRecord.setVersion(Integer.valueOf(blockRecord.getVersion() != null ? blockRecord.getVersion() + 1 : 1));
        blockRecord.setStatus(Integer.valueOf(TaskBlockStatusEnum.interrupt.getStatus()));
        blockRecord.setEndedOn(new Date());
        blockRecord.setEndedReason(TaskBlockStatusEnum.interrupt.getDesc() + ":" + e.getMessage());
        blockRecord.setStartedOn(startDate);
        this.saveBlockRecord(blockRecord);
    }

    @Transactional
    public void saveSuspendErrorBlockRecord(WindBlockRecord blockRecord, Integer blockId, String blockType, String projectId, String taskId, String taskRecordId, Date startDate, String errorMsg) {
        blockRecord.setId(blockRecord.getId());
        blockRecord.setBlockConfigId(String.valueOf(blockId));
        blockRecord.setBlockName(blockType);
        blockRecord.setProjectId(projectId);
        blockRecord.setTaskId(taskId);
        blockRecord.setTaskRecordId(taskRecordId);
        blockRecord.setVersion(Integer.valueOf(blockRecord.getVersion() != null ? blockRecord.getVersion() + 1 : 1));
        blockRecord.setStatus(Integer.valueOf(TaskBlockStatusEnum.suspend.getStatus()));
        blockRecord.setEndedOn(new Date());
        blockRecord.setEndedReason(errorMsg);
        blockRecord.setStartedOn(startDate);
        this.saveBlockRecord(blockRecord);
    }

    @Transactional
    public ResultVo suspendTask(String taskId, String taskRecordId) {
        ResultVo resultVo = new ResultVo();
        List cacheThread = GlobalCacheConfig.getCacheThread((String)taskRecordId);
        if (cacheThread.size() == 0) {
            resultVo.setCode(Integer.valueOf(-1));
            resultVo.setMsg("\u4efb\u52a1\u4e0d\u5b58\u5728");
            return resultVo;
        }
        GlobalCacheConfig.cacheInterrupt((String)taskRecordId, (String)"SuspendKey");
        return ResultVo.success();
    }

    @Transactional
    public ResultVo startSuspendTask(String taskId, String taskRecordId) {
        ResultVo resultVo = new ResultVo();
        List cacheThread = GlobalCacheConfig.getCacheThread((String)taskRecordId);
        if (cacheThread.size() == 0) {
            resultVo.setCode(Integer.valueOf(-1));
            resultVo.setMsg("\u4efb\u52a1\u4e0d\u5b58\u5728");
            return resultVo;
        }
        GlobalCacheConfig.clearCacheInterrupt((String)taskRecordId);
        List cacheThreadSet = GlobalCacheConfig.getCacheThread((String)taskRecordId);
        for (Thread thread : cacheThreadSet) {
            LockSupport.unpark(thread);
        }
        return ResultVo.success();
    }

    @Transactional
    public ResultVo interruptAndReloadTask(String taskId, String taskRecordId) {
        Optional taskRecord = this.windTaskRecordMapper.findById((Object)taskRecordId);
        if (taskRecord.isPresent()) {
            if (((WindTaskRecord)taskRecord.get()).getStatus().intValue() == TaskStatusEnum.running.getStatus()) {
                return ResultVo.success();
            }
            this.sysAlarmService.deleteTaskAlarmLikeAndNoticeWeb(((WindTaskRecord)taskRecord.get()).getId());
            GlobalCacheConfig.clearTaskErrorCacheByContainsPrefix((String)((WindTaskRecord)taskRecord.get()).getId());
            this.taskReloadService.reloadAndRunTaskDef((WindTaskRecord)taskRecord.get());
        }
        return ResultVo.success();
    }

    @Transactional
    public List<String> stopAllTask(List<StopAllTaskReq.StopTask> req) {
        ArrayList taskRecordIds = Lists.newArrayList();
        ArrayList taskIds = Lists.newArrayList();
        if (CollectionUtils.isEmpty(req)) {
            List records = this.windTaskRecordMapper.findByStatusIn(Arrays.asList(TaskStatusEnum.running.getStatus(), TaskStatusEnum.interrupt.getStatus(), TaskStatusEnum.interrupt_error.getStatus(), TaskStatusEnum.restart_error.getStatus()));
            for (WindTaskRecord task : records) {
                this.sysAlarmService.deleteTaskAlarmLikeAndNoticeWeb(task.getId());
                GlobalCacheConfig.clearTaskErrorCacheByContainsPrefix((String)task.getId());
                WindTaskService.siteNodeHashTable.deleteAll();
                GlobalCacheConfig.clearCacheInterrupt((String)task.getId());
                List cacheThread = GlobalCacheConfig.getCacheThread((String)task.getId());
                if (cacheThread != null) {
                    for (Thread thread : cacheThread) {
                        LockSupport.unpark(thread);
                    }
                }
                GlobalCacheConfig.cache((String)(task.getDefId() + task.getId()), (Object)TaskStatusEnum.stop.getStatus());
                RootBp.taskStatus.put(task.getDefId() + task.getId(), false);
                taskRecordIds.add(task.getId());
                taskIds.add(task.getDefId());
                new Thread((Runnable)new /* Unavailable Anonymous Inner Class!! */).start();
            }
            this.windTaskRecordMapper.stopAllRunningTaskRecord("@{wind.task.endHand}", Integer.valueOf(TaskStatusEnum.stop.getStatus()), (List)taskRecordIds);
            this.windTaskRecordMapper.stopAllInterruptAndRestartTaskRecord(new Date(), Integer.valueOf(TaskStatusEnum.stop.getStatus()), (List)taskRecordIds);
            JSONObject jSONObject = new JSONObject();
            ArrayList<String> idList = new ArrayList<String>();
            List blockRecordList = this.windBlockRecordMapper.findByTaskIdsAndTaskRecordIds((List)taskRecordIds);
            if (CollectionUtils.isNotEmpty((Collection)blockRecordList)) {
                for (WindBlockRecord blockRecord : blockRecordList) {
                    if (!blockRecord.getBlockName().equals("CAgvOperationBp") && !blockRecord.getBlockName().equals("CombinedOrderBp") && !blockRecord.getBlockName().equals("DistributeBp") && !blockRecord.getBlockName().equals("SweeperBp") && !blockRecord.getBlockName().equals("CAgvOperationBp") && !blockRecord.getBlockName().equals("CAgcChangeDestinationBp")) continue;
                    log.info("complete task, orderId={}", (Object)blockRecord.getOrderId());
                    if (!StringUtils.isNotEmpty((CharSequence)blockRecord.getOrderId())) continue;
                    idList.add(blockRecord.getOrderId());
                }
            }
            jSONObject.put("idList", idList);
            if (!idList.isEmpty()) {
                new Thread((Runnable)new /* Unavailable Anonymous Inner Class!! */).start();
            }
            return taskRecordIds;
        }
        for (StopAllTaskReq.StopTask stopTask : req) {
            GlobalCacheConfig.cache((String)(stopTask.getTaskId() + stopTask.getTaskRecordId()), (Object)TaskStatusEnum.stop.getStatus());
            RootBp.taskStatus.put(stopTask.getTaskId() + stopTask.getTaskRecordId(), false);
            taskRecordIds.add(stopTask.getTaskRecordId());
            taskIds.add(stopTask.getTaskId());
        }
        List taskRecords = this.windTaskRecordMapper.findByRecordIds((List)taskRecordIds);
        for (WindTaskRecord task : taskRecords) {
            this.sysAlarmService.deleteTaskAlarmLikeAndNoticeWeb(task.getId());
            GlobalCacheConfig.clearTaskErrorCacheByContainsPrefix((String)task.getId());
            String siteId = WindTaskService.siteNodeHashTable.getNodeByTaskRecordId(task.getId());
            if (StringUtils.isNotEmpty((CharSequence)siteId)) {
                WindTaskService.siteNodeHashTable.hashLinkedList(siteId).deleteById(task.getId());
            }
            GlobalCacheConfig.clearCacheInterrupt((String)task.getId());
            List cacheThread = GlobalCacheConfig.getCacheThread((String)task.getId());
            if (cacheThread == null) continue;
            for (Thread thread : cacheThread) {
                LockSupport.unpark(thread);
            }
        }
        List list = this.windBlockRecordMapper.findByTaskIdsAndTaskRecordIds((List)taskRecordIds);
        if (CollectionUtils.isNotEmpty((Collection)list)) {
            for (WindBlockRecord blockRecord : list) {
                if (!blockRecord.getBlockName().equals("CAgvOperationBp") && !blockRecord.getBlockName().equals("CombinedOrderBp") && !blockRecord.getBlockName().equals("DistributeBp") && !blockRecord.getBlockName().equals("CSelectAgvBp") && !blockRecord.getBlockName().equals("SweeperBp") && !blockRecord.getBlockName().equals("CAgvOperationBp") && !blockRecord.getBlockName().equals("CAgcChangeDestinationBp")) continue;
                log.info("complete task, orderId={}", (Object)blockRecord.getOrderId());
                if (!StringUtils.isNotEmpty((CharSequence)blockRecord.getOrderId())) continue;
                this.agvApiService.terminate(blockRecord.getOrderId());
                this.distributeRecordMapper.updateIsEndRestart(1, List.of(blockRecord.getOrderId()));
            }
        }
        this.windTaskRecordMapper.stopAllRunningTaskRecord("@{wind.task.endHand}", Integer.valueOf(TaskStatusEnum.stop.getStatus()), (List)taskRecordIds);
        this.windTaskRecordMapper.stopAllInterruptAndRestartTaskRecord(new Date(), Integer.valueOf(TaskStatusEnum.stop.getStatus()), (List)taskRecordIds);
        for (WindTaskRecord task : taskRecords) {
            new Thread((Runnable)new /* Unavailable Anonymous Inner Class!! */).start();
        }
        return taskRecordIds;
    }

    @Transactional
    public List<String> stopAllEvent(List<StopAllTaskReq.StopTask> req) {
        ArrayList taskRecordIds = Lists.newArrayList();
        ArrayList taskIds = Lists.newArrayList();
        if (CollectionUtils.isEmpty(req)) {
            List records = this.eventRecordMapper.findByStatusIn(Arrays.asList(TaskStatusEnum.running.getStatus(), TaskStatusEnum.interrupt.getStatus(), TaskStatusEnum.interrupt_error.getStatus(), TaskStatusEnum.restart_error.getStatus()));
            for (EventRecord task : records) {
                WindTaskService.siteNodeHashTable.deleteAll();
                GlobalCacheConfig.cache((String)(task.getDefId() + task.getId()), (Object)TaskStatusEnum.stop.getStatus());
                AbstratRootBp.taskStatus.put(task.getDefId() + task.getId(), false);
                taskRecordIds.add(task.getId());
                taskIds.add(task.getDefId());
            }
            this.eventRecordMapper.stopAllRunningTaskRecord(new Date(), "@{wind.task.endHand}", TaskStatusEnum.stop.getStatus(), (List)taskRecordIds);
            return taskRecordIds;
        }
        for (StopAllTaskReq.StopTask task : req) {
            GlobalCacheConfig.cache((String)(task.getTaskId() + task.getTaskRecordId()), (Object)TaskStatusEnum.stop.getStatus());
            AbstratRootBp.taskStatus.put(task.getTaskId() + task.getTaskRecordId(), false);
            taskRecordIds.add(task.getTaskRecordId());
            taskIds.add(task.getTaskId());
        }
        List taskRecords = this.eventRecordMapper.findByRecordIds((List)taskRecordIds);
        for (EventRecord task : taskRecords) {
            String siteId = WindTaskService.siteNodeHashTable.getNodeByTaskRecordId(task.getId());
            if (!StringUtils.isNotEmpty((CharSequence)siteId)) continue;
            WindTaskService.siteNodeHashTable.hashLinkedList(siteId).deleteById(task.getId());
        }
        this.eventRecordMapper.stopAllRunningTaskRecord(new Date(), "@{wind.task.endHand}", TaskStatusEnum.stop.getStatus(), (List)taskRecordIds);
        return taskRecordIds;
    }

    @Transactional
    public List<String> manualEndTask(List<StopAllTaskReq.StopTask> req) {
        ArrayList taskRecordIds = Lists.newArrayList();
        ArrayList taskIds = Lists.newArrayList();
        if (CollectionUtils.isEmpty(req)) {
            List records = this.windTaskRecordMapper.findByStatusIn(Arrays.asList(TaskStatusEnum.running.getStatus(), TaskStatusEnum.interrupt.getStatus(), TaskStatusEnum.interrupt_error.getStatus(), TaskStatusEnum.restart_error.getStatus()));
            for (WindTaskRecord task : records) {
                WindTaskService.siteNodeHashTable.deleteAll();
                GlobalCacheConfig.clearCacheInterrupt((String)task.getId());
                List cacheThread = GlobalCacheConfig.getCacheThread((String)task.getId());
                if (cacheThread != null) {
                    for (Thread thread : cacheThread) {
                        LockSupport.unpark(thread);
                    }
                }
                GlobalCacheConfig.cache((String)(task.getDefId() + task.getId()), (Object)TaskStatusEnum.manual_end.getStatus());
                RootBp.taskStatus.put(task.getDefId() + task.getId(), false);
                taskRecordIds.add(task.getId());
                taskIds.add(task.getDefId());
                new Thread((Runnable)new /* Unavailable Anonymous Inner Class!! */).start();
            }
            this.windTaskRecordMapper.stopAllRunningTaskRecord("@{wind.task.manualFinish}", Integer.valueOf(TaskStatusEnum.end.getStatus()), (List)taskRecordIds);
            this.windTaskRecordMapper.stopAllInterruptAndRestartTaskRecord(new Date(), Integer.valueOf(TaskStatusEnum.end.getStatus()), (List)taskRecordIds);
            JSONObject jSONObject = new JSONObject();
            ArrayList<String> idList = new ArrayList<String>();
            List blockRecordList = this.windBlockRecordMapper.findByTaskIdsAndTaskRecordIds((List)taskRecordIds);
            if (CollectionUtils.isNotEmpty((Collection)blockRecordList)) {
                for (WindBlockRecord blockRecord : blockRecordList) {
                    if (!blockRecord.getBlockName().equals("CAgvOperationBp") && !blockRecord.getBlockName().equals("CombinedOrderBp") && !blockRecord.getBlockName().equals("DistributeBp") && !blockRecord.getBlockName().equals("SweeperBp")) continue;
                    log.info("complete task, orderId={}", (Object)blockRecord.getOrderId());
                    idList.add(blockRecord.getOrderId());
                }
            }
            jSONObject.put("idList", idList);
            new Thread((Runnable)new /* Unavailable Anonymous Inner Class!! */).start();
            return taskRecordIds;
        }
        for (StopAllTaskReq.StopTask stopTask : req) {
            GlobalCacheConfig.cache((String)(stopTask.getTaskId() + stopTask.getTaskRecordId()), (Object)TaskStatusEnum.manual_end.getStatus());
            RootBp.taskStatus.put(stopTask.getTaskId() + stopTask.getTaskRecordId(), false);
            taskRecordIds.add(stopTask.getTaskRecordId());
            taskIds.add(stopTask.getTaskId());
        }
        List taskRecords = this.windTaskRecordMapper.findByRecordIds((List)taskRecordIds);
        for (WindTaskRecord task : taskRecords) {
            String siteId = WindTaskService.siteNodeHashTable.getNodeByTaskRecordId(task.getId());
            if (StringUtils.isNotEmpty((CharSequence)siteId)) {
                WindTaskService.siteNodeHashTable.hashLinkedList(siteId).deleteById(task.getId());
            }
            GlobalCacheConfig.clearCacheInterrupt((String)task.getId());
            List cacheThread = GlobalCacheConfig.getCacheThread((String)task.getId());
            if (cacheThread == null) continue;
            for (Thread thread : cacheThread) {
                LockSupport.unpark(thread);
            }
        }
        List list = this.windBlockRecordMapper.findByTaskIdsAndTaskRecordIds((List)taskRecordIds);
        if (CollectionUtils.isNotEmpty((Collection)list)) {
            for (WindBlockRecord blockRecord : list) {
                if (!blockRecord.getBlockName().equals("CAgvOperationBp") && !blockRecord.getBlockName().equals("CombinedOrderBp") && !blockRecord.getBlockName().equals("DistributeBp") && !blockRecord.getBlockName().equals("SweeperBp")) continue;
                log.info("complete task, orderId={}", (Object)blockRecord.getOrderId());
                JSONObject param = new JSONObject();
                param.put("id", (Object)blockRecord.getOrderId());
                try {
                    OkHttpUtil.postJsonParams((String)RootBp.getUrl((String)ApiEnum.markComplete.getUri()), (String)param.toJSONString());
                }
                catch (IOException e) {
                    log.error("stopAllTask \u53d1\u9001\u4efb\u52a1\u5c01\u53e3\u5931\u8d25: orderId: {}", (Object)blockRecord.getOrderId());
                }
                this.agvApiService.terminate(blockRecord.getOrderId());
            }
        }
        this.windTaskRecordMapper.stopAllRunningTaskRecord("@{wind.task.manualFinish}", Integer.valueOf(TaskStatusEnum.end.getStatus()), (List)taskRecordIds);
        this.windTaskRecordMapper.stopAllInterruptAndRestartTaskRecord(new Date(), Integer.valueOf(TaskStatusEnum.end.getStatus()), (List)taskRecordIds);
        for (WindTaskRecord task : taskRecords) {
            new Thread((Runnable)new /* Unavailable Anonymous Inner Class!! */).start();
        }
        return taskRecordIds;
    }

    @Transactional
    public boolean stopTask(List<StopAllTaskReq.StopTask> req) {
        int ifUpdate;
        ArrayList taskRecordIds = Lists.newArrayList();
        ArrayList taskIds = Lists.newArrayList();
        for (StopAllTaskReq.StopTask stopTask : req) {
            GlobalCacheConfig.cache((String)(stopTask.getTaskId() + stopTask.getTaskRecordId()), (Object)TaskStatusEnum.stop.getStatus());
            RootBp.taskStatus.put(stopTask.getTaskId() + stopTask.getTaskRecordId(), false);
            taskRecordIds.add(stopTask.getTaskRecordId());
            taskIds.add(stopTask.getTaskId());
        }
        List taskRecords = this.windTaskRecordMapper.findByRecordIds((List)taskRecordIds);
        for (Object task : taskRecords) {
            String siteId = WindTaskService.siteNodeHashTable.getNodeByTaskRecordId(task.getId());
            if (StringUtils.isNotEmpty((CharSequence)siteId)) {
                WindTaskService.siteNodeHashTable.hashLinkedList(siteId).deleteById(task.getId());
            }
            GlobalCacheConfig.clearCacheInterrupt((String)task.getId());
            List cacheThread = GlobalCacheConfig.getCacheThread((String)task.getId());
            if (cacheThread == null) continue;
            for (Thread thread : cacheThread) {
                LockSupport.unpark(thread);
            }
        }
        List list = this.windBlockRecordMapper.findByTaskIdsAndTaskRecordIds((List)taskRecordIds);
        if (CollectionUtils.isNotEmpty((Collection)list)) {
            for (WindBlockRecord blockRecord : list) {
                if (!blockRecord.getBlockName().equals("CAgvOperationBp") && !blockRecord.getBlockName().equals("CombinedOrderBp") && !blockRecord.getBlockName().equals("DistributeBp") && !blockRecord.getBlockName().equals("SweeperBp")) continue;
                log.info("complete task, orderId={}", (Object)blockRecord.getOrderId());
                this.agvApiService.terminate(blockRecord.getOrderId());
            }
        }
        if ((ifUpdate = this.windTaskRecordMapper.stopEnableTaskRecord(new Date(), Integer.valueOf(TaskStatusEnum.stop.getStatus()), (List)taskRecordIds)) == 1) {
            for (WindTaskRecord task : taskRecords) {
                new Thread((Runnable)new /* Unavailable Anonymous Inner Class!! */).start();
            }
            return true;
        }
        return false;
    }

    public void deleteAllTask() {
        List recordByStatus = this.windTaskRecordMapper.getRecordByStatus();
        List collect = recordByStatus.stream().map(BaseRecord::getId).collect(Collectors.toList());
        this.windTaskRecordMapper.deleteAllTask();
        new Thread((Runnable)new /* Unavailable Anonymous Inner Class!! */).start();
    }

    @Transactional
    public int deleteTaskByIds(List<String> ids) {
        return this.windTaskRecordMapper.deleteTaskByIds(ids);
    }

    public void updateTaskRecordEndedReason(String taskRecordId, String endedReason) {
        this.windTaskRecordMapper.updateTaskRecordEndedReason(taskRecordId, endedReason);
    }

    public ConcurrentHashMap<String, Object> getDataCacheOld() {
        String data;
        List all = this.windDataCacheMapper.findAll();
        if (CollectionUtils.isNotEmpty((Collection)all) && StringUtils.isNotEmpty((CharSequence)(data = ((WindDataCache)all.get(0)).getData()))) {
            ConcurrentHashMap dataMap = (ConcurrentHashMap)JSONObject.parseObject((String)data, ConcurrentHashMap.class);
            return dataMap;
        }
        return new ConcurrentHashMap<String, Object>();
    }

    public ConcurrentHashMap<String, Object> getDataCache() {
        List all = this.windDataCacheSplitMapper.findAll();
        ConcurrentHashMap<String, Object> dataMap = new ConcurrentHashMap<String, Object>();
        all.forEach(cache -> dataMap.put(cache.getDataKey(), cache.getDataValue()));
        return dataMap;
    }

    @Transactional
    public void dataCacheOld(String data) {
        List all = this.windDataCacheMapper.findAll();
        if (CollectionUtils.isNotEmpty((Collection)all)) {
            WindDataCache cache = (WindDataCache)all.get(0);
            cache.setData(data);
            this.windDataCacheMapper.save((Object)cache);
        } else {
            WindDataCache cache = new WindDataCache();
            cache.setData(data);
            this.windDataCacheMapper.save((Object)cache);
        }
    }

    @Transactional
    public void dataCache(String dataKey, String dataValue) {
        ArrayList<WindDataCacheSplit> caches = new ArrayList<WindDataCacheSplit>();
        caches.add(new WindDataCacheSplit(dataKey, dataValue, new Date()));
        this.dataCacheAll(caches);
    }

    @Transactional
    public void dataCache(String dataKey, String dataValue, int keep) {
        ArrayList<WindDataCacheSplit> caches = new ArrayList<WindDataCacheSplit>();
        caches.add(new WindDataCacheSplit(dataKey, dataValue, new Date(), Integer.valueOf(keep)));
        this.dataCacheAll(caches);
    }

    @Transactional
    public void dataCacheAll(List<WindDataCacheSplit> newCaches) {
        ArrayList caches = new ArrayList();
        List keys = newCaches.stream().map(WindDataCacheSplit::getDataKey).collect(Collectors.toList());
        List existsCaches = this.windDataCacheSplitMapper.findByDataKeyIn(keys);
        newCaches.forEach(newCache -> {
            WindDataCacheSplit existsCache = existsCaches.stream().filter(ec -> ec.getDataKey().equals(newCache.getDataKey())).findFirst().orElse(null);
            if (existsCache != null) {
                caches.add(existsCache.withDataValue(newCache.getDataValue()).withUpdatedOn(new Date()));
            } else {
                caches.add(newCache.withUpdatedOn(new Date()));
            }
        });
        this.windDataCacheSplitMapper.saveAll(caches);
    }

    @Transactional
    public int removeDataCache(String dataKey) {
        return this.windDataCacheSplitMapper.deleteByDataKey(dataKey);
    }

    @Transactional
    public int removeDataCacheBefore(Date updatedOn) {
        List caches = this.windDataCacheSplitMapper.findByUpdatedOnBefore(updatedOn);
        ((ConcurrentHashMap.KeySetView)CacheDataBp.cacheMap.keySet()).removeAll((Collection)caches.stream().map(WindDataCacheSplit::getDataKey).collect(Collectors.toList()));
        return this.windDataCacheSplitMapper.deleteAllByUpdatedOnLessThan(updatedOn);
    }

    public boolean hasAlreadyMoved() {
        WindDataCacheSplit moved = this.windDataCacheSplitMapper.findByDataKey("moved_all_to_cache_split");
        log.info("cache moved: {}", (Object)(moved != null ? 1 : 0));
        return moved != null;
    }

    @Transactional
    public int updateTaskRecordFirstExecutorTime(Date time, String id) {
        return this.windTaskRecordMapper.updateTaskRecordFirstExecutorTime(time, id);
    }

    @Transactional
    public int updateTaskRecordExecutorTime(WindTaskRecord record) {
        return this.windTaskRecordMapper.updateTaskRecordExecutorTime(record);
    }

    @Transactional
    public void clearWhileBlockRecord(String taskRecord, String key) {
        int i = this.windBlockRecordMapper.clearWindBlockRecordByTaskRecordAndWhile(taskRecord, "%" + key + "%");
    }

    @Transactional
    public void clearChildrenRecord(String taskRecord, List<String> key) {
        int i = this.windBlockRecordMapper.clearChildrenRecord(taskRecord, key);
    }

    public WindTaskDef findAllByLabel(String label) throws DataIntegrityViolationException {
        return this.windTaskDefMapper.findAllByLabel(label);
    }

    @Transactional
    public void updateWindcategoryId(WindTaskDef record) {
        this.windTaskDefMapper.updateWindcategoryId(record.getWindcategoryId(), record.getId());
    }

    public List<WindTaskDef> findWindTaskDefByWindcategoryIdIs0() {
        return this.windTaskDefMapper.findWindTaskDefByWindcategoryIdIs0();
    }

    public List<WindTaskDef> findWindTaskDefByLabel(String label) {
        return this.windTaskDefMapper.findWindTaskDefByLabelLike(label);
    }

    public List<WindTaskRecord> findByParentId(String parentId) {
        return this.windTaskRecordMapper.findByParentId(parentId);
    }
}

