/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.dao.StackMemInfoMapper
 *  com.seer.rds.model.serverInfo.StackMem
 *  javax.transaction.Transactional
 *  org.springframework.data.jpa.repository.JpaRepository
 *  org.springframework.data.jpa.repository.JpaSpecificationExecutor
 *  org.springframework.data.jpa.repository.Modifying
 *  org.springframework.data.jpa.repository.Query
 *  org.springframework.data.repository.query.Param
 *  org.springframework.stereotype.Repository
 */
package com.seer.rds.dao;

import com.seer.rds.model.serverInfo.StackMem;
import java.util.Date;
import java.util.List;
import javax.transaction.Transactional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface StackMemInfoMapper
extends JpaRepository<StackMem, Long>,
JpaSpecificationExecutor<StackMem> {
    @Modifying
    @Query(value="DELETE FROM StackMem s WHERE s.recordedOn < :date")
    @Transactional
    public void deleteByRecordedOnBefore(@Param(value="date") Date var1);

    public List<StackMem> findByRecordedOnBetween(Date var1, Date var2);
}

