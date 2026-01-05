/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.config.LocaleConfig
 *  com.seer.rds.config.configview.CommonConfig
 *  com.seer.rds.dao.CoreAlarmsMapper
 *  com.seer.rds.dao.RobotAlarmsMapper
 *  com.seer.rds.dao.TaskAlarmsMapper
 *  com.seer.rds.email.EmailUtil
 *  com.seer.rds.model.alarms.RobotAlarms
 *  com.seer.rds.schedule.BusinessErrorReporting
 *  com.seer.rds.service.Error.ErrorReportHandle
 *  com.seer.rds.service.Error.GetMessageService
 *  com.seer.rds.service.Error.MailErrorReportingStrategy
 *  com.seer.rds.util.LocaleMessageUtil
 *  com.seer.rds.web.config.ConfigFileController
 *  org.apache.commons.collections.CollectionUtils
 *  org.apache.commons.lang3.StringUtils
 *  org.slf4j.Logger
 *  org.slf4j.LoggerFactory
 *  org.springframework.mail.SimpleMailMessage
 *  org.springframework.stereotype.Component
 */
package com.seer.rds.service.Error;

import com.seer.rds.config.LocaleConfig;
import com.seer.rds.config.configview.CommonConfig;
import com.seer.rds.dao.CoreAlarmsMapper;
import com.seer.rds.dao.RobotAlarmsMapper;
import com.seer.rds.dao.TaskAlarmsMapper;
import com.seer.rds.email.EmailUtil;
import com.seer.rds.model.alarms.RobotAlarms;
import com.seer.rds.schedule.BusinessErrorReporting;
import com.seer.rds.service.Error.ErrorReportHandle;
import com.seer.rds.service.Error.GetMessageService;
import com.seer.rds.util.LocaleMessageUtil;
import com.seer.rds.web.config.ConfigFileController;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import org.apache.commons.collections.CollectionUtils;
import org.apache.commons.lang3.StringUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.stereotype.Component;

@Component
public class MailErrorReportingStrategy
implements ErrorReportHandle {
    private static final Logger log = LoggerFactory.getLogger(MailErrorReportingStrategy.class);
    private final CoreAlarmsMapper coreAlarmsMapper;
    private final RobotAlarmsMapper robotAlarmsMapper;
    private final LocaleMessageUtil localeMessageUtil;
    private final TaskAlarmsMapper taskAlarmsMapper;
    private final LocaleConfig localeConfig;
    private final GetMessageService getMessageService;

    public MailErrorReportingStrategy(CoreAlarmsMapper coreAlarmsMapper, RobotAlarmsMapper robotAlarmsMapper, LocaleMessageUtil localeMessageUtil, LocaleConfig localeConfig, TaskAlarmsMapper taskAlarmsMapper, GetMessageService getMessageService) {
        this.coreAlarmsMapper = coreAlarmsMapper;
        this.robotAlarmsMapper = robotAlarmsMapper;
        this.localeMessageUtil = localeMessageUtil;
        this.localeConfig = localeConfig;
        this.taskAlarmsMapper = taskAlarmsMapper;
        this.getMessageService = getMessageService;
    }

    private void sendMail(String title, String content, String users) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setSubject(title);
        message.setFrom(ConfigFileController.commonConfig.getEmailConfig().getUsername());
        message.setTo(users.split(","));
        message.setSentDate(new Date());
        message.setText(content);
        EmailUtil.javaMailSender.send(message);
    }

    public boolean report(CommonConfig config) {
        String content;
        String language = config.getSendAlarms().getLanguage();
        String toAddresses = config.getSendAlarms().getApproach().getMail().getToAddresses();
        Map<String, List<RobotAlarms>> res = BusinessErrorReporting.rbkMsg.stream().collect(Collectors.groupingBy(RobotAlarms::getAgvId));
        Set<String> strings = res.keySet();
        if (CollectionUtils.isNotEmpty((Collection)BusinessErrorReporting.coreMsg)) {
            try {
                String content2 = this.getMessageService.getMessage(BusinessErrorReporting.coreMsg, language);
                if (StringUtils.isNotEmpty((CharSequence)content2)) {
                    this.sendMail(this.localeMessageUtil.getMessageMatch("@{push.alarms.coreError}", this.localeConfig.transformationLanguage(language)), content2, toAddresses);
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
        if (CollectionUtils.isNotEmpty(mergedList)) {
            try {
                content = this.getMessageService.getMessage(mergedList, language);
                if (StringUtils.isNotEmpty((CharSequence)content)) {
                    this.sendMail(this.localeMessageUtil.getMessageMatch("@{push.alarms.agvError}", this.localeConfig.transformationLanguage(language)), content, toAddresses);
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
                    this.sendMail(this.localeMessageUtil.getMessageMatch("@{push.alarms.taskError}", this.localeConfig.transformationLanguage(language)), content, toAddresses);
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

