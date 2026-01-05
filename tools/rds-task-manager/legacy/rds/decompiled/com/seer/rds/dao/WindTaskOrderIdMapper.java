/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.dao.WindTaskOrderIdMapper
 *  com.seer.rds.model.wind.WindTaskOrderId
 *  org.springframework.data.jpa.repository.JpaRepository
 *  org.springframework.stereotype.Repository
 */
package com.seer.rds.dao;

import com.seer.rds.model.wind.WindTaskOrderId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface WindTaskOrderIdMapper
extends JpaRepository<WindTaskOrderId, String> {
    public WindTaskOrderId findByTaskIdAndTaskRecordIdAndBlockId(String var1, String var2, Integer var3);
}

