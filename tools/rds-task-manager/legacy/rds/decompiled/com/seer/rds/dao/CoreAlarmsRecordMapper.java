/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.dao.CoreAlarmsRecordMapper
 *  com.seer.rds.model.stat.CoreAlarmsRecord
 *  org.springframework.data.jpa.repository.JpaRepository
 *  org.springframework.data.jpa.repository.JpaSpecificationExecutor
 *  org.springframework.data.jpa.repository.Modifying
 *  org.springframework.data.jpa.repository.Query
 *  org.springframework.stereotype.Repository
 *  org.springframework.transaction.annotation.Transactional
 */
package com.seer.rds.dao;

import com.seer.rds.model.stat.CoreAlarmsRecord;
import java.util.Date;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

@Repository
public interface CoreAlarmsRecordMapper
extends JpaRepository<CoreAlarmsRecord, String>,
JpaSpecificationExecutor<CoreAlarmsRecord> {
    public List<CoreAlarmsRecord> findAllByTypeIs(int var1);

    @Transactional
    @Modifying
    @Query(value="delete from CoreAlarmsRecord record where record.startedOn < :time")
    public int clearCoreAlarmsRecord(Date var1);
}

