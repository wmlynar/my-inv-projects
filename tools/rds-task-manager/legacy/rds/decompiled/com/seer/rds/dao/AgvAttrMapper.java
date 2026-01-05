/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.dao.AgvAttrMapper
 *  com.seer.rds.model.device.AgvAttr
 *  org.springframework.data.jpa.repository.JpaRepository
 *  org.springframework.data.jpa.repository.JpaSpecificationExecutor
 *  org.springframework.stereotype.Repository
 */
package com.seer.rds.dao;

import com.seer.rds.model.device.AgvAttr;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

@Repository
public interface AgvAttrMapper
extends JpaRepository<AgvAttr, String>,
JpaSpecificationExecutor<AgvAttr> {
    public void deleteAgvAttrByAgvName(String var1);
}

