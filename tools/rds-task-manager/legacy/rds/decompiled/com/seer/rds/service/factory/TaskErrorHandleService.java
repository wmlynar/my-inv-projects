/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.dao.TaskErrorHandleMapper
 *  com.seer.rds.model.wind.BaseErrorHandle
 *  com.seer.rds.model.wind.TaskErrorHandle
 *  com.seer.rds.service.factory.ErrorHandle
 *  com.seer.rds.service.factory.TaskErrorHandleService
 *  org.springframework.beans.factory.annotation.Autowired
 *  org.springframework.stereotype.Component
 */
package com.seer.rds.service.factory;

import com.seer.rds.dao.TaskErrorHandleMapper;
import com.seer.rds.model.wind.BaseErrorHandle;
import com.seer.rds.model.wind.TaskErrorHandle;
import com.seer.rds.service.factory.ErrorHandle;
import java.util.Optional;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

@Component
public class TaskErrorHandleService
implements ErrorHandle {
    @Autowired
    private TaskErrorHandleMapper taskErrorHandleMapper;

    public Boolean checkIfShow(String errorId) {
        Optional byErrorId = this.taskErrorHandleMapper.findByErrorId(errorId);
        if (byErrorId.isPresent()) {
            return ((TaskErrorHandle)byErrorId.get()).getIfShow();
        }
        return true;
    }

    public Boolean setNotShow(String errorId) {
        this.taskErrorHandleMapper.setNotSHow(errorId);
        return null;
    }

    public BaseErrorHandle findByErrorId(String errorId) {
        Optional byErrorId = this.taskErrorHandleMapper.findByErrorId(errorId);
        return byErrorId.orElse(null);
    }
}

