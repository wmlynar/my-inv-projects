/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.config.PropConfig
 *  com.seer.rds.constant.UserTypeEnum
 *  com.seer.rds.model.admin.Role
 *  com.seer.rds.model.admin.User
 *  com.seer.rds.service.admin.UserService
 *  com.seer.rds.service.system.DataPermissionManager
 *  org.apache.commons.collections.CollectionUtils
 *  org.apache.shiro.SecurityUtils
 *  org.apache.shiro.subject.Subject
 *  org.slf4j.Logger
 *  org.slf4j.LoggerFactory
 *  org.springframework.beans.factory.annotation.Autowired
 *  org.springframework.stereotype.Service
 *  org.springframework.util.CollectionUtils
 */
package com.seer.rds.service.system;

import com.seer.rds.config.PropConfig;
import com.seer.rds.constant.UserTypeEnum;
import com.seer.rds.model.admin.Role;
import com.seer.rds.model.admin.User;
import com.seer.rds.service.admin.UserService;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import org.apache.shiro.SecurityUtils;
import org.apache.shiro.subject.Subject;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.util.CollectionUtils;

@Service
public class DataPermissionManager {
    private static final Logger log = LoggerFactory.getLogger(DataPermissionManager.class);
    @Autowired
    private UserService userService;

    public List<String> getAuthorizedGetGroups() {
        boolean ifEnableShiro = PropConfig.ifEnableShiro();
        if (!ifEnableShiro) {
            return Collections.emptyList();
        }
        Subject subject = SecurityUtils.getSubject();
        if (subject.isAuthenticated()) {
            List permissions = this.getPermissions();
            if (permissions.isEmpty()) {
                return Collections.emptyList();
            }
            return this.extractGroupsFromPermissions(permissions);
        }
        return Collections.emptyList();
    }

    public Boolean ifShowAllAgv() {
        try {
            Subject subject = SecurityUtils.getSubject();
            if (subject.getPrincipal() == null) {
                return true;
            }
            String username = ((User)subject.getPrincipal()).getUsername();
            List roles = null;
            User byUsernameAvailable = this.userService.findByUsernameAvailable(username);
            if (UserTypeEnum.admin.getStatus() == byUsernameAvailable.getType().intValue()) {
                return true;
            }
            roles = this.userService.findRoleByUserName(username);
            if (!org.apache.commons.collections.CollectionUtils.isEmpty((Collection)roles)) {
                return false;
            }
            return true;
        }
        catch (Exception e) {
            log.info(e.getMessage());
            return false;
        }
    }

    public List<String> getAuthorizedGetTasks() {
        boolean ifEnableShiro = PropConfig.ifEnableShiro();
        if (!ifEnableShiro) {
            return Collections.emptyList();
        }
        Subject subject = SecurityUtils.getSubject();
        if (subject.isAuthenticated()) {
            List permissions = this.getPermissions();
            if (permissions.isEmpty()) {
                return Collections.emptyList();
            }
            return this.extractTasksFromPermissions(permissions);
        }
        return Collections.emptyList();
    }

    public List<String> getPermissions() {
        Subject subject = SecurityUtils.getSubject();
        String username = ((User)subject.getPrincipal()).getUsername();
        ArrayList permList = new ArrayList();
        List roles = null;
        User byUsernameAvailable = this.userService.findByUsernameAvailable(username);
        if (UserTypeEnum.admin.getStatus() == byUsernameAvailable.getType().intValue()) {
            permList.addAll(this.userService.getAllPermName());
            return Collections.emptyList();
        }
        roles = this.userService.findRoleByUserName(username);
        if (CollectionUtils.isEmpty((Collection)roles)) {
            return Collections.emptyList();
        }
        permList.addAll(roles.stream().map(Role::getPermissions).collect(Collectors.toList()));
        String permListStr = String.join((CharSequence)",", permList);
        return List.of(permListStr.split(","));
    }

    public List<String> extractGroupsFromPermissions(List<String> permissions) {
        return Stream.concat(permissions.stream().map(arg_0 -> this.extractGroupFromPermission(arg_0)).filter(group -> group != null), Stream.of("11", null)).collect(Collectors.toList());
    }

    public List<String> extractTasksFromPermissions(List<String> permissions) {
        return Stream.concat(permissions.stream().map(arg_0 -> this.extractTaskFromPermission(arg_0)).filter(task -> task != null), Stream.of("", null)).collect(Collectors.toList());
    }

    public String extractGroupFromPermission(String permission) {
        String[] parts = permission.split(":");
        if (parts.length >= 3 && "group".equals(parts[1])) {
            return parts[2];
        }
        return null;
    }

    public String extractTaskFromPermission(String permission) {
        String[] parts = permission.split(":");
        if (parts.length >= 3 && "task".equals(parts[1])) {
            return parts[2];
        }
        return null;
    }

    public Boolean checkIfHavePermission(String name) {
        Subject subject = SecurityUtils.getSubject();
        return subject.isPermitted(name);
    }
}

