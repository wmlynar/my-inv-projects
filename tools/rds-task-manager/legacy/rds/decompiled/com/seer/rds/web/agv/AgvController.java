/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.alibaba.fastjson.JSON
 *  com.alibaba.fastjson.JSONObject
 *  com.fasterxml.jackson.databind.ObjectMapper
 *  com.seer.rds.annotation.SysLog
 *  com.seer.rds.config.GlobalCacheConfig
 *  com.seer.rds.config.LocaleConfig
 *  com.seer.rds.config.PropConfig
 *  com.seer.rds.constant.ApiEnum
 *  com.seer.rds.constant.CommonCodeEnum
 *  com.seer.rds.dao.TemplateTaskMapper
 *  com.seer.rds.model.device.AgvAttr
 *  com.seer.rds.model.wind.TemplateTask
 *  com.seer.rds.service.admin.SysAlarmService
 *  com.seer.rds.service.agv.AgvApiService
 *  com.seer.rds.service.wind.RootBp
 *  com.seer.rds.util.FileUploadUtil
 *  com.seer.rds.util.MD5Utils
 *  com.seer.rds.util.OkHttpUtil
 *  com.seer.rds.util.ResourceUtil
 *  com.seer.rds.util.SpringUtil
 *  com.seer.rds.vo.ResultVo
 *  com.seer.rds.vo.SetRobotIOReq
 *  com.seer.rds.vo.req.AttrAgvDeleteReq
 *  com.seer.rds.vo.req.BlockGroupReq
 *  com.seer.rds.vo.req.ChangeDestinationReq
 *  com.seer.rds.vo.req.ChangeRobotReq
 *  com.seer.rds.vo.req.ChangingProgressReq
 *  com.seer.rds.vo.req.ChargeAGVReq
 *  com.seer.rds.vo.req.ControlMotionReq
 *  com.seer.rds.vo.req.DutyOperationsReq
 *  com.seer.rds.vo.req.DutyRecordsReq
 *  com.seer.rds.vo.req.PaginationReq
 *  com.seer.rds.vo.req.ReleaseOrCancelReq
 *  com.seer.rds.vo.req.RssiMapReq
 *  com.seer.rds.vo.req.SetForkHeightReq
 *  com.seer.rds.vo.req.StopForkReq
 *  com.seer.rds.vo.req.taskRevertReq
 *  com.seer.rds.vo.response.AlarmDescResponseVo
 *  com.seer.rds.vo.response.AlarmDescResponseVo$CoreAlarmSolutionVo
 *  com.seer.rds.vo.response.AlarmDescResponseVo$RBKAlarmDescVO
 *  com.seer.rds.vo.response.AlarmDescResponseVo$RBKAlarmSolutionVo
 *  com.seer.rds.vo.response.PaginationResponseVo
 *  com.seer.rds.web.agv.AgvController
 *  io.swagger.annotations.Api
 *  io.swagger.annotations.ApiOperation
 *  javax.servlet.http.HttpServletResponse
 *  org.apache.commons.collections.CollectionUtils
 *  org.apache.commons.lang3.StringUtils
 *  org.slf4j.Logger
 *  org.slf4j.LoggerFactory
 *  org.springframework.beans.factory.annotation.Autowired
 *  org.springframework.context.i18n.LocaleContextHolder
 *  org.springframework.core.io.ClassPathResource
 *  org.springframework.data.domain.Page
 *  org.springframework.stereotype.Controller
 *  org.springframework.util.StreamUtils
 *  org.springframework.web.bind.annotation.GetMapping
 *  org.springframework.web.bind.annotation.PathVariable
 *  org.springframework.web.bind.annotation.PostMapping
 *  org.springframework.web.bind.annotation.RequestBody
 *  org.springframework.web.bind.annotation.RequestHeader
 *  org.springframework.web.bind.annotation.RequestMapping
 *  org.springframework.web.bind.annotation.RequestParam
 *  org.springframework.web.bind.annotation.ResponseBody
 *  org.springframework.web.multipart.MultipartFile
 *  springfox.documentation.annotations.ApiIgnore
 */
package com.seer.rds.web.agv;

import com.alibaba.fastjson.JSON;
import com.alibaba.fastjson.JSONObject;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.seer.rds.annotation.SysLog;
import com.seer.rds.config.GlobalCacheConfig;
import com.seer.rds.config.LocaleConfig;
import com.seer.rds.config.PropConfig;
import com.seer.rds.constant.ApiEnum;
import com.seer.rds.constant.CommonCodeEnum;
import com.seer.rds.dao.TemplateTaskMapper;
import com.seer.rds.model.device.AgvAttr;
import com.seer.rds.model.wind.TemplateTask;
import com.seer.rds.service.admin.SysAlarmService;
import com.seer.rds.service.agv.AgvApiService;
import com.seer.rds.service.wind.RootBp;
import com.seer.rds.util.FileUploadUtil;
import com.seer.rds.util.MD5Utils;
import com.seer.rds.util.OkHttpUtil;
import com.seer.rds.util.ResourceUtil;
import com.seer.rds.util.SpringUtil;
import com.seer.rds.vo.ResultVo;
import com.seer.rds.vo.SetRobotIOReq;
import com.seer.rds.vo.req.AttrAgvDeleteReq;
import com.seer.rds.vo.req.BlockGroupReq;
import com.seer.rds.vo.req.ChangeDestinationReq;
import com.seer.rds.vo.req.ChangeRobotReq;
import com.seer.rds.vo.req.ChangingProgressReq;
import com.seer.rds.vo.req.ChargeAGVReq;
import com.seer.rds.vo.req.ControlMotionReq;
import com.seer.rds.vo.req.DutyOperationsReq;
import com.seer.rds.vo.req.DutyRecordsReq;
import com.seer.rds.vo.req.PaginationReq;
import com.seer.rds.vo.req.ReleaseOrCancelReq;
import com.seer.rds.vo.req.RssiMapReq;
import com.seer.rds.vo.req.SetForkHeightReq;
import com.seer.rds.vo.req.StopForkReq;
import com.seer.rds.vo.req.taskRevertReq;
import com.seer.rds.vo.response.AlarmDescResponseVo;
import com.seer.rds.vo.response.PaginationResponseVo;
import io.swagger.annotations.Api;
import io.swagger.annotations.ApiOperation;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.Charset;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import javax.servlet.http.HttpServletResponse;
import org.apache.commons.collections.CollectionUtils;
import org.apache.commons.lang3.StringUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.i18n.LocaleContextHolder;
import org.springframework.core.io.ClassPathResource;
import org.springframework.data.domain.Page;
import org.springframework.stereotype.Controller;
import org.springframework.util.StreamUtils;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseBody;
import org.springframework.web.multipart.MultipartFile;
import springfox.documentation.annotations.ApiIgnore;

@Controller
@RequestMapping(value={"api"})
@Api(tags={"\u573a\u666f\u7ba1\u7406"})
public class AgvController {
    private static final Logger log = LoggerFactory.getLogger(AgvController.class);
    @Autowired
    private AgvApiService agvApiService;
    @Autowired
    private PropConfig propConfig;
    @Autowired
    private LocaleConfig localeConfig;
    @Autowired
    private SysAlarmService sysAlarmService;

    @ApiOperation(value="\u673a\u5668\u4eba\u72b6\u6001")
    @GetMapping(value={"/agv-report/core"})
    @ResponseBody
    public ResultVo<Object> robotsStatus(@ApiIgnore HttpServletResponse response) throws Exception {
        String string = null;
        try {
            string = this.agvApiService.robotsStatus();
            if (StringUtils.isEmpty((CharSequence)string)) {
                return ResultVo.error((CommonCodeEnum)CommonCodeEnum.ROBOT_STATUS_SYC_EXCEPTION);
            }
        }
        catch (Exception e) {
            return ResultVo.error((CommonCodeEnum)CommonCodeEnum.ROBOT_STATUS_SYC_EXCEPTION);
        }
        return ResultVo.response((Object)JSONObject.parse((String)this.agvApiService.ParsingAgvDataBasedOnPermission(string)));
    }

    @SysLog(operation="downloadScene", message="@{agv.controller.downloadScene}")
    @ApiOperation(value="\u4e0b\u8f7d\u573a\u666f")
    @GetMapping(value={"/download-scene"})
    @ResponseBody
    public ResultVo<Object> downloadScene() throws IOException {
        TemplateTaskMapper templateTaskMapper = (TemplateTaskMapper)SpringUtil.getBean(TemplateTaskMapper.class);
        TemplateTask templateTask = templateTaskMapper.findEnableTemplateTask().stream().findFirst().orElse(null);
        if (templateTask != null) {
            if (templateTask.getTemplateName().equals("userTemplate")) {
                this.agvApiService.download(ApiEnum.downloadScene.getUri(), null);
                return ResultVo.response(null);
            }
            ResultVo resultVo = new ResultVo();
            resultVo.setMsg("please use userTemplate");
            resultVo.setCode(Integer.valueOf(-1));
            return resultVo;
        }
        return ResultVo.response(null);
    }

    @ApiOperation(value="\u5c55\u793a\u573a\u666f\u6570\u636e")
    @GetMapping(value={"/display-scene"})
    @ResponseBody
    public ResultVo<Object> displayScene(@RequestParam(required=false) String md5) throws IOException {
        Object cache = GlobalCacheConfig.getCache((String)"sceneMd5CacheKey");
        if (cache != null) {
            String cache_scene_md5 = cache.toString();
            if (cache_scene_md5.equals(md5)) {
                JSONObject resultObject = new JSONObject();
                resultObject.put("md5", (Object)md5);
                return ResultVo.response((Object)resultObject);
            }
            List scene = ResourceUtil.readFileToString((String)(this.propConfig.getSceneDir() + "rds.scene"), (String)"scene");
            if (CollectionUtils.isNotEmpty((Collection)scene)) {
                String sceneInfo = (String)scene.get(0);
                JSONObject resultObject = new JSONObject();
                resultObject.put("md5", (Object)cache_scene_md5);
                resultObject.put("scene", (Object)JSONObject.parseObject((String)sceneInfo));
                return ResultVo.response((Object)resultObject);
            }
            return ResultVo.error((CommonCodeEnum)CommonCodeEnum.DATA_NON);
        }
        List scene = ResourceUtil.readFileToString((String)(this.propConfig.getSceneDir() + "rds.scene"), (String)"scene");
        if (CollectionUtils.isNotEmpty((Collection)scene)) {
            String sceneInfo = (String)scene.get(0);
            String sceneMd5 = MD5Utils.MD5((String)sceneInfo);
            JSONObject resultObject = new JSONObject();
            resultObject.put("md5", (Object)sceneMd5);
            resultObject.put("scene", (Object)JSONObject.parseObject((String)sceneInfo));
            return ResultVo.response((Object)resultObject);
        }
        return ResultVo.error((CommonCodeEnum)CommonCodeEnum.DATA_NON);
    }

    @SysLog(operation="uploadScene", message="@{agv.controller.uploadScene}")
    @ApiOperation(value="\u4e0a\u4f20\u573a\u666f")
    @PostMapping(value={"/upload-scene"})
    @ResponseBody
    public ResultVo<Object> uploadScene(@RequestParam(value="file") MultipartFile file) throws IOException {
        boolean typeMatch = FileUploadUtil.checkUploadType((MultipartFile)file, (String)"zip", (String)"application/x-zip-compressed");
        if (!typeMatch) {
            return ResultVo.error((CommonCodeEnum)CommonCodeEnum.UPLOAD_FILE_TYPE_ERROR);
        }
        if (file.isEmpty()) {
            return ResultVo.error();
        }
        byte[] fileBytes = file.getBytes();
        String res = this.agvApiService.upload(ApiEnum.uploadScene.getUri(), fileBytes);
        log.info("\u4e0a\u4f20\u6210\u529f\uff0c\u54cd\u5e94\u7ed3\u679c\uff1a" + res);
        return ResultVo.success();
    }

    @ApiOperation(value="\u83b7\u53d6\u914d\u7f6e\u6587\u4ef6")
    @GetMapping(value={"/get-profiles"})
    @ResponseBody
    public ResultVo<Object> getProfiles(@RequestParam(value="fileName") String fileName) throws IOException {
        JSONObject param = new JSONObject();
        param.put("file", (Object)fileName);
        String res = this.agvApiService.post(ApiEnum.getProfiles.getUri(), param.toJSONString());
        return ResultVo.response((Object)JSONObject.parseObject((String)res));
    }

    @ApiOperation(value="\u83b7\u53d6\u673a\u5668\u4eba\u5f53\u524d\u5730\u56fe\u6570\u636e\u7684\u70b9\u4e91\u548c\u53cd\u5149\u677f\u70b9")
    @GetMapping(value={"/smap/rssiAndPos/{agvs}"})
    @ResponseBody
    public ResultVo<Object> getRssiListAndPositionListByVehicle(@PathVariable String[] agvs) {
        return ResultVo.response((Object)this.agvApiService.getRssiListAndPositionListByVehicle(agvs));
    }

    @ApiOperation(value="\u6839\u636emap\u540d\u83b7\u53d6\u673a\u5668\u4eba\u70b9\u4e91\u548c\u53cd\u5149\u677f\u70b9")
    @PostMapping(value={"/smap/rssiAndPosByMap"})
    @ResponseBody
    public ResultVo<Object> getRssiListAndPositionListByMap(@RequestBody RssiMapReq mapNames) {
        return ResultVo.response((Object)this.agvApiService.getRssiListAndPositionListByMaps(mapNames));
    }

    @ApiOperation(value="\u83b7\u53d6\u914d\u7f6e\u6587\u4ef6")
    @GetMapping(value={"/get-rbkjson"})
    @ResponseBody
    public ResultVo<Object> getRbkJson() throws IOException {
        List json = null;
        Locale locale = LocaleContextHolder.getLocale();
        json = locale.equals(Locale.US) ? ResourceUtil.readFileToString((String)(this.propConfig.getConfigDir() + "rbk-scripts-en.json"), (String)"json") : (locale.equals(Locale.SIMPLIFIED_CHINESE) ? ResourceUtil.readFileToString((String)(this.propConfig.getConfigDir() + "rbk-scripts.json"), (String)"json") : (locale.equals(Locale.TAIWAN) ? ResourceUtil.readFileToString((String)(this.propConfig.getConfigDir() + "rbk-scripts-zh_TW.json"), (String)"json") : ResourceUtil.readFileToString((String)(this.propConfig.getConfigDir() + "rbk-scripts-" + locale.toString().split("_")[0] + ".json"), (String)"json")));
        return ResultVo.response(CollectionUtils.isNotEmpty((Collection)json) ? json.get(0) : null);
    }

    @ApiOperation(value="\u56de\u8df3")
    @PostMapping(value={"/revert_jump"})
    @ResponseBody
    public ResultVo<Object> taskRevert(@RequestBody taskRevertReq req) throws IOException {
        GlobalCacheConfig.cacheInterrupt((String)req.getTaskRecordId(), (String)"RevertJumpKey");
        GlobalCacheConfig.cacheSkip((String)(req.getTaskId() + req.getTaskRecordId()), (Object)req.getRevertId());
        List cacheThreadSet = GlobalCacheConfig.getCacheThread((String)req.getTaskRecordId());
        for (Thread thread : cacheThreadSet) {
            thread.interrupt();
        }
        this.sysAlarmService.deleteTaskAlarmLikeAndNoticeWeb(req.getTaskRecordId());
        GlobalCacheConfig.clearTaskErrorCacheByContainsPrefix((String)req.getTaskRecordId());
        return ResultVo.success();
    }

    @ApiOperation(value="\u6362\u8f66")
    @PostMapping(value={"/change_robot"})
    @ResponseBody
    public ResultVo<Object> changeRobot(@RequestBody ChangeRobotReq req) throws IOException {
        log.info("\u6362\u8f66");
        log.info(req.toString());
        if (StringUtils.isEmpty((CharSequence)req.getOriginalAgvId()) || req.getIfFilled() == null) {
            return new ResultVo(Integer.valueOf(-1), "Robot id parameter or whether the stock parameter is empty");
        }
        if (req.getIfFilled().booleanValue() && (StringUtils.isEmpty((CharSequence)req.getLocation()) || req.getPickUpMode() == null)) {
            return new ResultVo(Integer.valueOf(-1), "The starting point parameter or the pick up mode is empty.");
        }
        try {
            new Thread((Runnable)new /* Unavailable Anonymous Inner Class!! */).start();
        }
        catch (Exception e) {
            log.error("changeRobot Exception", (Throwable)e);
        }
        return ResultVo.success();
    }

    @ApiOperation(value="\u66f4\u6362\u76ee\u7684\u5730")
    @PostMapping(value={"/change_destination"})
    @ResponseBody
    public ResultVo<Object> changeDestination(@RequestBody ChangeDestinationReq req) throws IOException {
        log.info("\u66f4\u6362\u76ee\u7684\u5730");
        log.info(req.toString());
        if (StringUtils.isEmpty((CharSequence)req.getTargetSiteLabel())) {
            return new ResultVo(Integer.valueOf(-1), "targetSiteLabel is null");
        }
        if (StringUtils.isEmpty((CharSequence)req.getTaskRecordId())) {
            return new ResultVo(Integer.valueOf(-1), "taskRecordId is null");
        }
        try {
            new Thread((Runnable)new /* Unavailable Anonymous Inner Class!! */).start();
        }
        catch (Exception e) {
            log.error("changeDestination Exception", (Throwable)e);
        }
        return ResultVo.success();
    }

    @ApiOperation(value="\u6362\u8f66\u653e\u884c")
    @PostMapping(value={"/changeAgvRelease"})
    @ResponseBody
    public ResultVo<Object> startSuspendTask(@RequestBody ReleaseOrCancelReq req) {
        try {
            log.info("\u6362\u8f66\u653e\u884c");
            this.agvApiService.changeAgvRelease(req.getOrderId());
        }
        catch (Exception e) {
            log.error("changeAgvRelease Exception", (Throwable)e);
        }
        return ResultVo.response(null);
    }

    @SysLog(operation="setRobotIO", message="@{agv.controller.setRobotIO}")
    @ApiOperation(value="\u8bbe\u7f6e\u673a\u5668\u4ebaIO")
    @PostMapping(value={"/setRobotIO"})
    @ResponseBody
    public ResultVo<Object> setRobotIO(@RequestBody SetRobotIOReq setRobotIOReq) {
        log.info("setRobotIO request params = {}", (Object)setRobotIOReq);
        if (StringUtils.isEmpty((CharSequence)setRobotIOReq.getType()) || StringUtils.isEmpty((CharSequence)setRobotIOReq.getVehicle()) || setRobotIOReq.getStatus() == null || setRobotIOReq.getId() == null) {
            return ResultVo.error((int)CommonCodeEnum.REQUEST_PARMAS_ERROR.getCode(), (String)CommonCodeEnum.REQUEST_PARMAS_ERROR.getMsg(), (Object)"");
        }
        try {
            String res = OkHttpUtil.postJsonParams((String)RootBp.getUrl((String)ApiEnum.setRobotIO.getUri()), (String)JSONObject.toJSONString((Object)setRobotIOReq));
            if (StringUtils.isEmpty((CharSequence)res)) {
                return ResultVo.error();
            }
            JSONObject resObj = JSONObject.parseObject((String)res);
            Integer code = resObj.getInteger("code");
            String msg = resObj.getString("msg");
            if (code != null) {
                if (code == 0) {
                    return ResultVo.success();
                }
                return ResultVo.error((String)msg);
            }
        }
        catch (Exception e) {
            log.error("setRobotIO request Core error = {}", (Throwable)e);
        }
        return ResultVo.error();
    }

    @SysLog(operation="cancellationOfRobotExchange", message="@{user.controller.cancellationOfRobotExchange}")
    @ApiOperation(value="\u53d6\u6d88\u6362\u8f66")
    @PostMapping(value={"/cancellationOfRobotExchange"})
    @ResponseBody
    public ResultVo<Object> cancellationOfRobotExchange(@RequestBody ReleaseOrCancelReq req) throws IOException {
        try {
            log.info("\u53d6\u6d88\u6362\u8f66");
            this.agvApiService.cancelChangeAgv(req.getOriginalOrderId(), req.getOrderId());
        }
        catch (Exception e) {
            log.error("CancellationOfRobotExchange Exception", (Throwable)e);
        }
        return ResultVo.response(null);
    }

    @ApiOperation(value="\u6362\u8f66\u8fdb\u5ea6\u5217\u8868\u67e5\u8be2(\u5206\u9875\u67e5\u8be2)")
    @PostMapping(value={"findProgressOfRobotExchange"})
    @ResponseBody
    public ResultVo<Object> findProgressOfRobotExchangeByCondition(@RequestBody PaginationReq<ChangingProgressReq> req) throws Exception {
        ChangingProgressReq queryParam = (ChangingProgressReq)req.getQueryParam();
        PaginationResponseVo changeProgressList = this.agvApiService.findChangeProgressList(req.getCurrentPage(), req.getPageSize(), (ChangingProgressReq)req.getQueryParam());
        return ResultVo.response((Object)changeProgressList);
    }

    @ApiOperation(value="\u83b7\u53d6\u6240\u6709\u7b2c\u4e09\u65b9\u673a\u5668\u4eba")
    @PostMapping(value={"/agv/getAllAttrAgv"})
    @ResponseBody
    public ResultVo<Object> getAllAttrAgv(@ApiIgnore HttpServletResponse response) {
        List attrAgvList = this.agvApiService.findAllAttrAgv();
        return ResultVo.response((Object)attrAgvList);
    }

    @ApiOperation(value="\u65b0\u589e/\u4fee\u6539\u673a\u5668\u4eba")
    @PostMapping(value={"/agv/saveOrUpdateAttrAgv"})
    @ResponseBody
    public ResultVo<Object> saveOrUpdateAttrAgv(@RequestBody AgvAttr agvAttr) {
        this.agvApiService.saveOrUpdateAttrAgv(agvAttr);
        return ResultVo.success();
    }

    @ApiOperation(value="\u5220\u9664\u7b2c\u4e09\u65b9\u673a\u5668\u4eba")
    @PostMapping(value={"/agv/deleteAgvAttr"})
    @ResponseBody
    public ResultVo<Object> deleteAgvAttr(@RequestBody AttrAgvDeleteReq req) throws Exception {
        String agvName = req.getAgvName();
        this.agvApiService.deleteAttrAgvByAgvName(agvName);
        return ResultVo.success();
    }

    @PostMapping(value={"/agv/getBlockGroupStatus"})
    @ApiOperation(value="\u67e5\u8be2\u6307\u5b9a\u4e92\u65a5\u7ec4\u7684\u72b6\u6001")
    @ResponseBody
    public ResultVo<Object> getBlockGroupStatus(@ApiIgnore HttpServletResponse response) {
        List<String> blockGroups = Arrays.asList(new String[0]);
        String res = this.agvApiService.getBlockGroupStatus(blockGroups);
        return ResultVo.response((Object)JSONObject.parse((String)res));
    }

    @SysLog(operation="setAgvBlockGroupFill", message="@{agv.controller.setAgvBlockGroupFill}")
    @PostMapping(value={"/agv/setAgvBlockGroupFill"})
    @ApiOperation(value="\u5360\u7528\u4e92\u65a5\u7ec4")
    @ResponseBody
    public ResultVo<Object> setAgvBlockGroupFill(@RequestBody BlockGroupReq req, @ApiIgnore HttpServletResponse response) {
        String res = this.agvApiService.setAgvBlockGroupFill(req.getId(), req.getBlockGroup());
        return ResultVo.response((Object)JSONObject.parse((String)res));
    }

    @SysLog(operation="releaseBlockGroup", message="@{agv.controller.releaseBlockGroup}")
    @PostMapping(value={"/agv/releaseBlockGroup"})
    @ApiOperation(value="\u91ca\u653e\u6307\u5b9a\u4e92\u65a5\u7ec4")
    @ResponseBody
    public ResultVo<Object> releaseBlockGroup(@RequestBody BlockGroupReq req, @ApiIgnore HttpServletResponse response) {
        String res = this.agvApiService.releaseBlockGroup(req.getId(), req.getBlockGroup());
        return ResultVo.response((Object)JSONObject.parse((String)res));
    }

    @SysLog(operation="setSoftIOEMC", message="@{agv.controller.setSoftIOEMC}")
    @ApiOperation(value="\u8bbe\u7f6e\u673a\u5668\u4eba\u8f6f\u6025\u505c")
    @PostMapping(value={"/agv/setSoftIOEMC"})
    @ResponseBody
    public ResultVo<Object> setSoftStop(@RequestBody SetRobotIOReq req) throws Exception {
        String vehicle = req.getVehicle();
        if (StringUtils.isNotEmpty((CharSequence)vehicle)) {
            Map result = this.agvApiService.setSoftStop(req);
            if ("200".equals(result.get("code"))) {
                return ResultVo.success();
            }
            return ResultVo.error((int)9000, (String)((String)result.get("body")), null);
        }
        return ResultVo.error((CommonCodeEnum)CommonCodeEnum.DATA_NON);
    }

    @PostMapping(value={"/stopFork"})
    @ResponseBody
    public ResultVo<Object> stopFork(@RequestBody StopForkReq req) {
        String result;
        try {
            result = OkHttpUtil.postJsonParams((String)RootBp.getUrl((String)ApiEnum.stopFork.getUri()), (String)JSONObject.toJSONString((Object)req));
        }
        catch (Exception e) {
            log.error("stopFork error", (Throwable)e);
            return ResultVo.error((CommonCodeEnum)CommonCodeEnum.ROBOT_STATUS_SYC_EXCEPTION);
        }
        return ResultVo.response((Object)result);
    }

    @PostMapping(value={"/setForkHeight"})
    @ResponseBody
    public ResultVo<Object> setForkHeight(@RequestBody SetForkHeightReq req) {
        String result;
        try {
            result = OkHttpUtil.postJsonParams((String)RootBp.getUrl((String)ApiEnum.setForkHeight.getUri()), (String)JSONObject.toJSONString((Object)req));
        }
        catch (Exception e) {
            log.error("setForkHeight error", (Throwable)e);
            return ResultVo.error((CommonCodeEnum)CommonCodeEnum.ROBOT_STATUS_SYC_EXCEPTION);
        }
        return ResultVo.response((Object)result);
    }

    @PostMapping(value={"/controlMotion"})
    @ResponseBody
    public ResultVo<Object> controlMotion(@RequestBody ControlMotionReq req) {
        String result;
        try {
            result = OkHttpUtil.postJsonParams((String)RootBp.getUrl((String)ApiEnum.controlMotion.getUri()), (String)JSONObject.toJSONString((Object)req));
        }
        catch (Exception e) {
            log.error("setForkHeight error", (Throwable)e);
            return ResultVo.error((CommonCodeEnum)CommonCodeEnum.ROBOT_STATUS_SYC_EXCEPTION);
        }
        return ResultVo.response((Object)result);
    }

    @GetMapping(value={"/queryChargeParam/{vehicles}"})
    @ApiOperation(value="\u67e5\u8be2\u5145\u7535\u9608\u503c")
    @ResponseBody
    public ResultVo<Object> queryChargeParam(@PathVariable String vehicles) {
        String res;
        try {
            res = OkHttpUtil.get((String)(PropConfig.getRdsCoreBaseUrl() + ApiEnum.queryChargeParam.getUri()));
        }
        catch (Exception e) {
            log.error("query charge param error", (Throwable)e);
            return ResultVo.error((CommonCodeEnum)CommonCodeEnum.QUERY_CHARGE_THRESHOLD_ERROR);
        }
        List<String> vehicleNames = Arrays.asList(vehicles.split(","));
        if (StringUtils.isEmpty((CharSequence)vehicles) || vehicleNames.isEmpty()) {
            JSONObject jsonObject = JSONObject.parseObject((String)res);
            if (jsonObject == null) {
                return ResultVo.response(null);
            }
            for (String key : jsonObject.keySet()) {
                JSONObject valueObj = jsonObject.getJSONObject(key);
                for (String keyV : valueObj.keySet()) {
                    String v = valueObj.getString(keyV);
                    Double d = Double.valueOf(v);
                    valueObj.put(keyV, (Object)d);
                }
                jsonObject.put(key, (Object)valueObj);
            }
            return ResultVo.response((Object)jsonObject);
        }
        JSONObject jsonObject = JSON.parseObject((String)res);
        HashMap<String, JSONObject> resp = new HashMap<String, JSONObject>();
        for (Map.Entry o : jsonObject.entrySet()) {
            String name = (String)o.getKey();
            if (!StringUtils.isNotEmpty((CharSequence)name) || !vehicleNames.contains(name)) continue;
            JSONObject thresholds = (JSONObject)o.getValue();
            for (String key : thresholds.keySet()) {
                String threshold = thresholds.getString(key);
                Double d = Double.valueOf(threshold);
                thresholds.put(key, (Object)d);
            }
            resp.put(name, thresholds);
        }
        return ResultVo.response(resp);
    }

    @PostMapping(value={"/modifyChargeParam"})
    @SysLog(operation="modifyChargeParam", message="@{agv.controller.modifyChargeParam}")
    @ApiOperation(value="\u4fee\u6539\u5145\u7535\u9608\u503c")
    @ResponseBody
    public ResultVo<Object> modifyChargeParam(@RequestBody ChargeAGVReq chargeAGVReq) {
        try {
            String res = OkHttpUtil.postJsonParams((String)(PropConfig.getRdsCoreBaseUrl() + ApiEnum.modifyChargeParam.getUri()), (String)new ObjectMapper().writeValueAsString((Object)chargeAGVReq));
            JSONObject resObject = JSONObject.parseObject((String)res);
            Integer code = resObject.getInteger("code");
            String msg = resObject.getString("msg");
            if (code != null) {
                if (code == 0) {
                    return ResultVo.success();
                }
                return ResultVo.error((String)msg);
            }
            return ResultVo.error();
        }
        catch (Exception e) {
            log.error("modify charge param error", (Throwable)e);
            return ResultVo.error((CommonCodeEnum)CommonCodeEnum.MODIFY_CHARGE_THRESHOLD_ERROR);
        }
    }

    /*
     * WARNING - Removed try catching itself - possible behaviour change.
     */
    @ApiOperation(value="\u83b7\u53d6\u544a\u8b66\u63cf\u8ff0\u4fe1\u606f")
    @PostMapping(value={"/getAgvAlarmDesc"})
    @ResponseBody
    public ResultVo<Object> modifyChargeParam(@RequestHeader(value="language", required=false) String language) {
        InputStream coreInputStream = null;
        InputStream rbkInputStream = null;
        InputStream rbkAlarmInputStream = null;
        try {
            ClassPathResource rbkAlarmDescResource;
            ClassPathResource rbkSolutionResource;
            Locale lang = this.localeConfig.transformationLanguage(language);
            AlarmDescResponseVo alarmDescResponseVo = new AlarmDescResponseVo();
            ClassPathResource coreSolutionResource = new ClassPathResource("rbk/coreAlarmSolution_" + lang + ".properties");
            if (coreSolutionResource.exists()) {
                coreInputStream = coreSolutionResource.getInputStream();
                String coreAlarmSolution = StreamUtils.copyToString((InputStream)coreInputStream, (Charset)StandardCharsets.UTF_8);
                AlarmDescResponseVo.CoreAlarmSolutionVo coreAlarmSolutionVo = new AlarmDescResponseVo.CoreAlarmSolutionVo(alarmDescResponseVo);
                coreAlarmSolutionVo.setVersion(Integer.valueOf(1));
                coreAlarmSolutionVo.setCoreAlarmDesc(coreAlarmSolution);
                alarmDescResponseVo.setCoreAlarmSolutionDesc(coreAlarmSolutionVo);
            }
            if ((rbkSolutionResource = new ClassPathResource("rbk/rbkAlarmSolution_" + lang + ".properties")).exists()) {
                rbkInputStream = rbkSolutionResource.getInputStream();
                String rbkAlarmSolution = StreamUtils.copyToString((InputStream)rbkInputStream, (Charset)StandardCharsets.UTF_8);
                AlarmDescResponseVo.RBKAlarmSolutionVo rbkAlarmSolutionVo = new AlarmDescResponseVo.RBKAlarmSolutionVo(alarmDescResponseVo);
                rbkAlarmSolutionVo.setVersion(Integer.valueOf(1));
                rbkAlarmSolutionVo.setRbkAlarmDesc(rbkAlarmSolution);
                alarmDescResponseVo.setRbkAlarmSolutionDesc(rbkAlarmSolutionVo);
            }
            if ((rbkAlarmDescResource = new ClassPathResource("rbk/rbkAlarmDesc_" + lang + ".properties")).exists()) {
                rbkAlarmInputStream = rbkAlarmDescResource.getInputStream();
                String rbkAlarmDesc = StreamUtils.copyToString((InputStream)rbkAlarmInputStream, (Charset)StandardCharsets.UTF_8);
                AlarmDescResponseVo.RBKAlarmDescVO rbkAlarmDescVo = new AlarmDescResponseVo.RBKAlarmDescVO(alarmDescResponseVo);
                rbkAlarmDescVo.setVersion(Integer.valueOf(1));
                rbkAlarmDescVo.setRbkAlarmDesc(rbkAlarmDesc);
                alarmDescResponseVo.setRbkAlarmDesc(rbkAlarmDescVo);
            }
            ResultVo resultVo = ResultVo.response((Object)alarmDescResponseVo);
            return resultVo;
        }
        catch (Exception e) {
            log.error("Get robot alarm desc error", (Throwable)e);
            ResultVo resultVo = ResultVo.error((CommonCodeEnum)CommonCodeEnum.ERROR);
            return resultVo;
        }
        finally {
            if (coreInputStream != null) {
                try {
                    coreInputStream.close();
                }
                catch (IOException e) {
                    log.error("Close coreAlarmSolution stream error.", (Throwable)e);
                }
            }
            if (rbkInputStream != null) {
                try {
                    rbkInputStream.close();
                }
                catch (IOException e) {
                    log.error("Close rbkAlarmSolution stream error.", (Throwable)e);
                }
            }
            if (rbkAlarmInputStream != null) {
                try {
                    rbkAlarmInputStream.close();
                }
                catch (IOException e) {
                    log.error("Close rbkAlarmDesc stream error.", (Throwable)e);
                }
            }
        }
    }

    @GetMapping(value={"/agv/getFireStatus"})
    @ApiOperation(value="\u67e5\u8be2\u706b\u8b66\u533a\u57df\u7684\u72b6\u6001")
    @ResponseBody
    public ResultVo<Object> getFireStatus(@ApiIgnore HttpServletResponse response) {
        String res = this.agvApiService.getFireStatus();
        return ResultVo.response((Object)JSONObject.parse((String)res));
    }

    @GetMapping(value={"/agv/getDutyStatus"})
    @ApiOperation(value="\u83b7\u53d6\u673a\u5668\u4eba\u4e0a/\u4e0b\u73ed\u72b6\u6001")
    @ResponseBody
    public ResultVo<Object> getDutyStatus(@ApiIgnore HttpServletResponse response) {
        String res = this.agvApiService.getDutyStatus();
        return ResultVo.response((Object)JSONObject.parse((String)res));
    }

    @ApiOperation(value="\u4fee\u6539/\u4e0a\u4e0b\u73ed\u72b6\u6001")
    @PostMapping(value={"/agv/dutyOperations"})
    @ResponseBody
    public ResultVo<Object> dutyOperations(@RequestBody DutyOperationsReq dutyOperationsReq) {
        log.info("dutyOperations params {}", (Object)dutyOperationsReq);
        String res = this.agvApiService.dutyOperations(dutyOperationsReq);
        return ResultVo.response((Object)JSONObject.parse((String)res));
    }

    @PostMapping(value={"/agv/delDutyRecord"})
    @ApiOperation(value="\u5220\u9664\u673a\u5668\u4eba\u4e0a/\u4e0b\u73ed\u8bb0\u5f55")
    @ResponseBody
    public ResultVo<Object> delDutyRecord(@RequestBody List<String> ids) {
        Integer res = this.agvApiService.deleteDutyRecord(ids);
        return ResultVo.response((Object)res);
    }

    @ApiOperation(value="\u673a\u5668\u4eba\u4e0a\u73ed/\u4e0b\u73ed\u8bb0\u5f55")
    @PostMapping(value={"/agv/findDutyRecords"})
    @ResponseBody
    public ResultVo<Object> findDutyRecords(@RequestBody PaginationReq<DutyRecordsReq> req) {
        int currPage = req.getCurrentPage();
        int pageSize = req.getPageSize();
        DutyRecordsReq dutyRecordsReq = (DutyRecordsReq)req.getQueryParam();
        String startTime = Optional.ofNullable(dutyRecordsReq.getStartTime()).orElse("");
        String endTime = Optional.ofNullable(dutyRecordsReq.getEndTime()).orElse("");
        Boolean onDuty = dutyRecordsReq.getOnDuty();
        Page resultList = this.agvApiService.findDutyRecordsByConditionPaging(startTime, endTime, onDuty, currPage, pageSize);
        List dutyRecordList = resultList.getContent();
        PaginationResponseVo paginationResponseVo = new PaginationResponseVo();
        paginationResponseVo.setTotalCount(Long.valueOf(resultList.getTotalElements()));
        paginationResponseVo.setCurrentPage(Integer.valueOf(currPage));
        paginationResponseVo.setPageSize(Integer.valueOf(pageSize));
        paginationResponseVo.setTotalPage(Integer.valueOf(resultList.getTotalPages()));
        paginationResponseVo.setPageList(dutyRecordList);
        return ResultVo.response((Object)paginationResponseVo);
    }
}

