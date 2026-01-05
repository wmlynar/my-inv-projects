/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.alibaba.fastjson.JSON
 *  com.seer.rds.config.PropConfig
 *  com.seer.rds.constant.CommonCodeEnum
 *  com.seer.rds.constant.ScriptEnum
 *  com.seer.rds.dao.ScriptFileMapper
 *  com.seer.rds.dao.WindTaskDefHistoryMapper
 *  com.seer.rds.model.script.ScriptFile
 *  com.seer.rds.model.wind.InterfacePreHandle
 *  com.seer.rds.model.wind.WindTaskDef
 *  com.seer.rds.model.wind.WindTaskDefHistory
 *  com.seer.rds.service.agv.InterfaceService
 *  com.seer.rds.service.agv.WindService
 *  com.seer.rds.service.agv.WindTaskDefService
 *  com.seer.rds.service.agv.WindTaskService
 *  com.seer.rds.service.agv.WorkSiteService
 *  com.seer.rds.util.FileUploadUtil
 *  com.seer.rds.util.ResourceUtil
 *  com.seer.rds.vo.ResultVo
 *  com.seer.rds.web.config.ZipController
 *  io.swagger.annotations.Api
 *  io.swagger.annotations.ApiOperation
 *  javax.servlet.http.HttpServletResponse
 *  net.lingala.zip4j.core.ZipFile
 *  net.lingala.zip4j.exception.ZipException
 *  net.lingala.zip4j.model.FileHeader
 *  org.slf4j.Logger
 *  org.slf4j.LoggerFactory
 *  org.springframework.beans.factory.annotation.Autowired
 *  org.springframework.dao.DataIntegrityViolationException
 *  org.springframework.stereotype.Controller
 *  org.springframework.util.CollectionUtils
 *  org.springframework.util.StringUtils
 *  org.springframework.web.bind.annotation.PostMapping
 *  org.springframework.web.bind.annotation.RequestMapping
 *  org.springframework.web.bind.annotation.RequestParam
 *  org.springframework.web.bind.annotation.ResponseBody
 *  org.springframework.web.multipart.MultipartFile
 *  springfox.documentation.annotations.ApiIgnore
 */
package com.seer.rds.web.config;

import com.alibaba.fastjson.JSON;
import com.seer.rds.config.PropConfig;
import com.seer.rds.constant.CommonCodeEnum;
import com.seer.rds.constant.ScriptEnum;
import com.seer.rds.dao.ScriptFileMapper;
import com.seer.rds.dao.WindTaskDefHistoryMapper;
import com.seer.rds.model.script.ScriptFile;
import com.seer.rds.model.wind.InterfacePreHandle;
import com.seer.rds.model.wind.WindTaskDef;
import com.seer.rds.model.wind.WindTaskDefHistory;
import com.seer.rds.service.agv.InterfaceService;
import com.seer.rds.service.agv.WindService;
import com.seer.rds.service.agv.WindTaskDefService;
import com.seer.rds.service.agv.WindTaskService;
import com.seer.rds.service.agv.WorkSiteService;
import com.seer.rds.util.FileUploadUtil;
import com.seer.rds.util.ResourceUtil;
import com.seer.rds.vo.ResultVo;
import io.swagger.annotations.Api;
import io.swagger.annotations.ApiOperation;
import java.io.File;
import java.io.IOException;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Date;
import java.util.List;
import java.util.stream.Collectors;
import javax.servlet.http.HttpServletResponse;
import net.lingala.zip4j.core.ZipFile;
import net.lingala.zip4j.exception.ZipException;
import net.lingala.zip4j.model.FileHeader;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Controller;
import org.springframework.util.CollectionUtils;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseBody;
import org.springframework.web.multipart.MultipartFile;
import springfox.documentation.annotations.ApiIgnore;

@Controller
@RequestMapping(value={"/api"})
@Api(tags={"Zip\u901a\u7528"})
public class ZipController {
    private static final Logger log = LoggerFactory.getLogger(ZipController.class);
    private static String windTaskDefName = "windTask.task";
    private static String workSiteName = "worksite.xls";
    private static String applicationName = "application-biz.yml";
    private static String bootName = "boot.js";
    private static String zipName = "zipFile.zip";
    @Autowired
    private WindTaskDefHistoryMapper windTaskDefHistoryMapper;
    @Autowired
    private PropConfig propConfig;
    @Autowired
    private WorkSiteService workSiteService;
    @Autowired
    private WindService windService;
    @Autowired
    private WindTaskDefService windTaskDefService;
    @Autowired
    private InterfaceService interfaceService;
    @Autowired
    private WindTaskService windTaskService;
    @Autowired
    private ScriptFileMapper scriptFileMapper;

    @ApiOperation(value="zip\u89e3\u538b\u4e09\u79cd\u6587\u4ef6\u5e76\u8986\u76d6\u6587\u4ef6\u5bfc\u5165\u6570\u636e\u5e93")
    @PostMapping(value={"/zipDecompression"})
    @ResponseBody
    public ResultVo ZipDecompression(@RequestParam(value="file") MultipartFile zipFile, @ApiIgnore HttpServletResponse response) {
        boolean typeMatch = FileUploadUtil.checkUploadType((MultipartFile)zipFile, (String)"zip", (String)"application/x-zip-compressed");
        if (!typeMatch) {
            return ResultVo.error((CommonCodeEnum)CommonCodeEnum.UPLOAD_FILE_TYPE_ERROR);
        }
        String zipFilename = zipFile.getOriginalFilename();
        File file = new File(this.propConfig.getRdsStaticDir() + File.separator + zipFilename);
        try {
            zipFile.transferTo(file);
        }
        catch (IOException e) {
            file.delete();
            log.error("ZipFile transferTo error", (Throwable)e);
            return ResultVo.error();
        }
        try {
            ZipFile zFile = new ZipFile(file);
            zFile.setFileNameCharset("gb2312");
            List fileHeaders = zFile.getFileHeaders();
            for (FileHeader fileHeader : fileHeaders) {
                String folderName;
                ScriptFile scriptFile;
                log.info("isDirectory =" + fileHeader.isDirectory());
                log.info("fileName =" + fileHeader.getFileName());
                Path path = Paths.get(fileHeader.getFileName(), new String[0]);
                if (path.getNameCount() > 1 && fileHeader.isDirectory() || !fileHeader.isDirectory() && path.getNameCount() > 2) continue;
                if (fileHeader.isDirectory() && (scriptFile = this.scriptFileMapper.findScriptFileByFolderName(folderName = fileHeader.getFileName().substring(0, fileHeader.getFileName().length() - 1))) == null) {
                    ScriptFile tmp = new ScriptFile();
                    tmp.setFolderName(folderName);
                    tmp.setEnable(Integer.valueOf(ScriptEnum.DISABLED.getStatus()));
                    tmp.setDebugEnable(Integer.valueOf(ScriptEnum.DISABLED.getStatus()));
                    tmp.setCreateTime(new Date());
                    this.scriptFileMapper.save((Object)tmp);
                }
                if (fileHeader.getFileName().indexOf(".task") > 0) {
                    log.info(this.propConfig.getRdsStaticDir());
                    zFile.extractFile(fileHeader, this.propConfig.getRdsStaticDir());
                    try {
                        List taksDefFiles = ResourceUtil.readFileToString((String)(this.propConfig.getRdsStaticDir() + File.separator + fileHeader.getFileName()), (String)".task");
                        List windTaskDefs = JSON.parseArray((String)((String)taksDefFiles.get(0)), WindTaskDef.class);
                        List inLables = windTaskDefs.stream().map(def -> def.getLabel()).collect(Collectors.toList());
                        List localLables = this.windTaskDefService.findAllWindTaskDef().stream().map(def -> def.getLabel()).collect(Collectors.toList());
                        List labelcollect = localLables.stream().filter(inLables::contains).collect(Collectors.toList());
                        if (CollectionUtils.isEmpty(labelcollect)) {
                            for (WindTaskDef windTaskDef : windTaskDefs) {
                                windTaskDef.setWindcategoryId(Long.valueOf(0L));
                                windTaskDef.setIfEnable(Integer.valueOf(0));
                                if (StringUtils.isEmpty((Object)windTaskDef.getTemplateName())) {
                                    windTaskDef.setTemplateName("userTemplate");
                                }
                                if (windTaskDef.getIfEnable() == null) {
                                    windTaskDef.setIfEnable(Integer.valueOf(0));
                                }
                                if (windTaskDef.getPeriodicTask() == null) {
                                    windTaskDef.setPeriodicTask(Integer.valueOf(0));
                                }
                                this.windService.saveTask(windTaskDef);
                                WindTaskDefHistory windTaskDefHistory = WindTaskDefHistory.builder().createDate(new Date()).label(windTaskDef.getLabel()).detail(windTaskDef.getDetail()).version(windTaskDef.getVersion()).build();
                                try {
                                    this.windTaskDefHistoryMapper.save((Object)windTaskDefHistory);
                                }
                                catch (Exception e) {
                                    log.error(e.getMessage());
                                }
                            }
                        } else {
                            file.delete();
                            log.error("ZipUpTaskFile  taskIn error  windTask is repeat" + JSON.toJSONString(labelcollect));
                            return ResultVo.error((CommonCodeEnum)CommonCodeEnum.WIND_LABEL_ERROR, (Object)("windTask is repeat:" + JSON.toJSONString(labelcollect)));
                        }
                        new File(this.propConfig.getRdsStaticDir() + File.separator + fileHeader.getFileName()).delete();
                    }
                    catch (DataIntegrityViolationException e) {
                        file.delete();
                        log.error("ZipUpTaskFile error", (Throwable)e);
                        return ResultVo.error();
                    }
                }
                if (fileHeader.getFileName().equals("application.yml")) {
                    log.info("getAppDir:" + this.propConfig.getAppDir());
                    zFile.extractFile(fileHeader, this.propConfig.getAppDir());
                }
                if (fileHeader.getFileName().equals("application-biz.yml")) {
                    log.info("getScriptDir:" + this.propConfig.getScriptDir());
                    zFile.extractFile(fileHeader, this.propConfig.getScriptDir());
                }
                if (fileHeader.getFileName().indexOf(".js") > 0) {
                    log.info("getScriptDir:" + this.propConfig.getScriptDir());
                    zFile.extractFile(fileHeader, this.propConfig.getScriptDir());
                }
                if (fileHeader.getFileName().indexOf(".api") <= 0) continue;
                log.info("getRdsStaticDir:" + this.propConfig.getRdsStaticDir());
                zFile.extractFile(fileHeader, this.propConfig.getRdsStaticDir());
                try {
                    List interfaceFiles = ResourceUtil.readFileToString((String)(this.propConfig.getRdsStaticDir() + File.separator + fileHeader.getFileName()), (String)".api");
                    List interfaceList = JSON.parseArray((String)((String)interfaceFiles.get(0)), InterfacePreHandle.class);
                    List urls = interfaceList.stream().map(def -> def.getUrl()).collect(Collectors.toList());
                    List localInterface = this.interfaceService.findAll();
                    List localUrls = localInterface.stream().map(def -> def.getUrl()).collect(Collectors.toList());
                    List urlCollect = localUrls.stream().filter(urls::contains).collect(Collectors.toList());
                    if (CollectionUtils.isEmpty(urlCollect)) {
                        for (InterfacePreHandle interfaceFile : interfaceList) {
                            this.interfaceService.saveInterface(interfaceFile);
                        }
                        new File(this.propConfig.getRdsStaticDir() + File.separator + fileHeader.getFileName()).delete();
                        continue;
                    }
                    file.delete();
                    log.error("ZipUpTaskFile  task In error,  interface is repeat" + JSON.toJSONString(urlCollect));
                    return ResultVo.error((CommonCodeEnum)CommonCodeEnum.Interface_IS_EXIST, (Object)("interface is repeat:" + JSON.toJSONString(urlCollect)));
                }
                catch (DataIntegrityViolationException e) {
                    file.delete();
                    log.error("ZipUpTaskFile error", (Throwable)e);
                    return ResultVo.error();
                }
            }
            file.delete();
            return ResultVo.success();
        }
        catch (ZipException e) {
            file.delete();
            log.error("ZipDecompression error", (Throwable)e);
            return ResultVo.error();
        }
    }

    @ApiOperation(value="zip\u89e3\u538b\u4e09\u79cdsql\u6587\u4ef6\u5e76\u8986\u76d6\u6587\u4ef6\u5bfc\u5165\u6570\u636e\u5e93")
    @PostMapping(value={"/zipDecompressionSql"})
    @ResponseBody
    public ResultVo ZipDecompressionSql(@RequestParam(value="file") MultipartFile zipFile, @ApiIgnore HttpServletResponse response) {
        String zipFilename = zipFile.getOriginalFilename();
        File file = new File(this.propConfig.getRdsStaticDir() + File.separator + zipFilename);
        try {
            long start = System.currentTimeMillis();
            zipFile.transferTo(file);
            ZipFile zFile = new ZipFile(file);
            this.windTaskService.insertWindTaskSQL(zFile);
            long end = System.currentTimeMillis();
            log.info("\u89e3\u538b\u5b8c\u6210\uff0c\u8017\u65f6\uff1a" + (end - start) + " ms");
            File directory = new File(this.propConfig.getScriptDir() + "sqlFile");
            if (directory.exists()) {
                this.deleteDirectory(directory);
            }
            file.delete();
        }
        catch (Exception e) {
            File directory = new File(this.propConfig.getScriptDir() + "sqlFile");
            if (directory.exists()) {
                this.deleteDirectory(directory);
            }
            return ResultVo.error((CommonCodeEnum)CommonCodeEnum.ID_DUPLICATED);
        }
        return ResultVo.success();
    }

    public void deleteDirectory(File directory) {
        File[] files;
        if (directory.isDirectory() && (files = directory.listFiles()) != null) {
            for (File file : files) {
                this.deleteDirectory(file);
            }
        }
        directory.delete();
    }
}

