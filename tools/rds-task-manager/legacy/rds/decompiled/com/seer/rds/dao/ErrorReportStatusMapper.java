/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.dao.ErrorReportStatusMapper
 *  com.seer.rds.model.wind.ErrorReportStatus
 *  org.springframework.data.jpa.repository.JpaRepository
 *  org.springframework.data.jpa.repository.JpaSpecificationExecutor
 *  org.springframework.data.jpa.repository.Query
 *  org.springframework.stereotype.Repository
 */
package com.seer.rds.dao;

import com.seer.rds.model.wind.ErrorReportStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

@Repository
public interface ErrorReportStatusMapper
extends JpaRepository<ErrorReportStatus, String>,
JpaSpecificationExecutor<ErrorReportStatus> {
    @Query(value="select error from ErrorReportStatus error where error.errorHandleId = ?1 and error.platformType = ?2")
    public ErrorReportStatus findByErrorRecordId(String var1, Integer var2);
}

