/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.dao.DistributeRecordMapper
 *  com.seer.rds.model.distribute.DistributeRecord
 *  org.springframework.data.jpa.repository.JpaRepository
 *  org.springframework.data.jpa.repository.JpaSpecificationExecutor
 *  org.springframework.data.jpa.repository.Modifying
 *  org.springframework.data.jpa.repository.Query
 *  org.springframework.stereotype.Repository
 *  org.springframework.transaction.annotation.Transactional
 */
package com.seer.rds.dao;

import com.seer.rds.model.distribute.DistributeRecord;
import java.util.Date;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

@Repository
public interface DistributeRecordMapper
extends JpaRepository<DistributeRecord, String>,
JpaSpecificationExecutor<DistributeRecord> {
    public DistributeRecord findDistributeRecordByDistributeId(String var1);

    @Query(value="SELECT a from DistributeRecord a left join WindTaskRecord b on a.taskRecordId=b.id where a.isEnd = 0 and b.status in (1000,1002,1005,1006) ")
    public List<DistributeRecord> findDistributeRecords(int var1);

    @Transactional
    public int deleteAllByCreateTimeIsBefore(Date var1);

    @Transactional
    @Modifying
    @Query(value="update DistributeRecord d set d.isEnd = :isEnd where d.distributeId in :distributeIds and d.isEnd = 0")
    public int updateIsEndRestart(int var1, List<String> var2);
}

