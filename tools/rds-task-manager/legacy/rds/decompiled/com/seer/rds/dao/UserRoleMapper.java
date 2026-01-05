/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.dao.UserRoleMapper
 *  com.seer.rds.model.admin.UserRole
 *  org.springframework.data.jpa.repository.JpaRepository
 *  org.springframework.data.repository.query.Param
 *  org.springframework.stereotype.Repository
 */
package com.seer.rds.dao;

import com.seer.rds.model.admin.UserRole;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface UserRoleMapper
extends JpaRepository<UserRole, String> {
    public List<UserRole> findByUidAndRid(@Param(value="uid") String var1, @Param(value="rid") String var2);

    public List<UserRole> findByUid(@Param(value="uid") String var1);

    public UserRole save(UserRole var1);
}

