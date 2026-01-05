/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.dao.RoleMapper
 *  com.seer.rds.model.admin.Role
 *  org.springframework.data.jpa.domain.Specification
 *  org.springframework.data.jpa.repository.JpaRepository
 *  org.springframework.data.jpa.repository.JpaSpecificationExecutor
 *  org.springframework.data.jpa.repository.Modifying
 *  org.springframework.data.jpa.repository.Query
 *  org.springframework.stereotype.Repository
 */
package com.seer.rds.dao;

import com.seer.rds.model.admin.Role;
import java.util.List;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

@Repository
public interface RoleMapper
extends JpaRepository<Role, String>,
JpaSpecificationExecutor<Role> {
    @Query(value="select new Role(r.id,r.name,r.permissions,r.workStations,r.workTypes) from Role r,User u, UserRole ur where u.id = ur.uid and r.id = ur.rid and u.id =:id")
    public List<Role> findByUid(String var1);

    public List<Role> findByCode(String var1);

    public List<Role> findAll();

    public List<Role> findAll(Specification<Role> var1);

    @Modifying
    @Query(value="delete from Role where id = :id")
    public void deleteByRoleId(String var1);

    @Query(value="select new Role(r.id,r.name,r.permissions,r.workStations,r.workTypes) from Role r , UserRole ur where r.id = ur.rid  and ur.uid =:uid")
    public List<Role> findUserPermissionsByUuid(String var1);
}

