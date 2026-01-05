/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.dao.AlarmsRecordMapper
 *  com.seer.rds.dao.AlarmsRecordMergeMapper
 *  com.seer.rds.dao.BatteryLevelRecordMapper
 *  com.seer.rds.dao.RobotItemMapper
 *  com.seer.rds.dao.RobotStatusMapper
 *  com.seer.rds.dao.StatAgvLoadedTimeMapper
 *  com.seer.rds.dao.StatRecordDuplicateMapper
 *  com.seer.rds.dao.StatRecordMapper
 *  com.seer.rds.model.stat.AlarmsRecordMerge
 *  com.seer.rds.model.stat.BatteryLevelRecord
 *  com.seer.rds.model.stat.RobotStatusRecord
 *  com.seer.rds.model.stat.StatAgvLoadedTime
 *  com.seer.rds.model.stat.StatRecord
 *  com.seer.rds.service.agv.StatService
 *  com.seer.rds.service.agv.StatService$1
 *  com.seer.rds.service.agv.StatService$2
 *  com.seer.rds.service.agv.StatService$3
 *  com.seer.rds.util.DateUtil
 *  com.seer.rds.util.SpringUtil
 *  com.seer.rds.vo.response.OutOrderRecordsVo
 *  com.seer.rds.vo.response.RobotStatusRecordsVo
 *  com.seer.rds.vo.response.StatRecordVo
 *  javax.persistence.EntityManager
 *  javax.persistence.PersistenceContext
 *  javax.persistence.Query
 *  javax.persistence.criteria.Expression
 *  javax.persistence.criteria.Predicate
 *  org.apache.commons.collections.CollectionUtils
 *  org.apache.commons.collections4.ListUtils
 *  org.apache.commons.lang3.StringUtils
 *  org.slf4j.Logger
 *  org.slf4j.LoggerFactory
 *  org.springframework.beans.factory.annotation.Autowired
 *  org.springframework.beans.factory.annotation.Value
 *  org.springframework.data.domain.Page
 *  org.springframework.data.domain.PageRequest
 *  org.springframework.data.domain.Pageable
 *  org.springframework.data.domain.Sort
 *  org.springframework.data.domain.Sort$Direction
 *  org.springframework.data.domain.Sort$Order
 *  org.springframework.data.jpa.domain.Specification
 *  org.springframework.jdbc.core.JdbcOperations
 *  org.springframework.jdbc.core.JdbcTemplate
 *  org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate
 *  org.springframework.stereotype.Service
 */
package com.seer.rds.service.agv;

import com.seer.rds.dao.AlarmsRecordMapper;
import com.seer.rds.dao.AlarmsRecordMergeMapper;
import com.seer.rds.dao.BatteryLevelRecordMapper;
import com.seer.rds.dao.RobotItemMapper;
import com.seer.rds.dao.RobotStatusMapper;
import com.seer.rds.dao.StatAgvLoadedTimeMapper;
import com.seer.rds.dao.StatRecordDuplicateMapper;
import com.seer.rds.dao.StatRecordMapper;
import com.seer.rds.model.stat.AlarmsRecordMerge;
import com.seer.rds.model.stat.BatteryLevelRecord;
import com.seer.rds.model.stat.RobotStatusRecord;
import com.seer.rds.model.stat.StatAgvLoadedTime;
import com.seer.rds.model.stat.StatRecord;
import com.seer.rds.service.agv.StatService;
import com.seer.rds.util.DateUtil;
import com.seer.rds.util.SpringUtil;
import com.seer.rds.vo.response.OutOrderRecordsVo;
import com.seer.rds.vo.response.RobotStatusRecordsVo;
import com.seer.rds.vo.response.StatRecordVo;
import java.io.Serializable;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import javax.persistence.Query;
import javax.persistence.criteria.Expression;
import javax.persistence.criteria.Predicate;
import org.apache.commons.collections.CollectionUtils;
import org.apache.commons.collections4.ListUtils;
import org.apache.commons.lang3.StringUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.jdbc.core.JdbcOperations;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Service;

@Service
public class StatService {
    private static final Logger log = LoggerFactory.getLogger(StatService.class);
    @PersistenceContext
    private EntityManager em;
    private final StatRecordMapper statRecordMapper;
    @Autowired
    private StatRecordDuplicateMapper statRecordDuplicateMapper;
    @Autowired
    private RobotStatusMapper robotStatusMapper;
    @Autowired
    private AlarmsRecordMapper alarmsRecordMapper;
    @Autowired
    private AlarmsRecordMergeMapper alarmsRecordMergeMapper;
    @Autowired
    private BatteryLevelRecordMapper batteryLevelRecordMapper;
    @Autowired
    private RobotItemMapper robotItemMapper;
    @Autowired
    private StatAgvLoadedTimeMapper statAgvLoadedTimeMapper;
    @PersistenceContext
    private EntityManager entityManager;
    @Value(value="${spring.datasource.databaseType}")
    private String dataBaseType;

    @Autowired
    private StatService(StatRecordMapper statRecordMapper) {
        this.statRecordMapper = statRecordMapper;
    }

    public List<StatRecordVo> findStatRecordListByLevelAndTimeAndTypesAndThirdId(String level, List<String> types, String thirdId, String startedOn, String endedOn, String timeUnit, Sort orderBy) {
        List statRecords;
        List list = statRecords = StringUtils.isEmpty((CharSequence)thirdId) ? this.findByLevelAndTypeAndTimeRange(level, types, startedOn, endedOn, orderBy) : this.findByLevelAndTypeAndThirdIdAndTimeRange(level, types, thirdId, startedOn, endedOn, orderBy);
        if (!StringUtils.isEmpty((CharSequence)timeUnit)) {
            switch (timeUnit) {
                case "sec": {
                    statRecords.stream().filter(r -> r.getType().endsWith("Time")).forEach(r -> r.setValue(r.getValue().divide(BigDecimal.valueOf(1000L), 2, RoundingMode.HALF_UP)));
                    break;
                }
                case "min": {
                    statRecords.stream().filter(r -> r.getType().endsWith("Time")).forEach(r -> r.setValue(r.getValue().divide(BigDecimal.valueOf(60000L), 2, RoundingMode.HALF_UP)));
                    break;
                }
                case "hour": {
                    statRecords.stream().filter(r -> r.getType().endsWith("Time")).forEach(r -> r.setValue(r.getValue().divide(BigDecimal.valueOf(3600000L), 2, RoundingMode.HALF_UP)));
                    break;
                }
            }
        }
        return StatRecordVo.toStatRecordVoList((List)statRecords);
    }

    public List<StatRecordVo> findStatRecordListByLevelAndTimeAndTypes(String level, List<String> types, String startedOn, String endedOn, Sort orderBy) {
        List statRecords = this.findByLevelAndTypeAndTimeRange(level, types, startedOn, endedOn, orderBy);
        return StatRecordVo.toStatRecordVoList((List)statRecords);
    }

    public List<StatRecordVo> findStatRecordByLevelAndTimeAndTypes(String level, List<String> types, String startedOn, String timeUnit, Sort orderBy) {
        List statRecords = this.findByLevelAndTypeAndTime(level, types, startedOn, orderBy);
        if (!StringUtils.isEmpty((CharSequence)timeUnit)) {
            switch (timeUnit) {
                case "sec": {
                    statRecords.stream().filter(r -> r.getType().endsWith("Time")).forEach(r -> r.setValue(r.getValue().divide(BigDecimal.valueOf(1000L), 2, RoundingMode.HALF_UP)));
                    break;
                }
                case "min": {
                    statRecords.stream().filter(r -> r.getType().endsWith("Time")).forEach(r -> r.setValue(r.getValue().divide(BigDecimal.valueOf(60000L), 2, RoundingMode.HALF_UP)));
                    break;
                }
                case "hour": {
                    statRecords.stream().filter(r -> r.getType().endsWith("Time")).forEach(r -> r.setValue(r.getValue().divide(BigDecimal.valueOf(3600000L), 2, RoundingMode.HALF_UP)));
                    break;
                }
            }
        }
        return StatRecordVo.toStatRecordVoList((List)statRecords);
    }

    public Long findTotalByLevelAndTypeAndTimeRange(String level, List<String> types, String startedOn, String endedOn) {
        Long count = this.statRecordMapper.findTotalByLevelAndTypeAndTimeRange(level, types, startedOn, endedOn);
        return count;
    }

    public List<StatRecordVo> findStatRecordListByLevelAndTimeRangeAndTypesAndThirdId(String level, List<String> types, String thirdId, String startedOn, String endedOn, String timeUnit, Sort orderBy) {
        List statRecords;
        List list = StringUtils.isEmpty((CharSequence)thirdId) ? this.findByLevelAndTypeAndTimeRangeGroupByTime(level, types, startedOn, endedOn, orderBy) : (statRecords = thirdId.equals("details") ? this.findByLevelAndTypeAndTimeRange(level, types, startedOn, endedOn, orderBy) : this.findByLevelAndTypeAndThirdIdAndTimeRange(level, types, thirdId, startedOn, endedOn, orderBy));
        if (!StringUtils.isEmpty((CharSequence)timeUnit)) {
            switch (timeUnit) {
                case "sec": {
                    statRecords.stream().filter(r -> r.getType().endsWith("Time")).forEach(r -> r.setValue(r.getValue().divide(BigDecimal.valueOf(1000L), 2, RoundingMode.HALF_UP)));
                    break;
                }
                case "min": {
                    statRecords.stream().filter(r -> r.getType().endsWith("Time")).forEach(r -> r.setValue(r.getValue().divide(BigDecimal.valueOf(60000L), 2, RoundingMode.HALF_UP)));
                    break;
                }
                case "hour": {
                    statRecords.stream().filter(r -> r.getType().endsWith("Time")).forEach(r -> r.setValue(r.getValue().divide(BigDecimal.valueOf(3600000L), 2, RoundingMode.HALF_UP)));
                    break;
                }
            }
        }
        return StatRecordVo.toStatRecordVoList((List)statRecords);
    }

    public List<StatRecord> findByLevelAndTypeAndTimeRange(String level, List<String> types, String startedOn, String endedOn, Sort orderBy) {
        String sortBy = ((Sort.Order)orderBy.iterator().next()).getProperty();
        if (sortBy == "thirdId") {
            sortBy = "third_id";
        }
        String sort = ((Sort.Order)orderBy.iterator().next()).getDirection().toString();
        StringBuilder queryBuilder = new StringBuilder();
        if (this.dataBaseType.equals("MYSQL")) {
            queryBuilder.append("SELECT id, level, recorded_on, third_id, time, type,value FROM t_statrecord WHERE id IN (");
            queryBuilder.append("SELECT id FROM t_statrecord WHERE level = :level AND time >= :startedOn AND time < :endedOn)");
        } else {
            queryBuilder.append("SELECT id, \"level\", recorded_on, third_id, time, type,value FROM t_statrecord WHERE id IN (");
            queryBuilder.append("SELECT id FROM t_statrecord WHERE \"level\" = :level AND time >= :startedOn AND time < :endedOn)");
        }
        queryBuilder.append(" AND type IN :types ORDER BY ").append(sortBy).append(" ").append(sort);
        String queryString = queryBuilder.toString();
        Query query = this.entityManager.createNativeQuery(queryString, StatRecord.class);
        query.setParameter("level", (Object)level);
        query.setParameter("types", types);
        query.setParameter("startedOn", (Object)startedOn);
        query.setParameter("endedOn", (Object)endedOn);
        return query.getResultList();
    }

    public List<StatRecord> findByLevelAndTypeAndTimeRangeGroupByTime(String level, List<String> types, String startedOn, String endedOn, Sort orderBy) {
        String sortBy = ((Sort.Order)orderBy.iterator().next()).getProperty();
        if (sortBy == "thirdId") {
            sortBy = "third_id";
        }
        String sort = ((Sort.Order)orderBy.iterator().next()).getDirection().toString();
        StringBuilder queryBuilder = new StringBuilder();
        if (this.dataBaseType.equals("MYSQL")) {
            queryBuilder.append("SELECT MIN(record.time) time, MIN(record.type) type,MIN(record.level) level, SUM(record.value) value FROM t_statrecord record WHERE  id in (SELECT id from t_statrecord WHERE level = :level AND time >= :startedOn AND time < :endedOn)AND record.type IN :types GROUP BY record.time, record.type ORDER BY ").append(sortBy).append(" ").append(sort);
        } else if (this.dataBaseType.equals("ORACLE")) {
            queryBuilder.append("SELECT time, type, \"level\", SUM(value) value FROM t_statrecord WHERE  id in (SELECT id from t_statrecord WHERE \"level\" = :level AND time >= :startedOn AND time < :endedOn)AND type IN :types GROUP BY time, type,  \"level\"ORDER BY ").append(sortBy).append(" ").append(sort);
        } else {
            queryBuilder.append("SELECT MIN(record.time) time, MIN(record.type) type,MIN(record.level) \"level\", SUM(record.value) value FROM t_statrecord record WHERE  id in (SELECT id from t_statrecord WHERE \"level\" = :level AND time >= :startedOn AND time < :endedOn)AND record.type IN :types GROUP BY record.time, record.type ORDER BY ").append(sortBy).append(" ").append(sort);
        }
        Query query = this.entityManager.createNativeQuery(queryBuilder.toString());
        query.setParameter("startedOn", (Object)startedOn);
        query.setParameter("endedOn", (Object)endedOn);
        query.setParameter("level", (Object)level);
        query.setParameter("types", types);
        List results = query.getResultList();
        ArrayList<StatRecord> statRecords = new ArrayList<StatRecord>();
        for (Object[] result : results) {
            String minTime = (String)result[0];
            String minType = (String)result[1];
            String minLevel = (String)result[2];
            BigDecimal sumValue = (BigDecimal)result[3];
            StatRecord statRecord = new StatRecord(minLevel, minTime, minType, sumValue);
            statRecords.add(statRecord);
        }
        return statRecords;
    }

    public List<StatRecord> findByLevelAndTypeAndThirdIdAndTimeRange(String level, List<String> types, String thirdId, String startedOn, String endedOn, Sort orderBy) {
        String sortBy = ((Sort.Order)orderBy.iterator().next()).getProperty();
        String sort = ((Sort.Order)orderBy.iterator().next()).getDirection().toString();
        if (sortBy.equals("thirdId")) {
            sortBy = "third_id";
        }
        StringBuilder queryBuilder = new StringBuilder();
        if (this.dataBaseType.equals("MYSQL")) {
            queryBuilder.append("SELECT id, level, recorded_on, third_id, time, type,value FROM t_statrecord WHERE id IN (");
            queryBuilder.append("SELECT id FROM t_statrecord WHERE level = :level AND time >= :startedOn AND time < :endedOn)");
        } else {
            queryBuilder.append("SELECT id, \"level\", recorded_on, third_id, time, type,value FROM t_statrecord WHERE id IN (");
            queryBuilder.append("SELECT id FROM t_statrecord WHERE \"level\" = :level AND time >= :startedOn AND time < :endedOn)");
        }
        queryBuilder.append(" AND type IN :types AND third_id = :thirdId ORDER BY ").append(sortBy).append(" ").append(sort);
        String queryString = queryBuilder.toString();
        Query query = this.entityManager.createNativeQuery(queryString, StatRecord.class);
        query.setParameter("level", (Object)level);
        query.setParameter("types", types);
        query.setParameter("thirdId", (Object)thirdId);
        query.setParameter("startedOn", (Object)startedOn);
        query.setParameter("endedOn", (Object)endedOn);
        return query.getResultList();
    }

    public List<StatRecord> findByLevelAndTypeAndTime(String level, List<String> types, String startedOn, Sort orderBy) {
        String sortBy = ((Sort.Order)orderBy.iterator().next()).getProperty();
        if (sortBy.equals("thirdId")) {
            sortBy = "third_id";
        }
        String sort = ((Sort.Order)orderBy.iterator().next()).getDirection().toString();
        StringBuilder queryBuilder = new StringBuilder();
        if (this.dataBaseType.equals("MYSQL")) {
            queryBuilder.append("SELECT id, level, recorded_on, third_id, time, type,value FROM t_statrecord WHERE id IN (");
            queryBuilder.append("SELECT id FROM t_statrecord WHERE level = :level AND time = :startedOn)");
        } else {
            queryBuilder.append("SELECT id, \"level\", recorded_on, third_id, time, type,value FROM t_statrecord WHERE id IN (");
            queryBuilder.append("SELECT id FROM t_statrecord WHERE \"level\" = :level AND time = :startedOn)");
        }
        queryBuilder.append(" AND type IN :types ORDER BY ").append(sortBy).append(" ").append(sort);
        String queryString = queryBuilder.toString();
        Query query = this.entityManager.createNativeQuery(queryString, StatRecord.class);
        query.setParameter("level", (Object)level);
        query.setParameter("startedOn", (Object)startedOn);
        query.setParameter("types", types);
        return query.getResultList();
    }

    public Page<AlarmsRecordMerge> findAlarmsRecordsByConditionPaging(String vehicleId, String startCreateTime, String endCreateTime, String startEndTime, String endEndTime, String level, String alarmsCode, String alarmsDesc, int currentPage, int pageSize) {
        1 spec = new /* Unavailable Anonymous Inner Class!! */;
        PageRequest pageable = PageRequest.of((int)(currentPage - 1), (int)pageSize, (Sort)Sort.by((Sort.Direction)Sort.Direction.fromString((String)"DESC"), (String[])new String[]{"startedOn"}));
        return this.alarmsRecordMergeMapper.findAll((Specification)spec, (Pageable)pageable);
    }

    public List<AlarmsRecordMerge> findAlarmsRecordsByCondition(String vehicleId, String startCreateTime, String endCreateTime, String level) {
        2 spec = new /* Unavailable Anonymous Inner Class!! */;
        return this.alarmsRecordMergeMapper.findAll((Specification)spec, Sort.by((Sort.Direction)Sort.Direction.fromString((String)"DESC"), (String[])new String[]{"startedOn"}));
    }

    public Long findAlarmsRecordsCountByCondition(String vehicleId, String startCreateTime, String endCreateTime, String level) {
        3 spec = new /* Unavailable Anonymous Inner Class!! */;
        return this.alarmsRecordMergeMapper.count((Specification)spec);
    }

    public List<RobotStatusRecord> findAgvStatusCurrent() {
        LocalDateTime currentTime = LocalDateTime.now();
        LocalDateTime previousHour = currentTime.truncatedTo(ChronoUnit.HOURS);
        LocalDateTime nextHour = previousHour.plusHours(1L);
        Date previous = Date.from(previousHour.atZone(ZoneId.systemDefault()).toInstant());
        Date next = Date.from(nextHour.atZone(ZoneId.systemDefault()).toInstant());
        return this.robotStatusMapper.findAgvStatusCurrent(previous, next);
    }

    public List<BatteryLevelRecord> findBatteryLevelRecordByVehicleIdAndTimeRange(String vehicleId, String startedOn, String endedOn) {
        return this.batteryLevelRecordMapper.findBatteryLevelRecordByVehicleIdAndTimeRange(vehicleId, startedOn, endedOn);
    }

    public List<BatteryLevelRecord> findBatteryLevelRecordsByTime() {
        BatteryLevelRecord record = this.batteryLevelRecordMapper.findTopByOrderByTimeDesc();
        return this.batteryLevelRecordMapper.findBatteryLevelRecordsByTime(record.getTime());
    }

    public List<RobotStatusRecordsVo> findRobotStatusRecordsByCondition(String agvId, String startCreateTime, String endCreateTime, Integer status, String outOrderNo, int currPage, int pageSize) {
        String jpql = "SELECT r.uuid, r.newStatus, r.startedOn, r.endedOn, r.duration, w.outOrderNo, w.id, r.orderId, r.location FROM RobotStatusRecord r LEFT JOIN WindTaskRecord w ON r.externalId = w.id ";
        String whereClause = " WHERE 1 = 1 ";
        String orderByClause = " order by r.startedOn,r.uuid asc ";
        whereClause = this.getRobotStatusHqlWhereString(agvId, startCreateTime, endCreateTime, status, outOrderNo, whereClause);
        Query query = this.em.createQuery(jpql + whereClause + orderByClause);
        if (StringUtils.isNotEmpty((CharSequence)agvId)) {
            query.setParameter("agvId", (Object)agvId);
        }
        if (StringUtils.isNotEmpty((CharSequence)startCreateTime)) {
            Date startDate = DateUtil.fmt2Date((String)startCreateTime, (String)"yyyy-MM-dd HH:mm:ss");
            query.setParameter("startCreateTime", (Object)startDate);
        }
        if (StringUtils.isNotEmpty((CharSequence)endCreateTime)) {
            Date endDate = DateUtil.fmt2Date((String)endCreateTime, (String)"yyyy-MM-dd HH:mm:ss");
            query.setParameter("endCreateTime", (Object)endDate);
        }
        if (status != null) {
            query.setParameter("status", (Object)status);
        }
        if (StringUtils.isNotEmpty((CharSequence)outOrderNo)) {
            query.setParameter("outOrderNo", (Object)outOrderNo);
        }
        query.setFirstResult((currPage - 1) * pageSize);
        query.setMaxResults(pageSize);
        List rows = query.getResultList();
        return this.transListToRobotStatusRecords(rows);
    }

    public List<RobotStatusRecordsVo> exportRobotStatusRecords(String agvId, String startCreateTime, String endCreateTime, Integer status, String outOrderNo) {
        JdbcTemplate jdbcTemplate = (JdbcTemplate)SpringUtil.getBean(JdbcTemplate.class);
        NamedParameterJdbcTemplate namedParameterJdbcTemplate = new NamedParameterJdbcTemplate((JdbcOperations)jdbcTemplate);
        StringBuilder sql = new StringBuilder("SELECT r.uuid AS agvId, r.new_status AS status, r.started_on AS createTime, r.ended_on AS endTime, r.duration AS duration, w.out_order_no AS outOrderNo, w.id AS taskRecordId, r.order_id AS orderId, r.location AS destination FROM t_robotstatusrecord r LEFT OUTER JOIN t_windtaskrecord w ON ( r.external_id = w.id ) ");
        String whereClause = " WHERE 1 = 1 ";
        String orderByClause = " order by r.started_on,r.uuid asc ";
        whereClause = this.getRobotStatusSqlWhereString(agvId, startCreateTime, endCreateTime, status, outOrderNo, whereClause);
        sql.append(whereClause).append(orderByClause);
        HashMap<String, Object> params = new HashMap<String, Object>();
        if (StringUtils.isNotEmpty((CharSequence)agvId)) {
            params.put("agvId", agvId);
        }
        if (StringUtils.isNotEmpty((CharSequence)startCreateTime)) {
            Date startDate = DateUtil.fmt2Date((String)startCreateTime, (String)"yyyy-MM-dd HH:mm:ss");
            params.put("startCreateTime", startDate);
        }
        if (StringUtils.isNotEmpty((CharSequence)endCreateTime)) {
            Date endDate = DateUtil.fmt2Date((String)endCreateTime, (String)"yyyy-MM-dd HH:mm:ss");
            params.put("endCreateTime", endDate);
        }
        if (status != null) {
            params.put("status", status);
        }
        if (StringUtils.isNotEmpty((CharSequence)outOrderNo)) {
            params.put("outOrderNo", outOrderNo);
        }
        return this.transMapToRobotStatusRecords(namedParameterJdbcTemplate.queryForList(sql.toString(), params));
    }

    public Long findRobotStatusRecordsCountByCondition(String agvId, String startCreateTime, String endCreateTime, Integer status, String outOrderNo) {
        StringBuilder sql = new StringBuilder("SELECT count(1) FROM t_robotstatusrecord r LEFT JOIN t_windtaskrecord w ON r.external_id = w.id");
        String whereClause = " WHERE 1 = 1 ";
        whereClause = this.getRobotStatusSqlWhereString(agvId, startCreateTime, endCreateTime, status, outOrderNo, whereClause);
        sql.append(whereClause);
        HashMap<String, Object> params = new HashMap<String, Object>();
        if (StringUtils.isNotEmpty((CharSequence)agvId)) {
            params.put("agvId", agvId);
        }
        if (StringUtils.isNotEmpty((CharSequence)startCreateTime)) {
            Date startDate = DateUtil.fmt2Date((String)startCreateTime, (String)"yyyy-MM-dd HH:mm:ss");
            params.put("startCreateTime", startDate);
        }
        if (StringUtils.isNotEmpty((CharSequence)endCreateTime)) {
            Date endDate = DateUtil.fmt2Date((String)endCreateTime, (String)"yyyy-MM-dd HH:mm:ss");
            params.put("endCreateTime", endDate);
        }
        if (status != null) {
            params.put("status", status);
        }
        if (StringUtils.isNotEmpty((CharSequence)outOrderNo)) {
            params.put("outOrderNo", outOrderNo);
        }
        JdbcTemplate jdbcTemplate = (JdbcTemplate)SpringUtil.getBean(JdbcTemplate.class);
        NamedParameterJdbcTemplate namedParameterJdbcTemplate = new NamedParameterJdbcTemplate((JdbcOperations)jdbcTemplate);
        return (Long)namedParameterJdbcTemplate.queryForObject(sql.toString(), params, Long.class);
    }

    private String getRobotStatusSqlWhereString(String agvId, String startCreateTime, String endCreateTime, Integer status, String outOrderNo, String whereClause) {
        if (StringUtils.isNotEmpty((CharSequence)agvId)) {
            whereClause = (String)whereClause + " and r.uuid = :agvId";
        }
        if (StringUtils.isNotEmpty((CharSequence)startCreateTime)) {
            whereClause = (String)whereClause + " and r.started_on >= :startCreateTime";
        }
        if (StringUtils.isNotEmpty((CharSequence)endCreateTime)) {
            whereClause = (String)whereClause + " and r.started_on <= :endCreateTime";
        }
        if (status != null) {
            whereClause = (String)whereClause + " and r.new_status = :status";
        }
        if (StringUtils.isNotEmpty((CharSequence)outOrderNo)) {
            whereClause = (String)whereClause + " and w.out_order_no = :outOrderNo";
        }
        return whereClause;
    }

    private String getRobotStatusHqlWhereString(String agvId, String startCreateTime, String endCreateTime, Integer status, String outOrderNo, String whereClause) {
        if (StringUtils.isNotEmpty((CharSequence)agvId)) {
            whereClause = (String)whereClause + " and r.uuid = :agvId";
        }
        if (StringUtils.isNotEmpty((CharSequence)startCreateTime)) {
            whereClause = (String)whereClause + " and r.startedOn >= :startCreateTime";
        }
        if (StringUtils.isNotEmpty((CharSequence)endCreateTime)) {
            whereClause = (String)whereClause + " and r.startedOn <= :endCreateTime";
        }
        if (status != null) {
            whereClause = (String)whereClause + " and r.newStatus = :status";
        }
        if (StringUtils.isNotEmpty((CharSequence)outOrderNo)) {
            whereClause = (String)whereClause + " and w.outOrderNo = :outOrderNo";
        }
        return whereClause;
    }

    private List<RobotStatusRecordsVo> transMapToRobotStatusRecords(List<Map<String, Object>> list) {
        ArrayList<RobotStatusRecordsVo> resultList = new ArrayList<RobotStatusRecordsVo>();
        for (Map<String, Object> map : list) {
            RobotStatusRecordsVo resVo = new RobotStatusRecordsVo();
            resVo.setAgvId(map.get("agvId") == null ? null : map.get("agvId").toString());
            resVo.setStatus(map.get("status") == null ? null : (Integer)map.get("status"));
            resVo.setCreateTime(map.get("createTime") == null ? null : map.get("createTime").toString());
            resVo.setEndTime(map.get("endTime") == null ? null : map.get("endTime").toString());
            resVo.setDuration(map.get("duration") == null ? null : Double.valueOf(new BigDecimal(Double.parseDouble(map.get("duration").toString()) / 1000.0 / 60.0).setScale(2, 4).doubleValue()));
            resVo.setOutOrderNo(map.get("outOrderNo") == null ? null : map.get("outOrderNo").toString());
            resVo.setTaskRecordId(map.get("taskRecordId") == null ? null : map.get("taskRecordId").toString());
            resVo.setOrderId(map.get("orderId") == null ? null : map.get("orderId").toString());
            resVo.setDestination(map.get("destination") == null ? null : map.get("destination").toString());
            resultList.add(resVo);
        }
        return resultList;
    }

    private List<RobotStatusRecordsVo> transListToRobotStatusRecords(List rows) {
        ArrayList<RobotStatusRecordsVo> resultList = new ArrayList<RobotStatusRecordsVo>();
        for (Object row : rows) {
            Object[] cells = (Object[])row;
            RobotStatusRecordsVo resVo = new RobotStatusRecordsVo();
            resVo.setAgvId(cells[0] == null ? null : cells[0].toString());
            resVo.setStatus(cells[1] == null ? null : (Integer)cells[1]);
            resVo.setCreateTime(cells[2] == null ? null : cells[2].toString());
            resVo.setEndTime(cells[3] == null ? null : cells[3].toString());
            resVo.setDuration(cells[4] == null ? null : Double.valueOf(new BigDecimal(Double.parseDouble(cells[4].toString()) / 1000.0 / 60.0).setScale(2, 4).doubleValue()));
            resVo.setOutOrderNo(cells[5] == null ? null : cells[5].toString());
            resVo.setTaskRecordId(cells[6] == null ? null : cells[6].toString());
            resVo.setOrderId(cells[7] == null ? null : cells[7].toString());
            resVo.setDestination(cells[8] == null ? null : cells[8].toString());
            resultList.add(resVo);
        }
        return resultList;
    }

    public List<OutOrderRecordsVo> findOutOrderRecordsByCondition(String agvId, String startCreateTime, String endCreateTime, String outOrderNo, int currPage, int pageSize) {
        String jpql = "SELECT w.id, w.outOrderNo, w.createdOn, w.endedOn, w.agvId FROM WindTaskRecord w";
        String whereClause = " WHERE 1 = 1 ";
        String orderByClause = " order by w.createdOn asc";
        whereClause = this.getOutOrderWhereString(agvId, startCreateTime, endCreateTime, outOrderNo, whereClause);
        Query query = this.em.createQuery(jpql + whereClause + orderByClause);
        if (StringUtils.isNotEmpty((CharSequence)agvId)) {
            query.setParameter("agvId", (Object)agvId);
        }
        if (StringUtils.isNotEmpty((CharSequence)startCreateTime)) {
            Date startDate = DateUtil.fmt2Date((String)startCreateTime, (String)"yyyy-MM-dd HH:mm:ss");
            query.setParameter("startCreateTime", (Object)startDate);
        }
        if (StringUtils.isNotEmpty((CharSequence)endCreateTime)) {
            Date endDate = DateUtil.fmt2Date((String)endCreateTime, (String)"yyyy-MM-dd HH:mm:ss");
            query.setParameter("endCreateTime", (Object)endDate);
        }
        if (StringUtils.isNotEmpty((CharSequence)outOrderNo)) {
            query.setParameter("outOrderNo", (Object)outOrderNo);
        }
        if (currPage != -1) {
            query.setFirstResult((currPage - 1) * pageSize);
            query.setMaxResults(pageSize);
        }
        List rows = query.getResultList();
        List resList = this.transToOutOrderRecords(rows);
        return this.combineLocationField(resList);
    }

    private List<OutOrderRecordsVo> combineLocationField(List<OutOrderRecordsVo> list) {
        if (CollectionUtils.isNotEmpty(list)) {
            List taskRecordIds = list.stream().map(OutOrderRecordsVo::getTaskRecordId).collect(Collectors.toList());
            List subRecordIds = ListUtils.partition(taskRecordIds, (int)100);
            ArrayList locations = new ArrayList();
            for (List subRecordId : subRecordIds) {
                locations.addAll(this.robotStatusMapper.findLocationByExIdsIn(subRecordId));
            }
            Map<String, String> locationMap = locations.stream().collect(Collectors.toMap(RobotStatusRecord::getExternalId, r -> Optional.ofNullable(r.getLocation()).orElse(""), (oldValue, newValue) -> oldValue));
            for (OutOrderRecordsVo vo : list) {
                vo.setDestination(locationMap.get(vo.getTaskRecordId()));
            }
        }
        return list;
    }

    public Long findOutOrderRecordsCountByCondition(String agvId, String startCreateTime, String endCreateTime, String outOrderNo) {
        String countJpql = "SELECT count(1) FROM WindTaskRecord w";
        String whereClause = " WHERE 1 = 1 ";
        whereClause = this.getOutOrderWhereString(agvId, startCreateTime, endCreateTime, outOrderNo, whereClause);
        Query countQuery = this.em.createQuery(countJpql + whereClause);
        if (StringUtils.isNotEmpty((CharSequence)agvId)) {
            countQuery.setParameter("agvId", (Object)agvId);
        }
        if (StringUtils.isNotEmpty((CharSequence)startCreateTime)) {
            Date startDate = DateUtil.fmt2Date((String)startCreateTime, (String)"yyyy-MM-dd HH:mm:ss");
            countQuery.setParameter("startCreateTime", (Object)startDate);
        }
        if (StringUtils.isNotEmpty((CharSequence)endCreateTime)) {
            Date endDate = DateUtil.fmt2Date((String)endCreateTime, (String)"yyyy-MM-dd HH:mm:ss");
            countQuery.setParameter("endCreateTime", (Object)endDate);
        }
        if (StringUtils.isNotEmpty((CharSequence)outOrderNo)) {
            countQuery.setParameter("outOrderNo", (Object)outOrderNo);
        }
        return Long.parseLong(countQuery.getResultList().get(0).toString());
    }

    private String getOutOrderWhereString(String agvId, String startCreateTime, String endCreateTime, String outOrderNo, String whereClause) {
        if (StringUtils.isNotEmpty((CharSequence)agvId)) {
            whereClause = (String)whereClause + " and w.agvId = :agvId";
        }
        if (StringUtils.isNotEmpty((CharSequence)startCreateTime)) {
            whereClause = (String)whereClause + " and w.createdOn >= :startCreateTime";
        }
        if (StringUtils.isNotEmpty((CharSequence)endCreateTime)) {
            whereClause = (String)whereClause + " and w.createdOn <= :endCreateTime";
        }
        if (StringUtils.isNotEmpty((CharSequence)outOrderNo)) {
            whereClause = (String)whereClause + " and w.outOrderNo = :outOrderNo";
        }
        return whereClause;
    }

    private List<OutOrderRecordsVo> transToOutOrderRecords(List rows) {
        ArrayList<OutOrderRecordsVo> resultList = new ArrayList<OutOrderRecordsVo>();
        for (Object row : rows) {
            Object[] cells = (Object[])row;
            OutOrderRecordsVo resVo = new OutOrderRecordsVo();
            resVo.setTaskRecordId(cells[0] == null ? null : cells[0].toString());
            resVo.setOutOrderNo(cells[1] == null ? null : cells[1].toString());
            resVo.setCreateTime(cells[2] == null ? null : cells[2].toString());
            resVo.setEndTime(cells[3] == null ? null : cells[3].toString());
            Long duration = cells[3] == null ? null : Long.valueOf(((Date)cells[3]).toInstant().toEpochMilli() - ((Date)cells[2]).toInstant().toEpochMilli());
            resVo.setDuration(duration == null ? null : Double.valueOf(new BigDecimal(Double.parseDouble(duration.toString()) / 1000.0 / 60.0).setScale(2, 4).doubleValue()));
            resVo.setAgvId(cells[4] == null ? null : cells[4].toString());
            resultList.add(resVo);
        }
        return resultList;
    }

    public Integer deleteRobotByUuidIsIn(List<String> uuids) {
        return this.robotItemMapper.deleteByUuidIsIn(uuids);
    }

    public List<StatAgvLoadedTime> getAgvLoadedTime(String agvId, Date startDate, Date endDate) {
        Specification & Serializable spec = (Specification & Serializable)(root, query, cb) -> {
            ArrayList<Predicate> predicates = new ArrayList<Predicate>();
            if (StringUtils.isNotEmpty((CharSequence)agvId)) {
                predicates.add(cb.equal((Expression)root.get("agvId"), (Object)agvId));
            }
            if (null != startDate && null != endDate) {
                predicates.add(cb.between((Expression)root.get("updateTime"), (Comparable)startDate, (Comparable)endDate));
            }
            return cb.and(predicates.toArray(new Predicate[predicates.size()]));
        };
        return this.statAgvLoadedTimeMapper.findAll((Specification)spec);
    }

    public List<String> findRobotItemUuid() {
        List uuidList = this.robotItemMapper.findUuidGroupByUuid();
        return uuidList;
    }

    public void deleteAllStatData() {
        this.statRecordMapper.deleteAll();
        this.statRecordDuplicateMapper.deleteAll();
        this.robotStatusMapper.deleteAll();
        this.robotItemMapper.deleteAll();
        this.alarmsRecordMapper.deleteAll();
        this.alarmsRecordMergeMapper.deleteAll();
        this.batteryLevelRecordMapper.deleteAll();
        this.statAgvLoadedTimeMapper.deleteAll();
    }
}

