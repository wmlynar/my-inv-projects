/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.dao.WindDemandAttrDataMapper
 *  com.seer.rds.model.wind.WindDemandAttrData
 *  org.springframework.data.jpa.repository.JpaRepository
 *  org.springframework.stereotype.Repository
 */
package com.seer.rds.dao;

import com.seer.rds.model.wind.WindDemandAttrData;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface WindDemandAttrDataMapper
extends JpaRepository<WindDemandAttrData, Long> {
    public void deleteByAttributeId(Long var1);
}

