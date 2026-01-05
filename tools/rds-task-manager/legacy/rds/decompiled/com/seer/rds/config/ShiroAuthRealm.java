/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.config.ShiroAuthRealm
 *  com.seer.rds.constant.UserTypeEnum
 *  com.seer.rds.dao.RoleMapper
 *  com.seer.rds.dao.UserRoleMapper
 *  com.seer.rds.model.admin.Role
 *  com.seer.rds.model.admin.User
 *  com.seer.rds.service.admin.UserService
 *  com.seer.rds.service.admin.impl.UserServiceImpl
 *  com.seer.rds.web.config.ConfigFileController
 *  org.apache.shiro.authc.AuthenticationException
 *  org.apache.shiro.authc.AuthenticationInfo
 *  org.apache.shiro.authc.AuthenticationToken
 *  org.apache.shiro.authc.SimpleAuthenticationInfo
 *  org.apache.shiro.authc.UsernamePasswordToken
 *  org.apache.shiro.authz.AuthorizationInfo
 *  org.apache.shiro.authz.SimpleAuthorizationInfo
 *  org.apache.shiro.realm.AuthorizingRealm
 *  org.apache.shiro.subject.PrincipalCollection
 *  org.springframework.beans.factory.annotation.Autowired
 *  org.springframework.util.CollectionUtils
 */
package com.seer.rds.config;

import com.seer.rds.constant.UserTypeEnum;
import com.seer.rds.dao.RoleMapper;
import com.seer.rds.dao.UserRoleMapper;
import com.seer.rds.model.admin.Role;
import com.seer.rds.model.admin.User;
import com.seer.rds.service.admin.UserService;
import com.seer.rds.service.admin.impl.UserServiceImpl;
import com.seer.rds.web.config.ConfigFileController;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collection;
import java.util.List;
import java.util.stream.Collectors;
import org.apache.shiro.authc.AuthenticationException;
import org.apache.shiro.authc.AuthenticationInfo;
import org.apache.shiro.authc.AuthenticationToken;
import org.apache.shiro.authc.SimpleAuthenticationInfo;
import org.apache.shiro.authc.UsernamePasswordToken;
import org.apache.shiro.authz.AuthorizationInfo;
import org.apache.shiro.authz.SimpleAuthorizationInfo;
import org.apache.shiro.realm.AuthorizingRealm;
import org.apache.shiro.subject.PrincipalCollection;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.util.CollectionUtils;

public class ShiroAuthRealm
extends AuthorizingRealm {
    @Autowired
    private UserService userService;
    @Autowired
    private RoleMapper roleMapper;
    @Autowired
    private UserRoleMapper userRoleMapper;

    protected AuthorizationInfo doGetAuthorizationInfo(PrincipalCollection principals) {
        User sessionUser = (User)principals.getPrimaryPrincipal();
        if (sessionUser == null) {
            return null;
        }
        List roles = null;
        ArrayList roleList = new ArrayList();
        ArrayList permList = new ArrayList();
        List webPageList = new ArrayList();
        if (ConfigFileController.commonConfig != null && ConfigFileController.commonConfig.getWebPageList() != null) {
            webPageList = ConfigFileController.commonConfig.getWebPageList();
        }
        User byUsernameAvailable = this.userService.findByUsernameAvailable(sessionUser.getUsername());
        if (UserTypeEnum.admin.getStatus() == byUsernameAvailable.getType().intValue()) {
            permList.addAll(this.userService.getAllPermName());
            if (!CollectionUtils.isEmpty(webPageList)) {
                permList.addAll(webPageList.stream().map(e -> e.getPageName()).collect(Collectors.toList()));
            }
        } else {
            roles = this.userService.findRoleByUserName(sessionUser.getUsername());
            if (CollectionUtils.isEmpty((Collection)roles)) {
                permList.addAll(this.userService.getAllPermName());
                if (!CollectionUtils.isEmpty(webPageList)) {
                    permList.addAll(webPageList.stream().map(e -> e.getPageName()).collect(Collectors.toList()));
                }
            }
        }
        SimpleAuthorizationInfo simpleAuthorizationInfo = new SimpleAuthorizationInfo();
        if (!CollectionUtils.isEmpty((Collection)roles)) {
            roleList.addAll(roles.stream().map(Role::getCode).collect(Collectors.toList()));
        }
        if (!CollectionUtils.isEmpty((Collection)roles)) {
            permList.addAll(roles.stream().map(Role::getPermissions).collect(Collectors.toList()));
        }
        String permListStr = String.join((CharSequence)",", permList);
        String[] arr = permListStr.split(",");
        UserServiceImpl.UserPermission.put(sessionUser.getUsername(), permListStr);
        simpleAuthorizationInfo.addStringPermissions(Arrays.asList(arr));
        simpleAuthorizationInfo.addRoles(roleList);
        return simpleAuthorizationInfo;
    }

    protected AuthenticationInfo doGetAuthenticationInfo(AuthenticationToken token) throws AuthenticationException {
        UsernamePasswordToken usernamePasswordToken = (UsernamePasswordToken)token;
        String username = usernamePasswordToken.getUsername();
        User user = this.userService.findByUsername(username);
        if (user == null) {
            return null;
        }
        return new SimpleAuthenticationInfo((Object)user, (Object)user.getPassword(), this.getClass().getName());
    }
}

