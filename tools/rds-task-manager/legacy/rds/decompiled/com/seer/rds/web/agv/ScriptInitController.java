/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.google.common.collect.Maps
 *  com.google.common.io.Files
 *  com.seer.rds.annotation.SysLog
 *  com.seer.rds.config.PropConfig
 *  com.seer.rds.constant.CommonCodeEnum
 *  com.seer.rds.constant.ScriptEnum
 *  com.seer.rds.dao.ScriptFileMapper
 *  com.seer.rds.model.script.ScriptFile
 *  com.seer.rds.script.ScriptService
 *  com.seer.rds.service.Archiving.ArchivingService
 *  com.seer.rds.util.ResourceUtil
 *  com.seer.rds.util.SpringUtil
 *  com.seer.rds.util.ZipUtils
 *  com.seer.rds.vo.ChildrenFileNameVo
 *  com.seer.rds.vo.ResultVo
 *  com.seer.rds.vo.ScriptVo
 *  com.seer.rds.vo.req.LoadHistoryReq
 *  com.seer.rds.vo.req.ScriptRunButtonReq
 *  com.seer.rds.vo.req.ScriptRunReq
 *  com.seer.rds.web.agv.ScriptInitController
 *  io.swagger.annotations.Api
 *  io.swagger.annotations.ApiOperation
 *  javax.servlet.ServletOutputStream
 *  javax.servlet.http.HttpServletResponse
 *  org.apache.commons.compress.utils.Lists
 *  org.apache.commons.io.FileUtils
 *  org.apache.commons.lang3.StringUtils
 *  org.slf4j.Logger
 *  org.slf4j.LoggerFactory
 *  org.springframework.beans.factory.annotation.Autowired
 *  org.springframework.stereotype.Controller
 *  org.springframework.transaction.annotation.Transactional
 *  org.springframework.util.CollectionUtils
 *  org.springframework.web.bind.annotation.GetMapping
 *  org.springframework.web.bind.annotation.PostMapping
 *  org.springframework.web.bind.annotation.RequestBody
 *  org.springframework.web.bind.annotation.RequestMapping
 *  org.springframework.web.bind.annotation.RequestParam
 *  org.springframework.web.bind.annotation.ResponseBody
 *  springfox.documentation.annotations.ApiIgnore
 */
package com.seer.rds.web.agv;

import com.google.common.collect.Maps;
import com.google.common.io.Files;
import com.seer.rds.annotation.SysLog;
import com.seer.rds.config.PropConfig;
import com.seer.rds.constant.CommonCodeEnum;
import com.seer.rds.constant.ScriptEnum;
import com.seer.rds.dao.ScriptFileMapper;
import com.seer.rds.model.script.ScriptFile;
import com.seer.rds.script.ScriptService;
import com.seer.rds.service.Archiving.ArchivingService;
import com.seer.rds.util.ResourceUtil;
import com.seer.rds.util.SpringUtil;
import com.seer.rds.util.ZipUtils;
import com.seer.rds.vo.ChildrenFileNameVo;
import com.seer.rds.vo.ResultVo;
import com.seer.rds.vo.ScriptVo;
import com.seer.rds.vo.req.LoadHistoryReq;
import com.seer.rds.vo.req.ScriptRunButtonReq;
import com.seer.rds.vo.req.ScriptRunReq;
import io.swagger.annotations.Api;
import io.swagger.annotations.ApiOperation;
import java.io.File;
import java.io.IOException;
import java.io.OutputStream;
import java.net.URLEncoder;
import java.nio.charset.Charset;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collection;
import java.util.Date;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import javax.servlet.ServletOutputStream;
import javax.servlet.http.HttpServletResponse;
import org.apache.commons.compress.utils.Lists;
import org.apache.commons.io.FileUtils;
import org.apache.commons.lang3.StringUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.CollectionUtils;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseBody;
import springfox.documentation.annotations.ApiIgnore;

@Controller
@RequestMapping(value={"/script"})
@Api(tags={"\u811a\u672c\u521d\u59cb\u5316"})
public class ScriptInitController {
    private static final Logger log = LoggerFactory.getLogger(ScriptInitController.class);
    @Autowired
    private ScriptService scriptService;
    @Autowired
    private PropConfig propConfig;
    @Autowired
    private ArchivingService archivingService;
    @Autowired
    private ScriptFileMapper scriptFileMapper;

    public Map<String, String> showScript(String scriptName) {
        List scriptStrings = ResourceUtil.readFileToString((String)scriptName, (String)".js");
        File file = new File(scriptName);
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
        return resp;
    }

    @SysLog(operation="boot", message="@{script.controller.boot}")
    @ApiOperation(value="\u521d\u59cb\u5316\u811a\u672c")
    @GetMapping(value={"/boot"})
    @ResponseBody
    public ResultVo<Object> boot() throws Exception {
        this.scriptService.boot();
        return ResultVo.success();
    }

    @ApiOperation(value="\u83b7\u53d6\u811a\u672cdebug\u7f51\u5740")
    @GetMapping(value={"/get-script-url"})
    @ResponseBody
    public ResultVo<Object> getScriptUrl() throws Exception {
        ScriptService ScriptServiceBean = (ScriptService)SpringUtil.getBean(ScriptService.class);
        String url = ScriptServiceBean.getUrl();
        return ResultVo.response((Object)url);
    }

    @SysLog(operation="run", message="@{script.controller.run}")
    @ApiOperation(value="\u624b\u52a8\u6267\u884c\u51fd\u6570")
    @PostMapping(value={"/run"})
    @ResponseBody
    public ResultVo<Object> run(@RequestBody ScriptRunReq req, @ApiIgnore HttpServletResponse response) throws Exception {
        this.scriptService.execute(req.getFunctionName(), req.getArgs());
        return ResultVo.success();
    }

    @ApiOperation(value="\u663e\u793a\u811a\u672c")
    @GetMapping(value={"/show-script"})
    @ResponseBody
    @Deprecated
    public ResultVo<Object> getScript(@ApiIgnore HttpServletResponse response) throws Exception {
        Map resp = this.showScript(this.propConfig.getRdsScriptDir());
        return ResultVo.response((Object)resp);
    }

    @SysLog(operation="/update-script", message="@{script.controller.updateScript}")
    @ApiOperation(value="\u4fdd\u5b58\u811a\u672c")
    @PostMapping(value={"/update-script"})
    @ResponseBody
    public ResultVo<Object> updateScript(@RequestBody ScriptVo body, @ApiIgnore HttpServletResponse response) throws Exception {
        String path = StringUtils.equals((CharSequence)body.getFolderName(), (CharSequence)"boot") ? this.propConfig.getRdsScriptDir() : this.propConfig.getRdsScriptDir() + body.getFolderName() + File.separator;
        File file = new File(path + body.getFileName());
        String beforMD5 = this.archivingService.getFileMD5String(file);
        FileUtils.writeStringToFile((File)file, (String)body.getScript(), (String)"utf-8");
        String afterMD5 = this.archivingService.getFileMD5String(file);
        if (!StringUtils.equals((CharSequence)beforMD5, (CharSequence)afterMD5)) {
            String historyPath = StringUtils.equals((CharSequence)body.getFolderName(), (CharSequence)"boot") ? this.propConfig.getRdsHistoryDir() + "script" : this.propConfig.getRdsHistoryDir() + "script" + File.separator + body.getFolderName();
            FileUtils.writeStringToFile((File)new File(historyPath, body.getFileName().substring(0, body.getFileName().length() - 3) + "-" + Instant.now().toEpochMilli() + ".js"), (String)body.getScript(), (Charset)Charset.forName("UTF-8"));
        }
        return ResultVo.success();
    }

    @ApiOperation(value="\u663e\u793a\u5386\u53f2\u7684\u67d0\u4e2a\u811a\u672c")
    @PostMapping(value={"/show-history-script"})
    @ResponseBody
    public ResultVo<Object> getScript(@RequestBody LoadHistoryReq req) throws Exception {
        String historyPath = StringUtils.equals((CharSequence)req.getFolderName(), (CharSequence)"boot") ? this.propConfig.getRdsHistoryDir() + "script" : this.propConfig.getRdsHistoryDir() + "script" + File.separator + req.getFolderName();
        String resp = FileUtils.readFileToString((File)new File(historyPath, req.getName()), (String)"utf-8");
        return ResultVo.response((Object)resp);
    }

    @ApiOperation(value="\u5207\u6362\u811a\u672c")
    @PostMapping(value={"/switchScript"})
    @ResponseBody
    public ResultVo<Object> switchScript(@RequestBody LoadHistoryReq req) throws Exception {
        String historyPath = StringUtils.equals((CharSequence)req.getFolderName(), (CharSequence)"boot") ? this.propConfig.getRdsHistoryDir() + "script" : this.propConfig.getRdsHistoryDir() + "script" + File.separator + req.getFolderName();
        String body = FileUtils.readFileToString((File)new File(historyPath, req.getName()), (String)"utf-8");
        String[] split = req.getName().split("-");
        String name = split[0];
        String path = StringUtils.equals((CharSequence)req.getFolderName(), (CharSequence)"boot") ? this.propConfig.getRdsScriptDir() : this.propConfig.getRdsScriptDir() + req.getFolderName() + File.separator;
        File file = new File(path + name + ".js");
        FileUtils.writeStringToFile((File)file, (String)body, (String)"utf-8");
        ScriptFile scriptFileByFolderName = this.scriptFileMapper.findScriptFileByFolderName(req.getFolderName());
        if (scriptFileByFolderName == null) {
            ScriptFile tmp = new ScriptFile();
            tmp.setFolderName(req.getFolderName());
            tmp.setEnable(Integer.valueOf(ScriptEnum.DISABLED.getStatus()));
            tmp.setDebugEnable(Integer.valueOf(ScriptEnum.DISABLED.getStatus()));
            tmp.setCreateTime(new Date());
            this.scriptFileMapper.save((Object)tmp);
        }
        return ResultVo.success();
    }

    @ApiOperation(value="\u83b7\u53d6\u5386\u53f2\u7684\u811a\u672c\u6587\u4ef6\u5217\u8868")
    @PostMapping(value={"/getHistoryScriptList"})
    @ResponseBody
    @Deprecated
    public ResultVo<Object> getHistoryScriptList() throws IOException {
        String filename = this.propConfig.getRdsHistoryDir() + "script";
        List someSortedHistoryList = this.archivingService.getSomeSortedHistoryList(filename);
        return ResultVo.response((Object)someSortedHistoryList);
    }

    @ApiOperation(value="\u663e\u793a\u811a\u672c\u63a5\u53e3")
    @PostMapping(value={"/script-api"})
    @ResponseBody
    @Deprecated
    public ResultVo<Object> showScriptApi(@ApiIgnore HttpServletResponse response) throws Exception {
        return ResultVo.response((Object)ScriptService.scriptApiList);
    }

    @ApiOperation(value="\u663e\u793a\u811a\u672c\u6309\u94ae")
    @PostMapping(value={"/show-button"})
    @ResponseBody
    public ResultVo<Object> showButton(@ApiIgnore HttpServletResponse response) throws Exception {
        return ResultVo.response((Object)ScriptService.ScriptButtonListMap);
    }

    @SysLog(operation="/new-script", message="@{script.controller.newScript}")
    @ApiOperation(value="\u65b0\u5efa\u811a\u672c")
    @RequestMapping(value={"/new-script"})
    @ResponseBody
    public ResultVo<Object> createScriptFile(@RequestParam(name="folderName") String folderName, @RequestParam(name="fileName", required=false) String fileName, @ApiIgnore HttpServletResponse response) throws Exception {
        log.info("createScriptFile new-script folderName = {}, fileName={}", (Object)folderName, (Object)fileName);
        if (StringUtils.isEmpty((CharSequence)fileName) && this.scriptFileMapper.findScriptFileByFolderName(folderName) != null) {
            return ResultVo.error((int)CommonCodeEnum.SCRIPT_CREATE_ERROR.getCode(), (String)CommonCodeEnum.SCRIPT_CREATE_ERROR.getMsg(), null);
        }
        Object path = StringUtils.equals((CharSequence)"boot", (CharSequence)folderName) ? this.propConfig.getRdsScriptDir() : this.propConfig.getRdsScriptDir() + folderName;
        File file = new File((String)path);
        if (!file.exists()) {
            file.mkdir();
            ScriptFile scriptFile = new ScriptFile();
            scriptFile.setFolderName(folderName);
            scriptFile.setEnable(Integer.valueOf(ScriptEnum.DISABLED.getStatus()));
            scriptFile.setDebugEnable(Integer.valueOf(ScriptEnum.DISABLED.getStatus()));
            scriptFile.setCreateTime(new Date());
            this.scriptFileMapper.save((Object)scriptFile);
        }
        if (StringUtils.isNotEmpty((CharSequence)fileName)) {
            File js = new File((String)path, fileName);
            if (!js.exists()) {
                try {
                    js.createNewFile();
                }
                catch (IOException e) {
                    log.error("createScript createNewFile error {}", (Throwable)e);
                    return ResultVo.error((CommonCodeEnum)CommonCodeEnum.SCRIPT_FILE_FILL);
                }
            } else {
                return ResultVo.error((CommonCodeEnum)CommonCodeEnum.SCRIPT_CREATE_ERROR);
            }
        }
        return ResultVo.success();
    }

    @SysLog(operation="/delete-script", message="@{script.controller.deleteScript}")
    @ApiOperation(value="\u5220\u9664\u811a\u672c")
    @GetMapping(value={"/delete-script"})
    @ResponseBody
    public ResultVo<Object> deleteScriptFile(@RequestParam(name="folderName") String folderName, @RequestParam(name="fileName", required=false) String fileName, @ApiIgnore HttpServletResponse response) throws Exception {
        String path;
        log.info("deleteScriptFile folderName = {}, fileName = {} {}", new Object[]{folderName, fileName, PropConfig.ifDebug()});
        String string = path = StringUtils.equals((CharSequence)"boot", (CharSequence)folderName) ? this.propConfig.getRdsScriptDir() : this.propConfig.getRdsScriptDir() + folderName;
        if (StringUtils.isEmpty((CharSequence)fileName)) {
            if (StringUtils.equals((CharSequence)"boot", (CharSequence)folderName)) {
                return ResultVo.error((CommonCodeEnum)CommonCodeEnum.SCRIPT_BOOT_DIR);
            }
            ScriptFile scriptFileByFolderName = this.scriptFileMapper.findScriptFileByFolderName(folderName);
            if (scriptFileByFolderName != null && (scriptFileByFolderName.getEnable().intValue() == ScriptEnum.ENABLED.getStatus() && !PropConfig.ifDebug() || PropConfig.ifDebug() && scriptFileByFolderName.getDebugEnable().intValue() == ScriptEnum.ENABLED.getStatus())) {
                return ResultVo.error((CommonCodeEnum)CommonCodeEnum.SCRIPT_FILE_STOP);
            }
            File file = new File(path);
            for (File listFile : file.listFiles(it -> it.getName().endsWith(".js"))) {
                listFile.delete();
            }
            if (!StringUtils.equals((CharSequence)"boot", (CharSequence)folderName)) {
                file.delete();
                this.scriptFileMapper.deleteScriptFileByFolderName(folderName);
            }
            return ResultVo.success();
        }
        if (!fileName.endsWith(".js")) {
            return ResultVo.error((CommonCodeEnum)CommonCodeEnum.FILE_NAME_NOT_EXIST);
        }
        File file = new File(path, fileName);
        try {
            file.delete();
        }
        catch (Exception exception) {
            // empty catch block
        }
        return ResultVo.success();
    }

    @SysLog(operation="/enable-script", message="@{script.controller.enableScript}")
    @ApiOperation(value="\u542f\u7528\u811a\u672c")
    @GetMapping(value={"/enable-script"})
    @ResponseBody
    public ResultVo<Object> enableScript(@RequestParam(value="folderName") String folderName) throws Exception {
        List allByDebugEnable;
        List collect;
        log.info("enableScript folderName = {}", (Object)folderName);
        if (PropConfig.ifDebug() && (collect = (allByDebugEnable = this.scriptFileMapper.findAllByDebugEnable(ScriptEnum.ENABLED.getStatus())).stream().filter(it -> StringUtils.equals((CharSequence)folderName, (CharSequence)it.getFolderName())).collect(Collectors.toList())).isEmpty() && !CollectionUtils.isEmpty((Collection)allByDebugEnable)) {
            return ResultVo.error((CommonCodeEnum)CommonCodeEnum.SCRIPT_DEBUG_STOP);
        }
        List c = this.scriptFileMapper.findAllByEnable(0);
        collect = c.stream().filter(it -> StringUtils.equals((CharSequence)folderName, (CharSequence)it.getFolderName())).collect(Collectors.toList());
        if (c.size() <= 4 || !collect.isEmpty()) {
            int result = PropConfig.ifDebug() ? this.scriptFileMapper.updateScriptDebugEnable(folderName, 0) : this.scriptFileMapper.updateScriptEnable(folderName, 0, new Date());
            try {
                this.scriptService.fileStop(folderName);
                this.scriptService.fileStart(folderName);
            }
            catch (Exception e) {
                this.scriptService.fileStop(folderName);
                result = PropConfig.ifDebug() ? this.scriptFileMapper.updateScriptDebugEnable(folderName, 1) : this.scriptFileMapper.updateScriptEnable(folderName, 1, new Date());
                throw e;
            }
            return ResultVo.response((Object)result);
        }
        return ResultVo.error((CommonCodeEnum)CommonCodeEnum.SCRIPT_FILE_MAXVALUE);
    }

    @SysLog(operation="/disEnable-script", message="@{script.controller.disEnableScript}")
    @ApiOperation(value="\u505c\u6b62\u811a\u672c")
    @GetMapping(value={"/disEnable-script"})
    @ResponseBody
    @Transactional
    public ResultVo<Object> disEnableScript(@RequestParam(value="folderName") String folderName) throws Exception {
        log.info("disEnableScript folderName = {}", (Object)folderName);
        int result = PropConfig.ifDebug() ? this.scriptFileMapper.updateScriptDebugEnable(folderName, 1) : this.scriptFileMapper.updateScriptEnable(folderName, 1, new Date());
        this.scriptService.fileStop(folderName);
        return ResultVo.success();
    }

    @SysLog(operation="run", message="@{script.controller.run}")
    @ApiOperation(value="\u9875\u9762\u81ea\u5b9a\u4e49\u6309\u94ae\u70b9\u51fb")
    @PostMapping(value={"/runButton"})
    @ResponseBody
    public ResultVo<Object> runButton(@RequestBody ScriptRunButtonReq req, @ApiIgnore HttpServletResponse response) throws Exception {
        log.info("runButton params = {}", (Object)req);
        this.scriptService.execute(req.getFolderName(), req.getFunctionName(), req.getArgs());
        return ResultVo.success();
    }

    @SysLog(operation="scriptExport", message="@{permission.scriptExport}")
    @GetMapping(value={"/zip"})
    public void exportFilesToZip(@RequestParam(required=false, name="folderName") String folderName, HttpServletResponse response) throws IOException {
        try {
            List files = this.listFilesForFolder(folderName);
            response.setContentType("application/zip;charset=UTF-8");
            response.setHeader("Content-Disposition", "attachment; filename=" + URLEncoder.encode("script.zip", StandardCharsets.UTF_8));
            try (ServletOutputStream out = response.getOutputStream();){
                response.reset();
                response.setHeader("Content-Disposition", "attachment;filename=" + URLEncoder.encode("script.zip", StandardCharsets.UTF_8));
                response.setContentType("application/zip;charset=UTF-8");
                ZipUtils.toZipAll((List)files, (OutputStream)out);
                out.flush();
            }
        }
        catch (IOException e) {
            log.error("exportFilesToZip error {}", (Throwable)e);
            response.sendError(500, "Failed to export ZIP file: " + e.getMessage());
        }
    }

    @GetMapping(value={"/showScriptTree"})
    @ResponseBody
    public ResultVo<Object> showScriptTree() {
        List scriptFiles = this.scriptFileMapper.findAll();
        for (ScriptFile scriptFile : scriptFiles) {
            String path = StringUtils.equals((CharSequence)"boot", (CharSequence)scriptFile.getFolderName()) ? this.propConfig.getScriptDir() : this.propConfig.getScriptDir() + scriptFile.getFolderName();
            List strings = ResourceUtil.readPathFilesNames((String)path, (String)".js");
            ArrayList<ChildrenFileNameVo> tmp = new ArrayList<ChildrenFileNameVo>();
            for (int i = 0; i < strings.size(); ++i) {
                ChildrenFileNameVo vo = new ChildrenFileNameVo();
                vo.setId(scriptFile.getFolderName() + "#" + (String)strings.get(i));
                vo.setLabel((String)strings.get(i));
                tmp.add(vo);
            }
            scriptFile.setChildren(tmp);
        }
        return ResultVo.response((Object)scriptFiles);
    }

    @GetMapping(value={"/showScriptJS"})
    @ResponseBody
    public ResultVo<Object> showScriptJS(@RequestParam(name="folderName") String folderName, @RequestParam(name="fileName") String fileName) {
        String path = StringUtils.equals((CharSequence)folderName, (CharSequence)"boot") ? this.propConfig.getRdsScriptDir() + fileName : this.propConfig.getRdsScriptDir() + folderName + File.separator + fileName;
        return ResultVo.response((Object)ResourceUtil.readFileToString((String)path));
    }

    private List<File> listFilesForFolder(String fileName) {
        ArrayList<File> fileList = new ArrayList<File>();
        ArrayList<ScriptFile> scriptDirs = new ArrayList<ScriptFile>();
        if (StringUtils.isEmpty((CharSequence)fileName)) {
            scriptDirs.addAll(this.scriptFileMapper.findAll());
        } else {
            scriptDirs.add(this.scriptFileMapper.findScriptFileByFolderName(fileName));
        }
        for (ScriptFile scriptDir : scriptDirs) {
            Object jsFiles;
            if (StringUtils.equals((CharSequence)scriptDir.getFolderName(), (CharSequence)"boot")) {
                jsFiles = new File(this.propConfig.getRdsScriptDir()).listFiles((dir, name) -> name.endsWith(".js"));
                if (jsFiles == null || ((File[])jsFiles).length <= 0) continue;
                fileList.addAll(Arrays.asList(jsFiles));
                continue;
            }
            jsFiles = new File(this.propConfig.getRdsScriptDir() + scriptDir.getFolderName());
            if (jsFiles == null) continue;
            fileList.add((File)jsFiles);
        }
        return fileList;
    }

    @ApiOperation(value="\u83b7\u53d6\u5386\u53f2\u7684\u811a\u672c\u6587\u4ef6\u76ee\u5f55")
    @GetMapping(value={"/getHistoryDir"})
    @ResponseBody
    public ResultVo<Object> getHistoryDir() throws IOException {
        String filename = this.propConfig.getRdsHistoryDir() + "script";
        HashMap tmp = Maps.newHashMap();
        this.getScriptDir(new File(filename), tmp);
        return ResultVo.response((Object)tmp);
    }

    private void getScriptDir(File file, HashMap<String, Set<String>> map) {
        File[] files = file.listFiles();
        HashSet<String> list = new HashSet<String>();
        for (File tmp : files) {
            if (tmp.isDirectory()) {
                this.getScriptDir(tmp, map);
                continue;
            }
            String[] parts = tmp.getName().split("-");
            list.add(parts[0]);
        }
        map.put(StringUtils.equals((CharSequence)file.getName(), (CharSequence)"script") ? "boot" : file.getName(), list);
    }

    @SysLog(operation="paste", message="@{script.controller.pasteScriptJS}")
    @GetMapping(value={"/pasteScriptJS"})
    @ResponseBody
    public ResultVo<Object> pasteScriptJS(@RequestParam(name="folderName") String folderName, @RequestParam(name="sourceFolderName") String sourceFolderName, @RequestParam(name="fileName") String fileName) {
        log.info("pasteScriptJS folderName = {}, sourceFolderName = {}, fileName = {}", new Object[]{folderName, sourceFolderName, fileName});
        String destPath = StringUtils.equals((CharSequence)folderName, (CharSequence)"boot") ? this.propConfig.getRdsScriptDir() + fileName : this.propConfig.getRdsScriptDir() + folderName + File.separator + fileName;
        String sourcePath = StringUtils.equals((CharSequence)sourceFolderName, (CharSequence)"boot") ? this.propConfig.getRdsScriptDir() + fileName : this.propConfig.getRdsScriptDir() + sourceFolderName + File.separator + fileName;
        try {
            File file = new File(destPath);
            if (file.exists()) {
                return ResultVo.error((CommonCodeEnum)CommonCodeEnum.SCRIPT_FILE_EXIST);
            }
            FileUtils.copyFile((File)new File(sourcePath), (File)file);
        }
        catch (IOException e) {
            log.error("pasteScriptJS error {}", (Throwable)e);
            return ResultVo.error((String)e.getMessage());
        }
        return ResultVo.success();
    }

    @SysLog(operation="rename", message="@{script.controller.renameScriptJS}")
    @GetMapping(value={"/renameScriptJS"})
    @ResponseBody
    public ResultVo<Object> renameScriptJS(@RequestParam(name="folderName") String folderName, @RequestParam(name="fileName") String fileName, @RequestParam(name="sourceFolderName") String sourceFolderName, @RequestParam(name="sourceFileName") String sourceFileName) {
        String sourcePath;
        log.info("renameScriptJS folderName = {},fileName = {}, sourceFolderName = {}, sourceFileName = {}", new Object[]{folderName, fileName, sourceFolderName, sourceFileName});
        String destPath = StringUtils.equals((CharSequence)folderName, (CharSequence)"boot") ? this.propConfig.getRdsScriptDir() + fileName : this.propConfig.getRdsScriptDir() + folderName + File.separator + fileName;
        String string = sourcePath = StringUtils.equals((CharSequence)sourceFolderName, (CharSequence)"boot") ? this.propConfig.getRdsScriptDir() + sourceFileName : this.propConfig.getRdsScriptDir() + sourceFolderName + File.separator + sourceFileName;
        if (StringUtils.equals((CharSequence)destPath, (CharSequence)sourcePath)) {
            return ResultVo.success();
        }
        File destFile = new File(destPath);
        if (destFile.exists()) {
            return ResultVo.error((CommonCodeEnum)CommonCodeEnum.SCRIPT_FILE_EXIST);
        }
        File file = new File(sourcePath);
        return ResultVo.response((Object)file.renameTo(destFile));
    }

    @SysLog(operation="move", message="@{script.controller.moveScriptJS}")
    @GetMapping(value={"/moveScriptJS"})
    @ResponseBody
    public ResultVo<Object> moveScriptJS(@RequestParam(name="folderName") String folderName, @RequestParam(name="fileName") String fileName, @RequestParam(name="sourceFolderName") String sourceFolderName) {
        log.info("moveScriptJS folderName = {},fileName = {}, sourceFolderName = {}", new Object[]{folderName, fileName, sourceFolderName});
        String destPath = StringUtils.equals((CharSequence)folderName, (CharSequence)"boot") ? this.propConfig.getRdsScriptDir() + fileName : this.propConfig.getRdsScriptDir() + folderName + File.separator + fileName;
        String sourcePath = StringUtils.equals((CharSequence)sourceFolderName, (CharSequence)"boot") ? this.propConfig.getRdsScriptDir() + fileName : this.propConfig.getRdsScriptDir() + sourceFolderName + File.separator + fileName;
        File destFile = new File(destPath);
        if (destFile.exists()) {
            return ResultVo.error((CommonCodeEnum)CommonCodeEnum.SCRIPT_FILE_EXIST);
        }
        try {
            Files.move((File)new File(sourcePath), (File)destFile);
        }
        catch (IOException e) {
            log.error("moveScriptJS error {}", (Throwable)e);
            return ResultVo.error((String)e.getMessage());
        }
        return ResultVo.success();
    }
}

