/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.dao.GeneralBusinessMapper
 *  com.seer.rds.model.general.GeneralBusiness
 *  org.springframework.data.jpa.repository.JpaRepository
 *  org.springframework.data.jpa.repository.JpaSpecificationExecutor
 *  org.springframework.data.jpa.repository.Modifying
 *  org.springframework.data.jpa.repository.Query
 *  org.springframework.stereotype.Repository
 *  org.springframework.transaction.annotation.Transactional
 */
package com.seer.rds.dao;

import com.seer.rds.model.general.GeneralBusiness;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

@Repository
public interface GeneralBusinessMapper
extends JpaRepository<GeneralBusiness, String>,
JpaSpecificationExecutor<GeneralBusiness> {
    public List<GeneralBusiness> findByTypeOrderByModifyOnDesc(Integer var1);

    public List<GeneralBusiness> findByTypeAndNetAndEnable(Integer var1, String var2, Integer var3);

    @Transactional
    @Modifying
    @Query(value="update GeneralBusiness g set g.enable = :status where g.id = :id")
    public Integer setEnableGeneral(String var1, Integer var2);

    public List<GeneralBusiness> findAllById(String var1);

    public List<GeneralBusiness> findAllByLabel(String var1);

    public List<GeneralBusiness> findAllByGeneralLabel(String var1);

    public List<GeneralBusiness> findAllByIdIn(List<String> var1);
}

