/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.dao.WindDemandAttrMapper
 *  com.seer.rds.model.wind.WindDemandAttr
 *  org.springframework.data.jpa.repository.JpaRepository
 *  org.springframework.data.jpa.repository.Query
 *  org.springframework.stereotype.Repository
 */
package com.seer.rds.dao;

import com.seer.rds.model.wind.WindDemandAttr;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

@Repository
public interface WindDemandAttrMapper
extends JpaRepository<WindDemandAttr, Long> {
    @Query(value="select w.id from WindDemandAttr w where w.attributeName = :name")
    public Long findIdByName(String var1);

    @Query(value="select new WindDemandAttr(w.id, w.attributeName) from WindDemandAttr w where w.attributeName in :names")
    public List<WindDemandAttr> findByNameIn(List<String> var1);

    public List<WindDemandAttr> findAllByDefLabel(String var1);

    public void deleteByAttributeName(String var1);
}

