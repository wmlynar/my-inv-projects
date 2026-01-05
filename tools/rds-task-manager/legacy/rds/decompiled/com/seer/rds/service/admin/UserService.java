/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.model.admin.Role
 *  com.seer.rds.model.admin.User
 *  com.seer.rds.service.admin.UserService
 *  com.seer.rds.vo.UserReqVo
 *  com.seer.rds.vo.req.PaginationReq
 *  com.seer.rds.vo.response.PaginationResponseVo
 */
package com.seer.rds.service.admin;

import com.seer.rds.model.admin.Role;
import com.seer.rds.model.admin.User;
import com.seer.rds.vo.UserReqVo;
import com.seer.rds.vo.req.PaginationReq;
import com.seer.rds.vo.response.PaginationResponseVo;
import java.util.List;

public interface UserService {
    public User findByUsername(String var1);

    public User findByUsernameAvailable(String var1);

    public List<User> findAll();

    public void save(User var1);

    public void saveUserAndRoles(UserReqVo var1);

    public User findById(String var1);

    public void UpdateUser(UserReqVo var1);

    public void deleteByUsernames(List<String> var1);

    public PaginationResponseVo findAllUser(PaginationReq<User> var1);

    public List<Role> findUserPermissionsByUuid(String var1);

    public List<String> getAllPermName();

    public List<Role> findRoleByUserName(String var1);
}

