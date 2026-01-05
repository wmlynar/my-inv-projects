/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.dao.ChangeAgvProgressMapper
 *  com.seer.rds.model.wind.ChangeAgvProgress
 *  org.springframework.data.domain.Page
 *  org.springframework.data.domain.Pageable
 *  org.springframework.data.jpa.domain.Specification
 *  org.springframework.data.jpa.repository.JpaRepository
 *  org.springframework.stereotype.Repository
 */
package com.seer.rds.dao;

import com.seer.rds.model.wind.ChangeAgvProgress;
import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ChangeAgvProgressMapper
extends JpaRepository<ChangeAgvProgress, String> {
    public Page<ChangeAgvProgress> findAll(Specification<ChangeAgvProgress> var1, Pageable var2);

    public List<ChangeAgvProgress> findByStatusIn(List<Integer> var1);
}

