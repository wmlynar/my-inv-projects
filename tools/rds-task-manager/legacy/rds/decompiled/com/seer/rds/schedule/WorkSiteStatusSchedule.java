/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.alibaba.fastjson.JSON
 *  com.seer.rds.config.GlobalCacheConfig
 *  com.seer.rds.config.PropConfig
 *  com.seer.rds.constant.CommonCodeEnum
 *  com.seer.rds.dao.WindTaskDefMapper
 *  com.seer.rds.dao.WorkSiteAttrDataMapper
 *  com.seer.rds.dao.WorkSiteAttrMapper
 *  com.seer.rds.dao.WorkSiteMapper
 *  com.seer.rds.listener.EventSource
 *  com.seer.rds.listener.WindEvent
 *  com.seer.rds.model.worksite.WorkSite
 *  com.seer.rds.schedule.WorkSiteStatusSchedule
 *  com.seer.rds.util.SpringUtil
 *  com.seer.rds.vo.ResultVo
 *  com.seer.rds.vo.WorkSiteVo
 *  com.seer.rds.websocket.RdsServer
 *  org.apache.commons.collections.CollectionUtils
 *  org.apache.commons.lang3.StringUtils
 *  org.slf4j.Logger
 *  org.slf4j.LoggerFactory
 *  org.springframework.beans.factory.annotation.Autowired
 *  org.springframework.context.annotation.Configuration
 *  org.springframework.scheduling.annotation.EnableScheduling
 *  org.springframework.scheduling.annotation.SchedulingConfigurer
 *  org.springframework.scheduling.config.ScheduledTaskRegistrar
 *  org.springframework.scheduling.support.CronTrigger
 */
package com.seer.rds.schedule;

import com.alibaba.fastjson.JSON;
import com.seer.rds.config.GlobalCacheConfig;
import com.seer.rds.config.PropConfig;
import com.seer.rds.constant.CommonCodeEnum;
import com.seer.rds.dao.WindTaskDefMapper;
import com.seer.rds.dao.WorkSiteAttrDataMapper;
import com.seer.rds.dao.WorkSiteAttrMapper;
import com.seer.rds.dao.WorkSiteMapper;
import com.seer.rds.listener.EventSource;
import com.seer.rds.listener.WindEvent;
import com.seer.rds.model.worksite.WorkSite;
import com.seer.rds.util.SpringUtil;
import com.seer.rds.vo.ResultVo;
import com.seer.rds.vo.WorkSiteVo;
import com.seer.rds.websocket.RdsServer;
import java.util.Collection;
import java.util.List;
import org.apache.commons.collections.CollectionUtils;
import org.apache.commons.lang3.StringUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.SchedulingConfigurer;
import org.springframework.scheduling.config.ScheduledTaskRegistrar;
import org.springframework.scheduling.support.CronTrigger;

/*
 * Exception performing whole class analysis ignored.
 */
@Configuration
@EnableScheduling
public class WorkSiteStatusSchedule
implements SchedulingConfigurer {
    private static final Logger log = LoggerFactory.getLogger(WorkSiteStatusSchedule.class);
    private static Logger replaySitesLogger = LoggerFactory.getLogger((String)"REPLAY_SITES_FILE");
    @Autowired
    private WindTaskDefMapper windTaskDefMapper;
    @Autowired
    private WorkSiteMapper workSiteMapper;
    @Autowired
    private WorkSiteAttrMapper workSiteAttrMapper;
    @Autowired
    private WorkSiteAttrDataMapper workSiteAttrDataMapper;
    @Autowired
    private EventSource eventSource;
    @Autowired
    private PropConfig propConfig;
    public static String taskCron = "0/5 * * * * ?";
    public static final String allSitesCacheKey = "allSitesCacheKey";
    public static final String allExtFieldCacheKey = "allExtFieldCacheKey";
    public static final String allExtFieldDataCacheKey = "allExtFieldDataCacheKey";

    public static String getTaskCron() {
        return taskCron;
    }

    public static void setTaskCron(String taskCron) {
        WorkSiteStatusSchedule.taskCron = taskCron;
    }

    public void configureTasks(ScheduledTaskRegistrar taskRegistrar) {
        String scheduleName = WorkSiteStatusSchedule.class.getName();
        taskRegistrar.addTriggerTask(() -> {
            List allSites = this.workSiteMapper.findAll();
            List allExtFields = this.workSiteAttrMapper.findAll();
            List allExtFieldData = this.workSiteAttrDataMapper.findAll();
            if (CollectionUtils.isNotEmpty((Collection)allSites)) {
                List cacheAllSites = (List)GlobalCacheConfig.getCache((String)"allSitesCacheKey");
                List cacheAllExtFields = (List)GlobalCacheConfig.getCache((String)"allExtFieldCacheKey");
                List cacheAllExtFieldData = null;
                if (CollectionUtils.isNotEmpty((Collection)cacheAllExtFields)) {
                    cacheAllExtFieldData = (List)GlobalCacheConfig.getCache((String)"allExtFieldDataCacheKey");
                }
                if (CollectionUtils.isNotEmpty((Collection)cacheAllSites)) {
                    for (WorkSite cacheSite : cacheAllSites) {
                        for (WorkSite site : allSites) {
                            if (!cacheSite.getId().equals(site.getId()) || cacheSite.getLocked() == null || site.getLocked() == null || cacheSite.getFilled() == null || site.getFilled() == null || cacheSite.getLocked().intValue() == site.getLocked().intValue() && cacheSite.getFilled().intValue() == site.getFilled().intValue() && StringUtils.equals((CharSequence)cacheSite.getContent(), (CharSequence)site.getContent())) continue;
                            WindEvent windEvent = new WindEvent();
                            WorkSiteVo siteVo = new WorkSiteVo();
                            siteVo.setNewWorkSite(site);
                            siteVo.setOldWorkSite(cacheSite);
                            windEvent.setWorkSiteVo(siteVo);
                            windEvent.setType(Integer.valueOf(3));
                            this.eventSource.notify(windEvent);
                        }
                    }
                }
                GlobalCacheConfig.cache((String)"allSitesCacheKey", (Object)allSites);
                GlobalCacheConfig.cache((String)"allExtFieldCacheKey", (Object)allExtFields);
                GlobalCacheConfig.cache((String)"allExtFieldDataCacheKey", (Object)allExtFieldData);
                String cachedSiteJson = "";
                if (CollectionUtils.isNotEmpty((Collection)cacheAllSites)) {
                    cachedSiteJson = JSON.toJSONString((Object)cacheAllSites);
                }
                String cachedExtFieldJson = "";
                if (CollectionUtils.isNotEmpty((Collection)cacheAllExtFields)) {
                    cachedExtFieldJson = JSON.toJSONString((Object)cacheAllExtFields);
                }
                String cachedExtFieldDataJson = "";
                if (CollectionUtils.isNotEmpty((Collection)cacheAllExtFieldData)) {
                    cachedExtFieldDataJson = JSON.toJSONString((Object)cacheAllExtFieldData);
                }
                String curSiteJson = "";
                if (CollectionUtils.isNotEmpty((Collection)allSites)) {
                    curSiteJson = JSON.toJSONString((Object)allSites);
                }
                String curExtFieldJson = "";
                if (CollectionUtils.isNotEmpty((Collection)allExtFields)) {
                    curExtFieldJson = JSON.toJSONString((Object)allExtFields);
                }
                String curExtFieldDataJson = "";
                if (CollectionUtils.isNotEmpty((Collection)allExtFieldData)) {
                    curExtFieldDataJson = JSON.toJSONString((Object)allExtFieldData);
                }
                if (!(curSiteJson.equals(cachedSiteJson) && curExtFieldJson.equals(cachedExtFieldJson) && curExtFieldDataJson.equals(cachedExtFieldDataJson))) {
                    RdsServer websocketServer = (RdsServer)SpringUtil.getBean(RdsServer.class);
                    ResultVo messageResult = new ResultVo();
                    messageResult.setCode(CommonCodeEnum.WS_SITE_CHANGED.getCode());
                    websocketServer.sendMessage(JSON.toJSONString((Object)messageResult));
                    if (PropConfig.ifEnableReplay().booleanValue()) {
                        this.saveSiteChangeRecord(allSites);
                    }
                }
            }
        }, triggerContext -> new CronTrigger(WorkSiteStatusSchedule.getTaskCron()).nextExecutionTime(triggerContext));
    }

    private void saveSiteChangeRecord(List<WorkSite> sites) {
        StringBuilder sb = new StringBuilder();
        for (WorkSite site : sites) {
            int filled;
            String siteId = site.getSiteId();
            int locked = null == site.getLocked() ? 0 : site.getLocked();
            int n = filled = null == site.getFilled() ? 0 : site.getFilled();
            int content = null == site.getContent() ? 0 : ("EmptyTray".equals(site.getContent()) ? 1 : 0);
            int disabled = null == site.getDisabled() ? 0 : site.getDisabled();
            sb.append("[").append(siteId).append("|").append(locked).append("|").append(filled).append("|").append(content).append("|").append(disabled).append("]");
        }
        if (StringUtils.isEmpty((CharSequence)sb)) {
            return;
        }
        replaySitesLogger.info(sb.toString());
    }
}

