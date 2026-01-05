/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.dao.ModbusReadLogMapper
 *  com.seer.rds.model.modbus.ModbusReadLog
 *  org.springframework.data.jpa.repository.JpaRepository
 *  org.springframework.data.jpa.repository.JpaSpecificationExecutor
 *  org.springframework.data.jpa.repository.Modifying
 *  org.springframework.data.jpa.repository.Query
 *  org.springframework.stereotype.Repository
 *  org.springframework.transaction.annotation.Transactional
 */
package com.seer.rds.dao;

import com.seer.rds.model.modbus.ModbusReadLog;
import java.util.Date;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

@Repository
public interface ModbusReadLogMapper
extends JpaRepository<ModbusReadLog, Long>,
JpaSpecificationExecutor<ModbusReadLog> {
    @Transactional
    @Modifying
    @Query(value="delete from ModbusReadLog where createTime < :date")
    public int deleteByCreateTime(Date var1);
}

