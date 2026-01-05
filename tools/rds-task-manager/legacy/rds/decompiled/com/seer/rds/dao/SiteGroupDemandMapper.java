/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.dao.SiteGroupDemandMapper
 *  com.seer.rds.model.SiteGroupDemand.SiteGroupDemand
 *  org.springframework.data.jpa.repository.JpaRepository
 *  org.springframework.data.jpa.repository.JpaSpecificationExecutor
 *  org.springframework.data.jpa.repository.Query
 *  org.springframework.data.repository.query.Param
 *  org.springframework.stereotype.Repository
 */
package com.seer.rds.dao;

import com.seer.rds.model.SiteGroupDemand.SiteGroupDemand;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface SiteGroupDemandMapper
extends JpaRepository<SiteGroupDemand, String>,
JpaSpecificationExecutor<SiteGroupDemand> {
    @Query(value="SELECT sgd FROM SiteGroupDemand sgd WHERE sgd.status = :status")
    public List<SiteGroupDemand> findByStatus(@Param(value="status") int var1);

    @Query(value="SELECT sgd FROM SiteGroupDemand sgd WHERE sgd.status IN (1000, 1002)")
    public List<SiteGroupDemand> findByNotStopStatus();
}

