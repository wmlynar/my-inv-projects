/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.dao.WindDataCacheMapper
 *  com.seer.rds.model.wind.WindDataCache
 *  org.springframework.data.jpa.repository.JpaRepository
 *  org.springframework.stereotype.Repository
 */
package com.seer.rds.dao;

import com.seer.rds.model.wind.WindDataCache;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface WindDataCacheMapper
extends JpaRepository<WindDataCache, String> {
}

