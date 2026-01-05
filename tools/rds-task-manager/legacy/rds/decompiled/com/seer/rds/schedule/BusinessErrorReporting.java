/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.google.common.collect.Maps
 *  com.seer.rds.config.configview.CommonConfig
 *  com.seer.rds.model.alarms.CoreAlarms
 *  com.seer.rds.model.alarms.RobotAlarms
 *  com.seer.rds.model.alarms.TaskAlarms
 *  com.seer.rds.schedule.BusinessErrorReporting
 *  com.seer.rds.service.Error.ErrorHandlerChain
 *  com.seer.rds.service.Error.InsertErrorDataService
 *  com.seer.rds.util.SpringUtil
 *  com.seer.rds.web.config.ConfigFileController
 *  org.apache.commons.lang3.BooleanUtils
 *  org.slf4j.Logger
 *  org.slf4j.LoggerFactory
 *  org.springframework.boot.ApplicationArguments
 *  org.springframework.boot.ApplicationRunner
 *  org.springframework.core.io.ClassPathResource
 *  org.springframework.stereotype.Component
 */
package com.seer.rds.schedule;

import com.google.common.collect.Maps;
import com.seer.rds.config.configview.CommonConfig;
import com.seer.rds.model.alarms.CoreAlarms;
import com.seer.rds.model.alarms.RobotAlarms;
import com.seer.rds.model.alarms.TaskAlarms;
import com.seer.rds.service.Error.ErrorHandlerChain;
import com.seer.rds.service.Error.InsertErrorDataService;
import com.seer.rds.util.SpringUtil;
import com.seer.rds.web.config.ConfigFileController;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Properties;
import java.util.Set;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;
import org.apache.commons.lang3.BooleanUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;

@Component
public class BusinessErrorReporting
implements ApplicationRunner {
    private static final Logger log = LoggerFactory.getLogger(BusinessErrorReporting.class);
    private final InsertErrorDataService insertErrorDataService;
    public static final Set<CoreAlarms> coreMsgError = new LinkedHashSet();
    public static final Set<RobotAlarms> agvMsgError = new LinkedHashSet();
    public static final Set<TaskAlarms> taskMsgError = new LinkedHashSet();
    public static final List<CoreAlarms> coreMsg = new ArrayList();
    public static final List<RobotAlarms> rbkMsg = new ArrayList();
    public static final List<TaskAlarms> taskMsg = new ArrayList();
    private final String[] fileName = new String[]{"coreAlarmSolution_zh_CN.properties", "rbkAlarmDesc_zh_CN.properties", "rbkAlarmSolution_zh_CN.properties"};
    public static final Map<String, Properties> alarmMaps = Maps.newHashMap();

    public BusinessErrorReporting(InsertErrorDataService insertErrorDataService) {
        this.insertErrorDataService = insertErrorDataService;
    }

    public void run(ApplicationArguments args) throws Exception {
        CommonConfig bizConfig = ConfigFileController.commonConfig;
        if (bizConfig == null) {
            return;
        }
        if (!BooleanUtils.toBoolean((Boolean)bizConfig.getSendAlarms().getEnable())) {
            return;
        }
        ScheduledExecutorService ses = Executors.newScheduledThreadPool(1);
        for (String s : this.fileName) {
            alarmMaps.put(s, this.loadProperties(s));
        }
        ses.scheduleAtFixedRate(() -> {
            try {
                this.insertErrorDataService.insertAlarmData();
            }
            catch (Exception e) {
                log.error("insertAlarmData error {}", (Object)e.getMessage(), (Object)e);
            }
            try {
                this.sendMsg();
            }
            catch (Exception e) {
                log.error("sendMsg error {}", (Object)e.getMessage(), (Object)e);
            }
        }, 10000L, 5000L, TimeUnit.MILLISECONDS);
    }

    private void sendMsg() {
        ErrorHandlerChain errorHandlerChain = (ErrorHandlerChain)SpringUtil.getBean(ErrorHandlerChain.class);
        errorHandlerChain.handle();
    }

    private Properties loadProperties(String path) {
        Properties properties = new Properties();
        ClassPathResource rbkAlarmDescResource = new ClassPathResource("rbk/" + path);
        try (InputStream rbkAlarmInputStream = rbkAlarmDescResource.getInputStream();
             InputStreamReader inputStreamReader = new InputStreamReader(rbkAlarmInputStream, StandardCharsets.UTF_8);){
            properties.load(inputStreamReader);
        }
        catch (Exception e) {
            log.error("read properties alarm error {}, path {}", (Object)e, (Object)path);
        }
        return properties;
    }
}

