/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  cn.hutool.core.io.FileUtil
 *  com.alibaba.fastjson.JSONObject
 *  com.google.common.collect.Maps
 *  com.seer.rds.annotation.SysLog
 *  com.seer.rds.config.PropConfig
 *  com.seer.rds.constant.ApiEnum
 *  com.seer.rds.dao.TemplateTaskMapper
 *  com.seer.rds.model.wind.TemplateTask
 *  com.seer.rds.script.ScriptService
 *  com.seer.rds.service.agv.AgvApiService
 *  com.seer.rds.service.agv.WindTemplateTaskService
 *  com.seer.rds.util.ResourceUtil
 *  com.seer.rds.util.TemplateUtil
 *  com.seer.rds.util.YmlConfigUtil
 *  com.seer.rds.vo.ResultVo
 *  com.seer.rds.vo.req.TemplateTaskReq
 *  com.seer.rds.web.agv.WindTaskTemplateController
 *  com.seer.rds.web.config.ConfigFileController
 *  io.swagger.annotations.Api
 *  io.swagger.annotations.ApiOperation
 *  org.apache.commons.compress.utils.Lists
 *  org.apache.commons.lang3.StringUtils
 *  org.slf4j.Logger
 *  org.slf4j.LoggerFactory
 *  org.springframework.beans.factory.annotation.Autowired
 *  org.springframework.stereotype.Controller
 *  org.springframework.transaction.annotation.Transactional
 *  org.springframework.web.bind.annotation.PostMapping
 *  org.springframework.web.bind.annotation.RequestBody
 *  org.springframework.web.bind.annotation.RequestMapping
 *  org.springframework.web.bind.annotation.ResponseBody
 */
package com.seer.rds.web.agv;

import cn.hutool.core.io.FileUtil;
import com.alibaba.fastjson.JSONObject;
import com.google.common.collect.Maps;
import com.seer.rds.annotation.SysLog;
import com.seer.rds.config.PropConfig;
import com.seer.rds.constant.ApiEnum;
import com.seer.rds.dao.TemplateTaskMapper;
import com.seer.rds.model.wind.TemplateTask;
import com.seer.rds.script.ScriptService;
import com.seer.rds.service.agv.AgvApiService;
import com.seer.rds.service.agv.WindTemplateTaskService;
import com.seer.rds.util.ResourceUtil;
import com.seer.rds.util.TemplateUtil;
import com.seer.rds.util.YmlConfigUtil;
import com.seer.rds.vo.ResultVo;
import com.seer.rds.vo.req.TemplateTaskReq;
import com.seer.rds.web.config.ConfigFileController;
import io.swagger.annotations.Api;
import io.swagger.annotations.ApiOperation;
import java.io.File;
import java.io.IOException;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import org.apache.commons.compress.utils.Lists;
import org.apache.commons.lang3.StringUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseBody;

@Controller
@RequestMapping(value={"api"})
@Api(tags={"\u5929\u98ce\u4efb\u52a1\u6a21\u677f\u7ba1\u7406"})
public class WindTaskTemplateController {
    private static final Logger log = LoggerFactory.getLogger(WindTaskTemplateController.class);
    private static final String CFG_FILENAME = "application-biz.yml";
    @Autowired
    private TemplateTaskMapper templateTaskMapper;
    @Autowired
    private WindTaskTemplateController windTaskTemplateController;
    @Autowired
    private PropConfig propConfig;
    @Autowired
    private ScriptService scriptService;
    @Autowired
    private ConfigFileController configFileController;
    @Autowired
    private WindTemplateTaskService windTemplateTaskService;
    @Autowired
    private AgvApiService agvApiService;
    public static volatile Boolean ifChangeTemplate = false;

    /*
     * WARNING - Removed try catching itself - possible behaviour change.
     */
    @SysLog(operation="enable-task-template", message="@{wind.controller.enableTaskTemplate}")
    @ApiOperation(value="\u542f\u7528\u5929\u98ce\u4efb\u52a1\u6a21\u677f")
    @PostMapping(value={"/enableTaskTemplate"})
    @ResponseBody
    @Transactional(rollbackFor={Exception.class})
    public ResultVo<Object> enableTaskTemplate(@RequestBody TemplateTaskReq param) throws IOException {
        if (ifChangeTemplate.booleanValue()) {
            ResultVo resultVo = new ResultVo();
            resultVo.setMsg("Template exchanging");
            resultVo.setCode(Integer.valueOf(-1));
            return resultVo;
        }
        Boolean resultVo = ifChangeTemplate;
        synchronized (resultVo) {
            if (ifChangeTemplate.booleanValue()) {
                ResultVo resultVo2 = new ResultVo();
                resultVo2.setMsg("Template exchanging");
                resultVo2.setCode(Integer.valueOf(-1));
                return resultVo2;
            }
            ifChangeTemplate = true;
        }
        try {
            this.windTaskTemplateController.enableTemplate(param);
        }
        catch (Exception e) {
            ResultVo resultVo3 = new ResultVo();
            resultVo3.setMsg("Enable Template Fail:" + e.getMessage());
            log.error("EnableTaskTemplate InterruptedException", (Throwable)e);
            resultVo3.setCode(Integer.valueOf(-1));
            ResultVo resultVo4 = resultVo3;
            return resultVo4;
        }
        finally {
            ifChangeTemplate = false;
        }
        return ResultVo.success();
    }

    @Transactional(rollbackFor={Exception.class})
    public void enableTemplate(TemplateTaskReq param) throws Exception {
        String templateName = param.getTemplateName();
        TemplateTask templateTask = this.templateTaskMapper.findEnableTemplateTask().stream().findFirst().orElse(null);
        if (templateTask != null && templateTask.getTemplateName().equals("userTemplate")) {
            String scene = this.propConfig.getRdsTemplateDir() + "userTemplate/";
            log.info("\u4fdd\u5b58\u7528\u6237\u7684\u5730\u56fe\uff0cscene: {} ,before Template: {} ,after Template: {}", new Object[]{scene, templateTask.getTemplateName(), param.getTemplateName()});
            this.agvApiService.downloadByTemplate(ApiEnum.downloadScene.getUri(), scene);
            log.info("\u4fdd\u5b58\u5730\u56fe\u6210\u529f");
        }
        this.windTemplateTaskService.setTemplateEnable(param.getId());
        try {
            this.scriptService.boot();
        }
        catch (Exception e) {
            log.error(Arrays.toString(e.getStackTrace()));
        }
        log.info("script \u542f\u7528\u6210\u529f");
        boolean ifLoadSuccess = this.configFileController.loadConfig();
        if (!ifLoadSuccess) {
            throw new RuntimeException("config \u542f\u7528\u5931\u8d25");
        }
        log.info("config \u542f\u7528\u6210\u529f");
        Object sceneDir = "";
        sceneDir = templateName.equals("userTemplate") ? this.propConfig.getRdsTemplateDir() + "userTemplate/" : TemplateUtil.getTemplateDirByIfEnable();
        byte[] fileBytes = FileUtil.readBytes((String)((String)sceneDir + "scene.zip"));
        String res = this.agvApiService.upload(ApiEnum.uploadScene.getUri(), fileBytes);
        log.info("scene \u542f\u7528\u6210\u529f");
        this.templateTaskMapper.updateEnableFinished(param.getId());
    }

    @ApiOperation(value="\u67e5\u8be2\u6240\u6709\u5929\u98ce\u4efb\u52a1\u6a21\u677f")
    @PostMapping(value={"/findAllTemplateTask"})
    @ResponseBody
    public ResultVo<Object> findAllTemplateTask() throws Exception {
        List allTemplateTask = this.templateTaskMapper.findAllTemplateTask();
        return ResultVo.response((Object)allTemplateTask);
    }

    @ApiOperation(value="\u67e5\u8be2\u6240\u6709\u5929\u98ce\u4efb\u52a1\u6a21\u677f\u7684\u811a\u672c")
    @PostMapping(value={"/findTemplateTaskScript"})
    @ResponseBody
    public ResultVo<Object> findTemplateTaskScript(@RequestBody TemplateTaskReq param) throws Exception {
        String templateName = param.getTemplateName();
        String absoluteDir = this.propConfig.getRdsTemplateDir() + "/" + templateName;
        List scriptStrings = ResourceUtil.readFileToString((String)absoluteDir, (String)".js");
        File file = new File(absoluteDir);
        HashMap resp = Maps.newHashMap();
        if (file.isDirectory()) {
            int i;
            File[] files = file.listFiles();
            ArrayList fileNames = Lists.newArrayList();
            if (files.length > 0) {
                for (i = 0; i < files.length; ++i) {
                    String fileName = files[i].getName();
                    if (!fileName.endsWith("js")) continue;
                    fileNames.add(fileName);
                }
            }
            for (i = 0; i < fileNames.size(); ++i) {
                if (!((String)fileNames.get(i)).endsWith("js")) continue;
                String scriptStr = (String)scriptStrings.get(i);
                resp.put((String)fileNames.get(i), scriptStr);
            }
        }
        return ResultVo.response((Object)resp);
    }

    @ApiOperation(value="\u67e5\u8be2\u6240\u6709\u5929\u98ce\u4efb\u52a1\u6a21\u677f\u7684\u914d\u7f6e\u6587\u4ef6")
    @PostMapping(value={"/findTemplateTaskConfig"})
    @ResponseBody
    public ResultVo<Object> findTemplateTaskConfig(@RequestBody TemplateTaskReq param) throws Exception {
        File file;
        String templateName = param.getTemplateName();
        String configFilePath = this.propConfig.getRdsTemplateDir() + "/" + templateName + "/application-biz.yml";
        ResultVo resultVo = new ResultVo();
        if (StringUtils.isNotEmpty((CharSequence)configFilePath) && (file = new File(configFilePath)).exists()) {
            JSONObject configData = (JSONObject)YmlConfigUtil.loadConfig((String)configFilePath, JSONObject.class);
            resultVo.setData((Object)configData);
            return resultVo;
        }
        throw new RuntimeException("Config Is Null");
    }
}

