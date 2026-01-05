/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.dao.RobotItemMapper
 *  com.seer.rds.model.stat.RobotItem
 *  org.springframework.data.jpa.repository.JpaRepository
 *  org.springframework.data.jpa.repository.Modifying
 *  org.springframework.data.jpa.repository.Query
 *  org.springframework.stereotype.Repository
 *  org.springframework.transaction.annotation.Transactional
 */
package com.seer.rds.dao;

import com.seer.rds.model.stat.RobotItem;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

@Repository
public interface RobotItemMapper
extends JpaRepository<RobotItem, String> {
    @Query(nativeQuery=true, value="select uuid from t_robotitem where del = 0 group by uuid order by uuid")
    public List<String> findUuidGroupByUuid();

    @Query(nativeQuery=true, value="select * from t_robotitem where del = 0 and uuid = :uuid")
    public RobotItem findByUuid(String var1);

    @Transactional
    @Modifying
    @Query(value="update RobotItem set del = 1 where uuid in :uuids")
    public int deleteByUuidIsIn(List<String> var1);
}

