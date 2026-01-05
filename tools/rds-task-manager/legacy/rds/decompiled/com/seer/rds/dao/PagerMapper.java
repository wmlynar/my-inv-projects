/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.dao.PagerMapper
 *  com.seer.rds.model.device.Pager
 *  org.springframework.data.jpa.repository.JpaRepository
 *  org.springframework.data.jpa.repository.JpaSpecificationExecutor
 *  org.springframework.data.jpa.repository.Modifying
 *  org.springframework.data.jpa.repository.Query
 *  org.springframework.stereotype.Repository
 *  org.springframework.transaction.annotation.Transactional
 */
package com.seer.rds.dao;

import com.seer.rds.model.device.Pager;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

@Repository
public interface PagerMapper
extends JpaRepository<Pager, Long>,
JpaSpecificationExecutor<Pager> {
    @Query(value="select id from Pager where disabled = false")
    public List<Long> findUnDisabledIdFromPager();

    @Query(value="select id from Pager where ip = :ip ")
    public List<Long> findIdByIp(String var1);

    @Transactional
    @Modifying
    @Query(value="update Pager set disabled = :disabled where id in (:ids)")
    public int updateDisabledByIds(Boolean var1, List<Long> var2);
}

