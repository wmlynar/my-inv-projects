/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.dao.InterfaceTaskCategoryMapper
 *  com.seer.rds.model.wind.InterfaceTaskCategory
 *  org.springframework.data.jpa.repository.JpaRepository
 *  org.springframework.data.jpa.repository.JpaSpecificationExecutor
 *  org.springframework.data.jpa.repository.Modifying
 *  org.springframework.data.jpa.repository.Query
 *  org.springframework.stereotype.Repository
 *  org.springframework.transaction.annotation.Transactional
 */
package com.seer.rds.dao;

import com.seer.rds.model.wind.InterfaceTaskCategory;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

@Repository
public interface InterfaceTaskCategoryMapper
extends JpaRepository<InterfaceTaskCategory, String>,
JpaSpecificationExecutor<InterfaceTaskCategory> {
    @Query(value="select w from InterfaceTaskCategory w where w.isDel = 0 order by w.label")
    public List<InterfaceTaskCategory> findAllByIsDel(Integer var1);

    @Transactional
    @Modifying
    @Query(value="update InterfaceTaskCategory set isDel = 1 where id = :id")
    public Integer updateWindTaskCategoryIsDelById(Long var1);

    @Transactional
    @Modifying
    @Query(value="update InterfaceTaskCategory set isDel = 1 where id in (:ids)")
    public Integer updateInterfaceTaskCategoryIsDelByIds(List<Long> var1);

    @Query(value="select w from InterfaceTaskCategory w where w.isDel = 0 and w.label= :label ")
    public List<InterfaceTaskCategory> findInterfaceTaskCategorysByLabelAndIsDelEquels0(String var1);

    @Transactional
    @Modifying
    @Query(value="update InterfaceTaskCategory set isDel = 1 where id = :id")
    public Integer updateInterfaceTaskCategoryChangeRoot();

    @Query(value="select w from InterfaceTaskCategory w where  w.isDel=0 and w.id= :id  ")
    public InterfaceTaskCategory findInterfaceCategorysById(Long var1);

    @Query(value="select w from InterfaceTaskCategory w where  w.isDel=0 and w.parentId= :parentId  ")
    public List<InterfaceTaskCategory> findInterfaceCategorysByParentIdAndiAndIsDelEquals0(Long var1);

    @Transactional
    @Modifying
    @Query(value="update InterfaceTaskCategory set label = :label where id = :id")
    public Integer updateInterfaceTaskCategoryLabelById(String var1, Long var2);

    @Query(value="select w.id from InterfaceTaskCategory w where  w.parentIds like :ids  ")
    public List<Long> findInterfaceCategorysIdByIds(String var1);
}

