/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.alibaba.fastjson.JSON
 *  com.alibaba.fastjson.JSONObject
 *  com.seer.rds.annotation.SysLog
 *  com.seer.rds.config.PropConfig
 *  com.seer.rds.constant.CommonCodeEnum
 *  com.seer.rds.service.agv.AgvApiService
 *  com.seer.rds.service.replay.ReplayService
 *  com.seer.rds.util.FileUploadUtil
 *  com.seer.rds.util.ResourceUtil
 *  com.seer.rds.util.SpringUtil
 *  com.seer.rds.util.ZipUtils
 *  com.seer.rds.vo.ResultVo
 *  com.seer.rds.web.replay.ReplayController
 *  com.seer.rds.websocket.RdsServer
 *  io.swagger.annotations.Api
 *  io.swagger.annotations.ApiOperation
 *  javax.servlet.ServletOutputStream
 *  javax.servlet.http.HttpServletResponse
 *  org.apache.commons.collections.CollectionUtils
 *  org.apache.commons.io.FileUtils
 *  org.apache.commons.lang3.StringUtils
 *  org.slf4j.Logger
 *  org.slf4j.LoggerFactory
 *  org.springframework.beans.factory.annotation.Autowired
 *  org.springframework.stereotype.Controller
 *  org.springframework.web.bind.annotation.GetMapping
 *  org.springframework.web.bind.annotation.PostMapping
 *  org.springframework.web.bind.annotation.RequestMapping
 *  org.springframework.web.bind.annotation.RequestParam
 *  org.springframework.web.bind.annotation.ResponseBody
 *  org.springframework.web.multipart.MultipartFile
 *  springfox.documentation.annotations.ApiIgnore
 */
package com.seer.rds.web.replay;

import com.alibaba.fastjson.JSON;
import com.alibaba.fastjson.JSONObject;
import com.seer.rds.annotation.SysLog;
import com.seer.rds.config.PropConfig;
import com.seer.rds.constant.CommonCodeEnum;
import com.seer.rds.service.agv.AgvApiService;
import com.seer.rds.service.replay.ReplayService;
import com.seer.rds.util.FileUploadUtil;
import com.seer.rds.util.ResourceUtil;
import com.seer.rds.util.SpringUtil;
import com.seer.rds.util.ZipUtils;
import com.seer.rds.vo.ResultVo;
import com.seer.rds.websocket.RdsServer;
import io.swagger.annotations.Api;
import io.swagger.annotations.ApiOperation;
import java.io.File;
import java.io.IOException;
import java.io.OutputStream;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;
import javax.servlet.ServletOutputStream;
import javax.servlet.http.HttpServletResponse;
import org.apache.commons.collections.CollectionUtils;
import org.apache.commons.io.FileUtils;
import org.apache.commons.lang3.StringUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseBody;
import org.springframework.web.multipart.MultipartFile;
import springfox.documentation.annotations.ApiIgnore;

@Controller
@RequestMapping(value={"api"})
@Api(tags={"\u56de\u653e"})
public class ReplayController {
    private static final Logger log = LoggerFactory.getLogger(ReplayController.class);
    @Autowired
    private PropConfig propConfig;
    @Autowired
    private ReplayService replayService;
    @Autowired
    private AgvApiService agvApiService;

    @ApiOperation(value="\u56de\u653e\u7684\u673a\u5668\u4eba\u72b6\u6001")
    @GetMapping(value={"/replay/core"})
    @ResponseBody
    public ResultVo<Object> replayRobotsStatus(@RequestParam(value="dateTime") String dateTime, @RequestParam(value="from") String from, @RequestParam(value="uid") String uid) {
        if (StringUtils.isEmpty((CharSequence)dateTime)) {
            return ResultVo.error((String)"The request parameter dateTime cannot be null.");
        }
        if (StringUtils.isEmpty((CharSequence)from)) {
            return ResultVo.error((String)"The request parameter from cannot be null.");
        }
        Pattern pattern = Pattern.compile("(\\d{4}-\\d{2}-\\d{2} \\d{2}:\\d{2}:\\d{2})");
        if (!pattern.matcher(dateTime).matches()) {
            return ResultVo.error((String)"Request parameter dateTime is in wrong format, only yyyy-MM-dd HH:mm:ss is supported");
        }
        Object filePath = this.propConfig.getReplayRobotStatusesDir();
        if ("others".equals(from)) {
            filePath = this.propConfig.getReplayUploadDir() + "robotStatuses/";
        }
        Map map = this.replayService.getRobotStatusFromFile((String)filePath, dateTime);
        this.replayService.sendFileNameBySocket(dateTime, from, uid);
        return ResultVo.response((Object)map);
    }

    @ApiOperation(value="\u56de\u653e\u5c55\u793a\u573a\u666f\u6570\u636e")
    @GetMapping(value={"/replay/display-scene"})
    @ResponseBody
    public ResultVo<Object> replayScene(@RequestParam String name, @RequestParam(value="from") String from) {
        List scene;
        Object sceneDir = this.propConfig.getReplayScenesDir();
        if ("others".equals(from)) {
            sceneDir = this.propConfig.getReplayUploadDir() + "scenes/";
        }
        if (CollectionUtils.isNotEmpty((Collection)(scene = ResourceUtil.readFileToString((String)((String)sceneDir + name + ".scene"), (String)"scene")))) {
            String sceneInfo = (String)scene.get(0);
            JSONObject resultObject = new JSONObject();
            resultObject.put("name", (Object)name);
            resultObject.put("scene", (Object)JSONObject.parseObject((String)sceneInfo));
            return ResultVo.response((Object)resultObject);
        }
        return ResultVo.error((CommonCodeEnum)CommonCodeEnum.DATA_NON);
    }

    @ApiOperation(value="\u56de\u653e\u5e93\u4f4d\u5217\u8868")
    @GetMapping(value={"/replay/sites"})
    @ResponseBody
    public ResultVo<Object> replaySites(@RequestParam(value="dateTime") String dateTime, @RequestParam(value="from") String from) {
        if (StringUtils.isEmpty((CharSequence)dateTime)) {
            return ResultVo.error((String)"The request parameter dateTime cannot be null.");
        }
        if (StringUtils.isEmpty((CharSequence)from)) {
            return ResultVo.error((String)"The request parameter from cannot be null.");
        }
        Pattern pattern = Pattern.compile("(\\d{4}-\\d{2}-\\d{2} \\d{2}:\\d{2}:\\d{2})");
        if (!pattern.matcher(dateTime).matches()) {
            return ResultVo.error((String)"Request parameter dateTime is in wrong format, only yyyy-MM-dd HH:mm:ss is supported");
        }
        Object sitesDir = this.propConfig.getReplaySitesDir();
        if ("others".equals(from)) {
            sitesDir = this.propConfig.getReplayUploadDir() + "sites/";
        }
        Map map = this.replayService.getSitesFromFile((String)sitesDir, dateTime);
        return ResultVo.response((Object)map);
    }

    /*
     * WARNING - Removed try catching itself - possible behaviour change.
     */
    @ApiOperation(value="\u5bfc\u51fa\u56de\u653e\u6570\u636e")
    @GetMapping(value={"/replay/export"})
    @ResponseBody
    public void export(@RequestParam(value="startTime") String startTime, @RequestParam(value="endTime") String endTime, @ApiIgnore HttpServletResponse response) {
        String dataFileName = startTime.replaceAll("-", "").replaceAll(":", "").replaceAll(" ", "") + "-" + endTime.replaceAll("-", "").replaceAll(":", "").replaceAll(" ", "");
        String dataSuffix = ".txt";
        String sitesDir = this.propConfig.getReplaySitesDir();
        String path = sitesDir.substring(0, sitesDir.length() - 6);
        List filesToZip = this.replayService.getFileNamesBetween(startTime, endTime);
        if (CollectionUtils.isEmpty((Collection)filesToZip)) {
            throw new RuntimeException("data none.");
        }
        File dataFile = new File(path + dataFileName + dataSuffix);
        try (ServletOutputStream outputStream = response.getOutputStream();){
            FileUtils.touch((File)dataFile);
            filesToZip.add(dataFileName + dataSuffix);
            response.setHeader("Content-Disposition", "attachment;filename=" + URLEncoder.encode("Replay-" + dataFileName + ".zip", StandardCharsets.UTF_8));
            response.setContentType("application/zip;charset=UTF-8");
            ZipUtils.toZipWithFileStructure((String)path, (List)filesToZip, (OutputStream)outputStream);
            outputStream.flush();
        }
        catch (IOException e) {
            log.error("export error.");
        }
        finally {
            dataFile.delete();
        }
    }

    /*
     * WARNING - Removed try catching itself - possible behaviour change.
     */
    @SysLog(operation="/replay/upload", message="@{replay.controller.upload}")
    @ApiOperation(value="\u5bfc\u5165\u56de\u653e\u6570\u636e")
    @PostMapping(value={"/replay/upload"})
    @ResponseBody
    public ResultVo<Object> uploadScene(@RequestParam(value="file") MultipartFile file) {
        String[] list;
        boolean typeMatch = FileUploadUtil.checkUploadType((MultipartFile)file, (String)"zip", (String)"application/x-zip-compressed,application/zip");
        if (!typeMatch) {
            return ResultVo.error((CommonCodeEnum)CommonCodeEnum.UPLOAD_FILE_TYPE_ERROR);
        }
        if (file.isEmpty()) {
            return ResultVo.error();
        }
        String uploadDir = this.propConfig.getReplayUploadDir();
        File uploadFile = new File(uploadDir);
        String fileName = file.getOriginalFilename();
        File zipFile = new File(uploadDir + fileName);
        if (uploadFile.exists()) {
            try {
                FileUtils.cleanDirectory((File)uploadFile);
            }
            catch (IOException e) {
                log.error("delete file error", (Throwable)e);
                return ResultVo.error((CommonCodeEnum)CommonCodeEnum.WS_MSG_IN_REPLAYING_NOT_ALLOWED_UPLOAD);
            }
        }
        try {
            if (!zipFile.getParentFile().exists()) {
                zipFile.getParentFile().mkdirs();
            }
            zipFile.createNewFile();
            file.transferTo(zipFile);
            this.agvApiService.unzip(zipFile, uploadFile);
        }
        catch (IOException e) {
            log.error("ZipFile transferTo error", (Throwable)e);
            ResultVo resultVo = ResultVo.error();
            return resultVo;
        }
        finally {
            zipFile.delete();
        }
        for (String s : list = uploadFile.list()) {
            if (!s.endsWith("txt")) continue;
            ResultVo success = ResultVo.success((CommonCodeEnum)CommonCodeEnum.WS_MSG_UPDATE_REPLAY_DATE, (Object)s.substring(0, s.length() - 4));
            RdsServer websocketServer = (RdsServer)SpringUtil.getBean(RdsServer.class);
            websocketServer.sendMessage(JSON.toJSONString((Object)success));
            break;
        }
        return ResultVo.success();
    }
}

