/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.dao.PermissionMapper
 *  com.seer.rds.model.admin.Permission
 *  org.springframework.data.jpa.repository.JpaRepository
 *  org.springframework.stereotype.Repository
 */
package com.seer.rds.dao;

import com.seer.rds.model.admin.Permission;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface PermissionMapper
extends JpaRepository<Permission, String> {
    public void deleteAll();
}

