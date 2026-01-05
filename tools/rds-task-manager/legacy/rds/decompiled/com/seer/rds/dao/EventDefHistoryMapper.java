/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.dao.EventDefHistoryMapper
 *  com.seer.rds.model.wind.EventDefHistory
 *  org.springframework.data.jpa.repository.JpaRepository
 *  org.springframework.data.jpa.repository.JpaSpecificationExecutor
 *  org.springframework.data.jpa.repository.Query
 */
package com.seer.rds.dao;

import com.seer.rds.model.wind.EventDefHistory;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;

public interface EventDefHistoryMapper
extends JpaRepository<EventDefHistory, String>,
JpaSpecificationExecutor<EventDefHistory> {
    @Query(value="select w from EventDefHistory w where w.id in :idLists")
    public List<EventDefHistory> findOneTaskDefByIdList(List<String> var1);

    @Query(value="select w from EventDefHistory w where w.label = :defLabel and w.version = :version")
    public EventDefHistory findByLabelAndVersion(String var1, Integer var2);

    @Query(value="select max(w.version) from EventDefHistory w where w.label = :label")
    public Integer findMaxVersion(String var1);
}

