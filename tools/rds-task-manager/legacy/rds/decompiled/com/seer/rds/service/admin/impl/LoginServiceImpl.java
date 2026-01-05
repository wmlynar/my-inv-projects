/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.dao.LoginMapper
 *  com.seer.rds.model.admin.Login
 *  com.seer.rds.service.admin.LoginService
 *  com.seer.rds.service.admin.impl.LoginServiceImpl
 *  javax.transaction.Transactional
 *  org.springframework.beans.factory.annotation.Autowired
 *  org.springframework.stereotype.Service
 *  org.springframework.util.CollectionUtils
 */
package com.seer.rds.service.admin.impl;

import com.seer.rds.dao.LoginMapper;
import com.seer.rds.model.admin.Login;
import com.seer.rds.service.admin.LoginService;
import java.util.Collection;
import java.util.List;
import javax.transaction.Transactional;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.util.CollectionUtils;

@Service
public class LoginServiceImpl
implements LoginService {
    @Autowired
    private LoginMapper loginMapper;

    public Login findBySessionId(String sessionId) {
        List login = this.loginMapper.findBySessionIdOrderByLoginDateDesc(sessionId);
        return !CollectionUtils.isEmpty((Collection)login) ? (Login)login.get(0) : null;
    }

    public Login findByUsername(String username) {
        List login = this.loginMapper.findByUsername(username);
        return !CollectionUtils.isEmpty((Collection)login) ? (Login)login.get(0) : null;
    }

    public void saveLogin(Login login) {
        this.loginMapper.saveAndFlush((Object)login);
    }

    public Login findByUsernameOrderByLoginDateDesc(String username) {
        List login = this.loginMapper.findByUsernameOrderByLoginDateDesc(username);
        return !CollectionUtils.isEmpty((Collection)login) ? (Login)login.get(0) : null;
    }

    @Transactional
    public void removeLoginInfo(String sessionId) {
        this.loginMapper.deleteBySessionId(sessionId);
    }
}

