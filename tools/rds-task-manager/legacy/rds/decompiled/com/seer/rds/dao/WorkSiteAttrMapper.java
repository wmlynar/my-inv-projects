/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.dao.WorkSiteAttrMapper
 *  com.seer.rds.model.worksite.WorkSiteAttr
 *  org.springframework.data.jpa.repository.JpaRepository
 *  org.springframework.data.jpa.repository.Query
 *  org.springframework.stereotype.Repository
 */
package com.seer.rds.dao;

import com.seer.rds.model.worksite.WorkSiteAttr;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

@Repository
public interface WorkSiteAttrMapper
extends JpaRepository<WorkSiteAttr, String> {
    @Query(value="select w from WorkSiteAttr w where w.isDel = 0")
    public List<WorkSiteAttr> findAllExtFields();

    @Query(value="select w.id from WorkSiteAttr w where w.attributeName = :name and w.isDel = 0")
    public String findIdByName(String var1);

    public void deleteByAttributeName(String var1);
}

