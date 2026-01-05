/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  cn.afterturn.easypoi.excel.entity.params.ExcelExportEntity
 *  com.alibaba.fastjson.JSON
 *  com.alibaba.fastjson.JSONObject
 *  com.alibaba.fastjson.PropertyNamingStrategy
 *  com.alibaba.fastjson.serializer.SerializeConfig
 *  com.alibaba.fastjson.serializer.SerializerFeature
 *  com.google.common.collect.Lists
 *  com.google.common.collect.Maps
 *  com.seer.rds.config.PropConfig
 *  com.seer.rds.constant.CommonCodeEnum
 *  com.seer.rds.constant.WindTaskRecordTitleEnum
 *  com.seer.rds.dao.ChangeAgvProgressMapper
 *  com.seer.rds.dao.EventRecordMapper
 *  com.seer.rds.dao.InterfaceHandleMapper
 *  com.seer.rds.dao.InterfaceHandleRecordMapper
 *  com.seer.rds.dao.ModbusReadLogMapper
 *  com.seer.rds.dao.ModbusWriteLogMapper
 *  com.seer.rds.dao.RobotItemMapper
 *  com.seer.rds.dao.StatRecordMapper
 *  com.seer.rds.dao.TestRecordMapper
 *  com.seer.rds.dao.WindBlockChildMapper
 *  com.seer.rds.dao.WindBlockRecordMapper
 *  com.seer.rds.dao.WindTaskDefHistoryMapper
 *  com.seer.rds.dao.WindTaskDefMapper
 *  com.seer.rds.dao.WindTaskLogMapper
 *  com.seer.rds.dao.WindTaskOrderIdMapper
 *  com.seer.rds.dao.WindTaskRecordMapper
 *  com.seer.rds.dao.WindTaskRestrictionsMapper
 *  com.seer.rds.model.wind.WindTaskDef
 *  com.seer.rds.model.wind.WindTaskDefHistory
 *  com.seer.rds.model.wind.WindTaskOrderId
 *  com.seer.rds.model.wind.WindTaskRecord
 *  com.seer.rds.model.wind.WindTaskRestrictions
 *  com.seer.rds.model.worksite.SiteNodeHashTable
 *  com.seer.rds.service.agv.WindTaskService
 *  com.seer.rds.service.agv.WindTaskService$2
 *  com.seer.rds.service.system.DataPermissionManager
 *  com.seer.rds.util.LocaleMessageUtil
 *  com.seer.rds.util.OkHttpUtil
 *  com.seer.rds.util.SpringUtil
 *  com.seer.rds.vo.OrderRetentionVo
 *  com.seer.rds.vo.ResultVo
 *  com.seer.rds.vo.WindTaskRecordImportVo
 *  com.seer.rds.vo.req.QueryTaskRecordReq
 *  com.seer.rds.vo.response.AgvSuccessTaskCountVo
 *  com.seer.rds.vo.response.PaginationResponseVo
 *  com.seer.rds.vo.response.WindTaskRecordStatVo
 *  com.seer.rds.vo.response.WindTaskRecordVo
 *  com.seer.rds.websocket.RdsServer
 *  javax.persistence.EntityManager
 *  javax.persistence.PersistenceContext
 *  javax.persistence.Query
 *  net.lingala.zip4j.core.ZipFile
 *  net.lingala.zip4j.model.FileHeader
 *  org.apache.commons.collections.CollectionUtils
 *  org.apache.commons.lang3.StringUtils
 *  org.apache.commons.lang3.time.DateFormatUtils
 *  org.slf4j.Logger
 *  org.slf4j.LoggerFactory
 *  org.springframework.beans.factory.annotation.Autowired
 *  org.springframework.beans.factory.annotation.Value
 *  org.springframework.data.domain.Page
 *  org.springframework.data.domain.PageRequest
 *  org.springframework.data.domain.Pageable
 *  org.springframework.data.jpa.domain.Specification
 *  org.springframework.jdbc.core.JdbcOperations
 *  org.springframework.jdbc.core.JdbcTemplate
 *  org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate
 *  org.springframework.stereotype.Service
 *  org.springframework.transaction.annotation.Transactional
 */
package com.seer.rds.service.agv;

import cn.afterturn.easypoi.excel.entity.params.ExcelExportEntity;
import com.alibaba.fastjson.JSON;
import com.alibaba.fastjson.JSONObject;
import com.alibaba.fastjson.PropertyNamingStrategy;
import com.alibaba.fastjson.serializer.SerializeConfig;
import com.alibaba.fastjson.serializer.SerializerFeature;
import com.google.common.collect.Lists;
import com.google.common.collect.Maps;
import com.seer.rds.config.PropConfig;
import com.seer.rds.constant.CommonCodeEnum;
import com.seer.rds.constant.WindTaskRecordTitleEnum;
import com.seer.rds.dao.ChangeAgvProgressMapper;
import com.seer.rds.dao.EventRecordMapper;
import com.seer.rds.dao.InterfaceHandleMapper;
import com.seer.rds.dao.InterfaceHandleRecordMapper;
import com.seer.rds.dao.ModbusReadLogMapper;
import com.seer.rds.dao.ModbusWriteLogMapper;
import com.seer.rds.dao.RobotItemMapper;
import com.seer.rds.dao.StatRecordMapper;
import com.seer.rds.dao.TestRecordMapper;
import com.seer.rds.dao.WindBlockChildMapper;
import com.seer.rds.dao.WindBlockRecordMapper;
import com.seer.rds.dao.WindTaskDefHistoryMapper;
import com.seer.rds.dao.WindTaskDefMapper;
import com.seer.rds.dao.WindTaskLogMapper;
import com.seer.rds.dao.WindTaskOrderIdMapper;
import com.seer.rds.dao.WindTaskRecordMapper;
import com.seer.rds.dao.WindTaskRestrictionsMapper;
import com.seer.rds.model.wind.WindTaskDef;
import com.seer.rds.model.wind.WindTaskDefHistory;
import com.seer.rds.model.wind.WindTaskOrderId;
import com.seer.rds.model.wind.WindTaskRecord;
import com.seer.rds.model.wind.WindTaskRestrictions;
import com.seer.rds.model.worksite.SiteNodeHashTable;
import com.seer.rds.service.agv.WindTaskService;
import com.seer.rds.service.system.DataPermissionManager;
import com.seer.rds.util.LocaleMessageUtil;
import com.seer.rds.util.OkHttpUtil;
import com.seer.rds.util.SpringUtil;
import com.seer.rds.vo.OrderRetentionVo;
import com.seer.rds.vo.ResultVo;
import com.seer.rds.vo.WindTaskRecordImportVo;
import com.seer.rds.vo.req.QueryTaskRecordReq;
import com.seer.rds.vo.response.AgvSuccessTaskCountVo;
import com.seer.rds.vo.response.PaginationResponseVo;
import com.seer.rds.vo.response.WindTaskRecordStatVo;
import com.seer.rds.vo.response.WindTaskRecordVo;
import com.seer.rds.websocket.RdsServer;
import java.io.BufferedReader;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.lang.invoke.CallSite;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.sql.PreparedStatement;
import java.sql.SQLException;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Collections;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionStage;
import java.util.concurrent.ExecutionException;
import java.util.function.Function;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import javax.persistence.Query;
import net.lingala.zip4j.core.ZipFile;
import net.lingala.zip4j.model.FileHeader;
import org.apache.commons.collections.CollectionUtils;
import org.apache.commons.lang3.StringUtils;
import org.apache.commons.lang3.time.DateFormatUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.jdbc.core.JdbcOperations;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/*
 * Exception performing whole class analysis ignored.
 */
@Service
public class WindTaskService {
    private static final Logger log = LoggerFactory.getLogger(WindTaskService.class);
    public static SiteNodeHashTable siteNodeHashTable = new SiteNodeHashTable();
    @PersistenceContext
    private EntityManager em;
    @Autowired
    private WindTaskRecordMapper windTaskRecordMapper;
    @Autowired
    private WindTaskOrderIdMapper windTaskOrderIdMapper;
    @Autowired
    private LocaleMessageUtil localeMessageUtil;
    @Autowired
    private StatRecordMapper statRecordMapper;
    @Autowired
    private RobotItemMapper robotItemMapper;
    @Autowired
    private WindTaskDefMapper windTaskDefMapper;
    @Autowired
    private DataPermissionManager dataPermissionManager;
    @Autowired
    private WindTaskLogMapper windTaskLogMapper;
    @Autowired
    private WindBlockRecordMapper windBlockRecordMapper;
    @Autowired
    private WindBlockChildMapper windBlockChildMapper;
    @Autowired
    private ChangeAgvProgressMapper changeAgvProgressMapper;
    @Autowired
    private InterfaceHandleRecordMapper interfaceHandleRecordMapper;
    @Autowired
    private ModbusWriteLogMapper modbusWriteLogMapper;
    @Autowired
    private ModbusReadLogMapper modbusReadLogMapper;
    @Value(value="${spring.datasource.databaseType}")
    private String dataBaseType;
    @Autowired
    private WindTaskDefHistoryMapper windTaskDefHistoryMapper;
    @Autowired
    private PropConfig propConfig;
    @Autowired
    private TestRecordMapper testRecordMapper;
    @Autowired
    private InterfaceHandleMapper interfaceHandleMapper;
    @Autowired
    private EventRecordMapper eventRecordMapper;
    public static final SerializeConfig config = new SerializeConfig();
    public static WindTaskRestrictions windTaskRestrictions = null;
    @Autowired
    private WindTaskRestrictionsMapper windTaskRestrictionsMapper;

    @Transactional
    public void saveTaskRecord(WindTaskRecord record) {
        this.windTaskRecordMapper.save((Object)record);
    }

    public WindTaskOrderId findOrderIdByTaskIdAndTaskRecordIdAndBlockId(String taskId, String taskRecordId, Integer blockId) {
        return this.windTaskOrderIdMapper.findByTaskIdAndTaskRecordIdAndBlockId(taskId, taskRecordId, blockId);
    }

    public String getDefIdById(String taskRecordId) {
        return this.windTaskRecordMapper.getDefIdById(taskRecordId);
    }

    public List<WindTaskRecord> getIdAndDefIdByDefLabel(String defLabel) {
        return this.windTaskRecordMapper.getIdAndDefIdByDefLabel(defLabel);
    }

    public String findLabelById(String taskRecordId) {
        return this.windTaskRecordMapper.findLabelById(taskRecordId);
    }

    public List<WindTaskRecord> findIdLabelByIdIn(List<String> taskRecordIds) {
        return this.windTaskRecordMapper.findIdLabelByIdIn(taskRecordIds);
    }

    public Integer findStatusByTaskRecordId(String taskRecordId) {
        return this.windTaskRecordMapper.findStatusById(taskRecordId);
    }

    public List<Integer> find1ByLabelAndStatusIn(String taskLabel) {
        return this.windTaskRecordMapper.find1ByLabelAndStatusIn(taskLabel);
    }

    public List<WindTaskRecord> findRecordIdAndTaskIdByLabelAndStatusIn(String taskLabel) {
        return this.windTaskRecordMapper.findRecordIdAndTaskIdByLabelAndStatusIn(taskLabel);
    }

    @Transactional
    public void saveWindTaskOrderId(WindTaskOrderId orderId) {
        this.windTaskOrderIdMapper.save((Object)orderId);
    }

    public List<WindTaskRecord> getTaskRecordListByOutOrderNo(String outOrderNo) {
        List taskRecords = this.windTaskRecordMapper.getRecordListByOutOrderNo(outOrderNo);
        return taskRecords;
    }

    public int findCount() {
        Integer count = this.windTaskRecordMapper.findCount();
        return count;
    }

    public WindTaskRecord getTaskRecordById(String taskRecordId) {
        WindTaskRecord taskRecord = this.windTaskRecordMapper.findById((Object)taskRecordId).orElse(null);
        return taskRecord;
    }

    public WindTaskRecordVo getRecordById(String taskRecordId) {
        WindTaskRecord taskRecord = this.windTaskRecordMapper.findRecordById(taskRecordId);
        WindTaskRecordVo windTaskRecordVo = null;
        if (null != taskRecord) {
            windTaskRecordVo = WindTaskRecordVo.builder().id(taskRecord.getId()).outOrderNo(taskRecord.getOutOrderNo()).defId(taskRecord.getDefId()).defLabel(taskRecord.getDefLabel()).agvId(StringUtils.isEmpty((CharSequence)taskRecord.getAgvId()) ? "" : taskRecord.getAgvId()).createdOn(null == taskRecord.getCreatedOn() ? null : taskRecord.getCreatedOn().toString()).status(taskRecord.getStatus()).endedOn(null == taskRecord.getEndedOn() ? null : taskRecord.getEndedOn().toString()).stateDescription(taskRecord.getStateDescription()).build();
        }
        return windTaskRecordVo;
    }

    public List<WindTaskRecord> getTaskRecordListByAgvId(String agvId) {
        List taskRecords = this.windTaskRecordMapper.getRecordListByAgvId(agvId);
        return taskRecords;
    }

    public PaginationResponseVo findByConditionPage(QueryTaskRecordReq req, Integer page, Integer pageSize, Locale locale, boolean needShiro) throws ExecutionException, InterruptedException {
        List authorizedTasks = needShiro ? this.dataPermissionManager.getAuthorizedGetTasks() : Collections.EMPTY_LIST;
        CompletableFuture<List> completableFuture1 = CompletableFuture.supplyAsync(() -> {
            String orderStr;
            JdbcTemplate jdbcTemplate = (JdbcTemplate)SpringUtil.getBean(JdbcTemplate.class);
            StringBuilder sqlBuilder = new StringBuilder("select * from t_windtaskrecord where 1=1 ");
            StringBuilder subSqlBuilder = new StringBuilder(" select id FROM");
            StringBuilder subSubSqlBuilder = new StringBuilder();
            String string = orderStr = req.getIsOrderDesc() != null && req.getIsOrderDesc() != false ? "ASC" : "DESC";
            if (this.dataBaseType.equals("MYSQL")) {
                subSubSqlBuilder.append("select id from t_windtaskrecord FORCE INDEX(createdOnIsDelDefLabelAgvIdStatusIndex) where 1=1 ");
                if (StringUtils.isNotEmpty((CharSequence)req.getWorkStations()) || StringUtils.isNotEmpty((CharSequence)req.getWorkTypes())) {
                    subSubSqlBuilder.setLength(0);
                    subSubSqlBuilder.append("select id from t_windtaskrecord FORCE INDEX(createdOnWorkStationWorkTypeIsDel) where 1=1 ");
                }
                if (StringUtils.isNotEmpty((CharSequence)req.getOutOrderNo())) {
                    subSubSqlBuilder.setLength(0);
                    subSubSqlBuilder.append("select id from t_windtaskrecord FORCE INDEX(outOrderNoIsDelIndex) where 1=1 ");
                }
                if (StringUtils.isNotEmpty((CharSequence)req.getParentTaskId())) {
                    subSubSqlBuilder.setLength(0);
                    subSubSqlBuilder.append("select id from t_windtaskrecord FORCE INDEX(parentTaskRecordIdIsDelIndex) where 1=1 ");
                }
                if (StringUtils.isNotEmpty((CharSequence)req.getTaskId())) {
                    subSubSqlBuilder.setLength(0);
                    subSubSqlBuilder.append("select id from t_windtaskrecord FORCE INDEX(defIdIsDelIndex) where 1=1 ");
                }
                if (StringUtils.isNotEmpty((CharSequence)req.getStateDescription())) {
                    subSubSqlBuilder.setLength(0);
                    subSubSqlBuilder.append("select id from t_windtaskrecord FORCE INDEX(createdOnIsDelDefLabelAgvIdStatusStateDescriptionIndex) where 1=1 ");
                }
            } else if (this.dataBaseType.equals("SQLSERVER")) {
                subSubSqlBuilder.append("select row_number() over(order by created_on DESC) as rownum, id from t_windtaskrecord with(INDEX(createdOnIsDelDefLabelAgvIdStatusIndex)) where 1=1 ");
                if (StringUtils.isNotEmpty((CharSequence)req.getWorkStations()) || StringUtils.isNotEmpty((CharSequence)req.getWorkTypes())) {
                    subSubSqlBuilder.setLength(0);
                    subSubSqlBuilder.append("select row_number() over(order by created_on DESC) as rownum, id from t_windtaskrecord with(INDEX(createdOnWorkStationWorkTypeIsDel)) where 1=1 ");
                }
                if (StringUtils.isNotEmpty((CharSequence)req.getOutOrderNo())) {
                    subSubSqlBuilder.setLength(0);
                    subSubSqlBuilder.append("select row_number() over(order by created_on DESC) as rownum, id from t_windtaskrecord with(INDEX(outOrderNoIsDelIndex)) where 1=1 ");
                }
                if (StringUtils.isNotEmpty((CharSequence)req.getParentTaskId())) {
                    subSubSqlBuilder.setLength(0);
                    subSubSqlBuilder.append("select row_number() over(order by created_on DESC) as rownum, id from t_windtaskrecord with(INDEX(parentTaskRecordIdIsDelIndex)) where 1=1 ");
                }
                if (StringUtils.isNotEmpty((CharSequence)req.getTaskId())) {
                    subSubSqlBuilder.setLength(0);
                    subSubSqlBuilder.append("select row_number() over(order by created_on DESC) as rownum, id from t_windtaskrecord with(INDEX(defIdIsDelIndex)) where 1=1 ");
                }
                if (StringUtils.isNotEmpty((CharSequence)req.getStateDescription())) {
                    subSubSqlBuilder.setLength(0);
                    subSubSqlBuilder.append("select row_number() over(order by created_on DESC) as rownum, id from t_windtaskrecord with(INDEX(createdOnIsDelDefLabelAgvIdStatusStateDescriptionIndex)) where 1=1 ");
                }
            } else if (this.dataBaseType.equals("KINGDB")) {
                subSubSqlBuilder.append("select id from t_windtaskrecord where 1=1 ");
            } else if (this.dataBaseType.equals("ORACLE")) {
                subSubSqlBuilder.append("select row_number() over(order by created_on DESC) as rn, /*+ INDEX(t_windtaskrecord createdOnWorkStationWorkTypeIsDel) */id from t_windtaskrecord where 1=1 ");
                if (StringUtils.isNotEmpty((CharSequence)req.getWorkStations()) || StringUtils.isNotEmpty((CharSequence)req.getWorkTypes())) {
                    subSubSqlBuilder.setLength(0);
                    subSubSqlBuilder.append("select row_number() over(order by created_on DESC) as rn, /*+ INDEX(t_windtaskrecord createdOnWorkStationWorkTypeIsDel) */id from t_windtaskrecord  where 1=1 ");
                }
                if (StringUtils.isNotEmpty((CharSequence)req.getOutOrderNo())) {
                    subSubSqlBuilder.setLength(0);
                    subSubSqlBuilder.append("select row_number() over(order by created_on DESC) as rn, /*+ INDEX(t_windtaskrecord outOrderNoIsDelIndex) */id from t_windtaskrecord where 1=1 ");
                }
                if (StringUtils.isNotEmpty((CharSequence)req.getParentTaskId())) {
                    subSubSqlBuilder.setLength(0);
                    subSubSqlBuilder.append("select row_number() over(order by created_on DESC) as rn, /*+ INDEX(t_windtaskrecord parentTaskRecordIdIsDelIndex) */id from t_windtaskrecord where 1=1 ");
                }
                if (StringUtils.isNotEmpty((CharSequence)req.getTaskId())) {
                    subSubSqlBuilder.setLength(0);
                    subSubSqlBuilder.append("select row_number() over(order by created_on DESC) as rn, /*+ INDEX(t_windtaskrecord defIdIsDelIndex) */id from t_windtaskrecord where 1=1 ");
                }
                if (StringUtils.isNotEmpty((CharSequence)req.getStateDescription())) {
                    subSubSqlBuilder.setLength(0);
                    subSubSqlBuilder.append("select row_number() over(order by created_on DESC) as rn, /*+ INDEX(t_windtaskrecord createdOnIsDelDefLabelAgvIdStatusStateDescriptionIndex) */id from t_windtaskrecord where 1=1 ");
                }
            }
            HashMap params = Maps.newHashMap();
            this.appendSqlByQuery(req, subSubSqlBuilder, params);
            if (req.getIfParentOrChildOrAll() != null && req.getIfParentOrChildOrAll() == 1) {
                subSubSqlBuilder.append(" and id not like 'child-%'");
            }
            if (req.getIfParentOrChildOrAll() != null && req.getIfParentOrChildOrAll() == 2) {
                subSubSqlBuilder.append(" and id like 'child-%'");
            }
            if (req.getIfPeriodTask() != null && req.getIfPeriodTask() == 1) {
                subSubSqlBuilder.append(" and id like 'period%'");
            } else {
                subSubSqlBuilder.append(" and id not like 'period%'");
            }
            subSubSqlBuilder.append(" and is_del = 0");
            if (!authorizedTasks.isEmpty()) {
                String authorizedTasksCondition = authorizedTasks.stream().map(task -> "'" + task + "'").collect(Collectors.joining(",", "(", ")"));
                subSubSqlBuilder.append(" and def_label in ").append(authorizedTasksCondition);
            }
            if (this.dataBaseType.equals("MYSQL") || this.dataBaseType.equals("KINGDB")) {
                subSubSqlBuilder.append(" ORDER BY created_on ").append(orderStr);
                if (pageSize != null && page != 0) {
                    subSubSqlBuilder.append(" limit ").append(pageSize * (page - 1)).append(",").append(pageSize);
                }
                subSqlBuilder.append(" (").append((CharSequence)subSubSqlBuilder).append(") AS t");
            } else if (this.dataBaseType.equals("SQLSERVER")) {
                subSqlBuilder.append(" (").append((CharSequence)subSubSqlBuilder).append(") t");
                if (pageSize != null && page != 0) {
                    subSqlBuilder.append(" where rownum > ").append(pageSize * (page - 1)).append(" and rownum <= ").append(page * pageSize);
                }
            } else if (this.dataBaseType.equals("ORACLE")) {
                subSqlBuilder.append(" (").append((CharSequence)subSubSqlBuilder).append(") t");
                if (pageSize != null && page != 0) {
                    subSqlBuilder.append(" where rn > ").append(pageSize * (page - 1)).append(" and rn <= ").append(page * pageSize);
                }
            }
            sqlBuilder.append(" and id in (").append((CharSequence)subSqlBuilder).append(")");
            sqlBuilder.append(" ORDER BY created_on ").append(orderStr);
            NamedParameterJdbcTemplate namedParameterJdbcTemplate = new NamedParameterJdbcTemplate((JdbcOperations)jdbcTemplate);
            List pageList = namedParameterJdbcTemplate.queryForList(sqlBuilder.toString(), (Map)params);
            return pageList;
        });
        CompletableFuture<Long> completableFuture2 = CompletableFuture.supplyAsync(() -> this.findCountByCondition(req, authorizedTasks));
        CompletionStage thenCombineResult = completableFuture1.thenCombine(completableFuture2, (x, y) -> {
            List windTaskRecordImportVos = this.transformationWindTaskRecordNew(x, locale);
            PaginationResponseVo paginationResponseVo = new PaginationResponseVo();
            paginationResponseVo.setTotalCount(Long.valueOf(y));
            paginationResponseVo.setCurrentPage(page);
            paginationResponseVo.setPageSize(pageSize);
            int totalPage = y.intValue() / pageSize;
            if (y.intValue() % pageSize > 0) {
                ++totalPage;
            }
            paginationResponseVo.setTotalPage(Integer.valueOf(totalPage));
            if (x.size() > 0) {
                paginationResponseVo.setPageList(windTaskRecordImportVos);
            } else {
                paginationResponseVo.setPageList(new ArrayList());
            }
            return paginationResponseVo;
        });
        return (PaginationResponseVo)((CompletableFuture)thenCombineResult).get();
    }

    public Long findCountByCondition(QueryTaskRecordReq req, List<String> authorizedTasks) {
        JdbcTemplate jdbcTemplate = (JdbcTemplate)SpringUtil.getBean(JdbcTemplate.class);
        StringBuilder sql = new StringBuilder();
        if (this.dataBaseType.equals("MYSQL")) {
            sql.append("select count(*) from t_windtaskrecord FORCE INDEX(createdOnIsDelDefLabelAgvIdStatusIndex) where 1=1 ");
            if (StringUtils.isNotEmpty((CharSequence)req.getWorkStations()) || StringUtils.isNotEmpty((CharSequence)req.getWorkTypes())) {
                sql.setLength(0);
                sql.append("select count(*) from t_windtaskrecord  FORCE INDEX(createdOnWorkStationWorkTypeIsDel) where 1=1 ");
            }
            if (StringUtils.isNotEmpty((CharSequence)req.getOutOrderNo())) {
                sql.setLength(0);
                sql.append("select count(*) from t_windtaskrecord FORCE INDEX(outOrderNoIsDelIndex) where 1=1 ");
            }
            if (StringUtils.isNotEmpty((CharSequence)req.getParentTaskId())) {
                sql.setLength(0);
                sql.append("select count(*) from t_windtaskrecord FORCE INDEX(parentTaskRecordIdIsDelIndex) where 1=1 ");
            }
            if (StringUtils.isNotEmpty((CharSequence)req.getTaskId())) {
                sql.setLength(0);
                sql.append("select count(*) from t_windtaskrecord FORCE INDEX(defIdIsDelIndex) where 1=1 ");
            }
            if (StringUtils.isNotEmpty((CharSequence)req.getStateDescription())) {
                sql.setLength(0);
                sql.append("select count(*) from t_windtaskrecord FORCE INDEX(createdOnIsDelDefLabelAgvIdStatusStateDescriptionIndex) where 1=1 ");
            }
        } else if (this.dataBaseType.equals("SQLSERVER")) {
            sql.append("select count(*) from t_windtaskrecord  with(INDEX(createdOnIsDelDefLabelAgvIdStatusIndex))  where 1=1 ");
            if (StringUtils.isNotEmpty((CharSequence)req.getWorkStations()) || StringUtils.isNotEmpty((CharSequence)req.getWorkTypes())) {
                sql.setLength(0);
                sql.append("select count(*) from t_windtaskrecord  with(INDEX(createdOnWorkStationWorkTypeIsDel))  where 1=1 ");
            }
            if (StringUtils.isNotEmpty((CharSequence)req.getOutOrderNo())) {
                sql.setLength(0);
                sql.append("select count(*) from t_windtaskrecord  with(INDEX(outOrderNoIsDelIndex))  where 1=1 ");
            }
            if (StringUtils.isNotEmpty((CharSequence)req.getParentTaskId())) {
                sql.setLength(0);
                sql.append("select count(*) from t_windtaskrecord  with(INDEX(parentTaskRecordIdIsDelIndex))  where 1=1 ");
            }
            if (StringUtils.isNotEmpty((CharSequence)req.getTaskId())) {
                sql.setLength(0);
                sql.append("select count(*) from t_windtaskrecord  with(INDEX(defIdIsDelIndex))  where 1=1 ");
            }
            if (StringUtils.isNotEmpty((CharSequence)req.getStateDescription())) {
                sql.setLength(0);
                sql.append("select count(*) from t_windtaskrecord with(INDEX(createdOnIsDelDefLabelAgvIdStatusStateDescriptionIndex)) where 1=1 ");
            }
        } else if (this.dataBaseType.equals("KINGDB")) {
            sql.append("select count(*) from t_windtaskrecord where 1=1 ");
        } else if (this.dataBaseType.equals("ORACLE")) {
            sql.append("select /*+ INDEX(t_windtaskrecord createdOnIsDelDefLabelAgvIdStatusIndex) */count(*) from t_windtaskrecord where 1=1 ");
            if (StringUtils.isNotEmpty((CharSequence)req.getWorkStations()) || StringUtils.isNotEmpty((CharSequence)req.getWorkTypes())) {
                sql.setLength(0);
                sql.append("select /*+ INDEX(t_windtaskrecord createdOnWorkStationWorkTypeIsDel) */count(*) from t_windtaskrecord where 1=1 ");
            }
            if (StringUtils.isNotEmpty((CharSequence)req.getOutOrderNo())) {
                sql.setLength(0);
                sql.append("select /*+ INDEX(t_windtaskrecord outOrderNoIsDelIndex) */count(*) from t_windtaskrecord where 1=1 ");
            }
            if (StringUtils.isNotEmpty((CharSequence)req.getParentTaskId())) {
                sql.setLength(0);
                sql.append("select /*+ INDEX(t_windtaskrecord parentTaskRecordIdIsDelIndex) */count(*) from t_windtaskrecord where 1=1 ");
            }
            if (StringUtils.isNotEmpty((CharSequence)req.getTaskId())) {
                sql.setLength(0);
                sql.append("select /*+ INDEX(t_windtaskrecord defIdIsDelIndex) */count(*) from t_windtaskrecord where 1=1 ");
            }
            if (StringUtils.isNotEmpty((CharSequence)req.getStateDescription())) {
                sql.setLength(0);
                sql.append("select /*+ INDEX(t_windtaskrecord createdOnIsDelDefLabelAgvIdStatusStateDescriptionIndex) */count(*) from t_windtaskrecord where 1=1 ");
            }
        }
        HashMap params = Maps.newHashMap();
        this.appendSqlByQuery(req, sql, params);
        if (req.getIfParentOrChildOrAll() != null && req.getIfParentOrChildOrAll() == 1) {
            sql.append(" and id not like 'child%'");
        }
        if (req.getIfParentOrChildOrAll() != null && req.getIfParentOrChildOrAll() == 2) {
            sql.append(" and id like 'child%'");
        }
        if (req.getIfPeriodTask() != null && req.getIfPeriodTask() == 1) {
            sql.append(" and id like 'period%'");
        } else {
            sql.append(" and id not like 'period%'");
        }
        if (!authorizedTasks.isEmpty()) {
            String authorizedTasksCondition = authorizedTasks.stream().map(task -> "'" + task + "'").collect(Collectors.joining(",", "(", ")"));
            sql.append(" and def_label in ").append(authorizedTasksCondition);
        }
        sql.append(" and is_del = 0");
        NamedParameterJdbcTemplate namedParameterJdbcTemplate = new NamedParameterJdbcTemplate((JdbcOperations)jdbcTemplate);
        Long count = (Long)namedParameterJdbcTemplate.queryForObject(sql.toString(), (Map)params, Long.class);
        return count;
    }

    public List<WindTaskRecord> findByCondition(QueryTaskRecordReq req, boolean needShiro) {
        List authorizedTasks = needShiro ? this.dataPermissionManager.getAuthorizedGetTasks() : Collections.EMPTY_LIST;
        StringBuilder hql = new StringBuilder();
        if (this.dataBaseType.equals("MYSQL")) {
            hql.append("SELECT b.* from ( select id from t_windtaskrecord me FORCE INDEX(createdOnIsDelDefLabelAgvIdStatusIndex) where 1=1 ");
            if (StringUtils.isNotEmpty((CharSequence)req.getWorkStations()) || StringUtils.isNotEmpty((CharSequence)req.getWorkTypes())) {
                hql.setLength(0);
                hql.append("SELECT b.* from ( select id from t_windtaskrecord me  FORCE INDEX(createdOnWorkStationWorkTypeIsDel) where 1=1 ");
            }
            if (StringUtils.isNotEmpty((CharSequence)req.getOutOrderNo())) {
                hql.setLength(0);
                hql.append(" SELECT b.* from ( select id from t_windtaskrecord me FORCE INDEX(outOrderNoIsDelIndex) where 1=1 ");
            }
            if ((StringUtils.isNotEmpty((CharSequence)req.getParentTaskId()) || req.getIfParentOrChildOrAll() != null) && req.getStartDate() == null && req.getEndDate() == null) {
                hql.setLength(0);
                hql.append("SELECT b.* from ( select id from t_windtaskrecord me FORCE INDEX(parentTaskRecordIdIsDelIndex) where 1=1 ");
            }
            if (StringUtils.isNotEmpty((CharSequence)req.getTaskId())) {
                hql.setLength(0);
                hql.append("SELECT b.* from ( select id from t_windtaskrecord me FORCE INDEX(defIdIsDelIndex) where 1=1 ");
            }
            if (StringUtils.isNotEmpty((CharSequence)req.getStateDescription())) {
                hql.setLength(0);
                hql.append("SELECT b.* from ( select id from t_windtaskrecord me FORCE INDEX(createdOnIsDelDefLabelAgvIdStatusStateDescriptionIndex) where 1=1 ");
            }
        } else if (this.dataBaseType.equals("SQLSERVER")) {
            hql.append("SELECT b.* from ( select id from t_windtaskrecord me  with(INDEX(createdOnIsDelDefLabelAgvIdStatusIndex))  where 1=1 ");
            if (StringUtils.isNotEmpty((CharSequence)req.getWorkStations()) || StringUtils.isNotEmpty((CharSequence)req.getWorkTypes())) {
                hql.setLength(0);
                hql.append("SELECT b.* from ( select id from t_windtaskrecord me with(INDEX(createdOnWorkStationWorkTypeIsDel))  where 1=1 ");
            }
            if (StringUtils.isNotEmpty((CharSequence)req.getOutOrderNo())) {
                hql.setLength(0);
                hql.append("SELECT b.* from ( select id from t_windtaskrecord me with(INDEX(createdOnWorkStationWorkTypeIsDel))  where 1=1 ");
            }
            if ((StringUtils.isNotEmpty((CharSequence)req.getParentTaskId()) || req.getIfParentOrChildOrAll() != null) && req.getStartDate() == null && req.getEndDate() == null) {
                hql.setLength(0);
                hql.append("SELECT b.* from ( select id from t_windtaskrecord me with(INDEX(parentTaskRecordIdIsDelIndex))  where 1=1 ");
            }
            if (StringUtils.isNotEmpty((CharSequence)req.getTaskId())) {
                hql.setLength(0);
                hql.append("SELECT b.* from ( select id from t_windtaskrecord me with(INDEX(defIdIsDelIndex))  where 1=1 ");
            }
            if (StringUtils.isNotEmpty((CharSequence)req.getStateDescription())) {
                hql.setLength(0);
                hql.append("SELECT b.* from ( select id from t_windtaskrecord me with(INDEX(createdOnIsDelDefLabelAgvIdStatusStateDescriptionIndex))  where 1=1 ");
            }
        } else if (this.dataBaseType.equals("KINGDB")) {
            hql.append("SELECT b.* from ( select id from t_windtaskrecord me where 1=1 ");
        } else if (this.dataBaseType.equals("ORACLE")) {
            hql.append("SELECT b.* from ( select /*+ INDEX(t_windtaskrecord createdOnIsDelDefLabelAgvIdStatusIndex) */id from t_windtaskrecord me where 1=1 ");
            if (StringUtils.isNotEmpty((CharSequence)req.getWorkStations()) || StringUtils.isNotEmpty((CharSequence)req.getWorkTypes())) {
                hql.setLength(0);
                hql.append("SELECT b.* from ( select /*+ INDEX(t_windtaskrecord createdOnWorkStationWorkTypeIsDel) */id from t_windtaskrecord me where 1=1 ");
            }
            if (StringUtils.isNotEmpty((CharSequence)req.getOutOrderNo())) {
                hql.setLength(0);
                hql.append("SELECT b.* from ( select /*+ INDEX(t_windtaskrecord createdOnWorkStationWorkTypeIsDel) */id from t_windtaskrecord me  where 1=1 ");
            }
            if ((StringUtils.isNotEmpty((CharSequence)req.getParentTaskId()) || req.getIfParentOrChildOrAll() != null) && req.getStartDate() == null && req.getEndDate() == null) {
                hql.setLength(0);
                hql.append("SELECT b.* from ( select /*+ INDEX(t_windtaskrecord parentTaskRecordIdIsDelIndex) */id from t_windtaskrecord me  where 1=1 ");
            }
            if (StringUtils.isNotEmpty((CharSequence)req.getTaskId())) {
                hql.setLength(0);
                hql.append("SELECT b.* from ( select /*+ INDEX(t_windtaskrecord defIdIsDelIndex) */id from t_windtaskrecord me where 1=1 ");
            }
            if (StringUtils.isNotEmpty((CharSequence)req.getStateDescription())) {
                hql.setLength(0);
                hql.append("SELECT b.* from ( select /*+ INDEX(t_windtaskrecord createdOnIsDelDefLabelAgvIdStatusStateDescriptionIndex) */id from t_windtaskrecord me  where 1=1 ");
            }
        } else if (this.dataBaseType.equals("KINGDB")) {
            hql.append("SELECT b.* from ( select id from t_windtaskrecord me where 1=1 ");
        }
        HashMap params = Maps.newHashMap();
        this.appendSqlByQuery(req, hql, params);
        if (req.getIfParentOrChildOrAll() != null && req.getIfParentOrChildOrAll() == 1) {
            hql.append(" and id not like 'child-%'");
        }
        if (req.getIfParentOrChildOrAll() != null && req.getIfParentOrChildOrAll() == 2) {
            hql.append(" and id like 'child-%'");
        }
        if (req.getIfPeriodTask() != null && req.getIfPeriodTask() == 1) {
            hql.append(" and id like 'period%'");
        } else {
            hql.append(" and id not like 'period%'");
        }
        if (!authorizedTasks.isEmpty()) {
            hql.append(" and def_label in ").append(authorizedTasks.stream().map(task -> "'" + task + "'").collect(Collectors.joining(",", "(", ")")));
        }
        hql.append(" and is_del = 0 ");
        hql.append(" ) a left join t_windtaskrecord b on a.id = b.id");
        Query query = this.em.createNativeQuery(hql.toString(), WindTaskRecord.class);
        for (String s : params.keySet()) {
            query.setParameter(s, params.get(s));
        }
        List resultList = query.getResultList();
        Collections.sort(resultList, new /* Unavailable Anonymous Inner Class!! */);
        return resultList;
    }

    public List<ExcelExportEntity> getExcelExportEntityList() {
        ArrayList<ExcelExportEntity> excelExportEntityList = new ArrayList<ExcelExportEntity>();
        excelExportEntityList.add(new ExcelExportEntity(this.localeMessageUtil.getMessage(WindTaskRecordTitleEnum.id.getCode()), (Object)"id"));
        excelExportEntityList.add(new ExcelExportEntity(this.localeMessageUtil.getMessage(WindTaskRecordTitleEnum.status.getCode()), (Object)"status"));
        excelExportEntityList.add(new ExcelExportEntity(this.localeMessageUtil.getMessage(WindTaskRecordTitleEnum.agvId.getCode()), (Object)"agvId"));
        excelExportEntityList.add(new ExcelExportEntity(this.localeMessageUtil.getMessage(WindTaskRecordTitleEnum.defLabel.getCode()), (Object)"defLabel"));
        excelExportEntityList.add(new ExcelExportEntity(this.localeMessageUtil.getMessage(WindTaskRecordTitleEnum.stateDescription.getCode()), (Object)"stateDescription"));
        excelExportEntityList.add(new ExcelExportEntity(this.localeMessageUtil.getMessage(WindTaskRecordTitleEnum.createdOn.getCode()), (Object)"createdOn"));
        excelExportEntityList.add(new ExcelExportEntity(this.localeMessageUtil.getMessage(WindTaskRecordTitleEnum.endedOn.getCode()), (Object)"endedOn"));
        excelExportEntityList.add(new ExcelExportEntity(this.localeMessageUtil.getMessage(WindTaskRecordTitleEnum.firstExecutorTime.getCode()), (Object)"firstExecutorTime"));
        excelExportEntityList.add(new ExcelExportEntity(this.localeMessageUtil.getMessage(WindTaskRecordTitleEnum.executorTime.getCode()), (Object)"executorTime"));
        excelExportEntityList.add(new ExcelExportEntity(this.localeMessageUtil.getMessage(WindTaskRecordTitleEnum.endedReason.getCode()), (Object)"endedReason"));
        excelExportEntityList.add(new ExcelExportEntity(this.localeMessageUtil.getMessage(WindTaskRecordTitleEnum.path.getCode()), (Object)"path"));
        excelExportEntityList.add(new ExcelExportEntity(this.localeMessageUtil.getMessage(WindTaskRecordTitleEnum.defVersion.getCode()), (Object)"defVersion"));
        excelExportEntityList.add(new ExcelExportEntity(this.localeMessageUtil.getMessage(WindTaskRecordTitleEnum.outOrderNo.getCode()), (Object)"outOrderNo"));
        excelExportEntityList.add(new ExcelExportEntity(this.localeMessageUtil.getMessage(WindTaskRecordTitleEnum.callWorkType.getCode()), (Object)"callWorkType"));
        excelExportEntityList.add(new ExcelExportEntity(this.localeMessageUtil.getMessage(WindTaskRecordTitleEnum.callWorkStation.getCode()), (Object)"callWorkStation"));
        return excelExportEntityList;
    }

    @Deprecated
    public PaginationResponseVo queryWindTask(QueryTaskRecordReq req, Integer page, Integer pageSize, Locale locale) {
        2 spec = new /* Unavailable Anonymous Inner Class!! */;
        if (pageSize != null && page != 0) {
            PageRequest pageRequest = page != null ? PageRequest.of((int)(page - 1), (int)pageSize) : PageRequest.ofSize((int)pageSize);
            Page taskAll = this.windTaskRecordMapper.findAll((Specification)spec, (Pageable)pageRequest);
            List windTaskRecordImportVos = this.transformationWindTaskRecord(taskAll.getContent(), locale);
            PaginationResponseVo paginationResponseVo = new PaginationResponseVo();
            paginationResponseVo.setTotalCount(Long.valueOf(taskAll.getTotalElements()));
            paginationResponseVo.setCurrentPage(page);
            paginationResponseVo.setPageSize(pageSize);
            paginationResponseVo.setTotalPage(Integer.valueOf(taskAll.getTotalPages()));
            paginationResponseVo.setPageList(windTaskRecordImportVos);
            return paginationResponseVo;
        }
        List taskAll = this.windTaskRecordMapper.findAll((Specification)spec);
        List windTaskRecordImportVos = this.transformationWindTaskRecord(taskAll, locale);
        PaginationResponseVo paginationResponseVo = new PaginationResponseVo();
        paginationResponseVo.setTotalCount(Long.valueOf(taskAll.size()));
        paginationResponseVo.setCurrentPage(page);
        paginationResponseVo.setPageSize(pageSize);
        paginationResponseVo.setTotalPage(null);
        paginationResponseVo.setPageList(windTaskRecordImportVos);
        return paginationResponseVo;
    }

    public List<AgvSuccessTaskCountVo> findAgvSuccessTaskCount(String startDate, String endDate) {
        List robotItemList = this.robotItemMapper.findUuidGroupByUuid();
        List windTaskList = this.windTaskDefMapper.findAllLabel();
        List windTaskRecordList = this.windTaskRecordMapper.getAgvSuccessTaskCountByEndedOn(startDate, endDate);
        ArrayList<AgvSuccessTaskCountVo> resultList = new ArrayList<AgvSuccessTaskCountVo>(robotItemList.size());
        HashMap taskCountMap = new HashMap();
        windTaskList.forEach(taskLabel -> taskCountMap.put(taskLabel, 0));
        HashMap<CallSite, Integer> windTaskRecordMap = new HashMap<CallSite, Integer>();
        for (Map map : windTaskRecordList) {
            String agvIdsStr = map.get("agvId").toString();
            String[] agvIds = agvIdsStr.split(",");
            for (String agvId : agvIds) {
                Integer count = (Integer)windTaskRecordMap.get((String)agvId + map.get("taskLabel").toString());
                Number numberCount = (Number)map.get("count");
                int intValue = numberCount.intValue();
                if (null == count) {
                    windTaskRecordMap.put((CallSite)((Object)((String)agvId + map.get("taskLabel").toString())), intValue);
                    continue;
                }
                windTaskRecordMap.put((CallSite)((Object)((String)agvId + map.get("taskLabel").toString())), count + intValue);
            }
        }
        for (String agvId : robotItemList) {
            AgvSuccessTaskCountVo resultObj = new AgvSuccessTaskCountVo();
            HashMap tasksMap = new HashMap();
            for (String taskLabel2 : windTaskList) {
                if (null == resultObj.getAgvId()) {
                    resultObj.setAgvId(agvId);
                }
                if (null == resultObj.getTasks()) {
                    tasksMap.putAll(taskCountMap);
                } else {
                    tasksMap = resultObj.getTasks();
                }
                Integer count = (Integer)windTaskRecordMap.get(agvId + taskLabel2);
                if (count != null) {
                    tasksMap.put(taskLabel2, count);
                }
                resultObj.setTasks(tasksMap);
            }
            resultList.add(resultObj);
        }
        return resultList;
    }

    public PaginationResponseVo findTaskRetentionList(int currentPage, int pageSize, Integer retentionHours) {
        PageRequest pageable = PageRequest.of((int)(currentPage - 1), (int)pageSize);
        Date startDate = new Date(System.currentTimeMillis() - (long)(3600000 * retentionHours));
        Page statRecordVos = this.windTaskRecordMapper.getTaskRetentionList(startDate, (Pageable)pageable);
        List windTaskRecordList = statRecordVos.getContent();
        List windTaskRecordStatList = windTaskRecordList.stream().map(windTaskRecord -> {
            WindTaskRecordStatVo w = WindTaskRecordStatVo.builder().id(windTaskRecord.getId()).defLabel(windTaskRecord.getDefLabel()).createdOn(windTaskRecord.getCreatedOn()).status(windTaskRecord.getStatus()).agvId(windTaskRecord.getAgvId()).build();
            return w;
        }).collect(Collectors.toList());
        PaginationResponseVo paginationResponseVo = new PaginationResponseVo();
        paginationResponseVo.setTotalCount(Long.valueOf(statRecordVos.getTotalElements()));
        paginationResponseVo.setCurrentPage(Integer.valueOf(currentPage));
        paginationResponseVo.setPageSize(Integer.valueOf(pageSize));
        paginationResponseVo.setTotalPage(Integer.valueOf(statRecordVos.getTotalPages()));
        paginationResponseVo.setPageList(windTaskRecordStatList);
        return paginationResponseVo;
    }

    public PaginationResponseVo findOrderRetentionList(int currentPage, int pageSize, Integer retentionHours) {
        String end = String.valueOf(System.currentTimeMillis() / 1000L - (long)(3600 * retentionHours));
        ArrayList predicates = Lists.newArrayList((Object[])new List[]{List.of("receiveTime", "LT", end), List.of("state", "NE", "STOPPED"), List.of("state", "NE", "FINISHED")});
        Map<String, ArrayList> whereMap = Map.of("relation", "AND", "predicates", predicates);
        Integer totalPage = 0;
        String orderByDesc = "&orderBy=create_time&orderMethod=descending";
        String url = PropConfig.getRdsCoreBaseUrl() + "orders";
        try {
            Map res = OkHttpUtil.getWithHttpCode((String)(url + "?page=" + currentPage + "&size=" + pageSize + orderByDesc + "&where=" + JSONObject.toJSONString(whereMap)));
            String ordersStr = (String)res.get("body");
            if (StringUtils.isEmpty((CharSequence)ordersStr)) {
                log.error("WindTaskService core request failed1");
                return null;
            }
            JSONObject curPageContent = JSONObject.parseObject((String)ordersStr);
            if (StringUtils.isNotEmpty((CharSequence)curPageContent.getString("msg"))) {
                if (curPageContent.getString("msg").contains("too fast")) {
                    log.error("core orders {}", (Object)ordersStr);
                    return null;
                }
                log.error("Stat Core Error: " + curPageContent.toJSONString());
                return null;
            }
            long total = curPageContent.getLongValue("total");
            List totalOrderList = curPageContent.getJSONArray("list").stream().map(o -> (JSONObject)o).collect(Collectors.toList());
            List orderRetentionVoList = totalOrderList.stream().map(item -> {
                OrderRetentionVo vo = new OrderRetentionVo();
                vo.setId(item.getString("id"));
                vo.setVehicle(item.getString("vehicle"));
                vo.setState(item.getString("state"));
                vo.setReceiveTime(item.getString("receiveTime"));
                vo.setExternalId(item.getString("externalId"));
                return vo;
            }).collect(Collectors.toList());
            if (total > 0L) {
                totalPage = BigDecimal.valueOf(total).divide(BigDecimal.valueOf(pageSize), 0, RoundingMode.CEILING).intValue();
            }
            PaginationResponseVo paginationResponseVo = new PaginationResponseVo();
            paginationResponseVo.setTotalCount(Long.valueOf(total));
            paginationResponseVo.setCurrentPage(Integer.valueOf(currentPage));
            paginationResponseVo.setPageSize(Integer.valueOf(pageSize));
            paginationResponseVo.setTotalPage(totalPage);
            paginationResponseVo.setPageList(orderRetentionVoList);
            return paginationResponseVo;
        }
        catch (IOException e) {
            log.error("WindTaskService core request failed {}", (Object)e.getMessage());
            return null;
        }
    }

    public List<WindTaskRecordImportVo> transformationWindTaskRecord(List<WindTaskRecord> records, Locale locale) {
        if (CollectionUtils.isNotEmpty(records)) {
            List<WindTaskRecordImportVo> collect = records.stream().map(taskRecord -> {
                WindTaskRecordImportVo vo = WindTaskRecordImportVo.builder().defLabel(taskRecord.getDefLabel()).agvId(taskRecord.getAgvId()).status((Object)taskRecord.getStatus()).id(taskRecord.getId()).defId(taskRecord.getDefId()).createdOn(taskRecord.getCreatedOn() != null ? DateFormatUtils.format((Date)taskRecord.getCreatedOn(), (String)"yyyy-MM-dd HH:mm:ss") : "").endedOn(taskRecord.getEndedOn() != null ? DateFormatUtils.format((Date)taskRecord.getEndedOn(), (String)"yyyy-MM-dd HH:mm:ss") : "").firstExecutorTime(taskRecord.getFirstExecutorTime() != null ? DateFormatUtils.format((Date)taskRecord.getFirstExecutorTime(), (String)"yyyy-MM-dd HH:mm:ss") : "").executorTime(Integer.valueOf(taskRecord.getExecutorTime() != null ? taskRecord.getExecutorTime() : 0)).stateDescription(taskRecord.getStateDescription()).endedReason(taskRecord.getEndedReason() != null ? this.localeMessageUtil.getMessageMatch(taskRecord.getEndedReason(), locale) : "").ifHaveChildTask(taskRecord.getIfHaveChildTask()).parentTaskRecordId(taskRecord.getParentTaskRecordId()).rootTaskRecordId(taskRecord.getRootTaskRecordId()).outOrderNo(taskRecord.getOutOrderNo() != null ? taskRecord.getOutOrderNo() : "").inputParams(taskRecord.getInputParams()).build();
                return vo;
            }).collect(Collectors.toList());
            return collect;
        }
        return null;
    }

    private List<Object> transformationWindTaskRecordNew(List<Map<String, Object>> records, Locale locale) {
        Function<Map, JSONObject> mapper = e -> {
            WindTaskRecordImportVo vo = null;
            if (this.dataBaseType.equals("MYSQL")) {
                vo = WindTaskRecordImportVo.builder().defLabel(Optional.ofNullable(e.get("def_label")).map(Object::toString).orElse("")).defVersion(Optional.ofNullable(e.get("def_version")).map(Object::toString).map(Integer::valueOf).orElse(1)).agvId(Optional.ofNullable(e.get("agv_id")).map(Object::toString).orElse("")).status((Object)Optional.ofNullable(e.get("status")).orElse("")).id((String)e.get("id")).path((String)e.get("path")).defId((String)e.get("def_id")).createdOn(Optional.ofNullable(e.get("created_on")).map(o -> DateFormatUtils.format((Date)WindTaskService.asDate((LocalDateTime)((LocalDateTime)o)), (String)"yyyy-MM-dd HH:mm:ss")).orElse("")).endedOn(Optional.ofNullable(e.get("ended_on")).map(o -> DateFormatUtils.format((Date)WindTaskService.asDate((LocalDateTime)((LocalDateTime)o)), (String)"yyyy-MM-dd HH:mm:ss")).orElse("")).firstExecutorTime(Optional.ofNullable(e.get("first_executor_time")).map(o -> DateFormatUtils.format((Date)WindTaskService.asDate((LocalDateTime)((LocalDateTime)o)), (String)"yyyy-MM-dd HH:mm:ss")).orElse("")).executorTime(Optional.ofNullable(e.get("executor_time")).map(o -> (Integer)o).orElse(0)).stateDescription(Optional.ofNullable(e.get("state_description")).map(Object::toString).orElse("")).endedReason(Optional.ofNullable(e.get("ended_reason")).map(r -> this.localeMessageUtil.getMessageMatch((String)r, locale)).orElse("")).ifHaveChildTask(Optional.ofNullable(e.get("if_have_child_task")).map(o -> (Boolean)o).orElse(false)).parentTaskRecordId(Optional.ofNullable(e.get("parent_task_record_id")).map(o -> (String)o).orElse("")).rootTaskRecordId(Optional.ofNullable(e.get("root_task_record_id")).map(o -> (String)o).orElse("")).inputParams(Optional.ofNullable(e.get("input_params")).map(Object::toString).orElse("")).taskDefDetail(Optional.ofNullable(e.get("task_def_detail")).map(Object::toString).orElse("")).priority(Optional.ofNullable(e.get("priority")).map(Object::toString).map(Integer::valueOf).orElse(1)).outOrderNo(Optional.ofNullable(e.get("out_order_no")).map(Object::toString).orElse("")).workTypes(Optional.ofNullable(e.get("work_types")).map(Object::toString).orElse("")).workStations(Optional.ofNullable(e.get("work_stations")).map(Object::toString).orElse("")).build();
            } else if (this.dataBaseType.equals("SQLSERVER") || this.dataBaseType.equals("KINGDB") || this.dataBaseType.equals("ORACLE")) {
                vo = WindTaskRecordImportVo.builder().defLabel(Optional.ofNullable(e.get("def_label")).map(Object::toString).orElse("")).defVersion(Optional.ofNullable(e.get("def_version")).map(Object::toString).map(Integer::valueOf).orElse(1)).agvId(Optional.ofNullable(e.get("agv_id")).map(Object::toString).orElse("")).status((Object)Optional.ofNullable(e.get("status")).orElse("")).id((String)e.get("id")).path((String)e.get("path")).defId((String)e.get("def_id")).createdOn(Optional.ofNullable(e.get("created_on")).map(o -> DateFormatUtils.format((Date)((Date)o), (String)"yyyy-MM-dd HH:mm:ss")).orElse("")).endedOn(Optional.ofNullable(e.get("ended_on")).map(o -> DateFormatUtils.format((Date)((Date)o), (String)"yyyy-MM-dd HH:mm:ss")).orElse("")).firstExecutorTime(Optional.ofNullable(e.get("first_executor_time")).map(o -> DateFormatUtils.format((Date)((Date)o), (String)"yyyy-MM-dd HH:mm:ss")).orElse("")).executorTime(Optional.ofNullable(e.get("executor_time")).map(o -> {
                    if (o instanceof Integer) {
                        return (Integer)o;
                    }
                    return 0;
                }).orElse(0)).stateDescription(Optional.ofNullable(e.get("state_description")).map(Object::toString).orElse("")).endedReason(Optional.ofNullable(e.get("ended_reason")).map(r -> this.localeMessageUtil.getMessageMatch((String)r, locale)).orElse("")).ifHaveChildTask(Optional.ofNullable(e.get("if_have_child_task")).map(o -> (Boolean)o).orElse(false)).parentTaskRecordId(Optional.ofNullable(e.get("parent_task_record_id")).map(o -> (String)o).orElse("")).rootTaskRecordId(Optional.ofNullable(e.get("root_task_record_id")).map(o -> (String)o).orElse("")).inputParams(Optional.ofNullable(e.get("input_params")).map(Object::toString).orElse("")).taskDefDetail(Optional.ofNullable(e.get("task_def_detail")).map(Object::toString).orElse("")).priority(Optional.ofNullable(e.get("priority")).map(Object::toString).map(Integer::valueOf).orElse(1)).outOrderNo(Optional.ofNullable(e.get("out_order_no")).map(Object::toString).orElse("")).workTypes(Optional.ofNullable(e.get("work_types")).map(Object::toString).orElse("")).workStations(Optional.ofNullable(e.get("work_stations")).map(Object::toString).orElse("")).build();
            }
            String voString = JSON.toJSONString(vo, (SerializeConfig)config, (SerializerFeature[])new SerializerFeature[0]);
            return JSON.parseObject((String)voString);
        };
        return records.stream().map(mapper).collect(Collectors.toList());
    }

    public void deleteAllTaskRecordData() {
        this.windTaskRecordMapper.deleteAll();
        this.windBlockChildMapper.deleteAll();
        this.windBlockRecordMapper.deleteAll();
        this.windTaskOrderIdMapper.deleteAll();
        this.windTaskLogMapper.deleteAll();
        this.changeAgvProgressMapper.deleteAll();
        this.interfaceHandleRecordMapper.deleteAll();
        this.modbusReadLogMapper.deleteAll();
        this.modbusWriteLogMapper.deleteAll();
        this.interfaceHandleMapper.deleteAll();
        this.eventRecordMapper.deleteAll();
        this.testRecordMapper.deleteAll();
    }

    public static Date asDate(LocalDateTime localDateTime) {
        return Date.from(localDateTime.atZone(ZoneId.systemDefault()).toInstant());
    }

    public static String xX2x_x(String str) {
        Pattern compile = Pattern.compile("[A-Z]");
        Matcher matcher = compile.matcher(str);
        StringBuffer sb = new StringBuffer();
        while (matcher.find()) {
            matcher.appendReplacement(sb, "_" + matcher.group(0).toLowerCase());
        }
        matcher.appendTail(sb);
        return sb.toString();
    }

    public List<WindTaskRecord> getTaskRecordById(List<String> taskRecordId) {
        return this.windTaskRecordMapper.findByRecordIds(taskRecordId);
    }

    @Transactional
    public void insertWindTaskSQL(ZipFile zFile) throws Exception {
        List fileHeaders = zFile.getFileHeaders();
        for (FileHeader fileHeader : fileHeaders) {
            log.info("isDirectory =" + fileHeader.isDirectory());
            log.info("fileName =" + fileHeader.getFileName());
            if (fileHeader.getFileName().indexOf(".sql") <= 0) continue;
            log.info(this.propConfig.getScriptDir() + "sqlFile/" + fileHeader.getFileName());
            zFile.extractFile(fileHeader, this.propConfig.getScriptDir() + "sqlFile/");
            Boolean aBoolean = this.insertSqlFile(this.propConfig.getScriptDir() + "sqlFile/" + fileHeader.getFileName());
            if (aBoolean.booleanValue()) continue;
        }
    }

    public Boolean insertSqlFile(String fileName) throws SQLException, IOException {
        Boolean bl;
        BufferedReader reader = new BufferedReader(new InputStreamReader((InputStream)new FileInputStream(fileName), "UTF-8"));
        try {
            String line = null;
            JdbcTemplate jdbcTemplate = (JdbcTemplate)SpringUtil.getBean(JdbcTemplate.class);
            while ((line = reader.readLine()) != null) {
                if (line.indexOf("t_windtaskdef") > 0 || line.indexOf("t_windtaskrecord") > 0 || line.indexOf("t_windblockrecord") > 0) {
                    PreparedStatement preparedStatement = jdbcTemplate.getDataSource().getConnection().prepareStatement(line);
                    int i = preparedStatement.executeUpdate();
                    if (line.indexOf("t_windtaskdef") <= 0) continue;
                    for (WindTaskDef windTaskDef : this.windTaskDefMapper.findAll()) {
                        Integer maxVersion = this.windTaskDefHistoryMapper.findMaxVersion(windTaskDef.getLabel());
                        if (maxVersion != null) {
                            windTaskDef.setVersion(Integer.valueOf(maxVersion + 1));
                        }
                        WindTaskDefHistory windTaskDefHistory = WindTaskDefHistory.builder().createDate(new Date()).label(windTaskDef.getLabel()).detail(windTaskDef.getDetail()).version(windTaskDef.getVersion()).build();
                        try {
                            this.windTaskDefHistoryMapper.save((Object)windTaskDefHistory);
                        }
                        catch (Exception e) {
                            log.error(e.getMessage());
                        }
                    }
                    continue;
                }
                int n = jdbcTemplate.update(line);
            }
            log.info("\u6267\u884c\u5b8c" + fileName);
            bl = true;
        }
        catch (Throwable throwable) {
            try {
                try {
                    reader.close();
                }
                catch (Throwable throwable2) {
                    throwable.addSuppressed(throwable2);
                }
                throw throwable;
            }
            catch (Exception e) {
                log.error("insertSqlFile Exception", (Throwable)e);
                throw e;
            }
        }
        reader.close();
        return bl;
    }

    private synchronized void insertWindTaskRestrictions(Integer repair, String strategy) {
        WindTaskRestrictions vo;
        List all = this.windTaskRestrictionsMapper.findAll();
        WindTaskRestrictions windTaskRestrictions = vo = CollectionUtils.isEmpty((Collection)all) ? new WindTaskRestrictions() : (WindTaskRestrictions)all.get(0);
        if (vo != null) {
            if (strategy != null) {
                vo.setStrategy(strategy);
                vo.setStrategyTime(new Date());
            }
            if (repair != null && repair != vo.getRepair()) {
                vo.setRepair(repair);
                vo.setRepairTime(new Date());
            }
            WindTaskService.windTaskRestrictions = (WindTaskRestrictions)this.windTaskRestrictionsMapper.save((Object)vo);
            return;
        }
        vo.setRepairTime(new Date());
        vo.setStrategyTime(new Date());
        vo.setRepair(Integer.valueOf(repair == null ? 0 : repair));
        vo.setStrategy(StringUtils.isEmpty((CharSequence)strategy) ? "" : strategy);
        WindTaskService.windTaskRestrictions = (WindTaskRestrictions)this.windTaskRestrictionsMapper.save((Object)vo);
    }

    @Transactional
    public void updateWindTaskRestrictionsRepair(WindTaskRestrictions wtr) {
        this.insertWindTaskRestrictions(wtr.getRepair(), null);
    }

    @Transactional
    public void updateWindTaskRestrictionsStrategy(WindTaskRestrictions wtr) {
        this.insertWindTaskRestrictions(null, wtr.getStrategy());
        RdsServer rdsServer = (RdsServer)SpringUtil.getBean(RdsServer.class);
        rdsServer.sendMessage(JSON.toJSONString((Object)ResultVo.success((CommonCodeEnum)CommonCodeEnum.WS_MSG_USER_TIMING, (Object)StringUtils.isNotEmpty((CharSequence)wtr.getStrategy()))));
    }

    public WindTaskRestrictions queryWindTaskRestrictionsStrategy() {
        List vos = this.windTaskRestrictionsMapper.findAll();
        return CollectionUtils.isNotEmpty((Collection)vos) ? (WindTaskRestrictions)vos.get(0) : null;
    }

    public static ResultVo<Object> checkWindTask() {
        try {
            if (windTaskRestrictions == null) {
                return ResultVo.success();
            }
            if (windTaskRestrictions.getRepair() != null && windTaskRestrictions.getRepair() == 1) {
                log.info("windTask can not generate, System maintenance triggered by others");
                return ResultVo.error((CommonCodeEnum)CommonCodeEnum.TASK_REPAIR_ERROR);
            }
            String strategy = windTaskRestrictions.getStrategy();
            int currentHour = LocalDateTime.now().getHour();
            if (StringUtils.isNotEmpty((CharSequence)strategy)) {
                String[] arr = strategy.split(";");
                for (int i = 0; i < arr.length; ++i) {
                    String[] split;
                    if (!(arr[i].contains("-") ? Integer.parseInt((split = arr[i].split("-"))[0]) <= currentHour && currentHour < Integer.parseInt(split[1]) : StringUtils.isNumeric((CharSequence)arr[i]) && Integer.parseInt(arr[i]) == currentHour)) continue;
                    return ResultVo.success();
                }
                log.info("windTask can not generate, The task is not in the configured time period: {}", (Object)strategy);
                return ResultVo.error((CommonCodeEnum)CommonCodeEnum.TASK_RESTRICTIONSREPAIR_ERROR);
            }
        }
        catch (Exception e) {
            log.error("checkWindTask  error {} ", (Object)windTaskRestrictions);
        }
        return ResultVo.success();
    }

    private void appendSqlByQuery(QueryTaskRecordReq req, StringBuilder sql, HashMap<String, Object> params) {
        if (StringUtils.isNotEmpty((CharSequence)req.getTaskLabel())) {
            sql.append(" AND def_label LIKE :taskLabel");
            params.put("taskLabel", req.getTaskLabel() + "%");
        }
        if (StringUtils.isNotEmpty((CharSequence)req.getStateDescription())) {
            sql.append(" AND state_description LIKE :stateDescription");
            params.put("stateDescription", "%" + req.getStateDescription() + "%");
        }
        if (StringUtils.isNotEmpty((CharSequence)req.getAgvId())) {
            sql.append(" AND agv_id LIKE :agvId");
            params.put("agvId", "%" + req.getAgvId() + "%");
        }
        if (req.getAgvIdList() != null && !req.getAgvIdList().isEmpty()) {
            sql.append(" AND (");
            for (int i = 0; i < req.getAgvIdList().size(); ++i) {
                String key = "agvId" + i;
                sql.append(" agv_id LIKE :").append(key);
                params.put(key, "%" + (String)req.getAgvIdList().get(i) + "%");
                if (i == req.getAgvIdList().size() - 1) continue;
                sql.append(" OR");
            }
            sql.append(")");
        }
        if (req.getStatus() != null) {
            sql.append(" AND status = :status");
            params.put("status", req.getStatus());
        }
        if (StringUtils.isNotEmpty((CharSequence)req.getStartDate())) {
            sql.append(" AND created_on >= :startDate");
            params.put("startDate", req.getStartDate());
        }
        if (StringUtils.isNotEmpty((CharSequence)req.getEndDate())) {
            sql.append(" AND created_on <= :endDate");
            params.put("endDate", req.getEndDate());
        }
        if (StringUtils.isNotEmpty((CharSequence)req.getTaskRecordId())) {
            sql.append(" and id = :taskRecordId");
            params.put("taskRecordId", req.getTaskRecordId());
        }
        if (StringUtils.isNotEmpty((CharSequence)req.getTaskId())) {
            sql.append(" and def_id = :taskId");
            params.put("taskId", req.getTaskId());
        }
        if (StringUtils.isNotEmpty((CharSequence)req.getWorkStations())) {
            sql.append(" AND (work_stations LIKE :workStationsPattern1 OR ").append("work_stations LIKE :workStationsPattern2 OR ").append("work_stations LIKE :workStationsPattern3 OR ").append("work_stations = :workStationsExact)");
            params.put("workStationsPattern1", "%," + req.getWorkStations() + ",%");
            params.put("workStationsPattern2", req.getWorkStations() + ",%");
            params.put("workStationsPattern3", "%," + req.getWorkStations());
            params.put("workStationsExact", req.getWorkStations());
        }
        if (StringUtils.isNotEmpty((CharSequence)req.getWorkTypes())) {
            sql.append(" AND (work_types LIKE :workTypesPattern1 OR ").append("work_types LIKE :workTypesPattern2 OR ").append("work_types LIKE :workTypesPattern3 OR ").append("work_types = :workTypesExact)");
            params.put("workTypesPattern1", "%," + req.getWorkTypes() + ",%");
            params.put("workTypesPattern2", req.getWorkTypes() + ",%");
            params.put("workTypesPattern3", "%," + req.getWorkTypes());
            params.put("workTypesExact", req.getWorkTypes());
        }
        if (StringUtils.isNotEmpty((CharSequence)req.getParentTaskId())) {
            sql.append(" and parent_task_record_id = :parentTaskId");
            params.put("parentTaskId", req.getParentTaskId());
        }
        if (StringUtils.isNotEmpty((CharSequence)req.getOutOrderNo())) {
            sql.append(" and out_order_no = :outOrderNo");
            params.put("outOrderNo", req.getOutOrderNo());
        }
    }

    static {
        WindTaskService.config.propertyNamingStrategy = PropertyNamingStrategy.SnakeCase;
    }
}

