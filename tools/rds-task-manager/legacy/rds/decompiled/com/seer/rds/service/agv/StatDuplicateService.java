/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.dao.StatRecordDuplicateMapper
 *  com.seer.rds.model.stat.StatRecordDuplicate
 *  com.seer.rds.service.agv.StatDuplicateService
 *  com.seer.rds.vo.response.StatRecordDuplicateVo
 *  javax.persistence.EntityManager
 *  javax.persistence.PersistenceContext
 *  javax.persistence.Query
 *  javax.persistence.criteria.Expression
 *  javax.persistence.criteria.Predicate
 *  org.apache.commons.lang3.StringUtils
 *  org.slf4j.Logger
 *  org.slf4j.LoggerFactory
 *  org.springframework.beans.factory.annotation.Autowired
 *  org.springframework.beans.factory.annotation.Value
 *  org.springframework.data.domain.Sort
 *  org.springframework.data.domain.Sort$Order
 *  org.springframework.data.jpa.domain.Specification
 *  org.springframework.stereotype.Service
 */
package com.seer.rds.service.agv;

import com.seer.rds.dao.StatRecordDuplicateMapper;
import com.seer.rds.model.stat.StatRecordDuplicate;
import com.seer.rds.vo.response.StatRecordDuplicateVo;
import java.io.Serializable;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import javax.persistence.Query;
import javax.persistence.criteria.Expression;
import javax.persistence.criteria.Predicate;
import org.apache.commons.lang3.StringUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;

@Service
public class StatDuplicateService {
    private static final Logger log = LoggerFactory.getLogger(StatDuplicateService.class);
    @PersistenceContext
    private EntityManager em;
    private final StatRecordDuplicateMapper statRecordDuplicateMapper;
    @PersistenceContext
    private EntityManager entityManager;
    @Value(value="${spring.datasource.databaseType}")
    private String dataBaseType;

    @Autowired
    private StatDuplicateService(StatRecordDuplicateMapper statRecordMapper) {
        this.statRecordDuplicateMapper = statRecordMapper;
    }

    public List<StatRecordDuplicateVo> findStatRecordByLevelAndTimeAndTypes(String level, List<String> types, String startedOn, String timeUnit, Sort sort) {
        List statRecords = this.findByLevelAndTypeAndTime(level, types, startedOn, sort);
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
        return StatRecordDuplicateVo.toStatRecordVoList((List)statRecords);
    }

    public List<StatRecordDuplicateVo> findStatRecordListByLevelAndTimeRangeAndTypesAndThirdId(String level, List<String> types, String thirdId, String startedOn, String endedOn, String timeUnit, Sort orderBy) {
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
        return StatRecordDuplicateVo.toStatRecordVoList((List)statRecords);
    }

    public Long findTotalByLevelAndTypeAndTimeRange(String level, List<String> types, String startedOn, String endedOn) {
        Long count = this.statRecordDuplicateMapper.findTotalByLevelAndTypeAndTimeRange(level, types, startedOn, endedOn);
        return count;
    }

    public List<StatRecordDuplicate> findByLevelAndTypeAndTimeRange(String level, List<String> types, String startedOn, String endedOn, Sort orderBy) {
        Specification & Serializable spec = (Specification & Serializable)(root, query, criteriaBuilder) -> {
            Predicate levelPredicate = criteriaBuilder.equal((Expression)root.get("level"), (Object)level);
            Predicate typePredicate = root.get("type").in((Collection)types);
            Predicate timePredicate = criteriaBuilder.between((Expression)root.get("time"), (Comparable)((Object)startedOn), (Comparable)((Object)endedOn));
            return criteriaBuilder.and(new Predicate[]{levelPredicate, typePredicate, timePredicate});
        };
        return this.statRecordDuplicateMapper.findAll((Specification)spec, orderBy);
    }

    public List<StatRecordDuplicate> findByLevelAndTypeAndTimeRangeGroupByTime(String level, List<String> types, String startedOn, String endedOn, Sort orderBy) {
        String sortBy = ((Sort.Order)orderBy.iterator().next()).getProperty();
        if (sortBy == "thirdId") {
            sortBy = "third_id";
        }
        String sort = ((Sort.Order)orderBy.iterator().next()).getDirection().toString();
        StringBuilder queryBuilder = new StringBuilder();
        if (this.dataBaseType.equals("MYSQL")) {
            queryBuilder.append("SELECT MIN(record.time) time, MIN(record.type) type,MIN(record.level) level, SUM(record.value) value FROM t_statrecord_duplicate record WHERE  id in (SELECT id from t_statrecord_duplicate WHERE level = :level AND time >= :startedOn AND time < :endedOn)AND record.type IN :types GROUP BY record.time, record.type ORDER BY ").append(sortBy).append(" ").append(sort);
        } else if (this.dataBaseType.equals("ORACLE")) {
            queryBuilder.append("SELECT time, type, \"level\", SUM(value) value FROM t_statrecord_duplicate WHERE  id in (SELECT id from t_statrecord_duplicate WHERE \"level\" = :level AND time >= :startedOn AND time < :endedOn)AND type IN :types GROUP BY time, type,  \"level\"ORDER BY ").append(sortBy).append(" ").append(sort);
        } else {
            queryBuilder.append("SELECT MIN(record.time) time, MIN(record.type) type,MIN(record.level) \"level\", SUM(record.value) value FROM t_statrecord_duplicate record WHERE  id in (SELECT id from t_statrecord_duplicate WHERE \"level\" = :level AND time >= :startedOn AND time < :endedOn)AND record.type IN :types GROUP BY record.time, record.type ORDER BY ").append(sortBy).append(" ").append(sort);
        }
        Query query = this.entityManager.createNativeQuery(queryBuilder.toString());
        query.setParameter("startedOn", (Object)startedOn);
        query.setParameter("endedOn", (Object)endedOn);
        query.setParameter("level", (Object)level);
        query.setParameter("types", types);
        List results = query.getResultList();
        ArrayList<StatRecordDuplicate> statRecords = new ArrayList<StatRecordDuplicate>();
        for (Object[] result : results) {
            String minTime = (String)result[0];
            String minType = (String)result[1];
            String minLevel = (String)result[2];
            BigDecimal sumValue = (BigDecimal)result[3];
            StatRecordDuplicate statRecord = new StatRecordDuplicate(minLevel, minTime, minType, sumValue);
            statRecords.add(statRecord);
        }
        return statRecords;
    }

    public List<StatRecordDuplicate> findByLevelAndTypeAndThirdIdAndTimeRange(String level, List<String> types, String thirdId, String startedOn, String endedOn, Sort orderBy) {
        Specification & Serializable spec = (Specification & Serializable)(root, query, criteriaBuilder) -> {
            Predicate levelPredicate = criteriaBuilder.equal((Expression)root.get("level"), (Object)level);
            Predicate typePredicate = root.get("type").in((Collection)types);
            Predicate thirdIdPredicate = criteriaBuilder.equal((Expression)root.get("thirdId"), (Object)thirdId);
            Predicate timePredicate = criteriaBuilder.between((Expression)root.get("time"), (Comparable)((Object)startedOn), (Comparable)((Object)endedOn));
            return criteriaBuilder.and(new Predicate[]{levelPredicate, typePredicate, thirdIdPredicate, timePredicate});
        };
        return this.statRecordDuplicateMapper.findAll((Specification)spec, orderBy);
    }

    public List<StatRecordDuplicate> findByLevelAndTypeAndTime(String level, List<String> types, String startedOn, Sort orderBy) {
        Specification & Serializable spec = (Specification & Serializable)(root, query, criteriaBuilder) -> {
            Predicate levelPredicate = criteriaBuilder.equal((Expression)root.get("level"), (Object)level);
            Predicate typePredicate = root.get("type").in((Collection)types);
            Predicate timePredicate = criteriaBuilder.equal((Expression)root.get("time"), (Object)startedOn);
            return criteriaBuilder.and(new Predicate[]{levelPredicate, typePredicate, timePredicate});
        };
        return this.statRecordDuplicateMapper.findAll((Specification)spec, orderBy);
    }
}

