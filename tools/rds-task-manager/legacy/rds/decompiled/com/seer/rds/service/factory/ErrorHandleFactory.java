/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.service.factory.CoreErrorHandleService
 *  com.seer.rds.service.factory.ErrorHandle
 *  com.seer.rds.service.factory.ErrorHandleFactory
 *  com.seer.rds.service.factory.TaskErrorHandleService
 *  com.seer.rds.util.SpringUtil
 *  org.springframework.stereotype.Component
 */
package com.seer.rds.service.factory;

import com.seer.rds.service.factory.CoreErrorHandleService;
import com.seer.rds.service.factory.ErrorHandle;
import com.seer.rds.service.factory.TaskErrorHandleService;
import com.seer.rds.util.SpringUtil;
import org.springframework.stereotype.Component;

@Component
public class ErrorHandleFactory {
    public static ErrorHandle getHandleService(Integer errorHandle) {
        if (errorHandle.equals(0)) {
            return (ErrorHandle)SpringUtil.getBean(TaskErrorHandleService.class);
        }
        if (errorHandle.equals(1)) {
            return (ErrorHandle)SpringUtil.getBean(CoreErrorHandleService.class);
        }
        return null;
    }
}

