/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.dao.EventRecordMapper
 *  com.seer.rds.model.wind.EventRecord
 *  org.springframework.data.jpa.repository.JpaRepository
 *  org.springframework.data.jpa.repository.JpaSpecificationExecutor
 *  org.springframework.data.jpa.repository.Modifying
 *  org.springframework.data.jpa.repository.Query
 *  org.springframework.stereotype.Repository
 *  org.springframework.transaction.annotation.Transactional
 */
package com.seer.rds.dao;

import com.seer.rds.model.wind.EventRecord;
import java.util.Date;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

@Repository
public interface EventRecordMapper
extends JpaRepository<EventRecord, String>,
JpaSpecificationExecutor<EventRecord> {
    public List<EventRecord> findByStatusIn(List<Integer> var1);

    @Query(value="select record from EventRecord record where record.id in (?1)")
    public List<EventRecord> findByRecordIds(List<String> var1);

    @Transactional
    @Modifying(clearAutomatically=true, flushAutomatically=true)
    @Query(value="update EventRecord set endedOn = ?1,endedReason = ?2, status = ?3 where id in (?4) and status in (1000,1002)")
    public void stopAllRunningTaskRecord(Date var1, String var2, int var3, List<String> var4);
}

