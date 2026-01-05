/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.config.PropConfig
 *  com.seer.rds.dao.RoleMapper
 *  com.seer.rds.model.admin.Role
 *  com.seer.rds.service.admin.RoleService
 *  com.seer.rds.service.admin.impl.RoleServiceImpl
 *  com.seer.rds.vo.response.PaginationResponseVo
 *  javax.transaction.Transactional
 *  org.apache.commons.lang3.StringUtils
 *  org.springframework.beans.factory.annotation.Autowired
 *  org.springframework.data.domain.Page
 *  org.springframework.data.domain.PageRequest
 *  org.springframework.data.domain.Pageable
 *  org.springframework.data.jpa.domain.Specification
 *  org.springframework.stereotype.Service
 */
package com.seer.rds.service.admin.impl;

import com.seer.rds.config.PropConfig;
import com.seer.rds.dao.RoleMapper;
import com.seer.rds.model.admin.Role;
import com.seer.rds.service.admin.RoleService;
import com.seer.rds.vo.response.PaginationResponseVo;
import java.util.ArrayList;
import java.util.List;
import javax.transaction.Transactional;
import org.apache.commons.lang3.StringUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;

@Service
public class RoleServiceImpl
implements RoleService {
    @Autowired
    private RoleMapper roleMapper;

    public List<Role> findAll() {
        return this.roleMapper.findAll();
    }

    public void save(Role role) {
        this.roleMapper.save((Object)role);
    }

    @Transactional
    public void UpdateRole(Role req) {
        Role role = new Role();
        role.setId(req.getId());
        role.setCode(req.getCode());
        role.setStatus(req.getStatus());
        role.setWorkStations(req.getWorkStations());
        role.setCreateTime(req.getCreateTime());
        role.setWorkTypes(req.getWorkTypes());
        role.setName(req.getName());
        role.setModifyTime(req.getModifyTime());
        role.setPermissions(req.getPermissions());
        this.roleMapper.save((Object)role);
    }

    public PaginationResponseVo findAllRole(int page, int size) {
        PageRequest pageable = PageRequest.of((int)(page - 1), (int)size);
        Page sites = this.roleMapper.findAll((Specification)new /* Unavailable Anonymous Inner Class!! */, (Pageable)pageable);
        PaginationResponseVo paginationResponseVo = new PaginationResponseVo();
        paginationResponseVo.setTotalCount(Long.valueOf(sites.getTotalElements()));
        paginationResponseVo.setCurrentPage(Integer.valueOf(page));
        paginationResponseVo.setPageSize(Integer.valueOf(size));
        paginationResponseVo.setTotalPage(Integer.valueOf(sites.getTotalPages()));
        ArrayList<Role> roleList = new ArrayList<Role>();
        boolean ifEnableShiro = PropConfig.ifEnableShiro();
        for (int i = 0; i < sites.getContent().size(); ++i) {
            Role role = new Role();
            role.setCreateTime(((Role)sites.getContent().get(i)).getCreateTime());
            role.setCode(((Role)sites.getContent().get(i)).getCode());
            role.setStatus(((Role)sites.getContent().get(i)).getStatus());
            role.setWorkTypes(((Role)sites.getContent().get(i)).getWorkTypes());
            role.setWorkStations(((Role)sites.getContent().get(i)).getWorkStations());
            role.setId(((Role)sites.getContent().get(i)).getId());
            role.setModifyTime(((Role)sites.getContent().get(i)).getModifyTime());
            role.setName(((Role)sites.getContent().get(i)).getName());
            if (!ifEnableShiro) {
                String permissions = ((Role)sites.getContent().get(i)).getPermissions();
                if (StringUtils.isNotEmpty((CharSequence)permissions)) {
                    String[] permissionArray = permissions.split(",");
                    StringBuilder filteredPermissions = new StringBuilder();
                    for (String permission : permissionArray) {
                        if (permission.contains(":")) continue;
                        filteredPermissions.append(permission).append(",");
                    }
                    if (filteredPermissions.length() > 0) {
                        filteredPermissions.setLength(filteredPermissions.length() - 1);
                    }
                    role.setPermissions(filteredPermissions.toString());
                } else {
                    role.setPermissions(((Role)sites.getContent().get(i)).getPermissions());
                }
            } else {
                role.setPermissions(((Role)sites.getContent().get(i)).getPermissions());
            }
            roleList.add(role);
        }
        paginationResponseVo.setPageList(roleList);
        return paginationResponseVo;
    }

    @Transactional
    public void deleteByRoleId(String siteId) {
        this.roleMapper.deleteByRoleId(siteId);
    }
}

