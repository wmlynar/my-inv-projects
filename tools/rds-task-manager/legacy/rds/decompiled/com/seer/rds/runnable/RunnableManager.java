/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.config.PropConfig
 *  com.seer.rds.constant.ApiEnum
 *  com.seer.rds.dao.WindTaskRestrictionsMapper
 *  com.seer.rds.model.wind.WindTaskRestrictions
 *  com.seer.rds.roboview.RoboViewServer
 *  com.seer.rds.runnable.ArchivingApplicationYmlRunnable
 *  com.seer.rds.runnable.ChangeProgressRunnable
 *  com.seer.rds.runnable.CompatibleVersionRelated
 *  com.seer.rds.runnable.InitCacheDataRunnable
 *  com.seer.rds.runnable.PermissionRunnable
 *  com.seer.rds.runnable.RDSSystemInfo
 *  com.seer.rds.runnable.RDSTemplateRunnable
 *  com.seer.rds.runnable.RobotsStatusRunnable
 *  com.seer.rds.runnable.RunnableManager
 *  com.seer.rds.runnable.ScheduledTaskRunnable
 *  com.seer.rds.runnable.SiteGroupRestartRunnable
 *  com.seer.rds.runnable.WindStatusRunnable
 *  com.seer.rds.schedule.GeneralBusinessSchedule
 *  com.seer.rds.service.agv.AgvApiService
 *  com.seer.rds.service.agv.WindTaskService
 *  com.seer.rds.service.threadPool.LinkedBqThreadPool
 *  org.apache.commons.collections4.CollectionUtils
 *  org.slf4j.Logger
 *  org.slf4j.LoggerFactory
 *  org.springframework.beans.factory.annotation.Autowired
 *  org.springframework.boot.CommandLineRunner
 *  org.springframework.core.annotation.Order
 *  org.springframework.stereotype.Component
 */
package com.seer.rds.runnable;

import com.seer.rds.config.PropConfig;
import com.seer.rds.constant.ApiEnum;
import com.seer.rds.dao.WindTaskRestrictionsMapper;
import com.seer.rds.model.wind.WindTaskRestrictions;
import com.seer.rds.roboview.RoboViewServer;
import com.seer.rds.runnable.ArchivingApplicationYmlRunnable;
import com.seer.rds.runnable.ChangeProgressRunnable;
import com.seer.rds.runnable.CompatibleVersionRelated;
import com.seer.rds.runnable.InitCacheDataRunnable;
import com.seer.rds.runnable.PermissionRunnable;
import com.seer.rds.runnable.RDSSystemInfo;
import com.seer.rds.runnable.RDSTemplateRunnable;
import com.seer.rds.runnable.RobotsStatusRunnable;
import com.seer.rds.runnable.ScheduledTaskRunnable;
import com.seer.rds.runnable.SiteGroupRestartRunnable;
import com.seer.rds.runnable.WindStatusRunnable;
import com.seer.rds.schedule.GeneralBusinessSchedule;
import com.seer.rds.service.agv.AgvApiService;
import com.seer.rds.service.agv.WindTaskService;
import com.seer.rds.service.threadPool.LinkedBqThreadPool;
import java.io.File;
import java.util.Collection;
import java.util.List;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.Executor;
import org.apache.commons.collections4.CollectionUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

@Component
@Order(value=2)
public class RunnableManager
implements CommandLineRunner {
    private static final Logger log = LoggerFactory.getLogger(RunnableManager.class);
    @Autowired
    private PropConfig propConfig;
    @Autowired
    private AgvApiService agvApiService;
    @Autowired
    private WindTaskRestrictionsMapper windTaskRestrictionsMapper;

    public void run(String ... args) throws Exception {
        LinkedBqThreadPool instancePool = LinkedBqThreadPool.getInstance();
        this.mkDir();
        new Thread((Runnable)new PermissionRunnable()).start();
        new Thread((Runnable)new RDSSystemInfo()).start();
        new Thread((Runnable)new RobotsStatusRunnable(PropConfig.getRdsCoreBaseUrl())).start();
        ((CompletableFuture)((CompletableFuture)((CompletableFuture)((CompletableFuture)CompletableFuture.runAsync((Runnable)new InitCacheDataRunnable(), (Executor)instancePool).thenRun((Runnable)new CompatibleVersionRelated())).thenRun((Runnable)new RDSTemplateRunnable())).thenRunAsync((Runnable)new ChangeProgressRunnable())).thenRunAsync((Runnable)new WindStatusRunnable())).exceptionally(ex -> {
            log.error("error", ex);
            return null;
        });
        new Thread((Runnable)new SiteGroupRestartRunnable()).start();
        new Thread((Runnable)new ScheduledTaskRunnable()).start();
        new Thread((Runnable)new RoboViewServer()).start();
        new Thread((Runnable)new ArchivingApplicationYmlRunnable()).start();
        new Thread((Runnable)new GeneralBusinessSchedule()).start();
        this.initData();
    }

    private void initData() {
        try {
            List all = this.windTaskRestrictionsMapper.findAll();
            if (CollectionUtils.isNotEmpty((Collection)all)) {
                WindTaskService.windTaskRestrictions = (WindTaskRestrictions)all.get(0);
            }
        }
        catch (Exception exception) {
            // empty catch block
        }
    }

    public void downloadScene() {
        try {
            log.info("downloadScene...");
            this.agvApiService.download(ApiEnum.downloadScene.getUri(), null);
        }
        catch (Exception e) {
            log.error("downloadScene error", (Throwable)e);
        }
    }

    public void mkDir() {
        try {
            String SceneDir;
            File file5;
            String licenseDir;
            File file4;
            String scriptDir;
            File file3;
            String staticDir;
            File file2;
            log.info("mkDir...");
            String configDir = this.propConfig.getConfigDir();
            File file = new File(configDir);
            if (!file.exists()) {
                file.mkdir();
            }
            if (!(file2 = new File(staticDir = this.propConfig.getRdsStaticDir())).exists()) {
                file2.mkdir();
            }
            if (!(file3 = new File(scriptDir = this.propConfig.getRdsScriptDir())).exists()) {
                file3.mkdir();
            }
            if (!(file4 = new File(licenseDir = this.propConfig.getLicenseDir())).exists()) {
                file4.mkdir();
            }
            if (!(file5 = new File(SceneDir = this.propConfig.getSceneDir())).exists()) {
                file5.mkdir();
            }
        }
        catch (Exception e) {
            log.error("mkdir info: {}", (Object)e.getMessage());
        }
    }
}

