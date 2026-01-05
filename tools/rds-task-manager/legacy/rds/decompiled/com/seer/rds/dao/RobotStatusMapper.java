/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.dao.RobotStatusMapper
 *  com.seer.rds.model.stat.RobotStatusRecord
 *  org.springframework.data.jpa.repository.JpaRepository
 *  org.springframework.data.jpa.repository.JpaSpecificationExecutor
 *  org.springframework.data.jpa.repository.Modifying
 *  org.springframework.data.jpa.repository.Query
 *  org.springframework.stereotype.Repository
 *  org.springframework.transaction.annotation.Transactional
 */
package com.seer.rds.dao;

import com.seer.rds.model.stat.RobotStatusRecord;
import java.util.Date;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

@Repository
public interface RobotStatusMapper
extends JpaRepository<RobotStatusRecord, String>,
JpaSpecificationExecutor<RobotStatusRecord> {
    @Query(nativeQuery=true, value="select uuid from t_robotstatusrecord group by uuid")
    public List<String> findUuidGroupByUuid();

    @Query(nativeQuery=true, value="SELECT id, uuid, vehicle_name, old_status, new_status, started_on, ended_on, duration FROM (SELECT id, uuid, vehicle_name, old_status, new_status, started_on, ended_on, duration,@time_rank \\:= IF(@current_uuid = uuid, @time_rank + 1, 1) as time_rank,@current_uuid \\:= uuid FROM t_robotstatusrecord ORDER BY started_on desc, uuid desc) rec WHERE time_rank <= 3 GROUP BY uuid")
    public List<RobotStatusRecord> findTop1ByStartedOnDesc();

    @Query(nativeQuery=true, value="SELECT t1.* FROM t_robotstatusrecord t1 INNER JOIN ( SELECT MAX(ended_on) AS ended_on, MAX(uuid) AS uuid FROM t_robotstatusrecord t1  where started_on >= ?1 and started_on <= ?2 GROUP BY uuid ) t2 ON t2.ended_on = t1.ended_on  AND t2.uuid = t1.uuid where started_on >= ?1 and started_on <= ?2")
    public List<RobotStatusRecord> findAgvStatusCurrent(Date var1, Date var2);

    @Transactional
    @Modifying
    @Query(value="update RobotStatusRecord set endedOn = :endedOn, duration = :duration where id = :id")
    public int updateEndedOnAndDurationById(String var1, Date var2, long var3);

    @Transactional
    @Modifying
    @Query(value="update RobotStatusRecord set endedOn = :endedOn, duration = :duration where id = :id")
    public int updateById(String var1, Date var2, long var3);

    public RobotStatusRecord findTopByUuidOrderByStartedOnDesc(String var1);

    @Query(value="select sum(r.duration) from RobotStatusRecord r where r.startedOn >= :startedOn and r.startedOn < :endedOn and r.uuid = :uuid and r.newStatus = :status")
    public Long getSumDurationByStartedOnAndNewStatusAndUuid(Date var1, Date var2, int var3, String var4);

    public List<RobotStatusRecord> findAllByStartedOnGreaterThanEqualAndStartedOnLessThan(Date var1, Date var2);

    @Transactional
    @Modifying
    @Query(value="delete from RobotStatusRecord record where record.startedOn < :time")
    public int clearRobotStatusRecord(Date var1);

    @Transactional
    @Modifying
    public int deleteByUuidIsIn(List<String> var1);

    @Query(value="select new RobotStatusRecord (r.externalId, r.location) from RobotStatusRecord r where r.externalId in :exIds ORDER BY r.startedOn DESC")
    public List<RobotStatusRecord> findLocationByExIdsIn(List<String> var1);
}

