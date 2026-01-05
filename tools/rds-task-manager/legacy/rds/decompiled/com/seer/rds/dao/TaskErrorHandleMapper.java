/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.dao.TaskErrorHandleMapper
 *  com.seer.rds.model.wind.TaskErrorHandle
 *  org.springframework.data.jpa.repository.JpaRepository
 *  org.springframework.data.jpa.repository.JpaSpecificationExecutor
 *  org.springframework.data.jpa.repository.Modifying
 *  org.springframework.data.jpa.repository.Query
 *  org.springframework.transaction.annotation.Transactional
 */
package com.seer.rds.dao;

import com.seer.rds.model.wind.TaskErrorHandle;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.transaction.annotation.Transactional;

public interface TaskErrorHandleMapper
extends JpaRepository<TaskErrorHandle, String>,
JpaSpecificationExecutor<TaskErrorHandle> {
    @Query(value="select w from TaskErrorHandle w where w.errorId = :errorId")
    public Optional<TaskErrorHandle> findByErrorId(String var1);

    @Transactional
    @Modifying
    @Query(value="update TaskErrorHandle w set w.ifShow = false where w.errorId = :errorId")
    public void setNotSHow(String var1);
}

