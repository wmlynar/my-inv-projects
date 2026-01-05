/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.dao.ErrorHandleReportPlatformMapper
 *  com.seer.rds.model.wind.ErrorHandleReportPlatform
 *  org.springframework.data.jpa.repository.JpaRepository
 *  org.springframework.data.jpa.repository.JpaSpecificationExecutor
 *  org.springframework.data.jpa.repository.Query
 *  org.springframework.stereotype.Repository
 */
package com.seer.rds.dao;

import com.seer.rds.model.wind.ErrorHandleReportPlatform;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

@Repository
public interface ErrorHandleReportPlatformMapper
extends JpaRepository<ErrorHandleReportPlatform, String>,
JpaSpecificationExecutor<ErrorHandleReportPlatform> {
    @Query(value="select ifEnable from ErrorHandleReportPlatform where platformType = :errorReportPlatformType")
    public boolean isEnabled(int var1);

    @Query(value="select attempts from ErrorHandleReportPlatform where platformType = :errorReportPlatformType")
    public Integer getAttempts(int var1);
}

