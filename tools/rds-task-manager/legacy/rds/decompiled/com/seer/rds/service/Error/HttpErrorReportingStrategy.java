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
 *  com.seer.rds.model.alarms.BaseAlarms
 *  com.seer.rds.model.alarms.RobotAlarms
 *  com.seer.rds.schedule.BusinessErrorReporting
 *  com.seer.rds.service.Error.ErrorReportHandle
 *  com.seer.rds.service.Error.HttpErrorReportingStrategy
 *  com.seer.rds.util.OkHttpUtil
 *  com.seer.rds.util.server.DateUtils
 *  com.seer.rds.vo.AlarmVo
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
import com.seer.rds.model.alarms.BaseAlarms;
import com.seer.rds.model.alarms.RobotAlarms;
import com.seer.rds.schedule.BusinessErrorReporting;
import com.seer.rds.service.Error.ErrorReportHandle;
import com.seer.rds.util.OkHttpUtil;
import com.seer.rds.util.server.DateUtils;
import com.seer.rds.vo.AlarmVo;
import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Properties;
import java.util.Set;
import java.util.stream.Collectors;
import org.apache.commons.collections.CollectionUtils;
import org.apache.commons.lang3.StringUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

@Component
public class HttpErrorReportingStrategy
implements ErrorReportHandle {
    private static final Logger log = LoggerFactory.getLogger(HttpErrorReportingStrategy.class);
    private final CoreAlarmsMapper coreAlarmsMapper;
    private final RobotAlarmsMapper robotAlarmsMapper;
    private final TaskAlarmsMapper taskAlarmsMapper;
    private final LocaleConfig localeConfig;

    public HttpErrorReportingStrategy(CoreAlarmsMapper coreAlarmsMapper, RobotAlarmsMapper robotAlarmsMapper, TaskAlarmsMapper taskAlarmsMapper, LocaleConfig localeConfig) {
        this.coreAlarmsMapper = coreAlarmsMapper;
        this.robotAlarmsMapper = robotAlarmsMapper;
        this.taskAlarmsMapper = taskAlarmsMapper;
        this.localeConfig = localeConfig;
    }

    private <T extends BaseAlarms> List<AlarmVo> sendHttpData(List<T> errorMsg, String language) {
        Locale lang = this.localeConfig.transformationLanguage(language);
        ArrayList<AlarmVo> list = new ArrayList<AlarmVo>();
        if (CollectionUtils.isNotEmpty(errorMsg)) {
            for (BaseAlarms t : errorMsg) {
                Integer errorTime = t.getErrorTime();
                String time = errorTime == null ? "" : DateUtils.parseCoreTimeStamp((Integer)errorTime, (String)DateUtils.YYYY_MM_DD_HH_MM_SS);
                Properties properties0 = (Properties)BusinessErrorReporting.alarmMaps.get("coreAlarmSolution_" + lang + ".properties");
                Properties properties1 = (Properties)BusinessErrorReporting.alarmMaps.get("rbkAlarmDesc_" + lang + ".properties");
                Properties properties2 = (Properties)BusinessErrorReporting.alarmMaps.get("rbkAlarmSolution_" + lang + ".properties");
                String desc = t.getSendMsg();
                String solution = "";
                if (t instanceof RobotAlarms) {
                    String result;
                    if (properties1 != null && StringUtils.isNotEmpty((CharSequence)(result = properties1.getProperty(t.getCode().toString())))) {
                        desc = result;
                    }
                    if (properties2 != null) {
                        solution = properties2.getProperty(t.getCode().toString());
                    }
                } else if (properties0 != null) {
                    solution = properties0.getProperty(t.getCode().toString());
                }
                AlarmVo alarmVo = new AlarmVo();
                alarmVo.setCode(t.getCode());
                alarmVo.setDescription(desc);
                alarmVo.setSolutions(solution);
                alarmVo.setTime(time);
                list.add(alarmVo);
            }
        }
        return list;
    }

    public boolean report(CommonConfig config) {
        String url = config.getSendAlarms().getApproach().getUpLink().getUrl();
        Map<String, List<RobotAlarms>> res = BusinessErrorReporting.rbkMsg.stream().collect(Collectors.groupingBy(RobotAlarms::getAgvId));
        Set<String> strings = res.keySet();
        String language = config.getSendAlarms().getLanguage();
        try {
            if (CollectionUtils.isNotEmpty((Collection)BusinessErrorReporting.coreMsg) || CollectionUtils.isNotEmpty((Collection)BusinessErrorReporting.rbkMsg)) {
                HashMap map = Maps.newHashMap();
                map.put("core", this.sendHttpData(BusinessErrorReporting.coreMsg, language));
                for (String string : strings) {
                    map.put(string, this.sendHttpData(res.get(string), language));
                }
                OkHttpUtil.postJson((String)url, (String)JSONObject.toJSONString((Object)map));
                BusinessErrorReporting.coreMsg.forEach(it -> it.setIsOk(Integer.valueOf(1)));
                this.coreAlarmsMapper.saveAll((Iterable)BusinessErrorReporting.coreMsg);
                BusinessErrorReporting.rbkMsg.forEach(it -> it.setIsOk(Integer.valueOf(1)));
                this.robotAlarmsMapper.saveAll((Iterable)BusinessErrorReporting.rbkMsg);
            }
        }
        catch (Exception e) {
            log.error("send http error {}", (Object)e.getMessage(), (Object)e);
            BusinessErrorReporting.coreMsgError.addAll(BusinessErrorReporting.coreMsg);
            BusinessErrorReporting.agvMsgError.addAll(BusinessErrorReporting.rbkMsg);
        }
        return true;
    }
}

