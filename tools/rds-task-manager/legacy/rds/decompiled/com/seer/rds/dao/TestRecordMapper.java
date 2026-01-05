/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.dao.TestRecordMapper
 *  com.seer.rds.model.wind.TestRecord
 *  org.springframework.data.domain.Pageable
 *  org.springframework.data.jpa.repository.JpaRepository
 *  org.springframework.data.jpa.repository.JpaSpecificationExecutor
 *  org.springframework.data.jpa.repository.Modifying
 *  org.springframework.data.jpa.repository.Query
 *  org.springframework.transaction.annotation.Transactional
 */
package com.seer.rds.dao;

import com.seer.rds.model.wind.TestRecord;
import java.util.List;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.transaction.annotation.Transactional;

public interface TestRecordMapper
extends JpaRepository<TestRecord, String>,
JpaSpecificationExecutor<TestRecord> {
    @Query(value="select w from TestRecord w where w.defLabel = :defLabel order by w.createdOn desc")
    public List<TestRecord> findByDefLabel(String var1, Pageable var2);

    @Transactional
    @Modifying
    @Query(value="update TestRecord set path = :path where id = :taskRecordId")
    public int updateTaskRecordPath(String var1, String var2);
}

