/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.dao.EventDefMapper
 *  com.seer.rds.model.wind.EventDef
 *  org.springframework.data.jpa.repository.JpaRepository
 *  org.springframework.data.jpa.repository.JpaSpecificationExecutor
 *  org.springframework.data.jpa.repository.Modifying
 *  org.springframework.data.jpa.repository.Query
 *  org.springframework.data.repository.query.Param
 *  org.springframework.stereotype.Repository
 *  org.springframework.transaction.annotation.Transactional
 */
package com.seer.rds.dao;

import com.seer.rds.model.wind.EventDef;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

@Repository
public interface EventDefMapper
extends JpaRepository<EventDef, String>,
JpaSpecificationExecutor<EventDef> {
    @Query(value="select w from EventDef w where w.label = :label ")
    public List<EventDef> findByLabel(@Param(value="label") String var1);

    @Query(value="select w from EventDef w where w.label = :taskLabel ")
    public EventDef findAllByLabel(String var1);

    @Transactional
    @Modifying
    @Query(value="update EventDef set ifEnable = :ifEnable where id = :recordId ")
    public void setEnable(Boolean var1, String var2);

    @Query(value="select w from EventDef w where w.id in :idLists")
    public List<EventDef> findOneTaskDefByIdList(List<String> var1);
}

