/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.model.wind.BaseErrorHandle
 *  com.seer.rds.service.factory.CoreErrorHandleService
 *  com.seer.rds.service.factory.ErrorHandle
 *  org.springframework.stereotype.Component
 */
package com.seer.rds.service.factory;

import com.seer.rds.model.wind.BaseErrorHandle;
import com.seer.rds.service.factory.ErrorHandle;
import org.springframework.stereotype.Component;

@Component
public class CoreErrorHandleService
implements ErrorHandle {
    public Boolean checkIfShow(String errorId) {
        return true;
    }

    public Boolean setNotShow(String errorId) {
        return null;
    }

    public BaseErrorHandle findByErrorId(String errorId) {
        return null;
    }
}

