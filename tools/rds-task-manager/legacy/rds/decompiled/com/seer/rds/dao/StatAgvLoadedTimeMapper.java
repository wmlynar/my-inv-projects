/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.dao.StatAgvLoadedTimeMapper
 *  com.seer.rds.model.stat.StatAgvLoadedTime
 *  org.springframework.data.jpa.domain.Specification
 *  org.springframework.data.jpa.repository.JpaRepository
 *  org.springframework.data.jpa.repository.JpaSpecificationExecutor
 *  org.springframework.data.jpa.repository.Modifying
 *  org.springframework.data.jpa.repository.Query
 *  org.springframework.stereotype.Repository
 *  org.springframework.transaction.annotation.Transactional
 */
package com.seer.rds.dao;

import com.seer.rds.model.stat.StatAgvLoadedTime;
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
public interface StatAgvLoadedTimeMapper
extends JpaRepository<StatAgvLoadedTime, Long>,
JpaSpecificationExecutor<StatAgvLoadedTime> {
    public List<StatAgvLoadedTime> findAll(Specification<StatAgvLoadedTime> var1);

    @Query(value="select record from StatAgvLoadedTime record where record.agvId = :agvId and record.updateTime between :start and :end")
    public List<StatAgvLoadedTime> findByAgvIdAndUpdateTimeBetween(String var1, Date var2, Date var3);

    @Transactional
    @Modifying
    public int deleteByUpdateTimeBefore(Date var1);
}

