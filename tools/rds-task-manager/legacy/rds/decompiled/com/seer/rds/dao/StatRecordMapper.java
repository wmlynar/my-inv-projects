/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.dao.StatRecordMapper
 *  com.seer.rds.model.stat.StatRecord
 *  org.springframework.data.jpa.repository.JpaRepository
 *  org.springframework.data.jpa.repository.JpaSpecificationExecutor
 *  org.springframework.data.jpa.repository.Modifying
 *  org.springframework.data.jpa.repository.Query
 *  org.springframework.stereotype.Repository
 *  org.springframework.transaction.annotation.Transactional
 */
package com.seer.rds.dao;

import com.seer.rds.model.stat.StatRecord;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

@Repository
public interface StatRecordMapper
extends JpaRepository<StatRecord, String>,
JpaSpecificationExecutor<StatRecord> {
    public List<StatRecord> findAllByLevel(String var1);

    public List<StatRecord> findAllByTime(String var1);

    public List<StatRecord> findAllByType(String var1);

    public List<StatRecord> findAllByTimeAndLevel(String var1, String var2);

    public List<StatRecord> findAllByLevelAndTimeLike(String var1, String var2);

    public List<StatRecord> findAllByLevelAndTypeInAndTimeLike(String var1, List<String> var2, String var3);

    public List<StatRecord> findAllByLevelAndTypeAndThirdIdAndTimeLike(String var1, String var2, String var3, String var4);

    public StatRecord findByTimeAndLevelAndTypeAndThirdId(String var1, String var2, String var3, String var4);

    public List<StatRecord> findAllByTimeAndType(String var1, String var2);

    public List<StatRecord> findAllByLevelAndType(String var1, String var2);

    public List<StatRecord> findAllByLevelAndTimeAndType(String var1, String var2, String var3);

    public List<StatRecord> findByLevelAndThirdId(String var1, String var2);

    public List<StatRecord> findByThirdId(String var1);

    @Query(value="select record from StatRecord record where record.level = :targetLevel and record.time >= :startedOn and record.time <= :endedOn order by record.time")
    public List<StatRecord> findByLevelAndTimeRange(String var1, String var2, String var3);

    @Query(value="select record from StatRecord record where record.type = :targetType and record.level = :targetLevel and record.time >= :startedOn and record.time <= :endedOn order by record.time")
    public List<StatRecord> findByTypeAndLevelAndTimeRange(String var1, String var2, String var3, String var4);

    @Query(value="select record from StatRecord record where record.time >= :startedOn and record.time <= :endedOn and record.level = :level and record.thirdId = :thirdId and record.type in :types order by record.time")
    public List<StatRecord> findByLevelAndTypeAndThirdIdAndTimeRange(String var1, List<String> var2, String var3, String var4, String var5);

    @Query(value="select record from StatRecord record where record.time >= :startedOn and record.time <= :endedOn and record.level = :level and record.type in :types order by record.time")
    public List<StatRecord> findByLevelAndTypeAndTimeRange(String var1, List<String> var2, String var3, String var4);

    @Query(value="select count(1) from StatRecord record where record.time >= :startedOn and record.time <= :endedOn and record.level = :level and record.type in :types")
    public Long findTotalByLevelAndTypeAndTimeRange(String var1, List<String> var2, String var3, String var4);

    @Query(value="select new StatRecord(min(r.level),min(r.time),min(r.type),sum(r.value)) from StatRecord r where r.time >= :startedOn and r.time <= :endedOn and r.level = :level and r.type in :types group by r.time,r.type order by r.time asc")
    public List<StatRecord> findByLevelAndTypeAndTimeRangeGroupByTime(String var1, List<String> var2, String var3, String var4);

    @Query(value="select record from StatRecord record where record.time = :startedOn and record.level = :level and record.type in :types order by record.time")
    public List<StatRecord> findByLevelAndTypeAndTime(String var1, List<String> var2, String var3);

    @Transactional
    @Modifying
    @Query(value="delete from StatRecord record where record.time < :time and record.level = :level")
    public int clearStatRecord(String var1, String var2);

    @Transactional
    @Modifying
    public int deleteByThirdIdIsIn(List<String> var1);
}

