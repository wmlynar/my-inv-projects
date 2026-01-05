/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.dao.LiftRecordMapper
 *  com.seer.rds.model.device.LiftRecord
 *  org.springframework.data.jpa.repository.JpaRepository
 *  org.springframework.data.jpa.repository.JpaSpecificationExecutor
 *  org.springframework.data.jpa.repository.Modifying
 *  org.springframework.data.jpa.repository.Query
 *  org.springframework.transaction.annotation.Transactional
 */
package com.seer.rds.dao;

import com.seer.rds.model.device.LiftRecord;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.transaction.annotation.Transactional;

public interface LiftRecordMapper
extends JpaRepository<LiftRecord, Long>,
JpaSpecificationExecutor<LiftRecord> {
    @Transactional
    @Modifying
    @Query(value="update LiftRecord set isFinshed =1 where taskRecordId = :taskRecordId")
    public Integer updateIsFinshedByTaskRecordId(String var1);

    public List<LiftRecord> findLiftRecordByOprTypeAndLiftName(Integer var1, String var2);

    public List<LiftRecord> findLiftRecordByOprTypeAndLiftNameAndIsFinshed(Integer var1, String var2, Integer var3);

    public List<LiftRecord> findDistinctLiftRecordsByLiftNameAndPickFloorAreaAndPutFloorAreaAndPickSiteIdAndPutSiteIdAndOprType(String var1, String var2, String var3, String var4, String var5, int var6);

    public List<LiftRecord> findLiftRecordByOprTypeAndPickFloorAreaAndIsInnerSiteAndLiftName(Integer var1, String var2, Integer var3, String var4);

    public List<LiftRecord> findLiftRecordByOprTypeAndPickFloorAreaAndLiftName(Integer var1, String var2, String var3);
}

