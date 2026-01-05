/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.dao.InterfaceHandleRecordMapper
 *  com.seer.rds.model.wind.InterfaceHandleRecord
 *  org.springframework.data.jpa.domain.Specification
 *  org.springframework.data.jpa.repository.JpaRepository
 *  org.springframework.data.jpa.repository.JpaSpecificationExecutor
 *  org.springframework.data.jpa.repository.Modifying
 *  org.springframework.data.jpa.repository.Query
 *  org.springframework.stereotype.Repository
 *  org.springframework.transaction.annotation.Transactional
 */
package com.seer.rds.dao;

import com.seer.rds.model.wind.InterfaceHandleRecord;
import java.util.Date;
import java.util.List;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

@Repository
public interface InterfaceHandleRecordMapper
extends JpaRepository<InterfaceHandleRecord, String>,
JpaSpecificationExecutor<InterfaceHandleRecord> {
    public List<InterfaceHandleRecord> findAll(Specification<InterfaceHandleRecord> var1);

    @Transactional
    @Modifying
    @Query(value="delete from InterfaceHandleRecord record where record.createdOn < :time")
    public int clear(Date var1);
}

