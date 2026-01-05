/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.dao.WindBlockChildMapper
 *  com.seer.rds.model.wind.WindBlockChildid
 *  org.springframework.data.jpa.repository.JpaRepository
 *  org.springframework.stereotype.Repository
 */
package com.seer.rds.dao;

import com.seer.rds.model.wind.WindBlockChildid;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface WindBlockChildMapper
extends JpaRepository<WindBlockChildid, String> {
}

