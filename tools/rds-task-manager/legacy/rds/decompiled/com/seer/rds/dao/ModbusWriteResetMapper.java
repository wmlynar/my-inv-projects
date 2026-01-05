/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.dao.ModbusWriteResetMapper
 *  com.seer.rds.model.general.ModbusWriteReset
 *  org.springframework.data.jpa.repository.JpaRepository
 *  org.springframework.data.jpa.repository.JpaSpecificationExecutor
 *  org.springframework.data.jpa.repository.Modifying
 *  org.springframework.data.jpa.repository.Query
 *  org.springframework.stereotype.Repository
 *  org.springframework.transaction.annotation.Transactional
 */
package com.seer.rds.dao;

import com.seer.rds.model.general.ModbusWriteReset;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

@Repository
public interface ModbusWriteResetMapper
extends JpaRepository<ModbusWriteReset, String>,
JpaSpecificationExecutor<ModbusWriteReset> {
    public List<ModbusWriteReset> findModbusWriteResetByIpAndPortAndAddrTypeAndAddrNoAndSlaveId(String var1, Integer var2, String var3, Integer var4, Integer var5);

    @Transactional
    @Modifying
    @Query(value="update ModbusWriteReset w set w.writeValue= :writeValue where w.id = :id")
    public Integer updateModbusWriteResetValue(String var1, Integer var2);

    public List<ModbusWriteReset> findAllByTaskRecordId(String var1);
}

