/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.dao.WorkSiteTagsMapper
 *  com.seer.rds.model.worksite.WorkSiteTags
 *  org.springframework.data.jpa.repository.JpaRepository
 *  org.springframework.stereotype.Repository
 */
package com.seer.rds.dao;

import com.seer.rds.model.worksite.WorkSiteTags;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface WorkSiteTagsMapper
extends JpaRepository<WorkSiteTags, String> {
}

