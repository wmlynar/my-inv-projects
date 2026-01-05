/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.config.DutyConfig
 *  com.seer.rds.config.StatDutyConfig
 *  com.seer.rds.config.configview.AgvErrorReportEmail
 *  com.seer.rds.config.configview.BasicAuthConfig
 *  com.seer.rds.config.configview.CommonConfig
 *  com.seer.rds.config.configview.DataConfigs
 *  com.seer.rds.config.configview.DebugConfigOfView
 *  com.seer.rds.config.configview.MailConfigOfView
 *  com.seer.rds.config.configview.ModbusLogConfig
 *  com.seer.rds.config.configview.MqttConfigView
 *  com.seer.rds.config.configview.ProxyWebPageConfig
 *  com.seer.rds.config.configview.RdsCoreConfigOfView
 *  com.seer.rds.config.configview.ReplayConfig
 *  com.seer.rds.config.configview.RequestPeriod
 *  com.seer.rds.config.configview.RestartRecoverConfigOfView
 *  com.seer.rds.config.configview.RoboViewConfig
 *  com.seer.rds.config.configview.SapConfig
 *  com.seer.rds.config.configview.SendAlarms
 *  com.seer.rds.config.configview.ShiroConfigOfView
 *  com.seer.rds.config.configview.TemplateConfig
 *  com.seer.rds.config.configview.WebPageConfig
 *  com.seer.rds.config.configview.WindTaskConfig
 *  com.seer.rds.config.configview.operator.OperatorConfig
 *  com.seer.rds.config.configview.operator.RequestTimeOutConfig
 *  com.seer.rds.constant.CorePoolSizeEnum
 */
package com.seer.rds.config.configview;

import com.seer.rds.config.DutyConfig;
import com.seer.rds.config.StatDutyConfig;
import com.seer.rds.config.configview.AgvErrorReportEmail;
import com.seer.rds.config.configview.BasicAuthConfig;
import com.seer.rds.config.configview.DataConfigs;
import com.seer.rds.config.configview.DebugConfigOfView;
import com.seer.rds.config.configview.MailConfigOfView;
import com.seer.rds.config.configview.ModbusLogConfig;
import com.seer.rds.config.configview.MqttConfigView;
import com.seer.rds.config.configview.ProxyWebPageConfig;
import com.seer.rds.config.configview.RdsCoreConfigOfView;
import com.seer.rds.config.configview.ReplayConfig;
import com.seer.rds.config.configview.RequestPeriod;
import com.seer.rds.config.configview.RestartRecoverConfigOfView;
import com.seer.rds.config.configview.RoboViewConfig;
import com.seer.rds.config.configview.SapConfig;
import com.seer.rds.config.configview.SendAlarms;
import com.seer.rds.config.configview.ShiroConfigOfView;
import com.seer.rds.config.configview.TemplateConfig;
import com.seer.rds.config.configview.WebPageConfig;
import com.seer.rds.config.configview.WindTaskConfig;
import com.seer.rds.config.configview.operator.OperatorConfig;
import com.seer.rds.config.configview.operator.RequestTimeOutConfig;
import com.seer.rds.constant.CorePoolSizeEnum;
import java.util.List;

public class CommonConfig {
    private RdsCoreConfigOfView rdscore = new RdsCoreConfigOfView();
    private OperatorConfig operator = null;
    private Boolean isRdsIconDisplay = true;
    private Boolean isDocDisplay = true;
    private Boolean isFireDisplay = false;
    private int pagerThreadNum = CorePoolSizeEnum.NUMBER_SIXTEEN.getNum();
    private List<WebPageConfig> webPageList = null;
    private MailConfigOfView emailConfig = new MailConfigOfView();
    private RestartRecoverConfigOfView restartRecoverConfig = new RestartRecoverConfigOfView();
    private DebugConfigOfView debug = new DebugConfigOfView();
    private AgvErrorReportEmail errorReportEmail = new AgvErrorReportEmail();
    private TemplateConfig template = new TemplateConfig();
    private ModbusLogConfig modbusLogConfig = new ModbusLogConfig();
    private RoboViewConfig roboViews = null;
    private MqttConfigView mqttConfigView = new MqttConfigView();
    private ReplayConfig replayConfig = new ReplayConfig();
    private BasicAuthConfig basicAuthConfig = new BasicAuthConfig();
    private RequestTimeOutConfig requestTimeOut = new RequestTimeOutConfig();
    private ShiroConfigOfView shiro = new ShiroConfigOfView();
    private SapConfig sapConfig = new SapConfig();
    private DataConfigs keepDataConfigs = new DataConfigs();
    private RequestPeriod requestPeriod = new RequestPeriod();
    private Boolean isStackMemoryDisplay = false;
    private ProxyWebPageConfig proxyWebPageConfig = new ProxyWebPageConfig();
    private SendAlarms sendAlarms = new SendAlarms();
    private DutyConfig dutyConfig = new DutyConfig();
    private WindTaskConfig windTask = new WindTaskConfig();
    private StatDutyConfig statDutyConfig = new StatDutyConfig();

    public RdsCoreConfigOfView getRdscore() {
        return this.rdscore;
    }

    public OperatorConfig getOperator() {
        return this.operator;
    }

    public Boolean getIsRdsIconDisplay() {
        return this.isRdsIconDisplay;
    }

    public Boolean getIsDocDisplay() {
        return this.isDocDisplay;
    }

    public Boolean getIsFireDisplay() {
        return this.isFireDisplay;
    }

    public int getPagerThreadNum() {
        return this.pagerThreadNum;
    }

    public List<WebPageConfig> getWebPageList() {
        return this.webPageList;
    }

    public MailConfigOfView getEmailConfig() {
        return this.emailConfig;
    }

    public RestartRecoverConfigOfView getRestartRecoverConfig() {
        return this.restartRecoverConfig;
    }

    public DebugConfigOfView getDebug() {
        return this.debug;
    }

    public AgvErrorReportEmail getErrorReportEmail() {
        return this.errorReportEmail;
    }

    public TemplateConfig getTemplate() {
        return this.template;
    }

    public ModbusLogConfig getModbusLogConfig() {
        return this.modbusLogConfig;
    }

    public RoboViewConfig getRoboViews() {
        return this.roboViews;
    }

    public MqttConfigView getMqttConfigView() {
        return this.mqttConfigView;
    }

    public ReplayConfig getReplayConfig() {
        return this.replayConfig;
    }

    public BasicAuthConfig getBasicAuthConfig() {
        return this.basicAuthConfig;
    }

    public RequestTimeOutConfig getRequestTimeOut() {
        return this.requestTimeOut;
    }

    public ShiroConfigOfView getShiro() {
        return this.shiro;
    }

    public SapConfig getSapConfig() {
        return this.sapConfig;
    }

    public DataConfigs getKeepDataConfigs() {
        return this.keepDataConfigs;
    }

    public RequestPeriod getRequestPeriod() {
        return this.requestPeriod;
    }

    public Boolean getIsStackMemoryDisplay() {
        return this.isStackMemoryDisplay;
    }

    public ProxyWebPageConfig getProxyWebPageConfig() {
        return this.proxyWebPageConfig;
    }

    public SendAlarms getSendAlarms() {
        return this.sendAlarms;
    }

    public DutyConfig getDutyConfig() {
        return this.dutyConfig;
    }

    public WindTaskConfig getWindTask() {
        return this.windTask;
    }

    public StatDutyConfig getStatDutyConfig() {
        return this.statDutyConfig;
    }

    public void setRdscore(RdsCoreConfigOfView rdscore) {
        this.rdscore = rdscore;
    }

    public void setOperator(OperatorConfig operator) {
        this.operator = operator;
    }

    public void setIsRdsIconDisplay(Boolean isRdsIconDisplay) {
        this.isRdsIconDisplay = isRdsIconDisplay;
    }

    public void setIsDocDisplay(Boolean isDocDisplay) {
        this.isDocDisplay = isDocDisplay;
    }

    public void setIsFireDisplay(Boolean isFireDisplay) {
        this.isFireDisplay = isFireDisplay;
    }

    public void setPagerThreadNum(int pagerThreadNum) {
        this.pagerThreadNum = pagerThreadNum;
    }

    public void setWebPageList(List<WebPageConfig> webPageList) {
        this.webPageList = webPageList;
    }

    public void setEmailConfig(MailConfigOfView emailConfig) {
        this.emailConfig = emailConfig;
    }

    public void setRestartRecoverConfig(RestartRecoverConfigOfView restartRecoverConfig) {
        this.restartRecoverConfig = restartRecoverConfig;
    }

    public void setDebug(DebugConfigOfView debug) {
        this.debug = debug;
    }

    public void setErrorReportEmail(AgvErrorReportEmail errorReportEmail) {
        this.errorReportEmail = errorReportEmail;
    }

    public void setTemplate(TemplateConfig template) {
        this.template = template;
    }

    public void setModbusLogConfig(ModbusLogConfig modbusLogConfig) {
        this.modbusLogConfig = modbusLogConfig;
    }

    public void setRoboViews(RoboViewConfig roboViews) {
        this.roboViews = roboViews;
    }

    public void setMqttConfigView(MqttConfigView mqttConfigView) {
        this.mqttConfigView = mqttConfigView;
    }

    public void setReplayConfig(ReplayConfig replayConfig) {
        this.replayConfig = replayConfig;
    }

    public void setBasicAuthConfig(BasicAuthConfig basicAuthConfig) {
        this.basicAuthConfig = basicAuthConfig;
    }

    public void setRequestTimeOut(RequestTimeOutConfig requestTimeOut) {
        this.requestTimeOut = requestTimeOut;
    }

    public void setShiro(ShiroConfigOfView shiro) {
        this.shiro = shiro;
    }

    public void setSapConfig(SapConfig sapConfig) {
        this.sapConfig = sapConfig;
    }

    public void setKeepDataConfigs(DataConfigs keepDataConfigs) {
        this.keepDataConfigs = keepDataConfigs;
    }

    public void setRequestPeriod(RequestPeriod requestPeriod) {
        this.requestPeriod = requestPeriod;
    }

    public void setIsStackMemoryDisplay(Boolean isStackMemoryDisplay) {
        this.isStackMemoryDisplay = isStackMemoryDisplay;
    }

    public void setProxyWebPageConfig(ProxyWebPageConfig proxyWebPageConfig) {
        this.proxyWebPageConfig = proxyWebPageConfig;
    }

    public void setSendAlarms(SendAlarms sendAlarms) {
        this.sendAlarms = sendAlarms;
    }

    public void setDutyConfig(DutyConfig dutyConfig) {
        this.dutyConfig = dutyConfig;
    }

    public void setWindTask(WindTaskConfig windTask) {
        this.windTask = windTask;
    }

    public void setStatDutyConfig(StatDutyConfig statDutyConfig) {
        this.statDutyConfig = statDutyConfig;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof CommonConfig)) {
            return false;
        }
        CommonConfig other = (CommonConfig)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        if (this.getPagerThreadNum() != other.getPagerThreadNum()) {
            return false;
        }
        Boolean this$isRdsIconDisplay = this.getIsRdsIconDisplay();
        Boolean other$isRdsIconDisplay = other.getIsRdsIconDisplay();
        if (this$isRdsIconDisplay == null ? other$isRdsIconDisplay != null : !((Object)this$isRdsIconDisplay).equals(other$isRdsIconDisplay)) {
            return false;
        }
        Boolean this$isDocDisplay = this.getIsDocDisplay();
        Boolean other$isDocDisplay = other.getIsDocDisplay();
        if (this$isDocDisplay == null ? other$isDocDisplay != null : !((Object)this$isDocDisplay).equals(other$isDocDisplay)) {
            return false;
        }
        Boolean this$isFireDisplay = this.getIsFireDisplay();
        Boolean other$isFireDisplay = other.getIsFireDisplay();
        if (this$isFireDisplay == null ? other$isFireDisplay != null : !((Object)this$isFireDisplay).equals(other$isFireDisplay)) {
            return false;
        }
        Boolean this$isStackMemoryDisplay = this.getIsStackMemoryDisplay();
        Boolean other$isStackMemoryDisplay = other.getIsStackMemoryDisplay();
        if (this$isStackMemoryDisplay == null ? other$isStackMemoryDisplay != null : !((Object)this$isStackMemoryDisplay).equals(other$isStackMemoryDisplay)) {
            return false;
        }
        RdsCoreConfigOfView this$rdscore = this.getRdscore();
        RdsCoreConfigOfView other$rdscore = other.getRdscore();
        if (this$rdscore == null ? other$rdscore != null : !this$rdscore.equals(other$rdscore)) {
            return false;
        }
        OperatorConfig this$operator = this.getOperator();
        OperatorConfig other$operator = other.getOperator();
        if (this$operator == null ? other$operator != null : !this$operator.equals(other$operator)) {
            return false;
        }
        List this$webPageList = this.getWebPageList();
        List other$webPageList = other.getWebPageList();
        if (this$webPageList == null ? other$webPageList != null : !((Object)this$webPageList).equals(other$webPageList)) {
            return false;
        }
        MailConfigOfView this$emailConfig = this.getEmailConfig();
        MailConfigOfView other$emailConfig = other.getEmailConfig();
        if (this$emailConfig == null ? other$emailConfig != null : !this$emailConfig.equals(other$emailConfig)) {
            return false;
        }
        RestartRecoverConfigOfView this$restartRecoverConfig = this.getRestartRecoverConfig();
        RestartRecoverConfigOfView other$restartRecoverConfig = other.getRestartRecoverConfig();
        if (this$restartRecoverConfig == null ? other$restartRecoverConfig != null : !this$restartRecoverConfig.equals(other$restartRecoverConfig)) {
            return false;
        }
        DebugConfigOfView this$debug = this.getDebug();
        DebugConfigOfView other$debug = other.getDebug();
        if (this$debug == null ? other$debug != null : !this$debug.equals(other$debug)) {
            return false;
        }
        AgvErrorReportEmail this$errorReportEmail = this.getErrorReportEmail();
        AgvErrorReportEmail other$errorReportEmail = other.getErrorReportEmail();
        if (this$errorReportEmail == null ? other$errorReportEmail != null : !this$errorReportEmail.equals(other$errorReportEmail)) {
            return false;
        }
        TemplateConfig this$template = this.getTemplate();
        TemplateConfig other$template = other.getTemplate();
        if (this$template == null ? other$template != null : !this$template.equals(other$template)) {
            return false;
        }
        ModbusLogConfig this$modbusLogConfig = this.getModbusLogConfig();
        ModbusLogConfig other$modbusLogConfig = other.getModbusLogConfig();
        if (this$modbusLogConfig == null ? other$modbusLogConfig != null : !this$modbusLogConfig.equals(other$modbusLogConfig)) {
            return false;
        }
        RoboViewConfig this$roboViews = this.getRoboViews();
        RoboViewConfig other$roboViews = other.getRoboViews();
        if (this$roboViews == null ? other$roboViews != null : !this$roboViews.equals(other$roboViews)) {
            return false;
        }
        MqttConfigView this$mqttConfigView = this.getMqttConfigView();
        MqttConfigView other$mqttConfigView = other.getMqttConfigView();
        if (this$mqttConfigView == null ? other$mqttConfigView != null : !this$mqttConfigView.equals(other$mqttConfigView)) {
            return false;
        }
        ReplayConfig this$replayConfig = this.getReplayConfig();
        ReplayConfig other$replayConfig = other.getReplayConfig();
        if (this$replayConfig == null ? other$replayConfig != null : !this$replayConfig.equals(other$replayConfig)) {
            return false;
        }
        BasicAuthConfig this$basicAuthConfig = this.getBasicAuthConfig();
        BasicAuthConfig other$basicAuthConfig = other.getBasicAuthConfig();
        if (this$basicAuthConfig == null ? other$basicAuthConfig != null : !this$basicAuthConfig.equals(other$basicAuthConfig)) {
            return false;
        }
        RequestTimeOutConfig this$requestTimeOut = this.getRequestTimeOut();
        RequestTimeOutConfig other$requestTimeOut = other.getRequestTimeOut();
        if (this$requestTimeOut == null ? other$requestTimeOut != null : !this$requestTimeOut.equals(other$requestTimeOut)) {
            return false;
        }
        ShiroConfigOfView this$shiro = this.getShiro();
        ShiroConfigOfView other$shiro = other.getShiro();
        if (this$shiro == null ? other$shiro != null : !this$shiro.equals(other$shiro)) {
            return false;
        }
        SapConfig this$sapConfig = this.getSapConfig();
        SapConfig other$sapConfig = other.getSapConfig();
        if (this$sapConfig == null ? other$sapConfig != null : !this$sapConfig.equals(other$sapConfig)) {
            return false;
        }
        DataConfigs this$keepDataConfigs = this.getKeepDataConfigs();
        DataConfigs other$keepDataConfigs = other.getKeepDataConfigs();
        if (this$keepDataConfigs == null ? other$keepDataConfigs != null : !this$keepDataConfigs.equals(other$keepDataConfigs)) {
            return false;
        }
        RequestPeriod this$requestPeriod = this.getRequestPeriod();
        RequestPeriod other$requestPeriod = other.getRequestPeriod();
        if (this$requestPeriod == null ? other$requestPeriod != null : !this$requestPeriod.equals(other$requestPeriod)) {
            return false;
        }
        ProxyWebPageConfig this$proxyWebPageConfig = this.getProxyWebPageConfig();
        ProxyWebPageConfig other$proxyWebPageConfig = other.getProxyWebPageConfig();
        if (this$proxyWebPageConfig == null ? other$proxyWebPageConfig != null : !this$proxyWebPageConfig.equals(other$proxyWebPageConfig)) {
            return false;
        }
        SendAlarms this$sendAlarms = this.getSendAlarms();
        SendAlarms other$sendAlarms = other.getSendAlarms();
        if (this$sendAlarms == null ? other$sendAlarms != null : !this$sendAlarms.equals(other$sendAlarms)) {
            return false;
        }
        DutyConfig this$dutyConfig = this.getDutyConfig();
        DutyConfig other$dutyConfig = other.getDutyConfig();
        if (this$dutyConfig == null ? other$dutyConfig != null : !this$dutyConfig.equals(other$dutyConfig)) {
            return false;
        }
        WindTaskConfig this$windTask = this.getWindTask();
        WindTaskConfig other$windTask = other.getWindTask();
        if (this$windTask == null ? other$windTask != null : !this$windTask.equals(other$windTask)) {
            return false;
        }
        StatDutyConfig this$statDutyConfig = this.getStatDutyConfig();
        StatDutyConfig other$statDutyConfig = other.getStatDutyConfig();
        return !(this$statDutyConfig == null ? other$statDutyConfig != null : !this$statDutyConfig.equals(other$statDutyConfig));
    }

    protected boolean canEqual(Object other) {
        return other instanceof CommonConfig;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        result = result * 59 + this.getPagerThreadNum();
        Boolean $isRdsIconDisplay = this.getIsRdsIconDisplay();
        result = result * 59 + ($isRdsIconDisplay == null ? 43 : ((Object)$isRdsIconDisplay).hashCode());
        Boolean $isDocDisplay = this.getIsDocDisplay();
        result = result * 59 + ($isDocDisplay == null ? 43 : ((Object)$isDocDisplay).hashCode());
        Boolean $isFireDisplay = this.getIsFireDisplay();
        result = result * 59 + ($isFireDisplay == null ? 43 : ((Object)$isFireDisplay).hashCode());
        Boolean $isStackMemoryDisplay = this.getIsStackMemoryDisplay();
        result = result * 59 + ($isStackMemoryDisplay == null ? 43 : ((Object)$isStackMemoryDisplay).hashCode());
        RdsCoreConfigOfView $rdscore = this.getRdscore();
        result = result * 59 + ($rdscore == null ? 43 : $rdscore.hashCode());
        OperatorConfig $operator = this.getOperator();
        result = result * 59 + ($operator == null ? 43 : $operator.hashCode());
        List $webPageList = this.getWebPageList();
        result = result * 59 + ($webPageList == null ? 43 : ((Object)$webPageList).hashCode());
        MailConfigOfView $emailConfig = this.getEmailConfig();
        result = result * 59 + ($emailConfig == null ? 43 : $emailConfig.hashCode());
        RestartRecoverConfigOfView $restartRecoverConfig = this.getRestartRecoverConfig();
        result = result * 59 + ($restartRecoverConfig == null ? 43 : $restartRecoverConfig.hashCode());
        DebugConfigOfView $debug = this.getDebug();
        result = result * 59 + ($debug == null ? 43 : $debug.hashCode());
        AgvErrorReportEmail $errorReportEmail = this.getErrorReportEmail();
        result = result * 59 + ($errorReportEmail == null ? 43 : $errorReportEmail.hashCode());
        TemplateConfig $template = this.getTemplate();
        result = result * 59 + ($template == null ? 43 : $template.hashCode());
        ModbusLogConfig $modbusLogConfig = this.getModbusLogConfig();
        result = result * 59 + ($modbusLogConfig == null ? 43 : $modbusLogConfig.hashCode());
        RoboViewConfig $roboViews = this.getRoboViews();
        result = result * 59 + ($roboViews == null ? 43 : $roboViews.hashCode());
        MqttConfigView $mqttConfigView = this.getMqttConfigView();
        result = result * 59 + ($mqttConfigView == null ? 43 : $mqttConfigView.hashCode());
        ReplayConfig $replayConfig = this.getReplayConfig();
        result = result * 59 + ($replayConfig == null ? 43 : $replayConfig.hashCode());
        BasicAuthConfig $basicAuthConfig = this.getBasicAuthConfig();
        result = result * 59 + ($basicAuthConfig == null ? 43 : $basicAuthConfig.hashCode());
        RequestTimeOutConfig $requestTimeOut = this.getRequestTimeOut();
        result = result * 59 + ($requestTimeOut == null ? 43 : $requestTimeOut.hashCode());
        ShiroConfigOfView $shiro = this.getShiro();
        result = result * 59 + ($shiro == null ? 43 : $shiro.hashCode());
        SapConfig $sapConfig = this.getSapConfig();
        result = result * 59 + ($sapConfig == null ? 43 : $sapConfig.hashCode());
        DataConfigs $keepDataConfigs = this.getKeepDataConfigs();
        result = result * 59 + ($keepDataConfigs == null ? 43 : $keepDataConfigs.hashCode());
        RequestPeriod $requestPeriod = this.getRequestPeriod();
        result = result * 59 + ($requestPeriod == null ? 43 : $requestPeriod.hashCode());
        ProxyWebPageConfig $proxyWebPageConfig = this.getProxyWebPageConfig();
        result = result * 59 + ($proxyWebPageConfig == null ? 43 : $proxyWebPageConfig.hashCode());
        SendAlarms $sendAlarms = this.getSendAlarms();
        result = result * 59 + ($sendAlarms == null ? 43 : $sendAlarms.hashCode());
        DutyConfig $dutyConfig = this.getDutyConfig();
        result = result * 59 + ($dutyConfig == null ? 43 : $dutyConfig.hashCode());
        WindTaskConfig $windTask = this.getWindTask();
        result = result * 59 + ($windTask == null ? 43 : $windTask.hashCode());
        StatDutyConfig $statDutyConfig = this.getStatDutyConfig();
        result = result * 59 + ($statDutyConfig == null ? 43 : $statDutyConfig.hashCode());
        return result;
    }

    public String toString() {
        return "CommonConfig(rdscore=" + this.getRdscore() + ", operator=" + this.getOperator() + ", isRdsIconDisplay=" + this.getIsRdsIconDisplay() + ", isDocDisplay=" + this.getIsDocDisplay() + ", isFireDisplay=" + this.getIsFireDisplay() + ", pagerThreadNum=" + this.getPagerThreadNum() + ", webPageList=" + this.getWebPageList() + ", emailConfig=" + this.getEmailConfig() + ", restartRecoverConfig=" + this.getRestartRecoverConfig() + ", debug=" + this.getDebug() + ", errorReportEmail=" + this.getErrorReportEmail() + ", template=" + this.getTemplate() + ", modbusLogConfig=" + this.getModbusLogConfig() + ", roboViews=" + this.getRoboViews() + ", mqttConfigView=" + this.getMqttConfigView() + ", replayConfig=" + this.getReplayConfig() + ", basicAuthConfig=" + this.getBasicAuthConfig() + ", requestTimeOut=" + this.getRequestTimeOut() + ", shiro=" + this.getShiro() + ", sapConfig=" + this.getSapConfig() + ", keepDataConfigs=" + this.getKeepDataConfigs() + ", requestPeriod=" + this.getRequestPeriod() + ", isStackMemoryDisplay=" + this.getIsStackMemoryDisplay() + ", proxyWebPageConfig=" + this.getProxyWebPageConfig() + ", sendAlarms=" + this.getSendAlarms() + ", dutyConfig=" + this.getDutyConfig() + ", windTask=" + this.getWindTask() + ", statDutyConfig=" + this.getStatDutyConfig() + ")";
    }
}

