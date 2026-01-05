/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.dao.InterfaceHandleMapper
 *  com.seer.rds.model.wind.InterfacePreHandle
 *  org.springframework.data.jpa.repository.JpaRepository
 *  org.springframework.data.jpa.repository.JpaSpecificationExecutor
 *  org.springframework.data.jpa.repository.Modifying
 *  org.springframework.data.jpa.repository.Query
 *  org.springframework.data.repository.query.Param
 *  org.springframework.stereotype.Repository
 *  org.springframework.transaction.annotation.Transactional
 */
package com.seer.rds.dao;

import com.seer.rds.model.wind.InterfacePreHandle;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

@Repository
public interface InterfaceHandleMapper
extends JpaRepository<InterfacePreHandle, String>,
JpaSpecificationExecutor<InterfacePreHandle> {
    @Query(value="select w from InterfacePreHandle w where w.taskDefLabel = :taskDefLabel ")
    public List<InterfacePreHandle> findByTaskDefLabel(String var1);

    @Query(value="select w from InterfacePreHandle w where w.url = :url and w.method = :method ")
    public List<InterfacePreHandle> findByUrlAndMethod(@Param(value="url") String var1, @Param(value="method") String var2);

    @Query(value="select w from InterfacePreHandle w where w.url = :url ")
    public List<InterfacePreHandle> findByUrl(String var1);

    @Query(value="select w from InterfacePreHandle w where w.url = :url and w.method = :method and w.id = :id ")
    public List<InterfacePreHandle> findByUrlAndMethodAndId(String var1, String var2, String var3);

    @Query(value="select w from InterfacePreHandle w ")
    public List<InterfacePreHandle> findInterfaceTaskDefs();

    @Query(value="select w.url from InterfacePreHandle w where w.intertfaceCategoryId in :interfaceCategorysIdByIds ")
    public List<String> findLabelTaskDefByCategoryIds(List<Long> var1);

    @Transactional
    @Modifying
    @Query(value="delete from InterfacePreHandle   where intertfaceCategoryId in :interfaceCategorysIdByIds ")
    public void deleteInterfaceDefByInterfaceCategoryIds(List<Long> var1);

    @Query(value="select w from InterfacePreHandle w where  w.intertfaceCategoryId = 0 ")
    public List<InterfacePreHandle> findInterfaceTaskDefByInterfaceCategoryIdIs();

    @Transactional
    @Modifying
    @Query(value="update InterfacePreHandle set intertfaceCategoryId= :interfaceCategoryId where id= :id ")
    public void updateInterfaceCategoryId(Long var1, String var2);

    @Query(value="select w from InterfacePreHandle w  order by w.createDate DESC")
    public List<InterfacePreHandle> findAllAndIsNotHistory();

    @Query(value="select w from InterfacePreHandle w where w.id in :idLists")
    public List<InterfacePreHandle> findTaskDefList(List<String> var1);
}

