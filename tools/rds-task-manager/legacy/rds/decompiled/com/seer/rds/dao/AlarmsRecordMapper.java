/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.dao.AlarmsRecordMapper
 *  com.seer.rds.model.stat.AlarmsRecord
 *  org.springframework.data.jpa.repository.JpaRepository
 *  org.springframework.data.jpa.repository.JpaSpecificationExecutor
 *  org.springframework.data.jpa.repository.Modifying
 *  org.springframework.data.jpa.repository.Query
 *  org.springframework.stereotype.Repository
 *  org.springframework.transaction.annotation.Transactional
 */
package com.seer.rds.dao;

import com.seer.rds.model.stat.AlarmsRecord;
import java.util.Date;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

@Repository
public interface AlarmsRecordMapper
extends JpaRepository<AlarmsRecord, String>,
JpaSpecificationExecutor<AlarmsRecord> {
    @Query(value="select record from AlarmsRecord record where record.type = 0")
    public List<AlarmsRecord> findByTypeIsZero();

    @Transactional
    @Modifying
    @Query(value="delete from AlarmsRecord record where record.startedOn < :time")
    public int clearAlarmsRecord(Date var1);

    public List<AlarmsRecord> findAllByStartedOnGreaterThanEqualAndStartedOnLessThan(Date var1, Date var2);
}

