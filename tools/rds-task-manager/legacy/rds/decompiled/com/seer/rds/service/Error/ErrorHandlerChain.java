/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.config.configview.CommonConfig
 *  com.seer.rds.dao.CoreAlarmsMapper
 *  com.seer.rds.dao.RobotAlarmsMapper
 *  com.seer.rds.dao.TaskAlarmsMapper
 *  com.seer.rds.model.alarms.BaseAlarms
 *  com.seer.rds.schedule.BusinessErrorReporting
 *  com.seer.rds.service.Error.ErrorHandlerChain
 *  com.seer.rds.service.Error.ErrorReportHandle
 *  com.seer.rds.service.Error.FeiShuErrorReportingStrategy
 *  com.seer.rds.service.Error.HttpErrorReportingStrategy
 *  com.seer.rds.service.Error.MailErrorReportingStrategy
 *  com.seer.rds.service.Error.VXRobotErrorReportingStrategy
 *  com.seer.rds.web.config.ConfigFileController
 *  javax.annotation.PostConstruct
 *  org.apache.commons.collections.CollectionUtils
 *  org.apache.commons.lang3.StringUtils
 *  org.slf4j.Logger
 *  org.slf4j.LoggerFactory
 *  org.springframework.context.annotation.Scope
 *  org.springframework.stereotype.Component
 */
package com.seer.rds.service.Error;

import com.seer.rds.config.configview.CommonConfig;
import com.seer.rds.dao.CoreAlarmsMapper;
import com.seer.rds.dao.RobotAlarmsMapper;
import com.seer.rds.dao.TaskAlarmsMapper;
import com.seer.rds.model.alarms.BaseAlarms;
import com.seer.rds.schedule.BusinessErrorReporting;
import com.seer.rds.service.Error.ErrorReportHandle;
import com.seer.rds.service.Error.FeiShuErrorReportingStrategy;
import com.seer.rds.service.Error.HttpErrorReportingStrategy;
import com.seer.rds.service.Error.MailErrorReportingStrategy;
import com.seer.rds.service.Error.VXRobotErrorReportingStrategy;
import com.seer.rds.web.config.ConfigFileController;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Date;
import java.util.List;
import java.util.Set;
import javax.annotation.PostConstruct;
import org.apache.commons.collections.CollectionUtils;
import org.apache.commons.lang3.StringUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Scope;
import org.springframework.stereotype.Component;

@Component
@Scope(value="prototype")
public class ErrorHandlerChain {
    private static final Logger log = LoggerFactory.getLogger(ErrorHandlerChain.class);
    private final HttpErrorReportingStrategy httpErrorReportingStrategy;
    private final MailErrorReportingStrategy mailErrorReportingStrategy;
    private final VXRobotErrorReportingStrategy vxRobotErrorReportingStrategy;
    private final FeiShuErrorReportingStrategy feiShuErrorReportingStrategy;
    private final List<ErrorReportHandle> handlers = new ArrayList();
    private CommonConfig bizConfig;
    private final CoreAlarmsMapper coreAlarmsMapper;
    private final RobotAlarmsMapper robotAlarmsMapper;
    private final TaskAlarmsMapper taskAlarmsMapper;

    public ErrorHandlerChain(HttpErrorReportingStrategy httpErrorReportingStrategy, MailErrorReportingStrategy mailErrorReportingStrategy, VXRobotErrorReportingStrategy vxRobotErrorReportingStrategy, FeiShuErrorReportingStrategy feiShuErrorReportingStrategy, CoreAlarmsMapper coreAlarmsMapper, RobotAlarmsMapper robotAlarmsMapper, TaskAlarmsMapper taskAlarmsMapper) {
        this.httpErrorReportingStrategy = httpErrorReportingStrategy;
        this.mailErrorReportingStrategy = mailErrorReportingStrategy;
        this.vxRobotErrorReportingStrategy = vxRobotErrorReportingStrategy;
        this.feiShuErrorReportingStrategy = feiShuErrorReportingStrategy;
        this.coreAlarmsMapper = coreAlarmsMapper;
        this.robotAlarmsMapper = robotAlarmsMapper;
        this.taskAlarmsMapper = taskAlarmsMapper;
    }

    @PostConstruct
    public void init() {
        this.initData();
        this.initErrorHandlers();
    }

    private void initData() {
        BusinessErrorReporting.coreMsgError.clear();
        BusinessErrorReporting.agvMsgError.clear();
        BusinessErrorReporting.taskMsgError.clear();
        BusinessErrorReporting.coreMsg.clear();
        BusinessErrorReporting.rbkMsg.clear();
        BusinessErrorReporting.taskMsg.clear();
        this.bizConfig = ConfigFileController.commonConfig;
        BusinessErrorReporting.coreMsg.addAll(this.coreAlarmsMapper.findAllByIsOkEquals(0));
        BusinessErrorReporting.rbkMsg.addAll(this.robotAlarmsMapper.findAllByIsOkEquals(0));
        BusinessErrorReporting.taskMsg.addAll(this.taskAlarmsMapper.findAllByIsOkEquals(0));
    }

    public void addHandle(ErrorReportHandle errorReportHandle) {
        this.handlers.add(errorReportHandle);
    }

    public void handle() {
        for (ErrorReportHandle handler : this.handlers) {
            handler.report(this.bizConfig);
        }
        Integer no = this.bizConfig.getSendAlarms().getTimes();
        if (CollectionUtils.isNotEmpty((Collection)BusinessErrorReporting.coreMsgError)) {
            this.updateFailedNo(BusinessErrorReporting.coreMsgError, no);
            this.coreAlarmsMapper.saveAll((Iterable)BusinessErrorReporting.coreMsgError);
        }
        if (CollectionUtils.isNotEmpty((Collection)BusinessErrorReporting.agvMsgError)) {
            this.updateFailedNo(BusinessErrorReporting.agvMsgError, no);
            this.robotAlarmsMapper.saveAll((Iterable)BusinessErrorReporting.agvMsgError);
        }
        if (CollectionUtils.isNotEmpty((Collection)BusinessErrorReporting.taskMsgError)) {
            this.updateFailedNo(BusinessErrorReporting.taskMsgError, no);
            this.taskAlarmsMapper.saveAll((Iterable)BusinessErrorReporting.taskMsgError);
        }
    }

    public void initErrorHandlers() {
        String webhookFeiShu;
        String webhookVx;
        String url;
        this.handlers.clear();
        this.bizConfig = ConfigFileController.commonConfig;
        String toAddresses = this.bizConfig.getSendAlarms().getApproach().getMail().getToAddresses();
        if (StringUtils.isNotEmpty((CharSequence)toAddresses)) {
            this.addHandle((ErrorReportHandle)this.mailErrorReportingStrategy);
        }
        if (StringUtils.isNotEmpty((CharSequence)(url = this.bizConfig.getSendAlarms().getApproach().getUpLink().getUrl()))) {
            this.addHandle((ErrorReportHandle)this.httpErrorReportingStrategy);
        }
        if (StringUtils.isNotEmpty((CharSequence)(webhookVx = this.bizConfig.getSendAlarms().getApproach().getVxRobot().getWebhook()))) {
            this.addHandle((ErrorReportHandle)this.vxRobotErrorReportingStrategy);
        }
        if (StringUtils.isNotEmpty((CharSequence)(webhookFeiShu = this.bizConfig.getSendAlarms().getApproach().getFsRobot().getWebhook()))) {
            this.addHandle((ErrorReportHandle)this.feiShuErrorReportingStrategy);
        }
    }

    private <T extends BaseAlarms> void updateFailedNo(Set<T> coreMsgError, Integer no) {
        if (no == null) {
            return;
        }
        coreMsgError.stream().filter(it -> it.getCurrentNo() >= Integer.MAX_VALUE || no > 0 && it.getCurrentNo() >= no).forEach(it -> {
            it.setIsOk(Integer.valueOf(2));
            it.setUpdateTime(new Date());
        });
        coreMsgError.stream().filter(it -> it.getCurrentNo() < Integer.MAX_VALUE && (no <= 0 || it.getCurrentNo() < no)).forEach(it -> {
            it.setCurrentNo(Integer.valueOf(it.getCurrentNo() + 1));
            it.setUpdateTime(new Date());
        });
    }
}

