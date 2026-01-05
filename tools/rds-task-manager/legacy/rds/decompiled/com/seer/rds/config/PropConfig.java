/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.config.DutyConfig
 *  com.seer.rds.config.PropConfig
 *  com.seer.rds.config.StatDutyConfig
 *  com.seer.rds.config.configview.AgvErrorReportEmail
 *  com.seer.rds.config.configview.CommonConfig
 *  com.seer.rds.config.configview.DebugConfigOfView
 *  com.seer.rds.config.configview.ModbusLogConfig
 *  com.seer.rds.config.configview.MqttConfigView
 *  com.seer.rds.config.configview.RdsCoreConfigOfView
 *  com.seer.rds.config.configview.ReplayConfig
 *  com.seer.rds.config.configview.RequestPeriod
 *  com.seer.rds.config.configview.RestartRecoverConfigOfView
 *  com.seer.rds.config.configview.SapConfig
 *  com.seer.rds.config.configview.ShiroConfigOfView
 *  com.seer.rds.config.configview.TemplateConfig
 *  com.seer.rds.config.configview.operator.RequestTimeOutConfig
 *  com.seer.rds.constant.CorePoolSizeEnum
 *  com.seer.rds.model.wind.WindTaskRecord
 *  com.seer.rds.web.config.ConfigFileController
 *  org.apache.commons.lang3.StringUtils
 *  org.springframework.beans.factory.annotation.Value
 *  org.springframework.boot.system.ApplicationHome
 *  org.springframework.context.annotation.Configuration
 */
package com.seer.rds.config;

import com.seer.rds.config.DutyConfig;
import com.seer.rds.config.StatDutyConfig;
import com.seer.rds.config.configview.AgvErrorReportEmail;
import com.seer.rds.config.configview.CommonConfig;
import com.seer.rds.config.configview.DebugConfigOfView;
import com.seer.rds.config.configview.ModbusLogConfig;
import com.seer.rds.config.configview.MqttConfigView;
import com.seer.rds.config.configview.RdsCoreConfigOfView;
import com.seer.rds.config.configview.ReplayConfig;
import com.seer.rds.config.configview.RequestPeriod;
import com.seer.rds.config.configview.RestartRecoverConfigOfView;
import com.seer.rds.config.configview.SapConfig;
import com.seer.rds.config.configview.ShiroConfigOfView;
import com.seer.rds.config.configview.TemplateConfig;
import com.seer.rds.config.configview.operator.RequestTimeOutConfig;
import com.seer.rds.constant.CorePoolSizeEnum;
import com.seer.rds.model.wind.WindTaskRecord;
import com.seer.rds.web.config.ConfigFileController;
import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.LinkOption;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.attribute.BasicFileAttributes;
import java.nio.file.attribute.FileTime;
import java.text.SimpleDateFormat;
import java.util.Calendar;
import java.util.Date;
import org.apache.commons.lang3.StringUtils;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.system.ApplicationHome;
import org.springframework.context.annotation.Configuration;

/*
 * Exception performing whole class analysis ignored.
 */
@Configuration
public class PropConfig {
    @Value(value="${server.ssl.enabled: false}")
    private boolean sslEnabled;
    @Value(value="${server.port: 8090}")
    private int port;
    @Value(value="${server.http-port: 8080}")
    private int httpPort;
    @Value(value="${project.version: 1.0.0}")
    private String projectVersion;
    @Value(value="${rdscore.baseUrl:http://127.0.0.1:8088}")
    private String rdsCoreUrl;
    @Value(value="${rdscore.queryInterval:400}")
    private long rdsCoreQueryInterval;
    @Value(value="${rds.env: prod}")
    private String env;
    @Value(value="${spring.datasource.driver-class-name}")
    private String driverClassName;
    @Value(value="${spring.datasource.second.driver-class-name}")
    private String driverClassName1;
    @Value(value="${spring.datasource.kingdb.driver-class-name}")
    private String kingDriverClassName;
    @Value(value="${spring.datasource.url: jdbc:mysql://localhost:3306/rds?userSSL=false&serverTimezone=GMT%2B8&useUnicode=true&characterEncoding=UTF-8}")
    private String databaseUrl;
    @Value(value="${spring.datasource.username: root}")
    private String databaseUsername;
    @Value(value="${spring.datasource.password: rpth1q14QRnfAI/+/cgwdDoquCGOy03scSKIX4ow8dx+/9fM1E0mtmB3wCPWP9TBGQg6g5t1u7y5FxE58d2dAA==}")
    private String databasePassword;
    @Value(value="${spring.datasource.databaseType: MYSQL}")
    private String databaseType;
    @Value(value="${DBEncode}")
    private Boolean DBEncode;
    @Value(value="${databasePublicKey}")
    private String databasePublicKey;
    @Deprecated
    @Value(value="${clearDateMonth: 12}")
    private int clearDateMonth;
    @Deprecated
    @Value(value="${clearStatRecordInterval: 3}")
    private int clearStatRecordInterval;
    @Deprecated
    @Value(value="${clearAlarmsRecordsMonth: 1}")
    private int clearAlarmsRecordsMonth;
    @Deprecated
    @Value(value="${clearBatteryLevelRecordDay: 7}")
    private int clearBatteryLevelRecordDay;
    @Value(value="${rds.replayRobotStatuses:.data/rds/replay/robotStatuses}")
    private String replayRobotStatuses;
    @Value(value="${rds.replayScenes:.data/rds/replay/scenes}")
    private String replayScenes;
    @Value(value="${rds.replaySites:.data/rds/replay/sites}")
    private String replaySites;
    @Value(value="${rds.replayUpload:.data/rds/replay/upload}")
    private String replayUpload;
    @Value(value="${rds.appDir}")
    private String appPath;
    @Value(value="${rds.staticDir}")
    private String staticPath;
    @Value(value="${rds.configDir}")
    private String configPath;
    @Value(value="${rds.scriptDir}")
    private String scriptPath;
    @Value(value="${rds.templateDir}")
    private String templatePath;
    @Value(value="${rds.sceneDir}")
    private String scenePath;
    @Value(value="${rds.licenseDir}")
    private String licensePath;
    @Value(value="${rds.rdsHistoryDir}")
    private String rdsHistoryPath;

    public String getProjectVersion() {
        return this.projectVersion;
    }

    public static String getRdsCoreBaseUrl() {
        String baseUrl;
        RdsCoreConfigOfView rdscore;
        CommonConfig commonConfig = ConfigFileController.commonConfig;
        if (commonConfig != null && (rdscore = commonConfig.getRdscore()) != null && StringUtils.isNotEmpty((CharSequence)(baseUrl = rdscore.getBaseUrl()))) {
            return baseUrl.endsWith("/") ? baseUrl : baseUrl + "/";
        }
        return "http://127.0.0.1:8088/";
    }

    public String getRdsCoreUrl() {
        String baseUrl;
        RdsCoreConfigOfView rdscore;
        CommonConfig commonConfig = ConfigFileController.commonConfig;
        if (commonConfig != null && (rdscore = commonConfig.getRdscore()) != null && StringUtils.isNotEmpty((CharSequence)(baseUrl = rdscore.getBaseUrl()))) {
            return baseUrl.endsWith("/") ? baseUrl : baseUrl + "/";
        }
        return this.rdsCoreUrl.endsWith("/") ? this.rdsCoreUrl : this.rdsCoreUrl + "/";
    }

    public static long getRdsCoreQueryInterval() {
        RdsCoreConfigOfView rdsCore;
        CommonConfig commonConfig = ConfigFileController.commonConfig;
        if (commonConfig != null && (rdsCore = commonConfig.getRdscore()) != null) {
            long queryInterval = rdsCore.getQueryInterval();
            return queryInterval;
        }
        return 400L;
    }

    public static boolean isRdsIconDisplay() {
        CommonConfig commonConfig = ConfigFileController.commonConfig;
        if (commonConfig != null) {
            return commonConfig.getIsRdsIconDisplay();
        }
        return false;
    }

    public static boolean isFireDisplay() {
        CommonConfig commonConfig = ConfigFileController.commonConfig;
        if (commonConfig != null) {
            return commonConfig.getIsFireDisplay();
        }
        return false;
    }

    public static boolean ifRestartRecover(WindTaskRecord taskRecord) {
        CommonConfig commonConfig = ConfigFileController.commonConfig;
        if (commonConfig != null) {
            RestartRecoverConfigOfView restartRecoverConfig = commonConfig.getRestartRecoverConfig();
            Boolean restartRecover = restartRecoverConfig.getRestartRecover();
            if (restartRecover.booleanValue()) {
                int keepDays = restartRecoverConfig.getKeepDays();
                if (keepDays < 0) {
                    return true;
                }
                Calendar c = Calendar.getInstance();
                c.setTime(new Date());
                c.set(5, c.get(5) - keepDays);
                return taskRecord.getCreatedOn().toInstant().isAfter(c.toInstant());
            }
            return false;
        }
        return false;
    }

    public static boolean ifDebug() {
        CommonConfig commonConfig = ConfigFileController.commonConfig;
        if (commonConfig != null) {
            DebugConfigOfView debug = commonConfig.getDebug();
            Boolean ifDebug = debug.getIfDebug();
            return ifDebug != false;
        }
        return false;
    }

    public static boolean ifEnableShiro() {
        CommonConfig commonConfig = ConfigFileController.commonConfig;
        if (commonConfig != null) {
            ShiroConfigOfView shiroConfig = commonConfig.getShiro();
            Boolean ifEnableShiro = shiroConfig.getIfEnableShiro();
            return ifEnableShiro != false;
        }
        return false;
    }

    public static boolean ifShowTemplateTask() {
        CommonConfig commonConfig = ConfigFileController.commonConfig;
        if (commonConfig != null) {
            TemplateConfig templateConfig = commonConfig.getTemplate();
            Boolean ifShowTask = templateConfig.getIfShowTask();
            return ifShowTask != false;
        }
        return false;
    }

    public static RequestTimeOutConfig getTimeOut() {
        CommonConfig commonConfig = ConfigFileController.commonConfig;
        if (commonConfig != null) {
            RequestTimeOutConfig requestTimeOut = commonConfig.getRequestTimeOut();
            return requestTimeOut;
        }
        RequestTimeOutConfig requestTimeOutConfig = new RequestTimeOutConfig();
        requestTimeOutConfig.setModbusTimeOut(5000);
        requestTimeOutConfig.setHttpConnectTimeout(5000);
        requestTimeOutConfig.setHttpReadTimeout(5000);
        requestTimeOutConfig.setHttpWriteTimeout(5000);
        return requestTimeOutConfig;
    }

    public static RequestPeriod getRequestPeriod() {
        CommonConfig commonConfig = ConfigFileController.commonConfig;
        if (commonConfig != null) {
            RequestPeriod requestPeriod = commonConfig.getRequestPeriod();
            return requestPeriod;
        }
        RequestPeriod requestPeriod = new RequestPeriod();
        requestPeriod.setQueryOrdersCachePeriod(2);
        return requestPeriod;
    }

    public static boolean ifReportErrorEmail() {
        CommonConfig commonConfig = ConfigFileController.commonConfig;
        if (commonConfig != null) {
            AgvErrorReportEmail emailReportEmail = commonConfig.getErrorReportEmail();
            Boolean ifReportErrorEmail = emailReportEmail.getIfEnabled();
            return ifReportErrorEmail != false;
        }
        return false;
    }

    public static Boolean ifModbusLog() {
        CommonConfig commonConfig = ConfigFileController.commonConfig;
        if (commonConfig != null) {
            ModbusLogConfig modbusLogConfig = commonConfig.getModbusLogConfig();
            Boolean saveLog = modbusLogConfig.getSaveLog();
            if (saveLog.booleanValue()) {
                return true;
            }
            return false;
        }
        return false;
    }

    public static Boolean ifEnableMqtt() {
        CommonConfig commonConfig = ConfigFileController.commonConfig;
        if (commonConfig != null) {
            MqttConfigView mqttConfigView = commonConfig.getMqttConfigView();
            Boolean enableMqtt = mqttConfigView.getEnable();
            if (enableMqtt.booleanValue()) {
                return true;
            }
            return false;
        }
        return false;
    }

    public static Boolean ifEnableReplay() {
        CommonConfig commonConfig = ConfigFileController.commonConfig;
        if (commonConfig != null) {
            ReplayConfig replayConfig = commonConfig.getReplayConfig();
            Boolean enable = replayConfig.getEnable();
            if (enable.booleanValue()) {
                return true;
            }
            return false;
        }
        return true;
    }

    public static int getPagerThreadNum() {
        CommonConfig commonConfig = ConfigFileController.commonConfig;
        if (commonConfig != null) {
            return commonConfig.getPagerThreadNum();
        }
        return CorePoolSizeEnum.NUMBER_SIXTEEN.getNum();
    }

    public static Boolean ifEnableIdocServer() {
        CommonConfig commonConfig = ConfigFileController.commonConfig;
        if (commonConfig != null) {
            SapConfig sapConfig = commonConfig.getSapConfig();
            Boolean enable = sapConfig.getEnable();
            if (enable.booleanValue()) {
                return true;
            }
            return false;
        }
        return false;
    }

    public String getRdsApptDir() {
        String rootPath = this.getRootPath();
        return rootPath + this.appPath + "/";
    }

    public String getRdsStaticDir() {
        String rootPath = this.getRootPath();
        return rootPath + this.staticPath + "/";
    }

    public String getRdsScriptDir() {
        String rootPath = this.getRootPath();
        return rootPath + this.scriptPath + "/";
    }

    public String getRdsHistoryDir() {
        String rootPath = this.getRootPath();
        return rootPath + this.rdsHistoryPath + "/";
    }

    public String getRdsTemplateDir() {
        String rootPath = this.getRootPath();
        return rootPath + this.templatePath + "/";
    }

    public String getConfigDir() {
        String rootPath = this.getRootPath();
        return rootPath + this.configPath + "/";
    }

    public String getSceneDir() {
        String rootPath = this.getRootPath();
        return rootPath + this.scenePath + "/";
    }

    public String getLicenseDir() {
        String rootPath = this.getRootPath();
        return rootPath + this.licensePath + "/";
    }

    public String getScriptDir() {
        String rootPath = this.getRootPath();
        return rootPath + this.scriptPath + "/";
    }

    public String getAppDir() {
        String rootPath = this.getRootPath();
        return rootPath + this.appPath + "/";
    }

    public String getReplayRobotStatusesDir() {
        String rootPath = this.getRootPath();
        return rootPath + this.replayRobotStatuses + "/";
    }

    public String getReplayScenesDir() {
        String rootPath = this.getRootPath();
        return rootPath + this.replayScenes + "/";
    }

    public String getReplaySitesDir() {
        String rootPath = this.getRootPath();
        return rootPath + this.replaySites + "/";
    }

    public String getReplayUploadDir() {
        String rootPath = this.getRootPath();
        return rootPath + this.replayUpload + "/";
    }

    public boolean getSslEnabled() {
        return this.sslEnabled;
    }

    private String getRootPath() {
        ApplicationHome home = new ApplicationHome();
        String rootPath = home.getDir().getAbsolutePath();
        if (rootPath.contains("\\")) {
            rootPath = rootPath.replaceAll("\\\\", "/");
        }
        if (rootPath.endsWith("app")) {
            rootPath = rootPath.substring(0, rootPath.indexOf(this.appPath));
        }
        return rootPath;
    }

    public String getCreateDate(File file) throws IOException {
        Path path = Paths.get(file.getAbsolutePath(), new String[0]);
        BasicFileAttributes attrs = Files.readAttributes(path, BasicFileAttributes.class, new LinkOption[0]);
        FileTime fileTime = attrs.creationTime();
        long millis = fileTime.toMillis();
        SimpleDateFormat dateFormat = new SimpleDateFormat("YYYY-MM-dd HH:mm:ss");
        Date date = new Date();
        date.setTime(millis);
        String time = dateFormat.format(date);
        return time;
    }

    public String getDutyUrl() {
        String url;
        DutyConfig dutyConfig;
        CommonConfig commonConfig = ConfigFileController.commonConfig;
        if (commonConfig != null && (dutyConfig = commonConfig.getDutyConfig()) != null && StringUtils.isNotEmpty((CharSequence)(url = dutyConfig.getUrl()))) {
            return url.endsWith("/") ? url : url + "/";
        }
        return "";
    }

    public String getStatOnWorkTime() {
        StatDutyConfig statDutyConfig;
        CommonConfig commonConfig = ConfigFileController.commonConfig;
        if (commonConfig != null && (statDutyConfig = commonConfig.getStatDutyConfig()) != null) {
            return statDutyConfig.getOnWorkTime();
        }
        return "";
    }

    public String getStatOffWorkTime() {
        StatDutyConfig statDutyConfig;
        CommonConfig commonConfig = ConfigFileController.commonConfig;
        if (commonConfig != null && (statDutyConfig = commonConfig.getStatDutyConfig()) != null) {
            return statDutyConfig.getOffWorkTime();
        }
        return "";
    }

    public static void main(String[] args) {
        new PropConfig().getRootPath();
    }

    public static int getModbusRetryDelay() {
        Integer retryDelay;
        CommonConfig commonConfig = ConfigFileController.commonConfig;
        if (commonConfig != null && (retryDelay = commonConfig.getWindTask().getModbusConfig().getRetryDelay()) != null && retryDelay > 0) {
            return retryDelay;
        }
        return 2000;
    }

    public int getPort() {
        return this.port;
    }

    public int getHttpPort() {
        return this.httpPort;
    }

    public String getEnv() {
        return this.env;
    }

    public String getDriverClassName() {
        return this.driverClassName;
    }

    public String getDriverClassName1() {
        return this.driverClassName1;
    }

    public String getKingDriverClassName() {
        return this.kingDriverClassName;
    }

    public String getDatabaseUrl() {
        return this.databaseUrl;
    }

    public String getDatabaseUsername() {
        return this.databaseUsername;
    }

    public String getDatabasePassword() {
        return this.databasePassword;
    }

    public String getDatabaseType() {
        return this.databaseType;
    }

    public Boolean getDBEncode() {
        return this.DBEncode;
    }

    public String getDatabasePublicKey() {
        return this.databasePublicKey;
    }

    @Deprecated
    public int getClearDateMonth() {
        return this.clearDateMonth;
    }

    @Deprecated
    public int getClearStatRecordInterval() {
        return this.clearStatRecordInterval;
    }

    @Deprecated
    public int getClearAlarmsRecordsMonth() {
        return this.clearAlarmsRecordsMonth;
    }

    @Deprecated
    public int getClearBatteryLevelRecordDay() {
        return this.clearBatteryLevelRecordDay;
    }

    public String getReplayRobotStatuses() {
        return this.replayRobotStatuses;
    }

    public String getReplayScenes() {
        return this.replayScenes;
    }

    public String getReplaySites() {
        return this.replaySites;
    }

    public String getReplayUpload() {
        return this.replayUpload;
    }

    public String getAppPath() {
        return this.appPath;
    }

    public String getStaticPath() {
        return this.staticPath;
    }

    public String getConfigPath() {
        return this.configPath;
    }

    public String getScriptPath() {
        return this.scriptPath;
    }

    public String getTemplatePath() {
        return this.templatePath;
    }

    public String getScenePath() {
        return this.scenePath;
    }

    public String getLicensePath() {
        return this.licensePath;
    }

    public String getRdsHistoryPath() {
        return this.rdsHistoryPath;
    }

    public void setSslEnabled(boolean sslEnabled) {
        this.sslEnabled = sslEnabled;
    }

    public void setPort(int port) {
        this.port = port;
    }

    public void setHttpPort(int httpPort) {
        this.httpPort = httpPort;
    }

    public void setProjectVersion(String projectVersion) {
        this.projectVersion = projectVersion;
    }

    public void setRdsCoreUrl(String rdsCoreUrl) {
        this.rdsCoreUrl = rdsCoreUrl;
    }

    public void setRdsCoreQueryInterval(long rdsCoreQueryInterval) {
        this.rdsCoreQueryInterval = rdsCoreQueryInterval;
    }

    public void setEnv(String env) {
        this.env = env;
    }

    public void setDriverClassName(String driverClassName) {
        this.driverClassName = driverClassName;
    }

    public void setDriverClassName1(String driverClassName1) {
        this.driverClassName1 = driverClassName1;
    }

    public void setKingDriverClassName(String kingDriverClassName) {
        this.kingDriverClassName = kingDriverClassName;
    }

    public void setDatabaseUrl(String databaseUrl) {
        this.databaseUrl = databaseUrl;
    }

    public void setDatabaseUsername(String databaseUsername) {
        this.databaseUsername = databaseUsername;
    }

    public void setDatabasePassword(String databasePassword) {
        this.databasePassword = databasePassword;
    }

    public void setDatabaseType(String databaseType) {
        this.databaseType = databaseType;
    }

    public void setDBEncode(Boolean DBEncode) {
        this.DBEncode = DBEncode;
    }

    public void setDatabasePublicKey(String databasePublicKey) {
        this.databasePublicKey = databasePublicKey;
    }

    @Deprecated
    public void setClearDateMonth(int clearDateMonth) {
        this.clearDateMonth = clearDateMonth;
    }

    @Deprecated
    public void setClearStatRecordInterval(int clearStatRecordInterval) {
        this.clearStatRecordInterval = clearStatRecordInterval;
    }

    @Deprecated
    public void setClearAlarmsRecordsMonth(int clearAlarmsRecordsMonth) {
        this.clearAlarmsRecordsMonth = clearAlarmsRecordsMonth;
    }

    @Deprecated
    public void setClearBatteryLevelRecordDay(int clearBatteryLevelRecordDay) {
        this.clearBatteryLevelRecordDay = clearBatteryLevelRecordDay;
    }

    public void setReplayRobotStatuses(String replayRobotStatuses) {
        this.replayRobotStatuses = replayRobotStatuses;
    }

    public void setReplayScenes(String replayScenes) {
        this.replayScenes = replayScenes;
    }

    public void setReplaySites(String replaySites) {
        this.replaySites = replaySites;
    }

    public void setReplayUpload(String replayUpload) {
        this.replayUpload = replayUpload;
    }

    public void setAppPath(String appPath) {
        this.appPath = appPath;
    }

    public void setStaticPath(String staticPath) {
        this.staticPath = staticPath;
    }

    public void setConfigPath(String configPath) {
        this.configPath = configPath;
    }

    public void setScriptPath(String scriptPath) {
        this.scriptPath = scriptPath;
    }

    public void setTemplatePath(String templatePath) {
        this.templatePath = templatePath;
    }

    public void setScenePath(String scenePath) {
        this.scenePath = scenePath;
    }

    public void setLicensePath(String licensePath) {
        this.licensePath = licensePath;
    }

    public void setRdsHistoryPath(String rdsHistoryPath) {
        this.rdsHistoryPath = rdsHistoryPath;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof PropConfig)) {
            return false;
        }
        PropConfig other = (PropConfig)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        if (this.getSslEnabled() != other.getSslEnabled()) {
            return false;
        }
        if (this.getPort() != other.getPort()) {
            return false;
        }
        if (this.getHttpPort() != other.getHttpPort()) {
            return false;
        }
        if (this.getRdsCoreQueryInterval() != other.getRdsCoreQueryInterval()) {
            return false;
        }
        if (this.getClearDateMonth() != other.getClearDateMonth()) {
            return false;
        }
        if (this.getClearStatRecordInterval() != other.getClearStatRecordInterval()) {
            return false;
        }
        if (this.getClearAlarmsRecordsMonth() != other.getClearAlarmsRecordsMonth()) {
            return false;
        }
        if (this.getClearBatteryLevelRecordDay() != other.getClearBatteryLevelRecordDay()) {
            return false;
        }
        Boolean this$DBEncode = this.getDBEncode();
        Boolean other$DBEncode = other.getDBEncode();
        if (this$DBEncode == null ? other$DBEncode != null : !((Object)this$DBEncode).equals(other$DBEncode)) {
            return false;
        }
        String this$projectVersion = this.getProjectVersion();
        String other$projectVersion = other.getProjectVersion();
        if (this$projectVersion == null ? other$projectVersion != null : !this$projectVersion.equals(other$projectVersion)) {
            return false;
        }
        String this$rdsCoreUrl = this.getRdsCoreUrl();
        String other$rdsCoreUrl = other.getRdsCoreUrl();
        if (this$rdsCoreUrl == null ? other$rdsCoreUrl != null : !this$rdsCoreUrl.equals(other$rdsCoreUrl)) {
            return false;
        }
        String this$env = this.getEnv();
        String other$env = other.getEnv();
        if (this$env == null ? other$env != null : !this$env.equals(other$env)) {
            return false;
        }
        String this$driverClassName = this.getDriverClassName();
        String other$driverClassName = other.getDriverClassName();
        if (this$driverClassName == null ? other$driverClassName != null : !this$driverClassName.equals(other$driverClassName)) {
            return false;
        }
        String this$driverClassName1 = this.getDriverClassName1();
        String other$driverClassName1 = other.getDriverClassName1();
        if (this$driverClassName1 == null ? other$driverClassName1 != null : !this$driverClassName1.equals(other$driverClassName1)) {
            return false;
        }
        String this$kingDriverClassName = this.getKingDriverClassName();
        String other$kingDriverClassName = other.getKingDriverClassName();
        if (this$kingDriverClassName == null ? other$kingDriverClassName != null : !this$kingDriverClassName.equals(other$kingDriverClassName)) {
            return false;
        }
        String this$databaseUrl = this.getDatabaseUrl();
        String other$databaseUrl = other.getDatabaseUrl();
        if (this$databaseUrl == null ? other$databaseUrl != null : !this$databaseUrl.equals(other$databaseUrl)) {
            return false;
        }
        String this$databaseUsername = this.getDatabaseUsername();
        String other$databaseUsername = other.getDatabaseUsername();
        if (this$databaseUsername == null ? other$databaseUsername != null : !this$databaseUsername.equals(other$databaseUsername)) {
            return false;
        }
        String this$databasePassword = this.getDatabasePassword();
        String other$databasePassword = other.getDatabasePassword();
        if (this$databasePassword == null ? other$databasePassword != null : !this$databasePassword.equals(other$databasePassword)) {
            return false;
        }
        String this$databaseType = this.getDatabaseType();
        String other$databaseType = other.getDatabaseType();
        if (this$databaseType == null ? other$databaseType != null : !this$databaseType.equals(other$databaseType)) {
            return false;
        }
        String this$databasePublicKey = this.getDatabasePublicKey();
        String other$databasePublicKey = other.getDatabasePublicKey();
        if (this$databasePublicKey == null ? other$databasePublicKey != null : !this$databasePublicKey.equals(other$databasePublicKey)) {
            return false;
        }
        String this$replayRobotStatuses = this.getReplayRobotStatuses();
        String other$replayRobotStatuses = other.getReplayRobotStatuses();
        if (this$replayRobotStatuses == null ? other$replayRobotStatuses != null : !this$replayRobotStatuses.equals(other$replayRobotStatuses)) {
            return false;
        }
        String this$replayScenes = this.getReplayScenes();
        String other$replayScenes = other.getReplayScenes();
        if (this$replayScenes == null ? other$replayScenes != null : !this$replayScenes.equals(other$replayScenes)) {
            return false;
        }
        String this$replaySites = this.getReplaySites();
        String other$replaySites = other.getReplaySites();
        if (this$replaySites == null ? other$replaySites != null : !this$replaySites.equals(other$replaySites)) {
            return false;
        }
        String this$replayUpload = this.getReplayUpload();
        String other$replayUpload = other.getReplayUpload();
        if (this$replayUpload == null ? other$replayUpload != null : !this$replayUpload.equals(other$replayUpload)) {
            return false;
        }
        String this$appPath = this.getAppPath();
        String other$appPath = other.getAppPath();
        if (this$appPath == null ? other$appPath != null : !this$appPath.equals(other$appPath)) {
            return false;
        }
        String this$staticPath = this.getStaticPath();
        String other$staticPath = other.getStaticPath();
        if (this$staticPath == null ? other$staticPath != null : !this$staticPath.equals(other$staticPath)) {
            return false;
        }
        String this$configPath = this.getConfigPath();
        String other$configPath = other.getConfigPath();
        if (this$configPath == null ? other$configPath != null : !this$configPath.equals(other$configPath)) {
            return false;
        }
        String this$scriptPath = this.getScriptPath();
        String other$scriptPath = other.getScriptPath();
        if (this$scriptPath == null ? other$scriptPath != null : !this$scriptPath.equals(other$scriptPath)) {
            return false;
        }
        String this$templatePath = this.getTemplatePath();
        String other$templatePath = other.getTemplatePath();
        if (this$templatePath == null ? other$templatePath != null : !this$templatePath.equals(other$templatePath)) {
            return false;
        }
        String this$scenePath = this.getScenePath();
        String other$scenePath = other.getScenePath();
        if (this$scenePath == null ? other$scenePath != null : !this$scenePath.equals(other$scenePath)) {
            return false;
        }
        String this$licensePath = this.getLicensePath();
        String other$licensePath = other.getLicensePath();
        if (this$licensePath == null ? other$licensePath != null : !this$licensePath.equals(other$licensePath)) {
            return false;
        }
        String this$rdsHistoryPath = this.getRdsHistoryPath();
        String other$rdsHistoryPath = other.getRdsHistoryPath();
        return !(this$rdsHistoryPath == null ? other$rdsHistoryPath != null : !this$rdsHistoryPath.equals(other$rdsHistoryPath));
    }

    protected boolean canEqual(Object other) {
        return other instanceof PropConfig;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        result = result * 59 + (this.getSslEnabled() ? 79 : 97);
        result = result * 59 + this.getPort();
        result = result * 59 + this.getHttpPort();
        long $rdsCoreQueryInterval = this.getRdsCoreQueryInterval();
        result = result * 59 + (int)($rdsCoreQueryInterval >>> 32 ^ $rdsCoreQueryInterval);
        result = result * 59 + this.getClearDateMonth();
        result = result * 59 + this.getClearStatRecordInterval();
        result = result * 59 + this.getClearAlarmsRecordsMonth();
        result = result * 59 + this.getClearBatteryLevelRecordDay();
        Boolean $DBEncode = this.getDBEncode();
        result = result * 59 + ($DBEncode == null ? 43 : ((Object)$DBEncode).hashCode());
        String $projectVersion = this.getProjectVersion();
        result = result * 59 + ($projectVersion == null ? 43 : $projectVersion.hashCode());
        String $rdsCoreUrl = this.getRdsCoreUrl();
        result = result * 59 + ($rdsCoreUrl == null ? 43 : $rdsCoreUrl.hashCode());
        String $env = this.getEnv();
        result = result * 59 + ($env == null ? 43 : $env.hashCode());
        String $driverClassName = this.getDriverClassName();
        result = result * 59 + ($driverClassName == null ? 43 : $driverClassName.hashCode());
        String $driverClassName1 = this.getDriverClassName1();
        result = result * 59 + ($driverClassName1 == null ? 43 : $driverClassName1.hashCode());
        String $kingDriverClassName = this.getKingDriverClassName();
        result = result * 59 + ($kingDriverClassName == null ? 43 : $kingDriverClassName.hashCode());
        String $databaseUrl = this.getDatabaseUrl();
        result = result * 59 + ($databaseUrl == null ? 43 : $databaseUrl.hashCode());
        String $databaseUsername = this.getDatabaseUsername();
        result = result * 59 + ($databaseUsername == null ? 43 : $databaseUsername.hashCode());
        String $databasePassword = this.getDatabasePassword();
        result = result * 59 + ($databasePassword == null ? 43 : $databasePassword.hashCode());
        String $databaseType = this.getDatabaseType();
        result = result * 59 + ($databaseType == null ? 43 : $databaseType.hashCode());
        String $databasePublicKey = this.getDatabasePublicKey();
        result = result * 59 + ($databasePublicKey == null ? 43 : $databasePublicKey.hashCode());
        String $replayRobotStatuses = this.getReplayRobotStatuses();
        result = result * 59 + ($replayRobotStatuses == null ? 43 : $replayRobotStatuses.hashCode());
        String $replayScenes = this.getReplayScenes();
        result = result * 59 + ($replayScenes == null ? 43 : $replayScenes.hashCode());
        String $replaySites = this.getReplaySites();
        result = result * 59 + ($replaySites == null ? 43 : $replaySites.hashCode());
        String $replayUpload = this.getReplayUpload();
        result = result * 59 + ($replayUpload == null ? 43 : $replayUpload.hashCode());
        String $appPath = this.getAppPath();
        result = result * 59 + ($appPath == null ? 43 : $appPath.hashCode());
        String $staticPath = this.getStaticPath();
        result = result * 59 + ($staticPath == null ? 43 : $staticPath.hashCode());
        String $configPath = this.getConfigPath();
        result = result * 59 + ($configPath == null ? 43 : $configPath.hashCode());
        String $scriptPath = this.getScriptPath();
        result = result * 59 + ($scriptPath == null ? 43 : $scriptPath.hashCode());
        String $templatePath = this.getTemplatePath();
        result = result * 59 + ($templatePath == null ? 43 : $templatePath.hashCode());
        String $scenePath = this.getScenePath();
        result = result * 59 + ($scenePath == null ? 43 : $scenePath.hashCode());
        String $licensePath = this.getLicensePath();
        result = result * 59 + ($licensePath == null ? 43 : $licensePath.hashCode());
        String $rdsHistoryPath = this.getRdsHistoryPath();
        result = result * 59 + ($rdsHistoryPath == null ? 43 : $rdsHistoryPath.hashCode());
        return result;
    }

    public String toString() {
        return "PropConfig(sslEnabled=" + this.getSslEnabled() + ", port=" + this.getPort() + ", httpPort=" + this.getHttpPort() + ", projectVersion=" + this.getProjectVersion() + ", rdsCoreUrl=" + this.getRdsCoreUrl() + ", rdsCoreQueryInterval=" + this.getRdsCoreQueryInterval() + ", env=" + this.getEnv() + ", driverClassName=" + this.getDriverClassName() + ", driverClassName1=" + this.getDriverClassName1() + ", kingDriverClassName=" + this.getKingDriverClassName() + ", databaseUrl=" + this.getDatabaseUrl() + ", databaseUsername=" + this.getDatabaseUsername() + ", databasePassword=" + this.getDatabasePassword() + ", databaseType=" + this.getDatabaseType() + ", DBEncode=" + this.getDBEncode() + ", databasePublicKey=" + this.getDatabasePublicKey() + ", clearDateMonth=" + this.getClearDateMonth() + ", clearStatRecordInterval=" + this.getClearStatRecordInterval() + ", clearAlarmsRecordsMonth=" + this.getClearAlarmsRecordsMonth() + ", clearBatteryLevelRecordDay=" + this.getClearBatteryLevelRecordDay() + ", replayRobotStatuses=" + this.getReplayRobotStatuses() + ", replayScenes=" + this.getReplayScenes() + ", replaySites=" + this.getReplaySites() + ", replayUpload=" + this.getReplayUpload() + ", appPath=" + this.getAppPath() + ", staticPath=" + this.getStaticPath() + ", configPath=" + this.getConfigPath() + ", scriptPath=" + this.getScriptPath() + ", templatePath=" + this.getTemplatePath() + ", scenePath=" + this.getScenePath() + ", licensePath=" + this.getLicensePath() + ", rdsHistoryPath=" + this.getRdsHistoryPath() + ")";
    }
}

