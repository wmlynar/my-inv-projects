/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.dao.WindTaskDefMapper
 *  com.seer.rds.model.wind.WindTaskDef
 *  org.springframework.data.jpa.repository.JpaRepository
 *  org.springframework.data.jpa.repository.JpaSpecificationExecutor
 *  org.springframework.data.jpa.repository.Modifying
 *  org.springframework.data.jpa.repository.Query
 *  org.springframework.stereotype.Repository
 *  org.springframework.transaction.annotation.Transactional
 */
package com.seer.rds.dao;

import com.seer.rds.model.wind.WindTaskDef;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

@Repository
public interface WindTaskDefMapper
extends JpaRepository<WindTaskDef, String>,
JpaSpecificationExecutor<WindTaskDef> {
    public List<WindTaskDef> findAllByStatus(Integer var1);

    @Query(value="select w from WindTaskDef w where w.label = :label ")
    public WindTaskDef findAllByLabel(String var1);

    @Query(value="update WindTaskDef set status = :status")
    public Integer updateStatus(Integer var1);

    @Transactional
    @Modifying
    @Query(value="update WindTaskDef set ifEnable = :ifEnable where id = :id")
    public int updateTaskDefEnable(Integer var1, String var2);

    @Query(value="select w.label from WindTaskDef w")
    public List<String> findAllLabel();

    @Query(value="select w from WindTaskDef w where w.id = :Id ")
    public WindTaskDef findtaskDefById(String var1);

    @Query(value="select w from WindTaskDef w where w.periodicTask = 1 and w.ifEnable = 1 ")
    public List<WindTaskDef> findPeriodicTaskAndEnable();

    @Query(value="select w from WindTaskDef w where w.periodicTask = 1  ")
    public List<WindTaskDef> findPeriodicTask();

    @Query(value="select w from WindTaskDef w where w.templateName = 'userTemplate' or w.templateName is NULL ")
    public List<WindTaskDef> findAllTaskUserTemplate();

    public List<WindTaskDef> findByLabelLike(String var1);

    @Query(value="select w.id from WindTaskDef w where w.label like :label ")
    public List<String> findDefIdsByLabel(String var1);

    @Query(value="select w from WindTaskDef w where w.projectId = :taskDefId ")
    public List<WindTaskDef> findAllTaskDefByIds(String var1);

    @Transactional
    @Modifying
    @Query(value="update WindTaskDef set windcategoryId= :windcategoryId where id= :id ")
    public Integer updateWindcategoryId(Long var1, String var2);

    @Query(value="select w from WindTaskDef w where  w.windcategoryId = 0 and w.templateName='userTemplate' order by  w.label")
    public List<WindTaskDef> findWindTaskDefByWindcategoryIdIs0();

    @Query(value="select w from WindTaskDef w where  w.templateName='userTemplate'   order by  w.label")
    public List<WindTaskDef> findWindTaskDefsByTemplateNameOrderBy();

    @Query(value="select new WindTaskDef(w.id, w.label) from WindTaskDef w where w.templateName = 'userTemplate'  order by w.createDate desc")
    public List<WindTaskDef> findIdAndLabelFromUserTemplate();

    @Transactional
    @Modifying
    @Query(value="update WindTaskDef set  windcategoryId = 0 where windcategoryId in :windcategoryIds  ")
    public Integer retreyWindDefByWindcategoryId(List<Long> var1);

    @Transactional
    @Modifying
    @Query(value="delete from WindTaskDef   where windcategoryId in :windcategoryIds ")
    public Integer deleteWindDefByWindcategoryIds(List<Long> var1);

    @Transactional
    @Modifying
    public Integer deleteByIdIsIn(List<String> var1);

    @Query(value="select w.label from WindTaskDef w where w.windcategoryId in :windcategoryIds ")
    public List<String> findLabelTaskDefByCategoryIds(List<Long> var1);

    @Query(value="select w.id from WindTaskDef w where w.templateName = '' or w.templateName is NULL  ")
    public List<String> findTaskDefsByTemplateNameIsNull();

    @Query(value="select w from WindTaskDef w where w.label like :label ")
    public List<WindTaskDef> findWindTaskDefByLabelLike(String var1);

    @Transactional
    @Modifying
    public Integer deleteByLabelAndStatus(String var1, Integer var2);

    @Transactional
    @Modifying
    @Query(value="update WindTaskDef set ifEnable = :ifEnable where label = :label")
    public int updateTaskDefEnableByLabel(Integer var1, String var2);

    @Query(value="select w from WindTaskDef w where w.id in :idLists")
    public List<WindTaskDef> findOneTaskDefByIdList(List<String> var1);
}

