/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.dao.BatteryLevelRecordMapper
 *  com.seer.rds.model.stat.BatteryLevelRecord
 *  org.springframework.data.jpa.repository.JpaRepository
 *  org.springframework.data.jpa.repository.JpaSpecificationExecutor
 *  org.springframework.data.jpa.repository.Modifying
 *  org.springframework.data.jpa.repository.Query
 *  org.springframework.stereotype.Repository
 *  org.springframework.transaction.annotation.Transactional
 */
package com.seer.rds.dao;

import com.seer.rds.model.stat.BatteryLevelRecord;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

@Repository
public interface BatteryLevelRecordMapper
extends JpaRepository<BatteryLevelRecord, String>,
JpaSpecificationExecutor<BatteryLevelRecord> {
    public List<BatteryLevelRecord> findAllByTime(String var1);

    @Query(value="select record from BatteryLevelRecord record where record.time >= :startedOn and record.time < :endedOn and record.vehicleId = :vehicleId order by record.time")
    public List<BatteryLevelRecord> findBatteryLevelRecordByVehicleIdAndTimeRange(String var1, String var2, String var3);

    public BatteryLevelRecord findTopByOrderByTimeDesc();

    public List<BatteryLevelRecord> findBatteryLevelRecordsByTime(String var1);

    @Transactional
    @Modifying
    @Query(value="delete from BatteryLevelRecord record where record.time < :time")
    public int clearBatteryLevelRecord(String var1);
}

