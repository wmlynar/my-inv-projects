/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.config.PropConfig
 *  com.seer.rds.dao.TemplateTaskMapper
 *  com.seer.rds.runnable.RDSTemplateRunnable
 *  com.seer.rds.service.agv.WindService
 *  com.seer.rds.service.wind.commonBp.CacheDataBp
 *  com.seer.rds.util.SpringUtil
 *  com.seer.rds.util.TemplateUtil
 *  org.slf4j.Logger
 *  org.slf4j.LoggerFactory
 */
package com.seer.rds.runnable;

import com.seer.rds.config.PropConfig;
import com.seer.rds.dao.TemplateTaskMapper;
import com.seer.rds.service.agv.WindService;
import com.seer.rds.service.wind.commonBp.CacheDataBp;
import com.seer.rds.util.SpringUtil;
import com.seer.rds.util.TemplateUtil;
import java.util.concurrent.ConcurrentHashMap;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class RDSTemplateRunnable
implements Runnable {
    private static final Logger log = LoggerFactory.getLogger(RDSTemplateRunnable.class);
    public static Boolean ifShowTemplateTask = false;

    @Override
    public void run() {
        WindService windService = (WindService)SpringUtil.getBean(WindService.class);
        boolean ifShowTemplate = PropConfig.ifShowTemplateTask();
        if (ifShowTemplate) {
            ifShowTemplateTask = true;
            log.info("ifShowTemplateTask is true");
        }
        PropConfig propConfig = (PropConfig)SpringUtil.getBean(PropConfig.class);
        ConcurrentHashMap dataCache = windService.getDataCache();
        Object ifLoadTemplate = dataCache.get("ifLoadTemplate");
        if ("true".equals(ifLoadTemplate) || Boolean.TRUE.equals(ifLoadTemplate) || ifLoadTemplate == null) {
            TemplateTaskMapper templateTaskMapper = (TemplateTaskMapper)SpringUtil.getBean(TemplateTaskMapper.class);
            TemplateUtil.loadTemplate((TemplateTaskMapper)templateTaskMapper, (PropConfig)propConfig);
        }
        TemplateUtil.saveTemplateTaskDef((String)propConfig.getRdsTemplateDir());
        CacheDataBp.cacheMap.put("ifLoadTemplate", false);
        windService.dataCache("ifLoadTemplate", "false", 1);
    }
}

