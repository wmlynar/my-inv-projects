/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.dao.LoginMapper
 *  com.seer.rds.model.admin.Login
 *  org.springframework.data.jpa.repository.JpaRepository
 *  org.springframework.stereotype.Repository
 */
package com.seer.rds.dao;

import com.seer.rds.model.admin.Login;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface LoginMapper
extends JpaRepository<Login, String> {
    public List<Login> findBySessionIdOrderByLoginDateDesc(String var1);

    public List<Login> findByUsername(String var1);

    public List<Login> findByUsernameOrderByLoginDateDesc(String var1);

    public void deleteByUsername(String var1);

    public void deleteBySessionId(String var1);
}

