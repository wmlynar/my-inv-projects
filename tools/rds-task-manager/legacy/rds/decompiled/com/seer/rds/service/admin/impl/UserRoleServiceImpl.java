/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.dao.UserRoleMapper
 *  com.seer.rds.model.admin.UserRole
 *  com.seer.rds.service.admin.UserRoleService
 *  com.seer.rds.service.admin.impl.UserRoleServiceImpl
 *  javax.transaction.Transactional
 *  org.slf4j.Logger
 *  org.slf4j.LoggerFactory
 *  org.springframework.beans.factory.annotation.Autowired
 *  org.springframework.stereotype.Service
 */
package com.seer.rds.service.admin.impl;

import com.seer.rds.dao.UserRoleMapper;
import com.seer.rds.model.admin.UserRole;
import com.seer.rds.service.admin.UserRoleService;
import javax.transaction.Transactional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class UserRoleServiceImpl
implements UserRoleService {
    private static final Logger log = LoggerFactory.getLogger(UserRoleServiceImpl.class);
    private static Logger logger = LoggerFactory.getLogger((String)"UserRoleServiceImpl");
    @Autowired
    private UserRoleMapper mapper;

    @Transactional
    public void save(UserRole role) {
        try {
            this.mapper.save(role);
        }
        catch (Exception e) {
            logger.error("Role save Exception", (Throwable)e);
        }
    }
}

