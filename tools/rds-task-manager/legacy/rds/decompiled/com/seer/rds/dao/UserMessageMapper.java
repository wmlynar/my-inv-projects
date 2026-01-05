/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.dao.UserMessageMapper
 *  com.seer.rds.model.admin.UserMessage
 *  org.springframework.data.domain.Pageable
 *  org.springframework.data.jpa.domain.Specification
 *  org.springframework.data.jpa.repository.JpaRepository
 *  org.springframework.data.jpa.repository.JpaSpecificationExecutor
 *  org.springframework.data.jpa.repository.Modifying
 *  org.springframework.data.jpa.repository.Query
 *  org.springframework.stereotype.Repository
 *  org.springframework.transaction.annotation.Transactional
 */
package com.seer.rds.dao;

import com.seer.rds.model.admin.UserMessage;
import java.util.List;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

@Repository
public interface UserMessageMapper
extends JpaRepository<UserMessage, String>,
JpaSpecificationExecutor<UserMessage> {
    @Query(value="select message from UserMessage message where message.ifRead = :IfRead and message.isDel =1 order by message.createTime desc")
    public List<UserMessage> findByIfRead(Integer var1);

    public List<UserMessage> findAll(Specification<UserMessage> var1);

    @Query(value="select message from UserMessage message where message.level = :level and message.ifRead = 1 and message.isDel =1 order by message.createTime desc")
    public List<UserMessage> findByLevel(Integer var1, Pageable var2);

    @Query(value="select message from UserMessage message where (message.level = :level1 or message.level = :level2) and message.ifRead = 1 and message.isDel =1 order by message.createTime desc")
    public List<UserMessage> findByLevel(Integer var1, Integer var2, Pageable var3);

    @Query(value="select message from UserMessage message where message.level = :level1 or message.level = :level2 or message.level = :level3 and message.ifRead = 1 and message.isDel =1 order by message.createTime desc")
    public List<UserMessage> findByLevel(Integer var1, String var2, Integer var3);

    @Transactional
    @Modifying
    @Query(value="update UserMessage set ifRead = :IfRead where id = :messageId")
    public void updateReadById(String var1, Integer var2);

    @Transactional
    @Modifying
    @Query(value="update UserMessage set ifRead = 2 where 1 = 1")
    public void updateAllRead();

    @Transactional
    @Modifying
    @Query(value="update UserMessage set isDel = 2 where id = :messageId")
    public void deleteById(String var1);
}

