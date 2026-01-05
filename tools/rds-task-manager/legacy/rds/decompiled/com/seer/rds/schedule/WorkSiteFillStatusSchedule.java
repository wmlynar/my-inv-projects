/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.google.common.base.Joiner
 *  com.seer.rds.config.configview.CommonConfig
 *  com.seer.rds.config.configview.RdsCoreConfigOfView
 *  com.seer.rds.constant.ApiEnum
 *  com.seer.rds.constant.SiteStatusEnum
 *  com.seer.rds.constant.UpdateSiteScopeEnum
 *  com.seer.rds.dao.WorkSiteMapper
 *  com.seer.rds.model.worksite.WorkSite
 *  com.seer.rds.schedule.WorkSiteFillStatusSchedule
 *  com.seer.rds.web.config.ConfigFileController
 *  org.apache.commons.collections.CollectionUtils
 *  org.slf4j.Logger
 *  org.slf4j.LoggerFactory
 *  org.springframework.beans.factory.annotation.Autowired
 *  org.springframework.boot.ApplicationArguments
 *  org.springframework.boot.ApplicationRunner
 *  org.springframework.stereotype.Component
 */
package com.seer.rds.schedule;

import com.google.common.base.Joiner;
import com.seer.rds.config.configview.CommonConfig;
import com.seer.rds.config.configview.RdsCoreConfigOfView;
import com.seer.rds.constant.ApiEnum;
import com.seer.rds.constant.SiteStatusEnum;
import com.seer.rds.constant.UpdateSiteScopeEnum;
import com.seer.rds.dao.WorkSiteMapper;
import com.seer.rds.model.worksite.WorkSite;
import com.seer.rds.web.config.ConfigFileController;
import java.util.Collection;
import java.util.List;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;
import org.apache.commons.collections.CollectionUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

@Component
public class WorkSiteFillStatusSchedule
implements ApplicationRunner {
    private static final Logger log = LoggerFactory.getLogger(WorkSiteFillStatusSchedule.class);
    @Autowired
    private WorkSiteMapper workSiteMapper;

    public void run(ApplicationArguments args) throws Exception {
        CommonConfig bizConfig = ConfigFileController.commonConfig;
        if (null == bizConfig) {
            return;
        }
        RdsCoreConfigOfView rdscore = bizConfig.getRdscore();
        UpdateSiteScopeEnum updateBy = rdscore.getUpdateSitesBy();
        if (updateBy.equals((Object)UpdateSiteScopeEnum.NONE)) {
            return;
        }
        List groupList = null;
        if (UpdateSiteScopeEnum.GROUP.equals((Object)updateBy)) {
            groupList = bizConfig.getRdscore().getUpdateSitesGroup();
            if (CollectionUtils.isEmpty((Collection)groupList)) {
                log.info("\u5e93\u533a\u672a\u914d\u7f6e\uff0ccore\u66f4\u65b0\u5e93\u4f4d\u5360\u7528\u72b6\u6001\u672a\u542f\u7528\uff01");
                return;
            }
        } else if (!UpdateSiteScopeEnum.ALL.equals((Object)updateBy)) {
            log.error("{}\u4e0d\u662f\u53ef\u7528\u7684\u66f4\u65b0\u5e93\u4f4d\u72b6\u6001\u5b57\u6bb5\uff01", (Object)updateBy);
            return;
        }
        Object requestUrl = "";
        requestUrl = UpdateSiteScopeEnum.GROUP.equals((Object)updateBy) ? (rdscore.getBaseUrl().endsWith("/") ? rdscore.getBaseUrl() + ApiEnum.updateSiteFillStatus.getUri() + "?binGroups=" + Joiner.on((String)",").join((Iterable)groupList) : rdscore.getBaseUrl() + "/" + ApiEnum.updateSiteFillStatus.getUri() + "?binGroups=" + Joiner.on((String)",").join((Iterable)groupList)) : (rdscore.getBaseUrl().endsWith("/") ? rdscore.getBaseUrl() + ApiEnum.updateSiteFillStatus.getUri() : rdscore.getBaseUrl() + "/" + ApiEnum.updateSiteFillStatus.getUri());
        Object updateUrl = requestUrl;
        log.info("\u5b9a\u65f6\u66f4\u65b0\u5e93\u4f4d\u72b6\u6001url:{}", updateUrl);
        long interval = rdscore.getSiteStatusSyncInterval();
        ScheduledExecutorService mScheduledExecutorService = Executors.newScheduledThreadPool(1);
        List finalGroupList = groupList;
        mScheduledExecutorService.scheduleAtFixedRate((Runnable)new /* Unavailable Anonymous Inner Class!! */, 10000L, interval, TimeUnit.MILLISECONDS);
    }

    private void setSyncFailedByType(List<String> groupList, UpdateSiteScopeEnum updateBy) {
        if (UpdateSiteScopeEnum.GROUP.equals((Object)updateBy)) {
            List storedSiteList = this.workSiteMapper.findByGroupNameInAndSyncFailed(groupList, Integer.valueOf(SiteStatusEnum.synnofailed.getStatus()));
            if (CollectionUtils.isNotEmpty((Collection)storedSiteList)) {
                List siteIds = storedSiteList.stream().map(WorkSite::getSiteId).collect(Collectors.toList());
                this.workSiteMapper.updateSiteSyncFailedStatusBySiteIds(siteIds, Integer.valueOf(SiteStatusEnum.syncFailed.getStatus()));
            }
        } else {
            List storedSiteList = this.workSiteMapper.findBySyncFailed(Integer.valueOf(SiteStatusEnum.synnofailed.getStatus()));
            if (CollectionUtils.isNotEmpty((Collection)storedSiteList)) {
                List siteIds = storedSiteList.stream().map(WorkSite::getSiteId).collect(Collectors.toList());
                this.workSiteMapper.updateSiteSyncFailedStatusBySiteIds(siteIds, Integer.valueOf(SiteStatusEnum.syncFailed.getStatus()));
            }
        }
    }
}

