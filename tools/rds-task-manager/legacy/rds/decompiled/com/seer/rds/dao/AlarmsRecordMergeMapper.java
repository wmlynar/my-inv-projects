/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.dao.AlarmsRecordMergeMapper
 *  com.seer.rds.model.stat.AlarmsRecordMerge
 *  org.springframework.data.jpa.repository.JpaRepository
 *  org.springframework.data.jpa.repository.JpaSpecificationExecutor
 *  org.springframework.data.jpa.repository.Modifying
 *  org.springframework.data.jpa.repository.Query
 *  org.springframework.stereotype.Repository
 *  org.springframework.transaction.annotation.Transactional
 */
package com.seer.rds.dao;

import com.seer.rds.model.stat.AlarmsRecordMerge;
import java.util.Date;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

@Repository
public interface AlarmsRecordMergeMapper
extends JpaRepository<AlarmsRecordMerge, String>,
JpaSpecificationExecutor<AlarmsRecordMerge> {
    @Query(value="select record from AlarmsRecordMerge record where record.type = 0")
    public List<AlarmsRecordMerge> findByTypeIsZero();

    @Query(value="select record from AlarmsRecordMerge record where record.startedOn >= :startedOn and record.startedOn <= :endedOn")
    public List<AlarmsRecordMerge> findAllByStartedOnGreaterThanEqualAndStartedOnLessThan(Date var1, Date var2);

    @Transactional
    @Modifying
    @Query(value="delete from AlarmsRecordMerge record where record.startedOn < :time")
    public int clearAlarmsRecord(Date var1);
}

