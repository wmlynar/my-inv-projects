/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.dao.WindTaskCategoryMapper
 *  com.seer.rds.model.wind.WindTaskCategory
 *  org.springframework.data.jpa.repository.JpaRepository
 *  org.springframework.data.jpa.repository.JpaSpecificationExecutor
 *  org.springframework.data.jpa.repository.Modifying
 *  org.springframework.data.jpa.repository.Query
 *  org.springframework.stereotype.Repository
 *  org.springframework.transaction.annotation.Transactional
 */
package com.seer.rds.dao;

import com.seer.rds.model.wind.WindTaskCategory;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

@Repository
public interface WindTaskCategoryMapper
extends JpaRepository<WindTaskCategory, String>,
JpaSpecificationExecutor<WindTaskCategory> {
    @Query(value="select w from WindTaskCategory w where w.isDel = 0 order by w.label")
    public List<WindTaskCategory> findAllByIsDel(Integer var1);

    @Transactional
    @Modifying
    @Query(value="update WindTaskCategory set isDel = 1 where id = :id")
    public Integer updateWindTaskCategoryIsDelById(Long var1);

    @Transactional
    @Modifying
    @Query(value="update WindTaskCategory set isDel = 1 where id in (:ids)")
    public Integer updateWindTaskCategoryIsDelByIds(List<Long> var1);

    @Query(value="select w from WindTaskCategory w where w.isDel = 0 and w.label= :label ")
    public List<WindTaskCategory> findWindTaskCategorysByLabelAndIsDelEquels0(String var1);

    @Transactional
    @Modifying
    @Query(value="update WindTaskCategory set isDel = 1 where id = :id")
    public Integer updateWindTaskCategoryChangeRoot();

    @Query(value="select w from WindTaskCategory w where  w.isDel=0 and w.id= :id  ")
    public WindTaskCategory findWindCategorysById(Long var1);

    @Query(value="select w from WindTaskCategory w where  w.isDel=0 and w.parentId= :parentId  ")
    public List<WindTaskCategory> findWindCategorysByParentIdAndiAndIsDelEquals0(Long var1);

    @Transactional
    @Modifying
    @Query(value="update WindTaskCategory set label = :label where id = :id")
    public Integer updateWindTaskCategoryLabelById(String var1, Long var2);

    @Query(value="select w.id from WindTaskCategory w where  w.parentIds like :ids  ")
    public List<Long> findWindCategorysIdByIds(String var1);
}

