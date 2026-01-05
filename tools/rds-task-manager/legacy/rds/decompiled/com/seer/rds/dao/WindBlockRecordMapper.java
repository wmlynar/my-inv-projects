/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.dao.WindBlockRecordMapper
 *  com.seer.rds.model.wind.WindBlockRecord
 *  org.springframework.data.domain.Page
 *  org.springframework.data.domain.Pageable
 *  org.springframework.data.jpa.repository.JpaRepository
 *  org.springframework.data.jpa.repository.Modifying
 *  org.springframework.data.jpa.repository.Query
 *  org.springframework.stereotype.Repository
 *  org.springframework.transaction.annotation.Transactional
 */
package com.seer.rds.dao;

import com.seer.rds.model.wind.WindBlockRecord;
import java.util.Date;
import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

@Repository
public interface WindBlockRecordMapper
extends JpaRepository<WindBlockRecord, String> {
    @Query(value="select record from WindBlockRecord record where record.taskRecordId =:taskRecordId and record.taskId =:taskId order by record.startedOn asc")
    public List<WindBlockRecord> findByTaskIdAndTaskRecordId(String var1, String var2);

    @Query(value="select record from WindBlockRecord record where record.taskRecordId in (?1)")
    public List<WindBlockRecord> findByTaskIdsAndTaskRecordIds(List<String> var1);

    @Query(value="select new WindBlockRecord (w.blockConfigId,w.blockName,w.status,w.startedOn,w.endedOn,w.endedReason,w.remark) from WindBlockRecord w where w.taskRecordId =:taskRecordId")
    public List<WindBlockRecord> findByTaskRecordId(String var1);

    public List<WindBlockRecord> findWindBlockRecordByTaskRecordIdOrderByEndedOnDesc(String var1);

    public Page<WindBlockRecord> findWindBlockRecordByTaskRecordIdOrderByEndedOnDesc(String var1, Pageable var2);

    public Page<WindBlockRecord> findWindBlockRecordByTaskRecordId(String var1, Pageable var2);

    @Transactional
    @Modifying
    @Query(value="delete from WindBlockRecord record where record.startedOn < :time")
    public int clearWindBlockRecord(Date var1);

    @Transactional
    @Modifying
    @Query(value="delete from WindBlockRecord record where record.taskRecordId in (?1)")
    public int clearWindBlockRecordByTaskRecord(List<String> var1);

    @Transactional
    @Modifying
    @Query(value="delete from WindBlockRecord record where record.taskRecordId = ?1 and record.outputParams like  ?2 and record.blockName <> 'WhileBp'")
    public int clearWindBlockRecordByTaskRecordAndWhile(String var1, String var2);

    public List<WindBlockRecord> findWindBlockRecordByTaskRecordId(String var1);

    public List<WindBlockRecord> findWindBlockRecordByTaskRecordIdAndBlockConfigIdAndStatusInAndOrderIdNotNull(String var1, String var2, List<Integer> var3);

    @Transactional
    @Modifying
    @Query(value="delete from WindBlockRecord record where record.taskRecordId = ?1 and record.blockConfigId in ?2")
    public int clearChildrenRecord(String var1, List<String> var2);
}

