/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.dao.WindTaskLogMapper
 *  com.seer.rds.model.wind.WindTaskLog
 *  org.springframework.data.domain.Page
 *  org.springframework.data.domain.Pageable
 *  org.springframework.data.jpa.repository.JpaRepository
 *  org.springframework.data.jpa.repository.Modifying
 *  org.springframework.data.jpa.repository.Query
 *  org.springframework.stereotype.Repository
 *  org.springframework.transaction.annotation.Transactional
 */
package com.seer.rds.dao;

import com.seer.rds.model.wind.WindTaskLog;
import java.util.Date;
import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

@Repository
public interface WindTaskLogMapper
extends JpaRepository<WindTaskLog, String> {
    @Transactional
    @Modifying
    @Query(value="delete from WindTaskLog record where record.createTime < :time")
    public int clearWindTaskLog(Date var1);

    @Transactional
    @Modifying
    @Query(value="delete from WindTaskLog record where record.taskRecordId in (?1)")
    public int clearWindTaskLogByTaskRecord(List<String> var1);

    public List<WindTaskLog> findAllByTaskRecordId(String var1);

    @Query(value="select new WindTaskLog(w.id, w.message, w.level, w.createTime, w.taskBlockId) from WindTaskLog w where w.taskRecordId = :taskRecordId and w.level in :levels order by w.createTime asc")
    public Page<WindTaskLog> findLogByTaskRecordIdAndLevelIn(String var1, List<String> var2, Pageable var3);

    @Query(value="select new WindTaskLog(w.id, w.message, w.level,  w.createTime, w.taskBlockId) from WindTaskLog w where w.taskRecordId = :taskRecordId order by w.createTime asc")
    public Page<WindTaskLog> findLogByTaskRecordId(String var1, Pageable var2);
}

