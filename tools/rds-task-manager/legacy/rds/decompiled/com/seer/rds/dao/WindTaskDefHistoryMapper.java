/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.dao.WindTaskDefHistoryMapper
 *  com.seer.rds.model.wind.WindTaskDefHistory
 *  org.springframework.data.jpa.repository.JpaRepository
 *  org.springframework.data.jpa.repository.JpaSpecificationExecutor
 *  org.springframework.data.jpa.repository.Query
 *  org.springframework.stereotype.Repository
 */
package com.seer.rds.dao;

import com.seer.rds.model.wind.WindTaskDefHistory;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

@Repository
public interface WindTaskDefHistoryMapper
extends JpaRepository<WindTaskDefHistory, String>,
JpaSpecificationExecutor<WindTaskDefHistory> {
    @Query(value="select w from WindTaskDefHistory w where w.id in :idLists")
    public List<WindTaskDefHistory> findOneTaskDefByIdList(List<String> var1);

    @Query(value="select w from WindTaskDefHistory w where w.label = :defLabel and w.version = :defVersion")
    public WindTaskDefHistory findByLabelAndVersion(String var1, Integer var2);

    @Query(value="select max(w.version) from WindTaskDefHistory w where w.label = :label")
    public Integer findMaxVersion(String var1);
}

