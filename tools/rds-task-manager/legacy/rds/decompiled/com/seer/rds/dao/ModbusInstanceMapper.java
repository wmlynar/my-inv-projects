/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.dao.ModbusInstanceMapper
 *  com.seer.rds.model.modbus.ModbusInstance
 *  org.springframework.data.jpa.repository.JpaRepository
 *  org.springframework.data.jpa.repository.JpaSpecificationExecutor
 *  org.springframework.data.jpa.repository.Modifying
 *  org.springframework.data.jpa.repository.Query
 *  org.springframework.stereotype.Repository
 *  org.springframework.transaction.annotation.Transactional
 */
package com.seer.rds.dao;

import com.seer.rds.model.modbus.ModbusInstance;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

@Repository
public interface ModbusInstanceMapper
extends JpaRepository<ModbusInstance, String>,
JpaSpecificationExecutor<ModbusInstance> {
    @Query(value="select instance from ModbusInstance instance where instance.id = :id")
    public ModbusInstance findOneById(String var1);

    public ModbusInstance findByName(String var1);

    public ModbusInstance findByIdAndName(String var1, String var2);

    public ModbusInstance findByHostAndPortAndName(String var1, int var2, String var3);

    public ModbusInstance findByHostAndPort(String var1, int var2);

    @Query(value="select instance from ModbusInstance instance where instance.name = :name or instance.host = :host and instance.port = :port and instance.slaveId = :slaveId and instance.type = :type and instance.targetAddr = :targetAddr")
    public List<ModbusInstance> findAllByNameOrHostAndPortAndSlaveIdAndTypeAndTargetAddr(String var1, String var2, int var3, int var4, String var5, Integer var6);

    public List<ModbusInstance> findAllByIdIn(List<String> var1);

    @Transactional
    @Modifying
    public int deleteAllByIdIn(List<String> var1);
}

