/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.dao.SceneMapper
 *  com.seer.rds.model.replay.SceneRecord
 *  org.springframework.data.jpa.repository.JpaRepository
 *  org.springframework.data.jpa.repository.Modifying
 *  org.springframework.data.jpa.repository.Query
 *  org.springframework.stereotype.Repository
 *  org.springframework.transaction.annotation.Transactional
 */
package com.seer.rds.dao;

import com.seer.rds.model.replay.SceneRecord;
import java.util.Date;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

@Repository
public interface SceneMapper
extends JpaRepository<SceneRecord, Long> {
    @Query(value="select s.sceneMd5 from SceneRecord s order by s.id desc")
    public List<String> findMd5OrderByIdDesc();

    @Transactional
    @Modifying
    @Query(value="delete from SceneRecord record where record.createTime < :time")
    public int deleteByCreateTime(Date var1);
}

