/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.dao.SystemLogMapper
 *  com.seer.rds.model.admin.SysLog
 *  org.springframework.data.jpa.domain.Specification
 *  org.springframework.data.jpa.repository.JpaRepository
 *  org.springframework.data.jpa.repository.JpaSpecificationExecutor
 *  org.springframework.stereotype.Repository
 */
package com.seer.rds.dao;

import com.seer.rds.model.admin.SysLog;
import java.util.List;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

@Repository
public interface SystemLogMapper
extends JpaRepository<SysLog, String>,
JpaSpecificationExecutor<SysLog> {
    public List<SysLog> findAll(Specification<SysLog> var1);
}

