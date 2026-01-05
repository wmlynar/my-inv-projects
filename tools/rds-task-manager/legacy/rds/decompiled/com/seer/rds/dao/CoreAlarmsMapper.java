/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.dao.CoreAlarmsMapper
 *  com.seer.rds.model.alarms.CoreAlarms
 *  org.springframework.data.jpa.repository.JpaRepository
 *  org.springframework.data.jpa.repository.JpaSpecificationExecutor
 *  org.springframework.data.jpa.repository.Modifying
 *  org.springframework.data.jpa.repository.Query
 *  org.springframework.stereotype.Repository
 *  org.springframework.transaction.annotation.Transactional
 */
package com.seer.rds.dao;

import com.seer.rds.model.alarms.CoreAlarms;
import java.util.Date;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

@Repository
public interface CoreAlarmsMapper
extends JpaRepository<CoreAlarms, Long>,
JpaSpecificationExecutor<CoreAlarms> {
    public CoreAlarms findCoreAlarmsByCodeEqualsAndRecordMarkEquals(int var1, int var2);

    public List<CoreAlarms> findAllByIsOkEquals(int var1);

    public List<CoreAlarms> findAllByRecordMarkEquals(int var1);

    @Transactional
    @Modifying
    @Query(value="delete from CoreAlarms record where record.createTime < :time")
    public int clearCoreAlarms(Date var1);
}

