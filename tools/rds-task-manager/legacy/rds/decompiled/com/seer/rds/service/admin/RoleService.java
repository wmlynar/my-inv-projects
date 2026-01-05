/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.model.admin.Role
 *  com.seer.rds.service.admin.RoleService
 *  com.seer.rds.vo.response.PaginationResponseVo
 */
package com.seer.rds.service.admin;

import com.seer.rds.model.admin.Role;
import com.seer.rds.vo.response.PaginationResponseVo;
import java.util.List;

public interface RoleService {
    public List<Role> findAll();

    public void save(Role var1);

    public void UpdateRole(Role var1);

    public PaginationResponseVo findAllRole(int var1, int var2);

    public void deleteByRoleId(String var1);
}

