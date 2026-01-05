/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.dao.StatRecordDuplicateMapper
 *  com.seer.rds.model.stat.StatRecordDuplicate
 *  org.springframework.data.jpa.repository.JpaRepository
 *  org.springframework.data.jpa.repository.JpaSpecificationExecutor
 *  org.springframework.data.jpa.repository.Modifying
 *  org.springframework.data.jpa.repository.Query
 *  org.springframework.stereotype.Repository
 *  org.springframework.transaction.annotation.Transactional
 */
package com.seer.rds.dao;

import com.seer.rds.model.stat.StatRecordDuplicate;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

@Repository
public interface StatRecordDuplicateMapper
extends JpaRepository<StatRecordDuplicate, String>,
JpaSpecificationExecutor<StatRecordDuplicate> {
    public List<StatRecordDuplicate> findAllByLevel(String var1);

    public List<StatRecordDuplicate> findAllByTime(String var1);

    public List<StatRecordDuplicate> findAllByType(String var1);

    public List<StatRecordDuplicate> findAllByTimeAndLevel(String var1, String var2);

    public List<StatRecordDuplicate> findAllByLevelAndTimeLike(String var1, String var2);

    public List<StatRecordDuplicate> findAllByLevelAndTypeAndThirdIdAndTimeLike(String var1, String var2, String var3, String var4);

    public StatRecordDuplicate findByTimeAndLevelAndTypeAndThirdId(String var1, String var2, String var3, String var4);

    public List<StatRecordDuplicate> findAllByTimeAndType(String var1, String var2);

    public List<StatRecordDuplicate> findAllByLevelAndType(String var1, String var2);

    public List<StatRecordDuplicate> findAllByLevelAndTimeAndType(String var1, String var2, String var3);

    public List<StatRecordDuplicate> findByLevelAndThirdId(String var1, String var2);

    public List<StatRecordDuplicate> findByThirdId(String var1);

    @Query(value="select record from StatRecordDuplicate record where record.level = :targetLevel and record.time >= :startedOn and record.time <= :endedOn order by record.time")
    public List<StatRecordDuplicate> findByLevelAndTimeRange(String var1, String var2, String var3);

    @Query(value="select record from StatRecordDuplicate record where record.type = :targetType and record.level = :targetLevel and record.time >= :startedOn and record.time <= :endedOn order by record.time")
    public List<StatRecordDuplicate> findByTypeAndLevelAndTimeRange(String var1, String var2, String var3, String var4);

    @Query(value="select record from StatRecordDuplicate record where record.time >= :startedOn and record.time <= :endedOn and record.level = :level and record.thirdId = :thirdId and record.type in :types order by record.time")
    public List<StatRecordDuplicate> findByLevelAndTypeAndThirdIdAndTimeRange(String var1, List<String> var2, String var3, String var4, String var5);

    @Query(value="select record from StatRecordDuplicate record where record.time >= :startedOn and record.time <= :endedOn and record.level = :level and record.type in :types order by record.time")
    public List<StatRecordDuplicate> findByLevelAndTypeAndTimeRange(String var1, List<String> var2, String var3, String var4);

    @Query(value="select count(1) from StatRecordDuplicate record where record.time >= :startedOn and record.time <= :endedOn and record.level = :level and record.type in :types")
    public Long findTotalByLevelAndTypeAndTimeRange(String var1, List<String> var2, String var3, String var4);

    @Query(value="select new StatRecordDuplicate(min(r.level),min(r.time),min(r.type),sum(r.value)) from StatRecordDuplicate r where r.time >= :startedOn and r.time <= :endedOn and r.level = :level and r.type in :types group by r.time,r.type order by r.time asc")
    public List<StatRecordDuplicate> findByLevelAndTypeAndTimeRangeGroupByTime(String var1, List<String> var2, String var3, String var4);

    @Query(value="select record from StatRecordDuplicate record where record.time = :startedOn and record.level = :level and record.type in :types order by record.time")
    public List<StatRecordDuplicate> findByLevelAndTypeAndTime(String var1, List<String> var2, String var3);

    @Transactional
    @Modifying
    @Query(value="delete from StatRecordDuplicate record where record.time < :time and record.level = :level")
    public int clearStatRecordDuplicate(String var1, String var2);

    @Transactional
    @Modifying
    public int deleteByThirdIdIsIn(List<String> var1);
}

