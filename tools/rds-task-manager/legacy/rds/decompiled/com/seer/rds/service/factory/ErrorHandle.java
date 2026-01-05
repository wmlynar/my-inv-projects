/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.model.wind.BaseErrorHandle
 *  com.seer.rds.service.factory.ErrorHandle
 */
package com.seer.rds.service.factory;

import com.seer.rds.model.wind.BaseErrorHandle;

public interface ErrorHandle {
    public Boolean checkIfShow(String var1);

    public Boolean setNotShow(String var1);

    public BaseErrorHandle findByErrorId(String var1);
}

