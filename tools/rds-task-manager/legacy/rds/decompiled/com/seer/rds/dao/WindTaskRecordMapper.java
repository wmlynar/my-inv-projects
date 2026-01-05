/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.dao.WindTaskRecordMapper
 *  com.seer.rds.model.wind.WindTaskRecord
 *  org.springframework.data.domain.Page
 *  org.springframework.data.domain.Pageable
 *  org.springframework.data.jpa.domain.Specification
 *  org.springframework.data.jpa.repository.JpaRepository
 *  org.springframework.data.jpa.repository.JpaSpecificationExecutor
 *  org.springframework.data.jpa.repository.Modifying
 *  org.springframework.data.jpa.repository.Query
 *  org.springframework.data.repository.query.Param
 *  org.springframework.stereotype.Repository
 *  org.springframework.transaction.annotation.Transactional
 */
package com.seer.rds.dao;

import com.seer.rds.model.wind.WindTaskRecord;
import java.util.Date;
import java.util.List;
import java.util.Map;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

@Repository
public interface WindTaskRecordMapper
extends JpaRepository<WindTaskRecord, String>,
JpaSpecificationExecutor<WindTaskRecord> {
    public List<WindTaskRecord> findByDefIdOrderByCreatedOnDesc(String var1);

    public List<WindTaskRecord> findByDefIdAndIdOrderByCreatedOnDesc(String var1, String var2);

    @Query(value="select outOrderNo from WindTaskRecord where id = :taskRecordId")
    public String findOutOrderNoById(String var1);

    @Query(value="select status from WindTaskRecord where id = :taskRecordId")
    public Integer findStatusById(String var1);

    @Query(value="select count(*) from WindTaskRecord ")
    public Integer findCount();

    @Query(value="select count(*) from WindTaskRecord where status=1000")
    public Integer findCountByRunningStatus();

    @Query(value="select defLabel from WindTaskRecord where id = :taskRecordId")
    public String findLabelById(String var1);

    @Query(value="select new WindTaskRecord(w.id, '', w.defLabel) from WindTaskRecord w where w.id in (:taskRecordIds)")
    public List<WindTaskRecord> findIdLabelByIdIn(List<String> var1);

    @Query(value="select 1 from WindTaskRecord w where w.status in (1000,1002,1005,1006) and w.defLabel = :taskLabel")
    public List<Integer> find1ByLabelAndStatusIn(String var1);

    @Query(value="select new WindTaskRecord(w.id, w.defId, '') from WindTaskRecord w where w.status in (1000,1002,1005,1006) and w.defLabel = :taskLabel order by w.createdOn desc ")
    public List<WindTaskRecord> findRecordIdAndTaskIdByLabelAndStatusIn(String var1);

    @Query(value="select w from WindTaskRecord w where w.parentTaskRecordId = :parentTaskRecordId")
    public List<WindTaskRecord> findByParentTaskRecordId(String var1);

    @Query(value="select w.defId from WindTaskRecord w where w.id = :taskRecordId")
    public String getDefIdById(String var1);

    @Query(value="select new WindTaskRecord(w.id, w.defId) from WindTaskRecord w where w.isDel = 0 and w.status in (1000,1002,1005,1006) and w.defLabel = :defLabel")
    public List<WindTaskRecord> getIdAndDefIdByDefLabel(String var1);

    @Query(value="select new WindTaskRecord(w.id,w.outOrderNo,w.defId,w.defLabel,w.createdOn,w.status,w.endedOn,w.stateDescription,w.agvId) from WindTaskRecord w where w.id = :taskRecordId")
    public WindTaskRecord findRecordById(String var1);

    @Transactional
    @Modifying
    @Query(value="update WindTaskRecord set outOrderNo = :outOrderNo where id = :taskRecordId")
    public Integer updateOutOrderNoById(String var1, String var2);

    @Transactional
    @Modifying
    @Query(value="delete from WindTaskRecord record where record.defId = ?1 and record.status <> 1000 and record.endedOn <= ?2")
    public Integer deleteWindTaskRecordByDefId(String var1, Date var2);

    public List<WindTaskRecord> findByStatus(Integer var1);

    @Query(value="select new WindTaskRecord(r.defLabel, r.status, r.executorTime) from WindTaskRecord r where r.endedOn >= ?1 and r.endedOn <= ?2 and r.status = 1003")
    public List<WindTaskRecord> findByEndedOnBetweenAndStatusFinished(Date var1, Date var2);

    @Query(value="select new WindTaskRecord(r.defLabel, r.status, r.executorTime) from WindTaskRecord r where r.endedOn >= ?1 and r.endedOn <= ?2 and r.status = 1003 and r.defLabel = ?3")
    public List<WindTaskRecord> findByStatusAndEndedOnBetweenAndDefLabel(Date var1, Date var2, String var3);

    @Query(value="select record from WindTaskRecord record where record.outOrderNo = ?1 and record.isDel = 0  order by record.createdOn asc")
    public List<WindTaskRecord> getRecordListByOutOrderNo(String var1);

    @Query(nativeQuery=true, value="SELECT * FROM t_windtaskrecord WHERE id IN (SELECT id FROM t_windtaskrecord FORCE INDEX (createdOnIsDelDefLabelAgvIdStatusIndex) WHERE agv_id = ?1 AND is_del = 0) ORDER BY created_on ASC")
    public List<WindTaskRecord> getRecordListByAgvId(String var1);

    public List<WindTaskRecord> findByStatusIn(List<Integer> var1);

    @Query(value="select record from WindTaskRecord record where record.agvId = ?1 and record.isDel = 0 and record.status in (1000,1002,1005,1006) order by record.createdOn asc")
    public List<WindTaskRecord> getRecordByAgvIdAndStatus(String var1);

    @Query(nativeQuery=true, value="select count(1) from t_windtaskrecord  where created_on >= :startDate and created_on < :endDate and status = :status")
    public Integer getTaskCountByCreateTimeAndStatus(Date var1, Date var2, int var3);

    @Query(nativeQuery=true, value="select count(1) from t_windtaskrecord where created_on >= :startDate and created_on < :endDate")
    public Integer getCreatedTaskCountByCreateTime(Date var1, Date var2);

    @Query(value="select new WindTaskRecord(w.defLabel, w.status, w.executorTime,w.callWorkType,w.callWorkStation) from WindTaskRecord w where w.createdOn >= :startDate and w.createdOn < :endDate")
    public List<WindTaskRecord> getWindTaskRecordByCreateTime(Date var1, Date var2);

    @Query(value="select new WindTaskRecord(w.defLabel, w.status, w.executorTime,w.callWorkType,w.callWorkStation) from WindTaskRecord w where w.endedOn >= :startDate and w.endedOn < :endDate")
    public List<WindTaskRecord> getWindTaskRecordByEndTime(Date var1, Date var2);

    @Query(nativeQuery=true, value="SELECT agv_id AS agvId, def_label AS taskLabel, count(1) as count FROM t_windtaskrecord where ended_on >= :startDate and ended_on <= :endDate and status = 1003 and agv_id <> '' GROUP BY agv_id,def_label ORDER BY agv_id")
    public List<Map> getAgvSuccessTaskCountByEndedOn(String var1, String var2);

    @Query(value="select new WindTaskRecord(w.id,w.defLabel,w.createdOn,w.status,w.agvId) from WindTaskRecord w where w.createdOn <= :startDate and w.status in (1000,1002,1005,1006)")
    public Page<WindTaskRecord> getTaskRetentionList(Date var1, Pageable var2);

    @Transactional
    @Modifying
    @Query(value="update  WindTaskRecord w set w.isDel = 1 where w.status in (1001,1003,1004) and w.isDel = 0")
    public void deleteAllTask();

    @Query(value="select record from WindTaskRecord record where record.status in (1001,1003,1004) and record.isDel = 0")
    public List<WindTaskRecord> getRecordByStatus();

    @Transactional
    @Modifying
    @Query(value="update  WindTaskRecord w set w.isDel = 1 where w.id in (:ids) and w.status in (1001,1003,1004) and w.isDel = 0")
    public int deleteTaskByIds(List<String> var1);

    @Transactional
    @Modifying
    @Query(value="update WindTaskRecord set endedReason = :endedReason where id = :taskRecordId")
    public int updateTaskRecordEndedReason(String var1, String var2);

    @Transactional
    @Modifying
    @Query(value="update WindTaskRecord set path = :path where id = :taskRecordId")
    public int updateTaskRecordPath(String var1, String var2);

    public List<WindTaskRecord> findAll(Specification<WindTaskRecord> var1);

    public WindTaskRecord findByOutOrderNo(String var1);

    @Transactional
    @Modifying
    @Query(value="update WindTaskRecord set endedOn = ?1, endedReason = ?2, status = ?3 where id in (?4)")
    public int updateAllTaskRecord(Date var1, String var2, Integer var3, List<String> var4);

    @Transactional
    @Modifying
    @Query(value="update WindTaskRecord set endedOn = ?1 where id = ?2")
    public int updateTaskRecordEndTime(Date var1, String var2);

    @Transactional
    @Modifying(clearAutomatically=true, flushAutomatically=true)
    @Query(value="update WindTaskRecord set endedReason = ?1, status = ?2 where id in (?3) and status in (1000,1002)")
    public int stopAllRunningTaskRecord(String var1, Integer var2, List<String> var3);

    @Transactional
    @Modifying
    @Query(value="update WindTaskRecord set endedOn = ?1 ,status = ?2 where id in (?3) and status in (1005,1006)")
    public int stopAllInterruptAndRestartTaskRecord(Date var1, Integer var2, List<String> var3);

    @Transactional
    @Modifying
    @Query(value="update WindTaskRecord set endedOn = ?1 ,status = ?2 where id in (?3) and status in (1000,1002,1005,1006)")
    public int stopEnableTaskRecord(Date var1, Integer var2, List<String> var3);

    @Query(value="select record from WindTaskRecord record where record.id in (?1)")
    public List<WindTaskRecord> findByRecordIds(List<String> var1);

    @Transactional
    @Modifying
    @Query(value="update WindTaskRecord set firstExecutorTime = :time where id = :id and firstExecutorTime is null")
    public int updateTaskRecordFirstExecutorTime(Date var1, String var2);

    @Transactional
    @Modifying
    @Query(value="update WindTaskRecord set executorTime = :#{#windTaskRecord.executorTime} + case when executorTime is null THEN 0 else executorTime end where id = :#{#windTaskRecord.id}")
    public int updateTaskRecordExecutorTime(@Param(value="windTaskRecord") WindTaskRecord var1);

    @Query(value="select record from WindTaskRecord record where record.status  in (1000,1002,1005,1006) and record.defLabel in (?1) and record.isDel = 0 ")
    public List<WindTaskRecord> findByTaskLabel(List<String> var1);

    @Transactional
    @Modifying
    @Query(value="delete from WindTaskRecord record where record.createdOn < :time")
    public int clearWindTaskRecord(Date var1);

    @Query(value="select record from WindTaskRecord record where record.parentTaskRecordId = ?1")
    public List<WindTaskRecord> findByParentId(String var1);
}

