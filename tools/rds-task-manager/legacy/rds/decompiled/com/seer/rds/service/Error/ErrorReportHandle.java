/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.config.configview.CommonConfig
 *  com.seer.rds.service.Error.ErrorReportHandle
 *  org.springframework.stereotype.Component
 */
package com.seer.rds.service.Error;

import com.seer.rds.config.configview.CommonConfig;
import org.springframework.stereotype.Component;

@Component
public interface ErrorReportHandle {
    public boolean report(CommonConfig var1);
}

