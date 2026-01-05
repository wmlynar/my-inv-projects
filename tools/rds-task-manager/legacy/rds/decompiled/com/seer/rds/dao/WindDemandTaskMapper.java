/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.dao.WindDemandTaskMapper
 *  com.seer.rds.model.wind.WindDemandTask
 *  org.springframework.data.domain.Sort
 *  org.springframework.data.jpa.repository.JpaRepository
 *  org.springframework.data.jpa.repository.JpaSpecificationExecutor
 *  org.springframework.data.jpa.repository.Modifying
 *  org.springframework.data.jpa.repository.Query
 *  org.springframework.stereotype.Repository
 *  org.springframework.transaction.annotation.Transactional
 */
package com.seer.rds.dao;

import com.seer.rds.model.wind.WindDemandTask;
import java.util.Date;
import java.util.List;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

@Repository
public interface WindDemandTaskMapper
extends JpaRepository<WindDemandTask, String>,
JpaSpecificationExecutor<WindDemandTask> {
    @Query(value="select task from WindDemandTask task where task.status = 1")
    public List<WindDemandTask> findDemandList();

    @Query(value="select task from WindDemandTask task where (task.status = 1 or (task.status = 2 and task.handler = :handler)) and task.defLabel = :defLabel order by task.createdOn")
    public List<WindDemandTask> findDemandListByDefLabel(String var1, String var2);

    @Query(value="select task from WindDemandTask task where (task.status = 1 or (task.status = 2 and task.handler = :handler)) and task.defLabel = :defLabel")
    public List<WindDemandTask> findDemandListByDefLabelOrderBy(String var1, String var2, Sort var3);

    @Query(value="select task from WindDemandTask task where task.status = 2 and task.handler = :handler")
    public List<WindDemandTask> findDemandListByHandler(String var1);

    @Transactional
    @Modifying
    @Query(value="update WindDemandTask set status = :status, jobNumber = :jobNumber, handler = :userName where id = :demandId and status = 1")
    public int updateDemandHandlerAndStatus(String var1, String var2, String var3, int var4);

    @Query(value="select task from WindDemandTask task where task.id = :demandId")
    public WindDemandTask findDemandTaskById(String var1);

    @Transactional
    @Modifying
    @Query(value="update WindDemandTask set status = :status where id = :demandId")
    public int updateStatusById(String var1, Integer var2);

    @Transactional
    @Modifying
    @Query(value="update WindDemandTask set status = 1, handler = '' where id = :demandId")
    public int clearDispathcStatus(String var1);

    @Transactional
    @Modifying
    @Query(value="update WindDemandTask set supplementContent = :supplementContent, status = 3, handlerOn = :date where id = :demandId and status < 3")
    public void updateSupplementContentById(String var1, String var2, Date var3);

    @Transactional
    @Modifying
    @Query(value="update WindDemandTask set status = :status, handler = :handler where id = :demandId")
    public int updateDemandStatusById(String var1, Integer var2, String var3);

    @Transactional
    @Modifying
    @Query(value="update WindDemandTask set status = 3, supplementContent = :supplementContent, handlerOn = :date, handler = :handler where id = :demandId and status < 3")
    public int updateDemandFinishedById(String var1, String var2, String var3, Date var4);

    @Transactional
    @Modifying
    @Query(value="update WindDemandTask set status = 3, supplementContent = :supplementContent, handler = :handler where createdBy = :createBy and status < 3")
    public int updateDemandFinishedByCreateBy(String var1, String var2, String var3);
}

