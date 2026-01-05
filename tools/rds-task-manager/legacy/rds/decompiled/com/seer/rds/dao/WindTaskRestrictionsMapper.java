/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.dao.WindTaskRestrictionsMapper
 *  com.seer.rds.model.wind.WindTaskRestrictions
 *  org.springframework.data.jpa.repository.JpaRepository
 *  org.springframework.stereotype.Repository
 */
package com.seer.rds.dao;

import com.seer.rds.model.wind.WindTaskRestrictions;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface WindTaskRestrictionsMapper
extends JpaRepository<WindTaskRestrictions, String> {
}

