/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.config.LocaleConfig
 *  com.seer.rds.model.alarms.BaseAlarms
 *  com.seer.rds.model.alarms.CoreAlarms
 *  com.seer.rds.model.alarms.RobotAlarms
 *  com.seer.rds.model.alarms.TaskAlarms
 *  com.seer.rds.schedule.BusinessErrorReporting
 *  com.seer.rds.service.Error.GetMessageService
 *  com.seer.rds.util.LocaleMessageUtil
 *  com.seer.rds.util.server.DateUtils
 *  org.apache.commons.collections.CollectionUtils
 *  org.apache.commons.lang3.StringUtils
 *  org.springframework.stereotype.Component
 */
package com.seer.rds.service.Error;

import com.seer.rds.config.LocaleConfig;
import com.seer.rds.model.alarms.BaseAlarms;
import com.seer.rds.model.alarms.CoreAlarms;
import com.seer.rds.model.alarms.RobotAlarms;
import com.seer.rds.model.alarms.TaskAlarms;
import com.seer.rds.schedule.BusinessErrorReporting;
import com.seer.rds.util.LocaleMessageUtil;
import com.seer.rds.util.server.DateUtils;
import java.util.List;
import java.util.Locale;
import java.util.Properties;
import org.apache.commons.collections.CollectionUtils;
import org.apache.commons.lang3.StringUtils;
import org.springframework.stereotype.Component;

@Component
public class GetMessageService {
    private final LocaleMessageUtil localeMessageUtil;
    private final LocaleConfig localeConfig;

    public GetMessageService(LocaleMessageUtil localeMessageUtil, LocaleConfig localeConfig) {
        this.localeMessageUtil = localeMessageUtil;
        this.localeConfig = localeConfig;
    }

    public <T extends BaseAlarms> String getMessage(List<T> errorMsg, String language) {
        StringBuilder msg = new StringBuilder();
        Locale lang = this.localeConfig.transformationLanguage(language);
        if (CollectionUtils.isNotEmpty(errorMsg)) {
            for (int i = 0; i < errorMsg.size(); ++i) {
                Integer errorTime;
                String time = ((BaseAlarms)errorMsg.get(i)).getCreateTime() != null ? ((BaseAlarms)errorMsg.get(i)).getCreateTime().toString() : ((errorTime = ((BaseAlarms)errorMsg.get(i)).getErrorTime()) == null ? "" : DateUtils.parseCoreTimeStamp((Integer)errorTime, (String)DateUtils.YYYY_MM_DD_HH_MM_SS));
                Properties properties0 = (Properties)BusinessErrorReporting.alarmMaps.get("coreAlarmSolution_" + lang + ".properties");
                Properties properties1 = (Properties)BusinessErrorReporting.alarmMaps.get("rbkAlarmDesc_" + lang + ".properties");
                Properties properties2 = (Properties)BusinessErrorReporting.alarmMaps.get("rbkAlarmSolution_" + lang + ".properties");
                String desc = ((BaseAlarms)errorMsg.get(i)).getSendMsg();
                String solution = "";
                if (errorMsg.get(i) instanceof RobotAlarms) {
                    String result;
                    if (properties1 != null && StringUtils.isNotEmpty((CharSequence)(result = properties1.getProperty(((BaseAlarms)errorMsg.get(i)).getCode().toString())))) {
                        desc = result;
                    }
                    if (properties2 != null) {
                        solution = properties2.getProperty(((BaseAlarms)errorMsg.get(i)).getCode().toString());
                    }
                } else if (errorMsg.get(i) instanceof CoreAlarms && properties0 != null) {
                    solution = properties0.getProperty(((BaseAlarms)errorMsg.get(i)).getCode().toString());
                }
                msg.append("- @{push.alarms.No}: ").append(i + 1).append("\n");
                if (errorMsg.get(i) instanceof RobotAlarms) {
                    msg.append("- @{push.alarms.agvId}: ").append(((RobotAlarms)errorMsg.get(i)).getAgvId()).append("\n");
                }
                if (!(errorMsg.get(i) instanceof TaskAlarms)) {
                    msg.append("- @{push.alarms.code}: ").append(((BaseAlarms)errorMsg.get(i)).getCode()).append("\n");
                } else if (errorMsg.get(i) instanceof TaskAlarms) {
                    if (StringUtils.isNotEmpty((CharSequence)((TaskAlarms)errorMsg.get(i)).getRecordId())) {
                        msg.append("- @{push.alarms.recordId}: ").append(((TaskAlarms)errorMsg.get(i)).getRecordId()).append("\n");
                    }
                    if (StringUtils.isNotEmpty((CharSequence)((TaskAlarms)errorMsg.get(i)).getAgvId())) {
                        msg.append("- @{push.alarms.agvId}: ").append(((TaskAlarms)errorMsg.get(i)).getAgvId()).append("\n");
                    }
                    if (StringUtils.isNotEmpty((CharSequence)((TaskAlarms)errorMsg.get(i)).getOutOrderId())) {
                        msg.append("- @{push.alarms.outOrderId}: ").append(((TaskAlarms)errorMsg.get(i)).getOutOrderId()).append("\n");
                    }
                }
                msg.append("- @{push.alarms.RbkErrorDesc}: ").append(desc).append("\n");
                if (StringUtils.isNotEmpty((CharSequence)solution)) {
                    msg.append("- @{push.alarms.solution}: ").append(solution).append("\n");
                }
                msg.append("- @{statRecord.export.time}: ").append(time).append("\n");
                if (i == errorMsg.size() - 1) continue;
                msg.append("---------------------------------------").append("\n");
            }
        }
        return this.localeMessageUtil.getMessageMatch(msg.toString(), lang);
    }
}

