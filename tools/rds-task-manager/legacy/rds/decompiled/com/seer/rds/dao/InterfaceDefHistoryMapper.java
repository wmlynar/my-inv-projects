/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.dao.InterfaceDefHistoryMapper
 *  com.seer.rds.model.wind.InterfaceDefHistory
 *  org.springframework.data.jpa.repository.JpaRepository
 *  org.springframework.data.jpa.repository.JpaSpecificationExecutor
 *  org.springframework.data.jpa.repository.Query
 */
package com.seer.rds.dao;

import com.seer.rds.model.wind.InterfaceDefHistory;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;

public interface InterfaceDefHistoryMapper
extends JpaRepository<InterfaceDefHistory, String>,
JpaSpecificationExecutor<InterfaceDefHistory> {
    @Query(value="select w from InterfaceDefHistory w where w.id in :idLists")
    public List<InterfaceDefHistory> findOneTaskDefByIdList(List<String> var1);

    @Query(value="select w from InterfaceDefHistory w where w.url = :url and w.method = :method and w.version = :version")
    public InterfaceDefHistory findByLabelAndVersion(String var1, String var2, Integer var3);

    @Query(value="select max(w.version) from InterfaceDefHistory w where w.url = :url and w.method = :method")
    public Integer findMaxVersion(String var1, String var2);
}

