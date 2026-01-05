/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.runnable.SiteGroupRestartRunnable
 *  com.seer.rds.service.agv.SiteGroupDemandService
 *  com.seer.rds.util.SpringUtil
 *  org.springframework.stereotype.Component
 */
package com.seer.rds.runnable;

import com.seer.rds.service.agv.SiteGroupDemandService;
import com.seer.rds.util.SpringUtil;
import org.springframework.stereotype.Component;

@Component
public class SiteGroupRestartRunnable
implements Runnable {
    @Override
    public void run() {
        SiteGroupDemandService siteGroupDemandService = (SiteGroupDemandService)SpringUtil.getBean(SiteGroupDemandService.class);
        siteGroupDemandService.stopAll();
    }
}

