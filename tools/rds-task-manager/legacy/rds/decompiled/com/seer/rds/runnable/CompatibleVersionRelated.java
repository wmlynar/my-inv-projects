/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.alibaba.fastjson.JSONObject
 *  com.seer.rds.config.GlobalCacheConfig
 *  com.seer.rds.config.PropConfig
 *  com.seer.rds.constant.TaskStatusEnum
 *  com.seer.rds.dao.EventDefHistoryMapper
 *  com.seer.rds.dao.EventDefMapper
 *  com.seer.rds.dao.InterfaceDefHistoryMapper
 *  com.seer.rds.dao.InterfaceHandleMapper
 *  com.seer.rds.dao.WindBlockRecordMapper
 *  com.seer.rds.dao.WindTaskDefHistoryMapper
 *  com.seer.rds.dao.WindTaskDefMapper
 *  com.seer.rds.dao.WindTaskRecordMapper
 *  com.seer.rds.listener.EventSource
 *  com.seer.rds.model.wind.EventDef
 *  com.seer.rds.model.wind.EventDefHistory
 *  com.seer.rds.model.wind.InterfaceDefHistory
 *  com.seer.rds.model.wind.InterfacePreHandle
 *  com.seer.rds.model.wind.WindBlockRecord
 *  com.seer.rds.model.wind.WindTaskDef
 *  com.seer.rds.model.wind.WindTaskDefHistory
 *  com.seer.rds.model.wind.WindTaskRecord
 *  com.seer.rds.runnable.CompatibleVersionRelated
 *  com.seer.rds.service.agv.AgvApiService
 *  com.seer.rds.service.agv.WindService
 *  com.seer.rds.service.wind.RootBp
 *  com.seer.rds.service.wind.commonBp.CacheDataBp
 *  com.seer.rds.util.SpringUtil
 *  org.apache.commons.collections.CollectionUtils
 *  org.apache.commons.compress.utils.Lists
 *  org.slf4j.Logger
 *  org.slf4j.LoggerFactory
 *  org.springframework.jdbc.core.JdbcTemplate
 */
package com.seer.rds.runnable;

import com.alibaba.fastjson.JSONObject;
import com.seer.rds.config.GlobalCacheConfig;
import com.seer.rds.config.PropConfig;
import com.seer.rds.constant.TaskStatusEnum;
import com.seer.rds.dao.EventDefHistoryMapper;
import com.seer.rds.dao.EventDefMapper;
import com.seer.rds.dao.InterfaceDefHistoryMapper;
import com.seer.rds.dao.InterfaceHandleMapper;
import com.seer.rds.dao.WindBlockRecordMapper;
import com.seer.rds.dao.WindTaskDefHistoryMapper;
import com.seer.rds.dao.WindTaskDefMapper;
import com.seer.rds.dao.WindTaskRecordMapper;
import com.seer.rds.listener.EventSource;
import com.seer.rds.model.wind.EventDef;
import com.seer.rds.model.wind.EventDefHistory;
import com.seer.rds.model.wind.InterfaceDefHistory;
import com.seer.rds.model.wind.InterfacePreHandle;
import com.seer.rds.model.wind.WindBlockRecord;
import com.seer.rds.model.wind.WindTaskDef;
import com.seer.rds.model.wind.WindTaskDefHistory;
import com.seer.rds.model.wind.WindTaskRecord;
import com.seer.rds.service.agv.AgvApiService;
import com.seer.rds.service.agv.WindService;
import com.seer.rds.service.wind.RootBp;
import com.seer.rds.service.wind.commonBp.CacheDataBp;
import com.seer.rds.util.SpringUtil;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Date;
import java.util.List;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.locks.LockSupport;
import org.apache.commons.collections.CollectionUtils;
import org.apache.commons.compress.utils.Lists;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;

public class CompatibleVersionRelated
implements Runnable {
    private static final Logger log = LoggerFactory.getLogger(CompatibleVersionRelated.class);

    @Override
    public void run() {
        WindService windService = (WindService)SpringUtil.getBean(WindService.class);
        ConcurrentHashMap dataCache = windService.getDataCache();
        WindTaskRecordMapper windTaskRecordMapper = (WindTaskRecordMapper)SpringUtil.getBean(WindTaskRecordMapper.class);
        Integer count = windTaskRecordMapper.findCount();
        if (count > 0) {
            this.versionCompatibility1_7_19(dataCache);
            this.versionCompatibility1_7_21(dataCache);
            this.versionCompatibility1_7_22(dataCache);
            this.versionCompatibility1_7_52(dataCache);
            this.versionCompatibility1_7_53(dataCache);
            this.versionCompatibility1_8_20(dataCache);
            this.versionCompatibility1_8_25(dataCache);
            this.versionCompatibility1_8_31(dataCache);
            this.versionCompatibility1_8_43(dataCache);
            this.versionCompatibility1_8_45(dataCache);
        } else {
            CacheDataBp.cacheMap.put("1.8.45", true);
            windService.dataCache("1.8.45", "true", 1);
        }
    }

    private void versionCompatibility1_8_45(ConcurrentHashMap<String, Object> dataCache) {
        Object versionState = dataCache.get("1.8.45");
        log.info("start versionCompatibility1_8_45");
        if ("true".equals(versionState) || Boolean.TRUE.equals(versionState)) {
            WindService windService = (WindService)SpringUtil.getBean(WindService.class);
            windService.dataCache("1.8.45", "true", 1);
        } else {
            PropConfig propConfig = (PropConfig)SpringUtil.getBean(PropConfig.class);
            JdbcTemplate jdbcTemplate = (JdbcTemplate)SpringUtil.getBean(JdbcTemplate.class);
            String sql = "";
            if (propConfig.getDatabaseType().equals("MYSQL")) {
                sql = "ALTER TABLE t_windtaskrecord MODIFY def_label VARCHAR(150), MODIFY agv_id VARCHAR(150)";
                try {
                    jdbcTemplate.execute(sql);
                }
                catch (Exception e) {
                    log.error("" + e);
                }
            }
            sql = "CREATE INDEX createdOnIsDelDefLabelAgvIdStatusStateDescriptionIndex ON t_windtaskrecord (created_on, is_del, def_label, agv_id, status, state_description);";
            try {
                jdbcTemplate.execute(sql);
            }
            catch (Exception e) {
                log.error("" + e);
            }
            CacheDataBp.cacheMap.put("1.8.45", true);
            WindService windService = (WindService)SpringUtil.getBean(WindService.class);
            windService.dataCache("1.8.45", "true", 1);
        }
    }

    private void versionCompatibility1_8_43(ConcurrentHashMap<String, Object> dataCache) {
        Object versionState = dataCache.get("1.8.43");
        if ("true".equals(versionState) || Boolean.TRUE.equals(versionState)) {
            WindService windService = (WindService)SpringUtil.getBean(WindService.class);
            windService.dataCache("1.8.43", "true", 1);
        } else {
            WindTaskDefMapper windTaskDefMapper = (WindTaskDefMapper)SpringUtil.getBean(WindTaskDefMapper.class);
            WindTaskDefHistoryMapper windTaskDefHistoryMapper = (WindTaskDefHistoryMapper)SpringUtil.getBean(WindTaskDefHistoryMapper.class);
            InterfaceHandleMapper interfaceHandleMapper = (InterfaceHandleMapper)SpringUtil.getBean(InterfaceHandleMapper.class);
            InterfaceDefHistoryMapper interfaceDefHistoryMapper = (InterfaceDefHistoryMapper)SpringUtil.getBean(InterfaceDefHistoryMapper.class);
            EventDefMapper eventDefMapper = (EventDefMapper)SpringUtil.getBean(EventDefMapper.class);
            EventDefHistoryMapper eventDefHistoryMapper = (EventDefHistoryMapper)SpringUtil.getBean(EventDefHistoryMapper.class);
            for (WindTaskDef windTaskDef : windTaskDefMapper.findAll()) {
                if (windTaskDef.getVersion() == null) {
                    windTaskDef.setVersion(Integer.valueOf(1));
                }
                WindTaskDefHistory windTaskDefHistory = WindTaskDefHistory.builder().createDate(new Date()).label(windTaskDef.getLabel()).detail(windTaskDef.getDetail()).version(windTaskDef.getVersion()).build();
                try {
                    windTaskDefHistoryMapper.save((Object)windTaskDefHistory);
                }
                catch (Exception e) {
                    log.error(e.getMessage());
                }
            }
            for (InterfacePreHandle interfacePreHandle : interfaceHandleMapper.findAll()) {
                if (interfacePreHandle.getVersion() == null) {
                    interfacePreHandle.setVersion(Integer.valueOf(1));
                }
                InterfaceDefHistory interfaceDefHistory = InterfaceDefHistory.builder().url(interfacePreHandle.getUrl()).detail(interfacePreHandle.getDetail()).method(interfacePreHandle.getMethod()).version(interfacePreHandle.getVersion()).createDate(new Date()).build();
                try {
                    interfaceHandleMapper.save((Object)interfacePreHandle);
                    interfaceDefHistoryMapper.save((Object)interfaceDefHistory);
                }
                catch (Exception e) {
                    log.error(e.getMessage());
                }
            }
            for (EventDef eventDef : eventDefMapper.findAll()) {
                if (eventDef.getVersion() == null) {
                    eventDef.setVersion(Integer.valueOf(1));
                }
                EventDefHistory eventDefHistory = EventDefHistory.builder().msg(eventDef.getMsg()).label(eventDef.getLabel()).version(eventDef.getVersion()).detail(eventDef.getDetail()).createDate(new Date()).build();
                try {
                    eventDefMapper.save((Object)eventDef);
                    eventDefHistoryMapper.save((Object)eventDefHistory);
                }
                catch (Exception e) {
                    log.error(e.getMessage());
                }
            }
            CacheDataBp.cacheMap.put("1.8.43", true);
            WindService windService = (WindService)SpringUtil.getBean(WindService.class);
            windService.dataCache("1.8.43", "true", 1);
        }
    }

    private void versionCompatibility1_8_31(ConcurrentHashMap<String, Object> dataCache) {
        Object versionState = dataCache.get("1.8.31");
        if ("true".equals(versionState) || Boolean.TRUE.equals(versionState)) {
            WindService windService = (WindService)SpringUtil.getBean(WindService.class);
            windService.dataCache("1.8.31", "true", 1);
        } else {
            PropConfig propConfig = (PropConfig)SpringUtil.getBean(PropConfig.class);
            JdbcTemplate jdbcTemplate = (JdbcTemplate)SpringUtil.getBean(JdbcTemplate.class);
            String sql = "";
            if (propConfig.getDatabaseType().equals("MYSQL")) {
                sql = "alter  table  `t_statrecord`   drop  index  levelIndex;";
            } else if (propConfig.getDatabaseType().equals("SQLSERVER")) {
                sql = "DROP INDEX t_statrecord.levelIndex";
            }
            try {
                jdbcTemplate.execute(sql);
            }
            catch (Exception e) {
                log.error("" + e);
            }
            if (propConfig.getDatabaseType().equals("MYSQL")) {
                sql = "alter  table  `t_statrecord_duplicate`   drop  index  levelIndex;";
            } else if (propConfig.getDatabaseType().equals("SQLSERVER")) {
                sql = "DROP INDEX t_statrecord_duplicate.levelIndex";
            }
            try {
                jdbcTemplate.execute(sql);
            }
            catch (Exception e) {
                log.error("" + e);
            }
            CacheDataBp.cacheMap.put("1.8.31", true);
            WindService windService = (WindService)SpringUtil.getBean(WindService.class);
            windService.dataCache("1.8.31", "true", 1);
        }
    }

    private void versionCompatibility1_8_25(ConcurrentHashMap<String, Object> dataCache) {
        WindService windService;
        Object versionState = dataCache.get("1.8.25");
        if ("true".equals(versionState) || Boolean.TRUE.equals(versionState)) {
            windService = (WindService)SpringUtil.getBean(WindService.class);
            windService.dataCache("1.8.25", "true", 1);
        } else {
            JdbcTemplate jdbcTemplate = (JdbcTemplate)SpringUtil.getBean(JdbcTemplate.class);
            String sql = "UPDATE t_eventrecord SET def_id = event_def_id;";
            try {
                jdbcTemplate.execute(sql);
            }
            catch (Exception e) {
                log.error("" + e);
            }
            sql = "UPDATE t_preinterfacecallrecord SET def_id = pre_interface_call_id , input_params = params , def_label = task_def_label;";
            try {
                jdbcTemplate.execute(sql);
            }
            catch (Exception e) {
                log.error("" + e);
            }
        }
        CacheDataBp.cacheMap.put("1.8.25", true);
        windService = (WindService)SpringUtil.getBean(WindService.class);
        windService.dataCache("1.8.25", "true", 1);
    }

    private void versionCompatibility1_7_19(ConcurrentHashMap<String, Object> dataCache) {
        WindService windService;
        Object versionState = dataCache.get("1.7.19");
        WindTaskRecordMapper windTaskRecordMapper = (WindTaskRecordMapper)SpringUtil.getBean(WindTaskRecordMapper.class);
        WindBlockRecordMapper windBlockRecordMapper = (WindBlockRecordMapper)SpringUtil.getBean(WindBlockRecordMapper.class);
        EventSource eventSource = (EventSource)SpringUtil.getBean(EventSource.class);
        AgvApiService agvApiService = (AgvApiService)SpringUtil.getBean(AgvApiService.class);
        if ("true".equals(versionState) || Boolean.TRUE.equals(versionState)) {
            windService = (WindService)SpringUtil.getBean(WindService.class);
            windService.dataCache("1.7.19", "true", 1);
        } else {
            ArrayList taskRecordIds = Lists.newArrayList();
            ArrayList taskIds = Lists.newArrayList();
            SpringUtil.getBean(WindTaskRecordMapper.class);
            List records = windTaskRecordMapper.findByStatusIn(List.of(Integer.valueOf(TaskStatusEnum.end_error.getStatus())));
            for (WindTaskRecord task : records) {
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
            windTaskRecordMapper.updateAllTaskRecord(new Date(), "@{wind.task.endHand}", Integer.valueOf(TaskStatusEnum.stop.getStatus()), (List)taskRecordIds);
            JSONObject param = new JSONObject();
            ArrayList<String> idList = new ArrayList<String>();
            List blockRecordList = windBlockRecordMapper.findByTaskIdsAndTaskRecordIds((List)taskRecordIds);
            if (CollectionUtils.isNotEmpty((Collection)blockRecordList)) {
                for (WindBlockRecord blockRecord : blockRecordList) {
                    if (!blockRecord.getBlockName().equals("CAgvOperationBp") && !blockRecord.getBlockName().equals("CombinedOrderBp") && !blockRecord.getBlockName().equals("DistributeBp") && !blockRecord.getBlockName().equals("SweeperBp")) continue;
                    log.info("complete task, orderId=" + blockRecord.getOrderId());
                    idList.add(blockRecord.getOrderId());
                }
            }
            param.put("idList", idList);
            new Thread((Runnable)new /* Unavailable Anonymous Inner Class!! */).start();
        }
        CacheDataBp.cacheMap.put("1.7.19", true);
        windService = (WindService)SpringUtil.getBean(WindService.class);
        windService.dataCache("1.7.19", "true", 1);
    }

    private void versionCompatibility1_7_21(ConcurrentHashMap<String, Object> dataCache) {
        Object versionState = dataCache.get("1.7.21");
        if ("true".equals(versionState) || Boolean.TRUE.equals(versionState)) {
            WindService windService = (WindService)SpringUtil.getBean(WindService.class);
            windService.dataCache("1.7.21", "true", 1);
        } else {
            PropConfig propConfig = (PropConfig)SpringUtil.getBean(PropConfig.class);
            JdbcTemplate jdbcTemplate = (JdbcTemplate)SpringUtil.getBean(JdbcTemplate.class);
            String sql = "";
            if (propConfig.getDatabaseType().equals("MYSQL")) {
                sql = "alter  table  `t_windtaskrecord`   drop  index  statusIndex;";
            } else if (propConfig.getDatabaseType().equals("SQLSERVER")) {
                sql = "DROP INDEX t_windtaskrecord.statusIndex";
            }
            try {
                jdbcTemplate.execute(sql);
            }
            catch (Exception e) {
                log.error("" + e);
            }
            if (propConfig.getDatabaseType().equals("MYSQL")) {
                sql = "alter  table  `t_windtaskrecord`   drop  index  createdOnIndex;";
            } else if (propConfig.getDatabaseType().equals("SQLSERVER")) {
                sql = "DROP INDEX t_windtaskrecord.createdOnIndex";
            }
            try {
                jdbcTemplate.execute(sql);
            }
            catch (Exception e) {
                log.error("" + e);
            }
            if (propConfig.getDatabaseType().equals("MYSQL")) {
                sql = "alter  table  `t_windtaskrecord`   drop  index  agvIdIndex;";
            } else if (propConfig.getDatabaseType().equals("SQLSERVER")) {
                sql = "DROP INDEX t_windtaskrecord.agvIdIndex";
            }
            try {
                jdbcTemplate.execute(sql);
            }
            catch (Exception e) {
                log.error("" + e);
            }
            if (propConfig.getDatabaseType().equals("MYSQL")) {
                sql = "alter  table  `t_windtaskrecord`   drop  index  isDelIndex;";
            } else if (propConfig.getDatabaseType().equals("SQLSERVER")) {
                sql = "DROP INDEX t_windtaskrecord.isDelIndex";
            }
            try {
                jdbcTemplate.execute(sql);
            }
            catch (Exception e) {
                log.error("" + e);
            }
            if (propConfig.getDatabaseType().equals("MYSQL")) {
                sql = "alter  table  `t_windtaskrecord`   drop  index  statusIndex;";
            } else if (propConfig.getDatabaseType().equals("SQLSERVER")) {
                sql = "DROP INDEX t_windtaskrecord.statusIndex";
            }
            try {
                jdbcTemplate.execute(sql);
            }
            catch (Exception e) {
                log.error("" + e);
            }
            if (propConfig.getDatabaseType().equals("MYSQL")) {
                sql = "alter  table  `t_windtaskrecord`   drop  index  defLabelIndex;";
            } else if (propConfig.getDatabaseType().equals("SQLSERVER")) {
                sql = "DROP INDEX t_windtaskrecord.defLabelIndex";
            }
            try {
                jdbcTemplate.execute(sql);
            }
            catch (Exception e) {
                log.error("" + e);
            }
            if (propConfig.getDatabaseType().equals("MYSQL")) {
                sql = "alter  table  `t_windtaskrecord`   drop  index  outOrderNoIndex;";
            } else if (propConfig.getDatabaseType().equals("SQLSERVER")) {
                sql = "DROP INDEX t_windtaskrecord.outOrderNoIndex";
            }
            try {
                jdbcTemplate.execute(sql);
            }
            catch (Exception e) {
                log.error("" + e);
            }
            if (propConfig.getDatabaseType().equals("MYSQL")) {
                sql = "alter  table  `t_windtaskrecord`   drop  index  createdOnDefLabelIndex;";
            } else if (propConfig.getDatabaseType().equals("SQLSERVER")) {
                sql = "DROP INDEX t_windtaskrecord.createdOnDefLabelIndex";
            }
            try {
                jdbcTemplate.execute(sql);
            }
            catch (Exception e) {
                log.error("" + e);
            }
            if (propConfig.getDatabaseType().equals("MYSQL")) {
                sql = "alter  table  `t_windtaskrecord`   drop  index  defLabelAgvIdIndex;";
            } else if (propConfig.getDatabaseType().equals("SQLSERVER")) {
                sql = "DROP INDEX t_windtaskrecord.defLabelAgvIdIndex";
            }
            try {
                jdbcTemplate.execute(sql);
            }
            catch (Exception e) {
                log.error("" + e);
            }
            if (propConfig.getDatabaseType().equals("MYSQL")) {
                sql = "alter  table  `t_windtaskrecord`   drop  index  StatusDefLabelIndex;";
            } else if (propConfig.getDatabaseType().equals("SQLSERVER")) {
                sql = "DROP INDEX t_windtaskrecord.StatusDefLabelIndex";
            }
            try {
                jdbcTemplate.execute(sql);
            }
            catch (Exception e) {
                log.error("" + e);
            }
            if (propConfig.getDatabaseType().equals("MYSQL")) {
                sql = "alter  table  `t_windtaskrecord`   drop  index  parentTaskIndex;";
            } else if (propConfig.getDatabaseType().equals("SQLSERVER")) {
                sql = "DROP INDEX t_windtaskrecord.parentTaskIndex";
            }
            try {
                jdbcTemplate.execute(sql);
            }
            catch (Exception e) {
                log.error("" + e);
            }
            if (propConfig.getDatabaseType().equals("MYSQL")) {
                sql = "alter  table  `t_windtaskrecord`   drop  index  createdOnIsDelDefLabelIndex;";
            } else if (propConfig.getDatabaseType().equals("SQLSERVER")) {
                sql = "DROP INDEX t_windtaskrecord.createdOnIsDelDefLabelIndex";
            }
            try {
                jdbcTemplate.execute(sql);
            }
            catch (Exception e) {
                log.error("" + e);
            }
            CacheDataBp.cacheMap.put("1.7.21", true);
            WindService windService = (WindService)SpringUtil.getBean(WindService.class);
            windService.dataCache("1.7.21", "true", 1);
        }
    }

    private void versionCompatibility1_7_22(ConcurrentHashMap<String, Object> dataCache) {
        WindService windService;
        Object versionState = dataCache.get("1.7.22");
        if ("true".equals(versionState) || Boolean.TRUE.equals(versionState)) {
            windService = (WindService)SpringUtil.getBean(WindService.class);
            windService.dataCache("1.7.22", "true", 1);
        } else {
            PropConfig propConfig = (PropConfig)SpringUtil.getBean(PropConfig.class);
            JdbcTemplate jdbcTemplate = (JdbcTemplate)SpringUtil.getBean(JdbcTemplate.class);
            String sql = "CREATE INDEX isDelIndex ON t_windtaskrecord (is_del)";
            try {
                jdbcTemplate.execute(sql);
            }
            catch (Exception e) {
                log.error("" + e);
            }
            sql = "update t_windtaskrecord set is_del = 0 where is_del is Null;";
            try {
                jdbcTemplate.execute(sql);
            }
            catch (Exception e) {
                log.error("" + e);
            }
            if (propConfig.getDatabaseType().equals("MYSQL")) {
                sql = "alter  table  `t_windtaskrecord`   drop  index  isDelIndex;";
            } else if (propConfig.getDatabaseType().equals("SQLSERVER")) {
                sql = "DROP INDEX t_windtaskrecord.isDelIndex";
            }
            try {
                jdbcTemplate.execute(sql);
            }
            catch (Exception e) {
                log.error("" + e);
            }
            if (propConfig.getDatabaseType().equals("MYSQL")) {
                sql = "ALTER TABLE `t_windtaskrecord`\nMODIFY COLUMN `work_stations`  varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL DEFAULT NULL AFTER `version`,\nMODIFY COLUMN `work_types`  varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL DEFAULT NULL AFTER `work_stations`,MODIFY COLUMN `call_work_station`  varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL DEFAULT NULL AFTER `agv_id`,\nMODIFY COLUMN `call_work_type`  varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL DEFAULT NULL AFTER `call_work_station`;";
            } else if (propConfig.getDatabaseType().equals("SQLSERVER")) {
                sql = "alter table Request add  work_stations varchar(255) NULL DEFAULT NULL,\nwork_types varchar(255) COLLATE Chinese_PRC_CI_AS NULL DEFAULT NULL,\ncall_work_station varchar(255) COLLATE Chinese_PRC_CI_AS NULL DEFAULT NULL,\ncall_work_type varchar(255) COLLATE Chinese_PRC_CI_AS NULL DEFAULT NULL";
            }
            try {
                jdbcTemplate.execute(sql);
            }
            catch (Exception e) {
                log.error("" + e);
            }
            if (propConfig.getDatabaseType().equals("MYSQL")) {
                sql = "alter  table  `t_windtaskrecord`   drop  index  defIdIndex;";
            } else if (propConfig.getDatabaseType().equals("SQLSERVER")) {
                sql = "DROP INDEX t_windtaskrecord.defIdIndex";
            }
            try {
                jdbcTemplate.execute(sql);
            }
            catch (Exception e) {
                log.error("" + e);
            }
        }
        CacheDataBp.cacheMap.put("1.7.22", true);
        windService = (WindService)SpringUtil.getBean(WindService.class);
        windService.dataCache("1.7.22", "true", 1);
    }

    private void versionCompatibility1_7_52(ConcurrentHashMap<String, Object> dataCache) {
        PropConfig propConfig = (PropConfig)SpringUtil.getBean(PropConfig.class);
        Object versionState = dataCache.get("1.7.52");
        if ("true".equals(versionState) || Boolean.TRUE.equals(versionState)) {
            WindService windService = (WindService)SpringUtil.getBean(WindService.class);
            windService.dataCache("1.7.52", "true", 1);
        } else {
            JdbcTemplate jdbcTemplate = (JdbcTemplate)SpringUtil.getBean(JdbcTemplate.class);
            String sql = "";
            if (propConfig.getDatabaseType().equals("MYSQL")) {
                sql = "ALTER TABLE t_alarmsrecord MODIFY alarms_desc VARCHAR(1024);";
            } else if (propConfig.getDatabaseType().equals("SQLSERVER")) {
                sql = "ALTER TABLE t_alarmsrecord ALTER COLUMN alarms_desc varchar(1024)";
            }
            try {
                jdbcTemplate.execute(sql);
            }
            catch (Exception e) {
                log.error("" + e);
            }
            if (propConfig.getDatabaseType().equals("MYSQL")) {
                sql = "ALTER TABLE t_alarmsrecord_merge MODIFY alarms_desc VARCHAR(1024);";
            } else if (propConfig.getDatabaseType().equals("SQLSERVER")) {
                sql = "ALTER TABLE t_alarmsrecord_merge ALTER COLUMN alarms_desc varchar(1024)";
            }
            try {
                jdbcTemplate.execute(sql);
            }
            catch (Exception e) {
                log.error("" + e);
            }
            CacheDataBp.cacheMap.put("1.7.52", true);
            WindService windService = (WindService)SpringUtil.getBean(WindService.class);
            windService.dataCache("1.7.52", "true", 1);
        }
    }

    private void versionCompatibility1_7_53(ConcurrentHashMap<String, Object> dataCache) {
        PropConfig propConfig = (PropConfig)SpringUtil.getBean(PropConfig.class);
        Object versionState = dataCache.get("1.7.53");
        if ("true".equals(versionState) || Boolean.TRUE.equals(versionState)) {
            WindService windService = (WindService)SpringUtil.getBean(WindService.class);
            windService.dataCache("1.7.53", "true", 1);
        } else {
            JdbcTemplate jdbcTemplate = (JdbcTemplate)SpringUtil.getBean(JdbcTemplate.class);
            String sql = "";
            sql = "ALTER TABLE `t_windtaskrecord`\nMODIFY COLUMN `path`  text CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL AFTER `parent_task_record_id`;";
            try {
                jdbcTemplate.execute(sql);
            }
            catch (Exception e) {
                log.error("" + e);
            }
            CacheDataBp.cacheMap.put("1.7.53", true);
            WindService windService = (WindService)SpringUtil.getBean(WindService.class);
            windService.dataCache("1.7.53", "true", 1);
        }
    }

    private void versionCompatibility1_8_20(ConcurrentHashMap<String, Object> dataCache) {
        PropConfig propConfig = (PropConfig)SpringUtil.getBean(PropConfig.class);
        Object versionState = dataCache.get("1.8.20");
        if ("true".equals(versionState) || Boolean.TRUE.equals(versionState)) {
            WindService windService = (WindService)SpringUtil.getBean(WindService.class);
            windService.dataCache("1.8.20", "true", 1);
        } else {
            JdbcTemplate jdbcTemplate = (JdbcTemplate)SpringUtil.getBean(JdbcTemplate.class);
            String sql = "";
            if (propConfig.getDatabaseType().equals("MYSQL")) {
                sql = "ALTER TABLE t_preinterfacecall ADD COLUMN Data DATETIME DEFAULT CURRENT_TIMESTAMP;";
            } else if (propConfig.getDatabaseType().equals("SQLSERVER")) {
                sql = "ALTER TABLE t_preinterfacecall ADD  Data DATETIME DEFAULT CURRENT_TIMESTAMP;";
            }
            try {
                jdbcTemplate.execute(sql);
            }
            catch (Exception e) {
                log.error("" + e);
            }
            CacheDataBp.cacheMap.put("1.8.20", true);
            WindService windService = (WindService)SpringUtil.getBean(WindService.class);
            windService.dataCache("1.8.20", "true", 1);
        }
    }
}

