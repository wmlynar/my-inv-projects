/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.alibaba.fastjson.JSONObject
 *  com.google.common.collect.Maps
 *  com.seer.rds.config.LocaleConfig
 *  com.seer.rds.config.configview.CommonConfig
 *  com.seer.rds.dao.CoreAlarmsMapper
 *  com.seer.rds.dao.RobotAlarmsMapper
 *  com.seer.rds.dao.TaskAlarmsMapper
 *  com.seer.rds.model.alarms.RobotAlarms
 *  com.seer.rds.schedule.BusinessErrorReporting
 *  com.seer.rds.service.Error.ErrorReportHandle
 *  com.seer.rds.service.Error.GetMessageService
 *  com.seer.rds.service.Error.VXRobotErrorReportingStrategy
 *  com.seer.rds.util.LocaleMessageUtil
 *  com.seer.rds.util.OkHttpUtil
 *  org.apache.commons.collections.CollectionUtils
 *  org.apache.commons.lang3.StringUtils
 *  org.slf4j.Logger
 *  org.slf4j.LoggerFactory
 *  org.springframework.stereotype.Component
 */
package com.seer.rds.service.Error;

import com.alibaba.fastjson.JSONObject;
import com.google.common.collect.Maps;
import com.seer.rds.config.LocaleConfig;
import com.seer.rds.config.configview.CommonConfig;
import com.seer.rds.dao.CoreAlarmsMapper;
import com.seer.rds.dao.RobotAlarmsMapper;
import com.seer.rds.dao.TaskAlarmsMapper;
import com.seer.rds.model.alarms.RobotAlarms;
import com.seer.rds.schedule.BusinessErrorReporting;
import com.seer.rds.service.Error.ErrorReportHandle;
import com.seer.rds.service.Error.GetMessageService;
import com.seer.rds.util.LocaleMessageUtil;
import com.seer.rds.util.OkHttpUtil;
import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import org.apache.commons.collections.CollectionUtils;
import org.apache.commons.lang3.StringUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

@Component
public class VXRobotErrorReportingStrategy
implements ErrorReportHandle {
    private static final Logger log = LoggerFactory.getLogger(VXRobotErrorReportingStrategy.class);
    private final CoreAlarmsMapper coreAlarmsMapper;
    private final RobotAlarmsMapper robotAlarmsMapper;
    private final TaskAlarmsMapper taskAlarmsMapper;
    private final LocaleMessageUtil localeMessageUtil;
    private final GetMessageService getMessageService;
    private final LocaleConfig localeConfig;

    public VXRobotErrorReportingStrategy(CoreAlarmsMapper coreAlarmsMapper, RobotAlarmsMapper robotAlarmsMapper, LocaleMessageUtil localeMessageUtil, LocaleConfig localeConfig, TaskAlarmsMapper taskAlarmsMapper, GetMessageService getMessageService) {
        this.coreAlarmsMapper = coreAlarmsMapper;
        this.robotAlarmsMapper = robotAlarmsMapper;
        this.localeMessageUtil = localeMessageUtil;
        this.localeConfig = localeConfig;
        this.taskAlarmsMapper = taskAlarmsMapper;
        this.getMessageService = getMessageService;
    }

    public boolean report(CommonConfig config) {
        HashMap<String, StringBuilder> contentMap;
        StringBuilder vxMessage;
        HashMap map;
        String content;
        String webhookVx = config.getSendAlarms().getApproach().getVxRobot().getWebhook();
        Map<String, List<RobotAlarms>> res = BusinessErrorReporting.rbkMsg.stream().collect(Collectors.groupingBy(RobotAlarms::getAgvId));
        Set<String> strings = res.keySet();
        String language = config.getSendAlarms().getLanguage();
        if (CollectionUtils.isNotEmpty((Collection)BusinessErrorReporting.coreMsg)) {
            try {
                String content2 = this.getMessageService.getMessage(BusinessErrorReporting.coreMsg, language);
                if (StringUtils.isNotEmpty((CharSequence)content2)) {
                    HashMap map2 = Maps.newHashMap();
                    map2.put("msgtype", "markdown");
                    StringBuilder vxMessage2 = new StringBuilder();
                    vxMessage2.append(this.localeMessageUtil.getMessageMatch("@{push.alarms.coreError}: ", this.localeConfig.transformationLanguage(language))).append("\n");
                    vxMessage2.append(content2);
                    HashMap<String, Object> contentMap2 = new HashMap<String, Object>();
                    contentMap2.put("content", vxMessage2);
                    map2.put("markdown", contentMap2);
                    OkHttpUtil.postJson((String)webhookVx, (String)JSONObject.toJSONString((Object)map2));
                    BusinessErrorReporting.coreMsg.forEach(it -> it.setIsOk(Integer.valueOf(1)));
                    this.coreAlarmsMapper.saveAll((Iterable)BusinessErrorReporting.coreMsg);
                }
            }
            catch (Exception e) {
                log.error("send mail error {}", (Object)e.getMessage(), (Object)e);
                BusinessErrorReporting.coreMsgError.addAll(BusinessErrorReporting.coreMsg);
            }
        }
        ArrayList mergedList = new ArrayList();
        HashMap<Integer, RobotAlarms> mapA = new HashMap<Integer, RobotAlarms>();
        for (RobotAlarms alarm : BusinessErrorReporting.rbkMsg) {
            Integer code = alarm.getCode();
            RobotAlarms existingAlarm = (RobotAlarms)mapA.get(code);
            if (existingAlarm == null) {
                mapA.put(code, new RobotAlarms(alarm));
                continue;
            }
            existingAlarm.setAgvId(existingAlarm.getAgvId() + "," + alarm.getAgvId());
        }
        mergedList.addAll(mapA.values());
        if (CollectionUtils.isNotEmpty((Collection)BusinessErrorReporting.rbkMsg)) {
            try {
                content = this.getMessageService.getMessage(mergedList, language);
                if (StringUtils.isNotEmpty((CharSequence)content)) {
                    map = Maps.newHashMap();
                    map.put("msgtype", "markdown");
                    vxMessage = new StringBuilder();
                    vxMessage.append(this.localeMessageUtil.getMessageMatch("@{push.alarms.agvError}: ", this.localeConfig.transformationLanguage(language))).append("\n");
                    vxMessage.append(content);
                    contentMap = new HashMap<String, StringBuilder>();
                    contentMap.put("content", vxMessage);
                    map.put("markdown", contentMap);
                    OkHttpUtil.postJson((String)webhookVx, (String)JSONObject.toJSONString((Object)map));
                    BusinessErrorReporting.rbkMsg.forEach(it -> it.setIsOk(Integer.valueOf(1)));
                    this.robotAlarmsMapper.saveAll((Iterable)BusinessErrorReporting.rbkMsg);
                }
            }
            catch (Exception e) {
                log.error("send mail error {}", (Object)e.getMessage(), (Object)e);
                BusinessErrorReporting.agvMsgError.addAll(BusinessErrorReporting.rbkMsg);
            }
        }
        if (CollectionUtils.isNotEmpty((Collection)BusinessErrorReporting.taskMsg)) {
            try {
                content = this.getMessageService.getMessage(BusinessErrorReporting.taskMsg, language);
                if (StringUtils.isNotEmpty((CharSequence)content)) {
                    map = Maps.newHashMap();
                    map.put("msgtype", "markdown");
                    vxMessage = new StringBuilder();
                    vxMessage.append(this.localeMessageUtil.getMessageMatch("@{push.alarms.taskError}: ", this.localeConfig.transformationLanguage(language))).append("\n");
                    vxMessage.append(content);
                    contentMap = new HashMap();
                    contentMap.put("content", vxMessage);
                    map.put("markdown", contentMap);
                    OkHttpUtil.postJson((String)webhookVx, (String)JSONObject.toJSONString((Object)map));
                    BusinessErrorReporting.taskMsg.forEach(it -> it.setIsOk(Integer.valueOf(1)));
                    this.taskAlarmsMapper.saveAll((Iterable)BusinessErrorReporting.taskMsg);
                }
            }
            catch (Exception e) {
                log.error("send mail error {}", (Object)e.getMessage(), (Object)e);
                BusinessErrorReporting.taskMsgError.addAll(BusinessErrorReporting.taskMsg);
            }
        }
        return true;
    }
}

