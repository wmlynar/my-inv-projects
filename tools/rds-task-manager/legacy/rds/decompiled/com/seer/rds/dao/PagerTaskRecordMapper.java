/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.dao.PagerTaskRecordMapper
 *  com.seer.rds.model.device.PagerTaskRecord
 *  org.springframework.data.jpa.repository.JpaRepository
 *  org.springframework.data.jpa.repository.JpaSpecificationExecutor
 *  org.springframework.stereotype.Repository
 */
package com.seer.rds.dao;

import com.seer.rds.model.device.PagerTaskRecord;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

@Repository
public interface PagerTaskRecordMapper
extends JpaRepository<PagerTaskRecord, Long>,
JpaSpecificationExecutor<PagerTaskRecord> {
    public List<PagerTaskRecord> findByPagerInfoAndIsDel(String var1, Boolean var2);

    public List<PagerTaskRecord> findByTaskRecordId(String var1);
}

