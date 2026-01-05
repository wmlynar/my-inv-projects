/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.alibaba.druid.filter.config.ConfigTools
 *  com.alibaba.fastjson.JSONObject
 *  com.fasterxml.jackson.databind.ObjectMapper
 *  com.fasterxml.jackson.databind.node.ObjectNode
 *  com.google.common.collect.Maps
 *  com.seer.rds.annotation.SysLog
 *  com.seer.rds.config.PropConfig
 *  com.seer.rds.config.SecurityConfig
 *  com.seer.rds.config.configview.CommonConfig
 *  com.seer.rds.config.configview.DebugConfigOfView
 *  com.seer.rds.constant.AlarmExceptionTypeEnum
 *  com.seer.rds.constant.CommonCodeEnum
 *  com.seer.rds.dao.SysAlarmMapper
 *  com.seer.rds.service.Archiving.ArchivingService
 *  com.seer.rds.service.admin.SysAlarmService
 *  com.seer.rds.util.TemplateUtil
 *  com.seer.rds.util.YmlConfigUtil
 *  com.seer.rds.util.configFileMeta.ClassMetaUtil
 *  com.seer.rds.vo.DatabaseConfigVo
 *  com.seer.rds.vo.ResultVo
 *  com.seer.rds.vo.req.CfgFileUploadReq
 *  com.seer.rds.vo.req.LoadHistoryReq
 *  com.seer.rds.vo.req.UpdateHttpsConfigReq
 *  com.seer.rds.vo.req.UpdateYmlConfigDetailReq
 *  com.seer.rds.vo.response.ApplicationBizFileRes
 *  com.seer.rds.vo.response.BootJsFileRes
 *  com.seer.rds.vo.response.ConfigFileRes
 *  com.seer.rds.web.config.ConfigFileController
 *  com.seer.rds.web.config.ConfigFileController$CfgCollection
 *  io.swagger.annotations.Api
 *  io.swagger.annotations.ApiOperation
 *  javax.annotation.PostConstruct
 *  org.apache.commons.collections.CollectionUtils
 *  org.apache.commons.io.FileUtils
 *  org.apache.commons.lang3.StringUtils
 *  org.slf4j.Logger
 *  org.slf4j.LoggerFactory
 *  org.springframework.beans.factory.annotation.Autowired
 *  org.springframework.beans.factory.annotation.Value
 *  org.springframework.boot.ApplicationArguments
 *  org.springframework.context.annotation.DependsOn
 *  org.springframework.core.io.ClassPathResource
 *  org.springframework.core.io.ResourceLoader
 *  org.springframework.stereotype.Controller
 *  org.springframework.util.FileCopyUtils
 *  org.springframework.web.bind.annotation.GetMapping
 *  org.springframework.web.bind.annotation.PathVariable
 *  org.springframework.web.bind.annotation.PostMapping
 *  org.springframework.web.bind.annotation.RequestBody
 *  org.springframework.web.bind.annotation.RequestMapping
 *  org.springframework.web.bind.annotation.RequestParam
 *  org.springframework.web.bind.annotation.ResponseBody
 *  org.springframework.web.multipart.MultipartFile
 *  org.yaml.snakeyaml.Yaml
 *  org.yaml.snakeyaml.constructor.BaseConstructor
 *  org.yaml.snakeyaml.constructor.Constructor
 */
package com.seer.rds.web.config;

import com.alibaba.druid.filter.config.ConfigTools;
import com.alibaba.fastjson.JSONObject;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.google.common.collect.Maps;
import com.seer.rds.annotation.SysLog;
import com.seer.rds.config.PropConfig;
import com.seer.rds.config.SecurityConfig;
import com.seer.rds.config.configview.CommonConfig;
import com.seer.rds.config.configview.DebugConfigOfView;
import com.seer.rds.constant.AlarmExceptionTypeEnum;
import com.seer.rds.constant.CommonCodeEnum;
import com.seer.rds.dao.SysAlarmMapper;
import com.seer.rds.service.Archiving.ArchivingService;
import com.seer.rds.service.admin.SysAlarmService;
import com.seer.rds.util.TemplateUtil;
import com.seer.rds.util.YmlConfigUtil;
import com.seer.rds.util.configFileMeta.ClassMetaUtil;
import com.seer.rds.vo.DatabaseConfigVo;
import com.seer.rds.vo.ResultVo;
import com.seer.rds.vo.req.CfgFileUploadReq;
import com.seer.rds.vo.req.LoadHistoryReq;
import com.seer.rds.vo.req.UpdateHttpsConfigReq;
import com.seer.rds.vo.req.UpdateYmlConfigDetailReq;
import com.seer.rds.vo.response.ApplicationBizFileRes;
import com.seer.rds.vo.response.BootJsFileRes;
import com.seer.rds.vo.response.ConfigFileRes;
import com.seer.rds.web.config.ConfigFileController;
import io.swagger.annotations.Api;
import io.swagger.annotations.ApiOperation;
import java.io.BufferedReader;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.FileReader;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.charset.Charset;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.LinkOption;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicReference;
import java.util.stream.Collectors;
import javax.annotation.PostConstruct;
import org.apache.commons.collections.CollectionUtils;
import org.apache.commons.io.FileUtils;
import org.apache.commons.lang3.StringUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.context.annotation.DependsOn;
import org.springframework.core.io.ClassPathResource;
import org.springframework.core.io.ResourceLoader;
import org.springframework.stereotype.Controller;
import org.springframework.util.FileCopyUtils;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseBody;
import org.springframework.web.multipart.MultipartFile;
import org.yaml.snakeyaml.Yaml;
import org.yaml.snakeyaml.constructor.BaseConstructor;
import org.yaml.snakeyaml.constructor.Constructor;

@Controller
@RequestMapping(value={"/api/cfgFile"})
@DependsOn(value={"springUtil"})
@Api(tags={"\u914d\u7f6e\u6587\u4ef6\u76f8\u5173"})
public class ConfigFileController {
    private static final Logger log = LoggerFactory.getLogger(ConfigFileController.class);
    private static final String CFG_FILENAME = "application-biz.yml";
    private static final String RDS_FILENAME = "rds.d.ts";
    private static final String APP_FILENAME = "application.yml";
    private static final String PERMISSION_FILENAME = "permission.yml";
    @Autowired
    private ApplicationArguments arguments;
    public static CommonConfig commonConfig = null;
    @Autowired
    private PropConfig propConfig;
    @Value(value="${rds.appDir}")
    private String appDir;
    @Value(value="${rds.scriptDir}")
    private String scriptDir;
    @Autowired
    private SysAlarmService sysAlarmService;
    @Autowired
    private SysAlarmMapper sysAlarmMapper;
    @Autowired
    private ArchivingService archivingService;
    @Autowired
    private ObjectMapper objectMapper;
    @Autowired
    private SecurityConfig securityConfig;
    private String currentConfigFileMD5;
    private String savedConfigFileMD5;
    private ResourceLoader resourceLoader;

    @PostConstruct
    public boolean loadConfig() throws Exception {
        String configFilePath = this.genConfigFilePath();
        log.info("configFilePath: {}", (Object)configFilePath);
        if (StringUtils.isNotEmpty((CharSequence)configFilePath)) {
            File file = new File(configFilePath);
            if (!file.exists()) {
                commonConfig = new CommonConfig();
            } else {
                try {
                    commonConfig = (CommonConfig)YmlConfigUtil.loadConfig((String)configFilePath, CommonConfig.class);
                    this.sysAlarmService.deleteAlarmAndNoticeWeb(CommonCodeEnum.CONFIG_INIT_ERROR.getCode().intValue());
                }
                catch (Exception e) {
                    List alarms = this.sysAlarmMapper.findByCode(CommonCodeEnum.CONFIG_INIT_ERROR.getCode());
                    if (CollectionUtils.isEmpty((Collection)alarms)) {
                        this.sysAlarmService.addAlarmInfo(CommonCodeEnum.CONFIG_INIT_ERROR.getCode().intValue(), AlarmExceptionTypeEnum.ERROR.getStatus(), "Config Error:" + e.getMessage());
                    } else {
                        this.sysAlarmService.updateAlarmInfo(CommonCodeEnum.CONFIG_INIT_ERROR.getCode().intValue(), AlarmExceptionTypeEnum.ERROR.getStatus(), "Config Error:" + e.getMessage());
                    }
                    return false;
                }
            }
        } else {
            commonConfig = new CommonConfig();
        }
        return true;
    }

    public String getTemplateFilePath() {
        String templateDirByIfEnable = TemplateUtil.getTemplateDirByIfEnable();
        return templateDirByIfEnable + CFG_FILENAME;
    }

    public String genConfigFilePath() {
        String configFilePath = null;
        String outConfigLocation = "";
        try {
            List configArg;
            if (CollectionUtils.isNotEmpty((Collection)this.arguments.getNonOptionArgs()) && CollectionUtils.isNotEmpty(configArg = this.arguments.getNonOptionArgs().stream().filter(it -> it.contains("spring.config.location")).collect(Collectors.toList())) && (outConfigLocation = ((String)configArg.get(0)).split("=")[1]).startsWith(".")) {
                outConfigLocation = outConfigLocation.substring(1);
            }
            if (StringUtils.isNotBlank((CharSequence)outConfigLocation)) {
                String templateDirByIfEnable = TemplateUtil.getTemplateDirByIfEnable();
                return templateDirByIfEnable + CFG_FILENAME;
            }
            ClassPathResource fileResource = new ClassPathResource(CFG_FILENAME);
            if (fileResource.exists()) {
                configFilePath = new ClassPathResource(CFG_FILENAME).getURI().getPath();
            }
            String templateDirByIfEnable = TemplateUtil.getTemplateDirByIfEnable();
            if (!this.propConfig.getRdsScriptDir().equals(templateDirByIfEnable)) {
                return templateDirByIfEnable + CFG_FILENAME;
            }
        }
        catch (Exception e) {
            log.error("\u8bfb\u53d6\u914d\u7f6e\u6587\u4ef6\u5931\u8d25", (Throwable)e);
        }
        return configFilePath;
    }

    public String genUserConfigFilePath() {
        String configFilePath = null;
        String outConfigLocation = "";
        try {
            List configArg;
            if (CollectionUtils.isNotEmpty((Collection)this.arguments.getNonOptionArgs()) && CollectionUtils.isNotEmpty(configArg = this.arguments.getNonOptionArgs().stream().filter(it -> it.contains("spring.config.location")).collect(Collectors.toList())) && (outConfigLocation = ((String)configArg.get(0)).split("=")[1]).startsWith(".")) {
                outConfigLocation = outConfigLocation.substring(1);
            }
            if (StringUtils.isNotBlank((CharSequence)outConfigLocation)) {
                return this.propConfig.getRdsScriptDir() + CFG_FILENAME;
            }
            ClassPathResource fileResource = new ClassPathResource(CFG_FILENAME);
            if (fileResource.exists()) {
                configFilePath = new ClassPathResource(CFG_FILENAME).getURI().getPath();
            }
        }
        catch (Exception e) {
            log.error("\u8bfb\u53d6\u914d\u7f6e\u6587\u4ef6\u5931\u8d25", (Throwable)e);
        }
        return configFilePath;
    }

    public String getAppFilePath() {
        String configFilePath = null;
        String outConfigLocation = "";
        try {
            List configArg;
            if (CollectionUtils.isNotEmpty((Collection)this.arguments.getNonOptionArgs()) && CollectionUtils.isNotEmpty(configArg = this.arguments.getNonOptionArgs().stream().filter(it -> it.contains("spring.config.location")).collect(Collectors.toList())) && (outConfigLocation = ((String)configArg.get(0)).split("=")[1]).startsWith(".")) {
                outConfigLocation = outConfigLocation.substring(1);
            }
            if (StringUtils.isNotBlank((CharSequence)outConfigLocation)) {
                return this.propConfig.getRdsApptDir() + APP_FILENAME;
            }
            ClassPathResource fileResource = new ClassPathResource(APP_FILENAME);
            if (fileResource.exists()) {
                configFilePath = new ClassPathResource(APP_FILENAME).getURI().getPath();
            }
        }
        catch (Exception e) {
            log.error("\u8bfb\u53d6\u914d\u7f6e\u6587\u4ef6\u5931\u8d25", (Throwable)e);
        }
        return configFilePath;
    }

    public boolean isSameConfig() {
        return this.currentConfigFileMD5 != null && this.currentConfigFileMD5.equals(this.savedConfigFileMD5);
    }

    @ApiOperation(value="\u8bfb\u53d6\u914d\u7f6e\u6587\u4ef6\u7684\u5b9e\u9645\u53c2\u6570")
    @GetMapping(value={"/infos/{name}"})
    @ResponseBody
    public ResultVo<Object> cfgInfo(@PathVariable String name) throws Exception {
        File file;
        ResultVo resultVo = new ResultVo();
        String configFilePath = this.genUserConfigFilePath();
        if (StringUtils.isNotEmpty((CharSequence)configFilePath) && (file = new File(configFilePath)).exists()) {
            JSONObject configData = (JSONObject)YmlConfigUtil.loadConfig((String)configFilePath, JSONObject.class);
            resultVo.setData((Object)configData);
            return resultVo;
        }
        resultVo.setData((Object)commonConfig);
        return resultVo;
    }

    @ApiOperation(value="\u8bfb\u53d6\u914d\u7f6e\u6587\u4ef6\u7684\u5185\u5b58\u8fd0\u884c\u503c")
    @GetMapping(value={"/infos/curConfigVal"})
    @ResponseBody
    public ResultVo<Object> curConfigVal() {
        ResultVo resultVo = new ResultVo();
        resultVo.setData((Object)commonConfig);
        return resultVo;
    }

    @ApiOperation(value="\u8bfb\u53d6\u914d\u7f6e\u6587\u4ef6\u7684\u5143\u6570\u636e")
    @GetMapping(value={"/infos/define"})
    @ResponseBody
    public ResultVo<CfgCollection> define() {
        ResultVo resultVo = new ResultVo();
        CfgCollection cfgCollection = new CfgCollection();
        try {
            List commonConfigMetas = ClassMetaUtil.classMetaReader((Object)new CommonConfig());
            cfgCollection.setCommonCfg(commonConfigMetas);
        }
        catch (Exception e) {
            log.error("\u8bfb\u53d6\u914d\u7f6e\u6587\u4ef6\u5143\u7d20\u636e\u5931\u8d25");
        }
        resultVo.setData((Object)cfgCollection);
        return resultVo;
    }

    @SysLog(operation="saveCfg", message="@{config.file.save}")
    @ApiOperation(value="\u4fdd\u5b58\u914d\u7f6e\u6587\u4ef6")
    @PostMapping(value={"/infos/upload"})
    @ResponseBody
    public ResultVo<Object> upload(@RequestBody CfgFileUploadReq req) throws Exception {
        try {
            String dataString = req.getDataString();
            String configFilePath = this.genUserConfigFilePath();
            log.info("configFilePath:{}", (Object)configFilePath);
            this.currentConfigFileMD5 = this.archivingService.getFileMD5String(new File(configFilePath));
            FileUtils.writeStringToFile((File)new File(new File(configFilePath).getParentFile(), CFG_FILENAME), (String)dataString, (Charset)StandardCharsets.UTF_8);
            this.savedConfigFileMD5 = this.archivingService.getFileMD5String(new File(configFilePath));
            CommonConfig configData = (CommonConfig)YmlConfigUtil.loadConfig((String)configFilePath, CommonConfig.class);
            if (configData != null && !Objects.equals(configData.getOperator(), null) && !configData.getOperator().getRuntimeMenuPropsUpdate().booleanValue()) {
                commonConfig.setOperator(configData.getOperator());
            }
            if (!this.isSameConfig()) {
                FileUtils.writeStringToFile((File)new File(this.propConfig.getRdsHistoryDir() + "bizConfig/", "application-biz-" + Instant.now().toEpochMilli() + ".yml"), (String)dataString, (Charset)StandardCharsets.UTF_8);
            }
            this.sysAlarmService.deleteAlarmAndNoticeWeb(CommonCodeEnum.CONFIG_INIT_ERROR.getCode().intValue());
        }
        catch (Exception e) {
            log.error("write file error", (Throwable)e);
            List alarms = this.sysAlarmMapper.findByCode(CommonCodeEnum.CONFIG_INIT_ERROR.getCode());
            if (CollectionUtils.isEmpty((Collection)alarms)) {
                this.sysAlarmService.addAlarmInfo(CommonCodeEnum.CONFIG_INIT_ERROR.getCode().intValue(), AlarmExceptionTypeEnum.ERROR.getStatus(), "Config Error:" + e.getMessage());
            } else {
                this.sysAlarmService.updateAlarmInfo(CommonCodeEnum.CONFIG_INIT_ERROR.getCode().intValue(), AlarmExceptionTypeEnum.ERROR.getStatus(), "Config Error:" + e.getMessage());
            }
            throw new Exception("upload config file error");
        }
        return ResultVo.success();
    }

    @ApiOperation(value="\u8f6c\u6362rds.d.ts\u6587\u4ef6")
    @PostMapping(value={"/infos/conversion"})
    @ResponseBody
    public ResultVo<Object> conversion(@RequestBody String name) throws Exception {
        File f = new File(this.propConfig.getRdsScriptDir() + RDS_FILENAME);
        if (!f.exists()) {
            return ResultVo.response((Object)"");
        }
        StringBuffer buffer = null;
        try (BufferedReader lineNumberReader = new BufferedReader(new FileReader(f));){
            buffer = new StringBuffer();
            String temp = "";
            while ((temp = lineNumberReader.readLine()) != null) {
                buffer.append(temp).append("\n");
            }
        }
        catch (Exception e) {
            log.error("write file error", (Throwable)e);
            throw new Exception("conversion config file error");
        }
        return ResultVo.response((Object)buffer);
    }

    @ApiOperation(value="\u83b7\u53d6\u5386\u53f2\u7684application\u914d\u7f6e\u6587\u4ef6\u5217\u8868\u5c55\u793a\u5230\u524d\u7aef")
    @PostMapping(value={"/listHistoryConfig"})
    @ResponseBody
    public ResultVo<Object> getHistoryConfig() throws Exception {
        String filename = this.propConfig.getRdsHistoryDir() + "config";
        ArrayList<ConfigFileRes> configFileList = new ArrayList<ConfigFileRes>();
        List historyFileList = this.archivingService.getOneSortedHistoryList(filename);
        for (int i = 0; i < historyFileList.size(); ++i) {
            ConfigFileRes configFileRes = new ConfigFileRes();
            configFileRes.setId(i);
            configFileRes.setOrderNum(i + 1);
            configFileRes.setConfigName((String)historyFileList.get(i));
            configFileRes.setCreateDate(this.propConfig.getCreateDate(new File(filename + "/" + (String)historyFileList.get(i))));
            configFileList.add(configFileRes);
        }
        return ResultVo.response(configFileList);
    }

    @ApiOperation(value="\u67e5\u770b\u5bf9\u5e94\u7248\u672c\u7684\u5386\u53f2application\u914d\u7f6e\u6587\u4ef6")
    @PostMapping(value={"/getHistoryConfig"})
    @ResponseBody
    public ResultVo<Object> getHistoryConfig(@RequestBody LoadHistoryReq req) throws Exception {
        ResultVo resultVo = new ResultVo();
        String filename = this.propConfig.getRdsHistoryDir() + "config/" + req.getName();
        if (StringUtils.isNotEmpty((CharSequence)filename)) {
            File file = new File(filename);
            if (file.exists()) {
                String configStr = YmlConfigUtil.loadConfigString((String)filename);
                Yaml yaml = new Yaml();
                LinkedHashMap configMap = (LinkedHashMap)yaml.load(configStr);
                JSONObject configData = new JSONObject((Map)configMap);
                resultVo.setData((Object)configData);
                return resultVo;
            }
            throw new RuntimeException("config does not exist");
        }
        return resultVo;
    }

    @ApiOperation(value="\u5207\u6362application-biz\u914d\u7f6e\u6587\u4ef6")
    @PostMapping(value={"/switchBizConfig"})
    @ResponseBody
    public ResultVo<Object> switchBizConfig(@RequestBody LoadHistoryReq req) {
        return this.switchConfig(req, CFG_FILENAME, "bizConfig");
    }

    @ApiOperation(value="\u5207\u6362application\u914d\u7f6e\u6587\u4ef6")
    @PostMapping(value={"/switchConfig"})
    @ResponseBody
    public ResultVo<Object> switchConfig(@RequestBody LoadHistoryReq req) {
        return this.switchConfig(req, APP_FILENAME, "config");
    }

    public ResultVo<Object> switchConfig(@RequestBody LoadHistoryReq req, String configFilename, String dirName) {
        try {
            log.info("switch config");
            Object configFilePath = "";
            if (CFG_FILENAME.equals(configFilename)) {
                configFilePath = this.genUserConfigFilePath();
            } else if (APP_FILENAME.equals(configFilename)) {
                configFilePath = this.propConfig.getRdsApptDir() + APP_FILENAME;
            }
            log.info("configFilePath: " + (String)configFilePath + ",configFilename: " + configFilename);
            String filename = this.propConfig.getRdsHistoryDir() + dirName + "/" + req.getName();
            log.info("from :" + filename);
            if (StringUtils.isNotEmpty((CharSequence)filename)) {
                File file = new File(filename);
                if (file.exists()) {
                    String configString = YmlConfigUtil.loadConfigString((String)filename);
                    FileUtils.writeStringToFile((File)new File(new File((String)configFilePath).getParentFile(), configFilename), (String)configString, (Charset)StandardCharsets.UTF_8);
                    CommonConfig configData = (CommonConfig)YmlConfigUtil.loadConfig((String)configFilePath, CommonConfig.class);
                    if (configData != null && !Objects.equals(configData.getOperator(), null) && !configData.getOperator().getRuntimeMenuPropsUpdate().booleanValue()) {
                        commonConfig.setOperator(configData.getOperator());
                    }
                } else {
                    throw new RuntimeException("config does not exist");
                }
            }
            return ResultVo.success();
        }
        catch (Exception e) {
            log.error("Switch Config Exception", (Throwable)e);
            throw new RuntimeException("toggle Config error");
        }
    }

    @ApiOperation(value="\u83b7\u53d6\u5386\u53f2\u7684boot.js\u914d\u7f6e\u6587\u4ef6\u5217\u8868\u5c55\u793a\u5230\u524d\u7aef")
    @GetMapping(value={"/listHistoryBootJs"})
    @ResponseBody
    public ResultVo<Object> getHistoryBootJs(@RequestParam(name="folderName") String folderName, @RequestParam(name="fileName", required=false) String fileName) throws Exception {
        String filename = StringUtils.equals((CharSequence)folderName, (CharSequence)"boot") ? this.propConfig.getRdsHistoryDir() + "script" : this.propConfig.getRdsHistoryDir() + "script" + File.separator + folderName;
        ArrayList bootFileLists = new ArrayList();
        List someSortedHistoryList = this.archivingService.getSomeSortedHistoryList(filename);
        for (int i = 0; i < someSortedHistoryList.size(); ++i) {
            List bootlist = (List)someSortedHistoryList.get(i);
            ArrayList<BootJsFileRes> bootFileList = new ArrayList<BootJsFileRes>();
            int tmp = 0;
            for (int j = 0; j < bootlist.size(); ++j) {
                if (StringUtils.isNotEmpty((CharSequence)fileName) && !((String)bootlist.get(j)).startsWith(fileName + "-") || !((String)bootlist.get(j)).endsWith(".js")) continue;
                BootJsFileRes bootFileRes = new BootJsFileRes();
                bootFileRes.setId(tmp);
                bootFileRes.setOrderNum(tmp + 1);
                bootFileRes.setBootName((String)bootlist.get(j));
                bootFileRes.setCreateDate(this.propConfig.getCreateDate(new File(filename + "/" + (String)bootlist.get(j))));
                bootFileList.add(bootFileRes);
                ++tmp;
            }
            if (!CollectionUtils.isNotEmpty(bootFileList)) continue;
            bootFileLists.add(bootFileList);
        }
        return ResultVo.response(bootFileLists);
    }

    @ApiOperation(value="\u67e5\u770b\u5bf9\u5e94\u7248\u672c\u7684\u5386\u53f2boot.js\u6587\u4ef6\u8be6\u60c5")
    @PostMapping(value={"/getHistoryBootDetail"})
    @ResponseBody
    public ResultVo<Object> getHistoryBootDetail(@RequestBody LoadHistoryReq req) throws Exception {
        ResultVo resultVo = new ResultVo();
        String filename = this.propConfig.getRdsHistoryDir() + "script/" + req.getName();
        if (StringUtils.isNotEmpty((CharSequence)filename)) {
            File file = new File(filename);
            if (file.exists()) {
                String s = FileUtils.readFileToString((File)file, (String)"utf-8");
                HashMap resp = Maps.newHashMap();
                resp.put(req.getName(), s);
                resultVo.setData((Object)resp);
                return resultVo;
            }
            throw new RuntimeException(req.getName() + " does not exist");
        }
        return resultVo;
    }

    @ApiOperation(value="\u83b7\u53d6\u5386\u53f2\u7684application-biz\u914d\u7f6e\u6587\u4ef6\u5217\u8868\u5c55\u793a\u5230\u524d\u7aef")
    @PostMapping(value={"/listHistoryApplicationBiz"})
    @ResponseBody
    public ResultVo<Object> listHistoryApplicationBiz() throws Exception {
        String filename = this.propConfig.getRdsHistoryDir() + "bizConfig";
        ArrayList<ApplicationBizFileRes> bizFileList = new ArrayList<ApplicationBizFileRes>();
        List historyFileList = this.archivingService.getOneSortedHistoryList(filename);
        for (int i = 0; i < historyFileList.size(); ++i) {
            ApplicationBizFileRes bizFileRes = new ApplicationBizFileRes();
            bizFileRes.setId(i);
            bizFileRes.setOrderNum(i + 1);
            bizFileRes.setBizName((String)historyFileList.get(i));
            bizFileRes.setCreateDate(this.propConfig.getCreateDate(new File(filename + "/" + (String)historyFileList.get(i))));
            bizFileList.add(bizFileRes);
        }
        return ResultVo.response(bizFileList);
    }

    @ApiOperation(value="\u67e5\u770b\u5bf9\u5e94\u7248\u672c\u7684\u5386\u53f2application-biz\u6587\u4ef6\u8be6\u60c5")
    @PostMapping(value={"/getHistoryApplicationBizDetail"})
    @ResponseBody
    public ResultVo<Object> getHistoryApplicationBizDetail(@RequestBody LoadHistoryReq req) throws Exception {
        ResultVo resultVo = new ResultVo();
        String filename = this.propConfig.getRdsHistoryDir() + "bizConfig/" + req.getName();
        if (StringUtils.isNotEmpty((CharSequence)filename)) {
            File file = new File(filename);
            if (file.exists()) {
                String configStr = YmlConfigUtil.loadConfigString((String)filename);
                Yaml yaml = new Yaml();
                LinkedHashMap configMap = (LinkedHashMap)yaml.load(configStr);
                JSONObject configData = new JSONObject((Map)configMap);
                resultVo.setData((Object)configData);
                return resultVo;
            }
            throw new RuntimeException(req.getName() + " does not exist");
        }
        return resultVo;
    }

    @ApiOperation(value="\u4fee\u6539\u914d\u7f6e\u6587\u4ef6\u4e2dhttps\u7684\u76f8\u5173\u53c2\u6570")
    @PostMapping(value={"/updateHttpsConfigDetail"})
    @ResponseBody
    public ResultVo<Object> updateHttpsConfigDetail(@RequestParam(value="req") String reqStr, @RequestParam(value="keyStoreFile", required=false) MultipartFile keyStoreFile, @RequestParam(value="crtFile", required=false) MultipartFile crtFile, @RequestParam(value="keyFile", required=false) MultipartFile keyFile) throws Exception {
        ResultVo resultVo = new ResultVo();
        UpdateHttpsConfigReq req = null;
        req = (UpdateHttpsConfigReq)this.objectMapper.readValue(reqStr, UpdateHttpsConfigReq.class);
        String ymlFile = this.getAppFilePath();
        File file = new File(ymlFile);
        String absolutePath = file.getAbsolutePath();
        String currentDir = System.getProperty("user.dir");
        String relativeYmlPath = absolutePath.substring(currentDir.length() + 1);
        if (!file.exists()) {
            resultVo.setMsg("Config File does not exist");
            resultVo.setCode(Integer.valueOf(401));
            return resultVo;
        }
        if (keyStoreFile == null && keyFile == null && crtFile == null || StringUtils.isEmpty((CharSequence)req.getKeyStorePath())) {
            YmlConfigUtil.resetHttpsConfig((String)relativeYmlPath);
            resultVo.setMsg("File not uploaded or key store path is empty, will be reset to default configuration");
            resultVo.setCode(Integer.valueOf(200));
            return resultVo;
        }
        ObjectNode dataNode = this.objectMapper.createObjectNode();
        AtomicReference<String> keyStoreFileName = new AtomicReference<String>(YmlConfigUtil.getKeyStoreFilePath((String)relativeYmlPath));
        if (keyStoreFile != null) {
            keyStoreFileName.set(keyStoreFile.getOriginalFilename());
        } else if (crtFile != null) {
            Optional<UpdateHttpsConfigReq> optionalReq = Optional.ofNullable(req);
            optionalReq.map(UpdateHttpsConfigReq::getKeyAlias).ifPresent(keyAlias -> {
                if (keyAlias.endsWith(".keystore")) {
                    keyStoreFileName.set((String)keyAlias);
                } else {
                    keyStoreFileName.set(keyAlias + ".keystore");
                }
            });
        }
        try {
            Path filePath;
            File keyStoreFilePath = null;
            if (!req.getKeyStorePath().matches("^([a-zA-Z]:)?([\\\\/][a-zA-Z0-9_.\\\u3040-\u309f\\\u30a0-\u30ff\\\u4e00-\u9faf-]+)+[\\\\/]?$") && !req.getKeyStorePath().equals("classpath:rds-https.keystore")) {
                resultVo.setMsg(" Illegal file path");
                resultVo.setCode(Integer.valueOf(400));
                return resultVo;
            }
            if (!req.getKeyStorePath().equals("classpath:rds-https.keystore") && !Files.exists(filePath = Paths.get(req.getKeyStorePath(), new String[0]), new LinkOption[0])) {
                resultVo.setMsg("File path does not exist");
                resultVo.setCode(Integer.valueOf(400));
                return resultVo;
            }
            keyStoreFilePath = new File(YmlConfigUtil.genKeyStoreFilePath((String)req.getKeyStorePath(), (String)keyStoreFileName.get()));
            if (keyFile != null && crtFile != null) {
                YmlConfigUtil.transferKeyStore((MultipartFile)crtFile, (MultipartFile)keyFile, (File)keyStoreFilePath, (String)req.getKeyAlias(), (String)req.getKeyPassword(), (String)req.getKeyStorePassword(), (String)req.getKeyStoreType());
            } else if (keyStoreFile != null) {
                InputStream inputStream = keyStoreFile.getInputStream();
                FileOutputStream outputStream = new FileOutputStream(keyStoreFilePath);
                FileCopyUtils.copy((InputStream)inputStream, (OutputStream)outputStream);
            }
            String configResult = "";
            configResult = YmlConfigUtil.updateHttpsConfig((UpdateHttpsConfigReq)req, (String)relativeYmlPath, (String)keyStoreFileName.get());
            if (StringUtils.isEmpty((CharSequence)configResult)) {
                return resultVo;
            }
            resultVo.setMsg(configResult);
            resultVo.setCode(Integer.valueOf(400));
            return resultVo;
        }
        catch (Exception e) {
            log.error("Update Https Config Error", (Throwable)e);
            resultVo.setMsg("Update Https Config Error");
            resultVo.setCode(Integer.valueOf(400));
            return resultVo;
        }
    }

    @ApiOperation(value="\u91cd\u7f6ehttps\u914d\u7f6e\u4e3a\u9ed8\u8ba4\u503c")
    @PostMapping(value={"/resetHttpsConfigDetail"})
    @ResponseBody
    public ResultVo<Object> resetHttpsConfigDetail() throws Exception {
        String newYmlPath = this.getAppFilePath();
        ResultVo resultVo = new ResultVo();
        ObjectNode dataNode = this.objectMapper.createObjectNode();
        if (YmlConfigUtil.resetHttpsConfig((String)newYmlPath)) {
            dataNode.put("msg", resultVo.getMsg());
            dataNode.put("code", resultVo.getCode());
            resultVo.setData((Object)dataNode);
            return resultVo;
        }
        resultVo.setCode(Integer.valueOf(400));
        resultVo.setMsg("Reset failed");
        dataNode.put("msg", resultVo.getMsg());
        dataNode.put("code", resultVo.getCode());
        resultVo.setData((Object)dataNode);
        return resultVo;
    }

    @ApiOperation(value="\u67e5\u770b\u672c\u5730\u6570\u636e\u5e93\u6587\u4ef6")
    @PostMapping(value={"/getLocalApplication"})
    @ResponseBody
    public ResultVo<Object> getLocalApplication() throws Exception {
        ResultVo resultVo = new ResultVo();
        String filePath = this.propConfig.getRdsApptDir() + APP_FILENAME;
        if (StringUtils.isNotEmpty((CharSequence)filePath)) {
            File file = new File(filePath);
            if (this.securityConfig.getDisableShowUserInfo() != null && this.securityConfig.getDisableShowUserInfo().booleanValue()) {
                return ResultVo.response((Object)"******");
            }
            if (file.exists()) {
                JSONObject applicationData = (JSONObject)YmlConfigUtil.loadConfig((String)filePath, JSONObject.class);
                resultVo.setData((Object)applicationData);
                return resultVo;
            }
            throw new RuntimeException("application.yml does not exist");
        }
        return resultVo;
    }

    @ApiOperation(value="\u4fee\u6539yml\u914d\u7f6e\u6587\u4ef6\u4e2d\u76f8\u5173\u53c2\u6570")
    @PostMapping(value={"/updateYmlConfigDetail"})
    @ResponseBody
    public ResultVo<Object> updateYmlConfigDetail(@RequestParam(value="req") String reqStr) throws Exception {
        ResultVo resultVo = new ResultVo();
        UpdateYmlConfigDetailReq ymlReq = null;
        ymlReq = (UpdateYmlConfigDetailReq)this.objectMapper.readValue(reqStr, UpdateYmlConfigDetailReq.class);
        String configType = ymlReq.getType();
        String ymlConfigPath = this.getAppFilePath();
        File file = new File(ymlConfigPath);
        if (!file.exists()) {
            resultVo.setCode(Integer.valueOf(400));
            resultVo.setMsg("application.yml does not exist");
            return resultVo;
        }
        String absolutePath = file.getAbsolutePath();
        String currentDir = System.getProperty("user.dir");
        String relativeYmlPath = absolutePath.substring(currentDir.length() + 1);
        if (configType != null) {
            YmlConfigUtil.updateYmlConfig((String)configType, (String)reqStr, (String)relativeYmlPath);
        }
        return resultVo;
    }

    /*
     * WARNING - Removed try catching itself - possible behaviour change.
     */
    @ApiOperation(value="\u83b7\u53d6\u914d\u7f6e\u6587\u4ef6\u8def\u5f84")
    @PostMapping(value={"/getYmlPath"})
    @ResponseBody
    public ResultVo<Object> getYmlPath() throws Exception {
        ResultVo resultVo = new ResultVo();
        ObjectNode dataNode = this.objectMapper.createObjectNode();
        String applicationFilePath = this.getAppFilePath();
        Yaml yaml = new Yaml((BaseConstructor)new Constructor(Map.class));
        try (FileInputStream inputStream = null;){
            inputStream = new FileInputStream(applicationFilePath);
            Map data = (Map)yaml.load((InputStream)inputStream);
            Map server = (Map)data.get("server");
            Map ssl = (Map)server.get("ssl");
            String keyStoreValue = (String)ssl.get("key-store");
            int lastIndex = keyStoreValue.lastIndexOf("\\");
            if (lastIndex != -1) {
                keyStoreValue = keyStoreValue.substring(0, lastIndex + 1);
            }
            resultVo.setData((Object)keyStoreValue);
        }
        dataNode.put("msg", resultVo.getMsg());
        dataNode.put("code", resultVo.getCode());
        return resultVo;
    }

    @ApiOperation(value="\u83b7\u53d6\u914d\u7f6e\u6587\u4ef6\u4e2d\u6570\u636e\u5e93\u7684\u76f8\u5173\u53c2\u6570")
    @GetMapping(value={"/getDataBaseConfig"})
    @ResponseBody
    public ResultVo<Object> getDataBaseConfig() {
        DatabaseConfigVo databaseConfigVo = new DatabaseConfigVo();
        String applicationFilePath = this.getAppFilePath();
        try {
            String applicationYmlString = YmlConfigUtil.loadConfigString((String)applicationFilePath);
            if (StringUtils.isEmpty((CharSequence)applicationYmlString)) {
                log.error("application.yml \u5185\u5bb9\u4e3a\u7a7a\uff01");
                return ResultVo.error((String)"config file is empty.");
            }
            Yaml yaml = new Yaml();
            LinkedHashMap configMap = (LinkedHashMap)yaml.load(applicationYmlString);
            databaseConfigVo.setDatabaseType((String)configMap.get("databaseType"));
            databaseConfigVo.setDatabaseUrl((String)configMap.get("databaseUrl"));
            databaseConfigVo.setDatabaseUsername((String)configMap.get("databaseUsername"));
            databaseConfigVo.setDatabasePassword((String)configMap.get("databasePassword"));
        }
        catch (Exception e) {
            log.error("read application.yml failed.", (Throwable)e);
            throw new RuntimeException("\u52a0\u8f7d\u914d\u7f6e\u6587\u4ef6\u5931\u8d25\u3002");
        }
        if (this.securityConfig.getDisableShowUserInfo() != null && this.securityConfig.getDisableShowUserInfo().booleanValue()) {
            return ResultVo.response((Object)"******");
        }
        return ResultVo.response((Object)databaseConfigVo);
    }

    @SysLog(operation="updateDataBaseConfig", message="@{agv.controller.updateDataBaseConfig}")
    @ApiOperation(value="\u4fee\u6539\u914d\u7f6e\u6587\u4ef6\u4e2d\u6570\u636e\u5e93\u7684\u76f8\u5173\u53c2\u6570")
    @PostMapping(value={"/updateDataBaseConfig"})
    @ResponseBody
    public ResultVo<Object> updateDataBaseConfig(@RequestBody DatabaseConfigVo reqVo) throws IOException {
        if (null == reqVo) {
            log.error("\u4fee\u6539\u914d\u7f6e\u6587\u4ef6\u5931\u8d25\uff0c\u8bf7\u6c42\u53c2\u6570\u4e0d\u80fd\u4e3a\u7a7a\u3002");
            return ResultVo.error((CommonCodeEnum)CommonCodeEnum.Data_Cannot_Be_Empty);
        }
        HashMap<String, String> map = new HashMap<String, String>();
        map.put("databaseType", reqVo.getDatabaseType());
        map.put("databaseUrl", reqVo.getDatabaseUrl());
        map.put("databaseUsername", reqVo.getDatabaseUsername());
        map.put("databasePassword", reqVo.getDatabasePassword());
        String appFilePath = this.getAppFilePath();
        log.info("updateDataBaseConfig, application.yml located in: {}", (Object)appFilePath);
        boolean success = YmlConfigUtil.syncWriteToYml(map, (String)appFilePath);
        if (!success) {
            return ResultVo.error((CommonCodeEnum)CommonCodeEnum.WRITE_ERROR);
        }
        return ResultVo.success();
    }

    @SysLog(operation="resetDataBaseConfig", message="@{agv.controller.resetDataBaseConfig}")
    @ApiOperation(value="\u91cd\u7f6e\u914d\u7f6e\u6587\u4ef6\u4e2d\u6570\u636e\u5e93\u7684\u76f8\u5173\u53c2\u6570")
    @PostMapping(value={"/resetDataBaseConfig"})
    @ResponseBody
    public ResultVo<Object> resetDataBaseConfig() throws IOException {
        HashMap<String, String> map = new HashMap<String, String>();
        map.put("databaseType", "MYSQL");
        map.put("databaseUrl", "jdbc:mysql://localhost:3306/rds?userSSL=false&serverTimezone=GMT%2B8&useUnicode=true&characterEncoding=UTF-8");
        map.put("databaseUsername", "root");
        map.put("databasePassword", "rpth1q14QRnfAI/+/cgwdDoquCGOy03scSKIX4ow8dx+/9fM1E0mtmB3wCPWP9TBGQg6g5t1u7y5FxE58d2dAA==");
        String appFilePath = this.getAppFilePath();
        log.info("resetDataBaseConfig, application.yml located in: {}", (Object)appFilePath);
        boolean success = YmlConfigUtil.syncWriteToYml(map, (String)appFilePath);
        if (!success) {
            return ResultVo.error((CommonCodeEnum)CommonCodeEnum.WRITE_ERROR);
        }
        return ResultVo.success();
    }

    @ApiOperation(value="\u6570\u636e\u5e93\u5bc6\u7801\u52a0\u5bc6")
    @PostMapping(value={"/pwdEncrypt"})
    @ResponseBody
    public ResultVo<Object> pwdEncrypt(@RequestBody String param) {
        String encrypt;
        if (StringUtils.isEmpty((CharSequence)param)) {
            return ResultVo.error((CommonCodeEnum)CommonCodeEnum.Data_Cannot_Be_Empty);
        }
        JSONObject json = JSONObject.parseObject((String)param);
        Object pwd = json.get((Object)"pwd");
        if (null == pwd) {
            return ResultVo.error((CommonCodeEnum)CommonCodeEnum.Data_Cannot_Be_Empty);
        }
        String pwdStr = pwd.toString();
        try {
            encrypt = ConfigTools.encrypt((String)"MIIBVAIBADANBgkqhkiG9w0BAQEFAASCAT4wggE6AgEAAkEAvflw2D/63ILzOqtWY/r7Gt2O79yZqXJdYt21ZPY+mu3nwb7x4gt1gmKsLqO4K37S4mAb/SjL6BPuwBu9SABauQIDAQABAkBjCEmfMZsgoNMS3oamkAuesaj1uVYRUyEDjPgmrYdtU3eBSrVH9T2FtVIuEneHsE7c4tFOIzlUSSDFldRbkexBAiEA/ygHKbvgtbA/oTmrj+Sxsd/GG/AqW3XlsdMVwfF36H0CIQC+mj2m+pjjpYQBq3h1xVGe6we3FtIz9ssE6nTHFZ/L7QIhAN+n0I+OdewMr9m82VtqFTBbfCXlINvGvi5fXsT/yiFpAiAq1uwIfcajU+5JmcqnXcQsndLMGfsA5vVWk4PPw1J5OQIgc+e6lzRuSUyJq4XV7rF3rx36shdMsE8RjLdICUKlo7A=", (String)pwdStr);
        }
        catch (Exception e) {
            log.error("encrypt password failed.", (Throwable)e);
            throw new RuntimeException("\u52a0\u5bc6\u5931\u8d25\uff0c\u8bf7\u7a0d\u540e\u91cd\u8bd5\u3002");
        }
        return ResultVo.response((Object)encrypt);
    }

    @SysLog(operation="scriptDebug", message="@{script.controller.scriptDebug}")
    @PostMapping(value={"/scriptDebug"})
    @ResponseBody
    public ResultVo<Object> scriptDebug(@RequestBody DebugConfigOfView dcov) {
        String configFilePath = this.genUserConfigFilePath();
        HashMap<String, Object> map = new HashMap<String, Object>();
        if (dcov.getIfDebug() != null) {
            map.put("ifDebug", dcov.getIfDebug());
        }
        if (StringUtils.isNotEmpty((CharSequence)dcov.getDomainName())) {
            map.put("domainName", dcov.getDomainName());
        }
        if (StringUtils.isNotEmpty((CharSequence)dcov.getPort())) {
            map.put("port", dcov.getPort());
        }
        HashMap<String, HashMap<String, Object>> result = new HashMap<String, HashMap<String, Object>>();
        result.put("debug", map);
        return YmlConfigUtil.syncWriteToYml(result, (String)configFilePath) ? ResultVo.success() : ResultVo.error();
    }
}

