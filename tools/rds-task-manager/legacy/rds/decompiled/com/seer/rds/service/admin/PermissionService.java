/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.dao.PermissionMapper
 *  com.seer.rds.model.admin.Permission
 *  com.seer.rds.service.admin.PermissionService
 *  org.springframework.beans.factory.annotation.Autowired
 *  org.springframework.stereotype.Service
 */
package com.seer.rds.service.admin;

import com.seer.rds.dao.PermissionMapper;
import com.seer.rds.model.admin.Permission;
import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class PermissionService {
    @Autowired
    private PermissionMapper permissionMapper;

    public List<Permission> findAll() {
        return this.permissionMapper.findAll();
    }
}

