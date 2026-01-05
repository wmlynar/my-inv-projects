/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.dao.WorkSiteAttrDataMapper
 *  com.seer.rds.model.worksite.WorkSiteAttrData
 *  org.springframework.data.jpa.repository.JpaRepository
 *  org.springframework.data.jpa.repository.Modifying
 *  org.springframework.data.jpa.repository.Query
 *  org.springframework.stereotype.Repository
 */
package com.seer.rds.dao;

import com.seer.rds.model.worksite.WorkSiteAttrData;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

@Repository
public interface WorkSiteAttrDataMapper
extends JpaRepository<WorkSiteAttrData, String> {
    @Query(value="select w from WorkSiteAttrData w where w.attributeId = :attributeId and w.siteId = :siteId")
    public List<WorkSiteAttrData> findByAttributeIdAndSiteId(String var1, String var2);

    @Query(value="select d.attributeValue from WorkSiteAttr a left join WorkSiteAttrData d on a.id = d.attributeId where a.attributeName = :attributeName and d.siteId = :siteId")
    public List<String> findValueByNameAndSiteId(String var1, String var2);

    public void deleteBySiteId(String var1);

    @Modifying
    @Query(value="delete from WorkSiteAttrData where siteId in :siteIds")
    public void deleteBySiteIds(List<String> var1);

    public void deleteByAttributeId(String var1);
}

