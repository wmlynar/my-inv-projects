/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.dao.RobotAlarmsMapper
 *  com.seer.rds.model.alarms.RobotAlarms
 *  org.springframework.data.jpa.repository.JpaRepository
 *  org.springframework.data.jpa.repository.JpaSpecificationExecutor
 *  org.springframework.data.jpa.repository.Modifying
 *  org.springframework.data.jpa.repository.Query
 *  org.springframework.stereotype.Repository
 *  org.springframework.transaction.annotation.Transactional
 */
package com.seer.rds.dao;

import com.seer.rds.model.alarms.RobotAlarms;
import java.util.Date;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

@Repository
public interface RobotAlarmsMapper
extends JpaRepository<RobotAlarms, Long>,
JpaSpecificationExecutor<RobotAlarms> {
    public RobotAlarms findRobotAlarmsByAgvIdEqualsAndCodeEqualsAndRecordMarkEquals(String var1, int var2, int var3);

    public List<RobotAlarms> findAllByIsOkEquals(int var1);

    public List<RobotAlarms> findAllByAgvIdEqualsAndRecordMarkEquals(String var1, int var2);

    @Transactional
    @Modifying
    @Query(value="delete from RobotAlarms record where record.createTime < :time")
    public int clearRobotAlarms(Date var1);
}

