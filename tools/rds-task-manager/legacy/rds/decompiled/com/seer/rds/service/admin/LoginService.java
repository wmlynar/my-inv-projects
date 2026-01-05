/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.model.admin.Login
 *  com.seer.rds.service.admin.LoginService
 */
package com.seer.rds.service.admin;

import com.seer.rds.model.admin.Login;

public interface LoginService {
    public Login findBySessionId(String var1);

    public Login findByUsername(String var1);

    public Login findByUsernameOrderByLoginDateDesc(String var1);

    public void saveLogin(Login var1);

    public void removeLoginInfo(String var1);
}

