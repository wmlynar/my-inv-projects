/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.dao.UserMapper
 *  com.seer.rds.model.admin.User
 *  org.springframework.data.jpa.domain.Specification
 *  org.springframework.data.jpa.repository.JpaRepository
 *  org.springframework.data.jpa.repository.JpaSpecificationExecutor
 *  org.springframework.data.jpa.repository.Modifying
 *  org.springframework.data.jpa.repository.Query
 *  org.springframework.stereotype.Repository
 *  org.springframework.transaction.annotation.Transactional
 */
package com.seer.rds.dao;

import com.seer.rds.model.admin.User;
import java.util.List;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

@Repository
public interface UserMapper
extends JpaRepository<User, String>,
JpaSpecificationExecutor<User> {
    public List<User> findByUsername(String var1);

    public List<User> findAll();

    public List<User> findAll(Specification<User> var1);

    @Transactional
    @Modifying
    @Query(value="update User set status = 2 where username in (:usernames)")
    public void deleteUsersByUsername(List<String> var1);

    public List<User> findByUsernameAndStatus(String var1, int var2);
}

