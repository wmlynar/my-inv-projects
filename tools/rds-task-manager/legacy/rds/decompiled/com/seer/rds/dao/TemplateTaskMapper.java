/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.dao.TemplateTaskMapper
 *  com.seer.rds.model.wind.TemplateTask
 *  org.springframework.data.jpa.repository.JpaRepository
 *  org.springframework.data.jpa.repository.JpaSpecificationExecutor
 *  org.springframework.data.jpa.repository.Modifying
 *  org.springframework.data.jpa.repository.Query
 *  org.springframework.stereotype.Repository
 *  org.springframework.transaction.annotation.Transactional
 */
package com.seer.rds.dao;

import com.seer.rds.model.wind.TemplateTask;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

@Repository
public interface TemplateTaskMapper
extends JpaRepository<TemplateTask, String>,
JpaSpecificationExecutor<TemplateTask> {
    @Transactional
    @Modifying
    @Query(value="update TemplateTask set templateIfEnable = 1 where id = :id")
    public Integer stateChange(String var1);

    @Transactional
    @Modifying(clearAutomatically=true, flushAutomatically=true)
    @Query(value="update TemplateTask set templateIfEnable = 2 where id = :id")
    public Integer updateEnableFinished(String var1);

    @Transactional
    @Modifying
    @Query(value="update TemplateTask w set w.templateIfEnable = 0")
    public Integer setAllDisable();

    @Query(value="select w from TemplateTask w where w.templateIfEnable = 2 or w.templateIfEnable = 1 ")
    public List<TemplateTask> findEnableTemplateTask();

    @Query(value="select w from TemplateTask w ")
    public List<TemplateTask> findAllTemplateTask();
}

