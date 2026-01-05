/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.alibaba.fastjson.JSON
 *  com.alibaba.fastjson.JSONArray
 *  com.alibaba.fastjson.JSONObject
 *  com.google.common.collect.Maps
 *  com.seer.rds.config.GlobalCacheConfig
 *  com.seer.rds.config.PropConfig
 *  com.seer.rds.constant.AgvActionStatusEnum
 *  com.seer.rds.constant.ApiEnum
 *  com.seer.rds.constant.ChangeRobotStatusEnum
 *  com.seer.rds.constant.PickUpModeEnum
 *  com.seer.rds.constant.TaskBlockStatusEnum
 *  com.seer.rds.constant.TaskLogLevelEnum
 *  com.seer.rds.constant.TaskStatusEnum
 *  com.seer.rds.dao.AgvAttrMapper
 *  com.seer.rds.dao.ChangeAgvProgressMapper
 *  com.seer.rds.dao.DutyRecordMapper
 *  com.seer.rds.dao.RobotStatusMapper
 *  com.seer.rds.dao.WindBlockRecordMapper
 *  com.seer.rds.dao.WindTaskDefMapper
 *  com.seer.rds.dao.WindTaskRecordMapper
 *  com.seer.rds.dao.WorkSiteMapper
 *  com.seer.rds.model.device.AgvAttr
 *  com.seer.rds.model.device.DutyRecord
 *  com.seer.rds.model.wind.ChangeAgvProgress
 *  com.seer.rds.model.wind.WindBlockRecord
 *  com.seer.rds.model.wind.WindTaskDef
 *  com.seer.rds.model.wind.WindTaskLog
 *  com.seer.rds.model.wind.WindTaskRecord
 *  com.seer.rds.model.worksite.WorkSite
 *  com.seer.rds.schedule.queryOrderListSchedule
 *  com.seer.rds.service.agv.AgvApiService
 *  com.seer.rds.service.agv.AgvApiService$3
 *  com.seer.rds.service.agv.AgvApiService$4
 *  com.seer.rds.service.agv.WindService
 *  com.seer.rds.service.system.DataPermissionManager
 *  com.seer.rds.service.threadPool.LinkedBqThreadPool
 *  com.seer.rds.service.wind.RootBp
 *  com.seer.rds.service.wind.taskBp.CAgvOperationBp$Blocks
 *  com.seer.rds.service.wind.taskBp.CSelectAgvBp
 *  com.seer.rds.util.OkHttpUtil
 *  com.seer.rds.vo.MapRssiPosVo
 *  com.seer.rds.vo.ResultVo
 *  com.seer.rds.vo.SetRobotIOReq
 *  com.seer.rds.vo.XyVo
 *  com.seer.rds.vo.req.AgvNormalAndRssiPositionListVo
 *  com.seer.rds.vo.req.ChangeDestinationReq
 *  com.seer.rds.vo.req.ChangeRobotReq
 *  com.seer.rds.vo.req.ChangingProgressReq
 *  com.seer.rds.vo.req.DutyOperationsReq
 *  com.seer.rds.vo.req.EnergyThresholdBody
 *  com.seer.rds.vo.req.LoopSpeedBody
 *  com.seer.rds.vo.req.RelocStartBody
 *  com.seer.rds.vo.req.RelocStartReq
 *  com.seer.rds.vo.req.RssiMapReq
 *  com.seer.rds.vo.req.SetOrderReq
 *  com.seer.rds.vo.response.ChangeProgressResp
 *  com.seer.rds.vo.response.MapRssiPosAllVo
 *  com.seer.rds.vo.response.MapRssiPosReponse
 *  com.seer.rds.vo.response.PaginationResponseVo
 *  com.seer.rds.vo.response.RobotInfoVo
 *  com.seer.rds.vo.wind.CSelectAgvBpField
 *  com.seer.rds.web.config.ConfigFileController
 *  org.apache.commons.collections.CollectionUtils
 *  org.apache.commons.compress.archivers.zip.ZipArchiveEntry
 *  org.apache.commons.compress.archivers.zip.ZipArchiveInputStream
 *  org.apache.commons.compress.utils.IOUtils
 *  org.apache.commons.compress.utils.Lists
 *  org.apache.commons.io.FileUtils
 *  org.apache.commons.lang3.StringUtils
 *  org.slf4j.Logger
 *  org.slf4j.LoggerFactory
 *  org.springframework.beans.factory.annotation.Autowired
 *  org.springframework.data.domain.Page
 *  org.springframework.data.domain.PageRequest
 *  org.springframework.data.domain.Pageable
 *  org.springframework.data.domain.Sort
 *  org.springframework.data.domain.Sort$Direction
 *  org.springframework.data.jpa.domain.Specification
 *  org.springframework.http.HttpEntity
 *  org.springframework.http.HttpHeaders
 *  org.springframework.http.HttpMethod
 *  org.springframework.http.MediaType
 *  org.springframework.http.ResponseEntity
 *  org.springframework.http.client.ClientHttpRequestFactory
 *  org.springframework.http.client.HttpComponentsClientHttpRequestFactory
 *  org.springframework.http.client.SimpleClientHttpRequestFactory
 *  org.springframework.scheduling.annotation.EnableAsync
 *  org.springframework.stereotype.Component
 *  org.springframework.transaction.annotation.Transactional
 *  org.springframework.util.MultiValueMap
 *  org.springframework.web.client.RestTemplate
 */
package com.seer.rds.service.agv;

import com.alibaba.fastjson.JSON;
import com.alibaba.fastjson.JSONArray;
import com.alibaba.fastjson.JSONObject;
import com.google.common.collect.Maps;
import com.seer.rds.config.GlobalCacheConfig;
import com.seer.rds.config.PropConfig;
import com.seer.rds.constant.AgvActionStatusEnum;
import com.seer.rds.constant.ApiEnum;
import com.seer.rds.constant.ChangeRobotStatusEnum;
import com.seer.rds.constant.PickUpModeEnum;
import com.seer.rds.constant.TaskBlockStatusEnum;
import com.seer.rds.constant.TaskLogLevelEnum;
import com.seer.rds.constant.TaskStatusEnum;
import com.seer.rds.dao.AgvAttrMapper;
import com.seer.rds.dao.ChangeAgvProgressMapper;
import com.seer.rds.dao.DutyRecordMapper;
import com.seer.rds.dao.RobotStatusMapper;
import com.seer.rds.dao.WindBlockRecordMapper;
import com.seer.rds.dao.WindTaskDefMapper;
import com.seer.rds.dao.WindTaskRecordMapper;
import com.seer.rds.dao.WorkSiteMapper;
import com.seer.rds.model.device.AgvAttr;
import com.seer.rds.model.device.DutyRecord;
import com.seer.rds.model.wind.ChangeAgvProgress;
import com.seer.rds.model.wind.WindBlockRecord;
import com.seer.rds.model.wind.WindTaskDef;
import com.seer.rds.model.wind.WindTaskLog;
import com.seer.rds.model.wind.WindTaskRecord;
import com.seer.rds.model.worksite.WorkSite;
import com.seer.rds.schedule.queryOrderListSchedule;
import com.seer.rds.service.agv.AgvApiService;
import com.seer.rds.service.agv.WindService;
import com.seer.rds.service.system.DataPermissionManager;
import com.seer.rds.service.threadPool.LinkedBqThreadPool;
import com.seer.rds.service.wind.RootBp;
import com.seer.rds.service.wind.taskBp.CAgvOperationBp;
import com.seer.rds.service.wind.taskBp.CSelectAgvBp;
import com.seer.rds.util.OkHttpUtil;
import com.seer.rds.vo.MapRssiPosVo;
import com.seer.rds.vo.ResultVo;
import com.seer.rds.vo.SetRobotIOReq;
import com.seer.rds.vo.XyVo;
import com.seer.rds.vo.req.AgvNormalAndRssiPositionListVo;
import com.seer.rds.vo.req.ChangeDestinationReq;
import com.seer.rds.vo.req.ChangeRobotReq;
import com.seer.rds.vo.req.ChangingProgressReq;
import com.seer.rds.vo.req.DutyOperationsReq;
import com.seer.rds.vo.req.EnergyThresholdBody;
import com.seer.rds.vo.req.LoopSpeedBody;
import com.seer.rds.vo.req.RelocStartBody;
import com.seer.rds.vo.req.RelocStartReq;
import com.seer.rds.vo.req.RssiMapReq;
import com.seer.rds.vo.req.SetOrderReq;
import com.seer.rds.vo.response.ChangeProgressResp;
import com.seer.rds.vo.response.MapRssiPosAllVo;
import com.seer.rds.vo.response.MapRssiPosReponse;
import com.seer.rds.vo.response.PaginationResponseVo;
import com.seer.rds.vo.response.RobotInfoVo;
import com.seer.rds.vo.wind.CSelectAgvBpField;
import com.seer.rds.web.config.ConfigFileController;
import java.awt.image.BufferedImage;
import java.awt.image.RenderedImage;
import java.io.BufferedInputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.charset.Charset;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collection;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.locks.LockSupport;
import java.util.stream.Collectors;
import javax.imageio.ImageIO;
import org.apache.commons.collections.CollectionUtils;
import org.apache.commons.compress.archivers.zip.ZipArchiveEntry;
import org.apache.commons.compress.archivers.zip.ZipArchiveInputStream;
import org.apache.commons.compress.utils.IOUtils;
import org.apache.commons.compress.utils.Lists;
import org.apache.commons.io.FileUtils;
import org.apache.commons.lang3.StringUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.client.ClientHttpRequestFactory;
import org.springframework.http.client.HttpComponentsClientHttpRequestFactory;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;

@Component
@EnableAsync
public class AgvApiService {
    private static final Logger log = LoggerFactory.getLogger(AgvApiService.class);
    @Autowired
    private PropConfig propConfig;
    @Autowired
    private RestTemplate restTemplate;
    @Autowired
    private WindTaskDefMapper windTaskDefMapper;
    @Autowired
    private WindTaskRecordMapper windTaskRecordMapper;
    @Autowired
    private RobotStatusMapper robotStatusMapper;
    @Autowired
    private RootBp rootBp;
    @Autowired
    private WindService windService;
    @Autowired
    private WorkSiteMapper workSiteMapper;
    @Autowired
    private AgvApiService agvApiService;
    @Autowired
    private ChangeAgvProgressMapper changeAgvProgressMapper;
    @Autowired
    private WindBlockRecordMapper blockRecordMapper;
    @Autowired
    private AgvAttrMapper agvAttrMapper;
    @Autowired
    private DataPermissionManager dataPermissionManager;
    @Autowired
    private DataPermissionManager DataPermissionManager;
    @Autowired
    private DutyRecordMapper dutyRecordMapper;
    public static ConcurrentHashMap<String, String> changeRobotOrderId = new ConcurrentHashMap();
    public static ConcurrentHashMap<String, Boolean> changeAgvIfContinue = new ConcurrentHashMap();
    public static ConcurrentHashMap<String, Thread> changeRobotWaitingForRelease = new ConcurrentHashMap();
    public static ConcurrentHashMap<String, ChangeDestinationReq> changeDestinationReq = new ConcurrentHashMap();

    public ResultVo asyncSetOrder(SetOrderReq req) {
        WindTaskRecord windTaskRecord;
        ResultVo resultVo = new ResultVo();
        if (StringUtils.isEmpty((CharSequence)req.getTaskId()) && StringUtils.isEmpty((CharSequence)req.getTaskLabel())) {
            log.error("TaskId And TaskLabel Have At Least One Field That Is Not Empty");
            resultVo.setMsg("TaskId And TaskLabel Have At Least One Field That Is Not Empty");
            resultVo.setCode(Integer.valueOf(-1));
            return resultVo;
        }
        WindTaskDef res = null;
        if (StringUtils.isNotEmpty((CharSequence)req.getTaskId())) {
            res = this.windTaskDefMapper.findById((Object)req.getTaskId()).orElse(null);
        }
        if (res == null && StringUtils.isNotEmpty((CharSequence)req.getTaskLabel())) {
            res = this.windTaskDefMapper.findAllByLabel(req.getTaskLabel());
        }
        if (res == null) {
            log.error("No Task Definition Was Queried");
            resultVo.setMsg("No Task Definition Was Queried");
            resultVo.setCode(Integer.valueOf(-1));
            return resultVo;
        }
        String detail = res.getDetail();
        JSONObject jsonObject = JSONObject.parseObject((String)detail);
        if (jsonObject.getJSONObject("rootBlock") == null || jsonObject.getJSONObject("rootBlock").getJSONObject("children").size() == 0) {
            log.error("Task details undefined");
            resultVo.setMsg("Task details undefined");
            resultVo.setCode(Integer.valueOf(-1));
            return resultVo;
        }
        if (StringUtils.isNotEmpty((CharSequence)req.getTaskRecordId()) && (windTaskRecord = (WindTaskRecord)this.windTaskRecordMapper.findById((Object)req.getTaskRecordId()).orElse(null)) != null) {
            log.error("Task Instance Id Repeat");
            resultVo.setMsg("Task Instance Id Repeat");
            resultVo.setCode(Integer.valueOf(-1));
            return resultVo;
        }
        LinkedBqThreadPool taskPool = LinkedBqThreadPool.getInstance();
        int taskNum = taskPool.getTaskNum();
        log.info("current running task number is:" + taskNum);
        req.setWindTaskDef(res);
        taskPool.execute((Runnable)new /* Unavailable Anonymous Inner Class!! */);
        resultVo.setMsg("SUCCESS");
        resultVo.setCode(Integer.valueOf(200));
        return resultVo;
    }

    public ResultVo<Object> asyncSetOrders(List<SetOrderReq> reqList) {
        ResultVo resultVo = new ResultVo();
        for (SetOrderReq req : reqList) {
            resultVo = this.asyncSetOrder(req);
        }
        return resultVo;
    }

    public ResultVo setOrder(SetOrderReq req) {
        WindTaskRecord windTaskRecord;
        ResultVo resultVo = new ResultVo();
        if (StringUtils.isEmpty((CharSequence)req.getTaskId()) && StringUtils.isEmpty((CharSequence)req.getTaskLabel())) {
            log.error("TaskId And TaskLabel Have At Least One Field That Is Not Empty");
            resultVo.setMsg("TaskId And TaskLabel Have At Least One Field That Is Not Empty");
            resultVo.setCode(Integer.valueOf(-1));
            return resultVo;
        }
        WindTaskDef res = null;
        if (StringUtils.isNotEmpty((CharSequence)req.getTaskId())) {
            res = this.windTaskDefMapper.findById((Object)req.getTaskId()).orElse(null);
        }
        if (res == null && StringUtils.isNotEmpty((CharSequence)req.getTaskLabel())) {
            res = this.windTaskDefMapper.findAllByLabel(req.getTaskLabel());
        }
        if (res == null) {
            log.error("No Task Definition Was Queried");
            resultVo.setMsg("No Task Definition Was Queried");
            resultVo.setCode(Integer.valueOf(-1));
            return resultVo;
        }
        if (StringUtils.isNotEmpty((CharSequence)req.getTaskRecordId()) && (windTaskRecord = (WindTaskRecord)this.windTaskRecordMapper.findById((Object)req.getTaskRecordId()).orElse(null)) != null) {
            log.error("Task Instance Id Repeat");
            resultVo.setMsg("Task Instance Id Repeat");
            resultVo.setCode(Integer.valueOf(-1));
            return resultVo;
        }
        req.setWindTaskDef(res);
        this.rootBp.execute(req);
        resultVo.setMsg("SUCCESS");
        resultVo.setCode(Integer.valueOf(200));
        return resultVo;
    }

    public String getAgvIp(String agvId) throws Exception {
        String agvIp = "unknown";
        String s = this.robotsStatus();
        JSONObject jsonObject = JSONObject.parseObject((String)s);
        JSONArray report = jsonObject.getJSONArray("report");
        for (int i = 0; i < report.size(); ++i) {
            JSONObject jsonObject1 = report.getJSONObject(i);
            String agvuuid = jsonObject1.getString("uuid");
            if (!agvuuid.equals(agvId)) continue;
            JSONObject basic_info = jsonObject1.getJSONObject("basic_info");
            agvIp = basic_info.getString("ip");
        }
        return agvIp;
    }

    public String robotsStatus() throws Exception {
        String cache = (String)GlobalCacheConfig.getCache((String)"robotsStatus");
        return cache;
    }

    public String pauseRobotsInBlock(String blockName) {
        HashMap param = Maps.newHashMap();
        param.put("block_name", blockName);
        try {
            String res = OkHttpUtil.postJsonParams((String)this.getUrl(ApiEnum.pauseRobotsInBlock.getUri()), (String)JSONObject.toJSONString((Object)param));
            return res;
        }
        catch (IOException e) {
            log.error("pauseRobotsInBlock error,{}", (Throwable)e);
            return "";
        }
    }

    public String resumeRobotsInBlock(String blockName) {
        HashMap param = Maps.newHashMap();
        param.put("block_name", blockName);
        try {
            String res = OkHttpUtil.postJsonParams((String)this.getUrl(ApiEnum.resumeRobotsInBlock.getUri()), (String)JSONObject.toJSONString((Object)param));
            return res;
        }
        catch (IOException e) {
            log.error("resumeRobotsInBlock error,{}", (Throwable)e);
            return "";
        }
    }

    public String startReLoc(String id, RelocStartBody param) {
        RelocStartReq req = new RelocStartReq();
        req.setBody(param);
        req.setVehicle(id);
        try {
            String res = OkHttpUtil.postJsonParams((String)this.getUrl(ApiEnum.reLocStart.getUri()), (String)JSONObject.toJSONString((Object)req));
            return res;
        }
        catch (IOException e) {
            log.error("startReLoc error,{}", (Throwable)e);
            return "";
        }
    }

    public String confirmReLoc(List<String> vehicles) {
        HashMap req = Maps.newHashMap();
        req.put("vehicles", vehicles);
        try {
            String res = OkHttpUtil.postJsonParams((String)this.getUrl(ApiEnum.reLocConfirm.getUri()), (String)JSONObject.toJSONString((Object)req));
            return res;
        }
        catch (IOException e) {
            log.error("confirmReLoc error,{}", (Throwable)e);
            return "";
        }
    }

    public String cancelReLoc(List<String> vehicles) {
        HashMap req = Maps.newHashMap();
        req.put("vehicles", vehicles);
        try {
            String res = OkHttpUtil.postJsonParams((String)this.getUrl(ApiEnum.reLocCancel.getUri()), (String)JSONObject.toJSONString((Object)req));
            return res;
        }
        catch (IOException e) {
            log.error("cancelReLoc error,{}", (Throwable)e);
            return "";
        }
    }

    public String gotoSiteStart(String id, String siteLabel) {
        HashMap req = Maps.newHashMap();
        req.put("vehicle", id);
        HashMap body = Maps.newHashMap();
        body.put("id", siteLabel);
        body.put("task_id", UUID.randomUUID().toString());
        req.put("body", body);
        try {
            String res = OkHttpUtil.postJsonParams((String)this.getUrl(ApiEnum.gotoSiteStart.getUri()), (String)JSONObject.toJSONString((Object)req));
            return res;
        }
        catch (IOException e) {
            log.error("gotoSiteStart error,{}", (Throwable)e);
            return "";
        }
    }

    public String gotoSitePause(List<String> vehicles) {
        HashMap req = Maps.newHashMap();
        req.put("vehicles", vehicles);
        try {
            String res = OkHttpUtil.postJsonParams((String)this.getUrl(ApiEnum.gotoSitePause.getUri()), (String)JSONObject.toJSONString((Object)req));
            return res;
        }
        catch (IOException e) {
            log.error("gotoSitePause error,{}", (Throwable)e);
            return "";
        }
    }

    public String gotoSiteResume(List<String> vehicles) {
        HashMap req = Maps.newHashMap();
        req.put("vehicles", vehicles);
        try {
            String res = OkHttpUtil.postJsonParams((String)this.getUrl(ApiEnum.gotoSiteResume.getUri()), (String)JSONObject.toJSONString((Object)req));
            return res;
        }
        catch (IOException e) {
            log.error("gotoSiteResume error,{}", (Throwable)e);
            return "";
        }
    }

    public String cancelGotoSite(List<String> vehicles) {
        HashMap req = Maps.newHashMap();
        req.put("vehicles", vehicles);
        try {
            String res = OkHttpUtil.postJsonParams((String)this.getUrl(ApiEnum.gotoSiteCancel.getUri()), (String)JSONObject.toJSONString((Object)req));
            return res;
        }
        catch (IOException e) {
            log.error("cancelGotoSite error,{}", (Throwable)e);
            return "";
        }
    }

    public String dispatchable(String type, List<String> vehicles) {
        HashMap req = Maps.newHashMap();
        req.put("vehicles", vehicles);
        req.put("type", type);
        try {
            String res = OkHttpUtil.postJsonParams((String)this.getUrl(ApiEnum.dispatchable.getUri()), (String)JSONObject.toJSONString((Object)req));
            return res;
        }
        catch (IOException e) {
            log.error("dispatchable error,{}", (Throwable)e);
            return "";
        }
    }

    public String enableSoftEms(List<String> vehicles) {
        HashMap req = Maps.newHashMap();
        req.put("vehicles", vehicles);
        try {
            String res = OkHttpUtil.postJsonParams((String)this.getUrl(ApiEnum.enableSoftEms.getUri()), (String)JSONObject.toJSONString((Object)req));
            return res;
        }
        catch (IOException e) {
            log.error("enableSoftEms error,{}", (Throwable)e);
            return "";
        }
    }

    public String disableSoftEms(List<String> vehicles) {
        HashMap req = Maps.newHashMap();
        req.put("vehicles", vehicles);
        try {
            String res = OkHttpUtil.postJsonParams((String)this.getUrl(ApiEnum.disableSoftEms.getUri()), (String)JSONObject.toJSONString((Object)req));
            return res;
        }
        catch (IOException e) {
            log.error("disableSoftEms error,{}", (Throwable)e);
            return "";
        }
    }

    public String openLoop(String id, LoopSpeedBody param) {
        HashMap req = Maps.newHashMap();
        req.put("vehicles", id);
        HashMap speed = Maps.newHashMap();
        speed.put("speed", param);
        req.put("body", speed);
        try {
            String res = OkHttpUtil.postJsonParams((String)this.getUrl(ApiEnum.openLoop.getUri()), (String)JSONObject.toJSONString((Object)req));
            return res;
        }
        catch (IOException e) {
            log.error("openLoop error,{}", (Throwable)e);
            return "";
        }
    }

    public String unlock(List<String> vehicles) {
        HashMap req = Maps.newHashMap();
        req.put("vehicles", vehicles);
        try {
            String res = OkHttpUtil.postJsonParams((String)this.getUrl(ApiEnum.unlock.getUri()), (String)JSONObject.toJSONString((Object)req));
            return res;
        }
        catch (IOException e) {
            log.error("unlock error,{}", (Throwable)e);
            return "";
        }
    }

    public String lock(List<String> vehicles) {
        HashMap req = Maps.newHashMap();
        req.put("vehicles", vehicles);
        try {
            String res = OkHttpUtil.postJsonParams((String)this.getUrl(ApiEnum.lock.getUri()), (String)JSONObject.toJSONString((Object)req));
            return res;
        }
        catch (IOException e) {
            log.error("lock error,{}", (Throwable)e);
            return "";
        }
    }

    public String clearMoveList(List<String> vehicles) {
        HashMap req = Maps.newHashMap();
        req.put("vehicles", vehicles);
        try {
            String res = OkHttpUtil.postJsonParams((String)this.getUrl(ApiEnum.clearMoveList.getUri()), (String)JSONObject.toJSONString((Object)req));
            return res;
        }
        catch (IOException e) {
            log.error("clearMoveList error,{}", (Object)e.getMessage());
            return "";
        }
    }

    public String clearAllErrors() {
        HashMap req = Maps.newHashMap();
        ArrayList list = new ArrayList();
        req.put("error_codes", list);
        try {
            String res = OkHttpUtil.postJsonParams((String)this.getUrl(ApiEnum.clearAllErrors.getUri()), (String)"");
            return res;
        }
        catch (IOException e) {
            log.error("clearAllErrors error,{}", (Object)e.getMessage());
            return "";
        }
    }

    public String clearRobotAllError(List<String> vehicles) {
        HashMap req = Maps.newHashMap();
        req.put("vehicles", vehicles);
        try {
            String res = OkHttpUtil.postJsonParams((String)this.getUrl(ApiEnum.clearRobotAllError.getUri()), (String)JSONObject.toJSONString((Object)req));
            return res;
        }
        catch (IOException e) {
            log.error("clearRobotAllError error,{}", (Object)e.getMessage());
            return "";
        }
    }

    public String energyThreshold(List<String> vehicles, EnergyThresholdBody param) {
        HashMap req = Maps.newHashMap();
        req.put("vehicles", vehicles);
        HashMap params = Maps.newHashMap();
        params.put("params", param);
        req.put("body", params);
        try {
            String res = OkHttpUtil.postJsonParams((String)this.getUrl(ApiEnum.energyThreshold.getUri()), (String)JSONObject.toJSONString((Object)req));
            return res;
        }
        catch (IOException e) {
            log.error("energyThreshold error,{}", (Object)e.getMessage());
            return "";
        }
    }

    public String terminate(String taskId) {
        HashMap paramMap = Maps.newHashMap();
        paramMap.put("id", taskId);
        log.info("Terminate Task OrderId = {}", (Object)taskId);
        try {
            String res = OkHttpUtil.postJsonParams((String)this.getUrl(ApiEnum.terminate.getUri()), (String)JSONObject.toJSONString((Object)paramMap));
            return res;
        }
        catch (IOException e) {
            log.error("terminate error,{}", (Object)e.getMessage());
            return "";
        }
    }

    public String terminateAndCanTakeOrders(String taskId) {
        HashMap paramMap = Maps.newHashMap();
        paramMap.put("id", taskId);
        paramMap.put("disableVehicle", false);
        log.info("Terminate Task OrderId = {}", (Object)taskId);
        try {
            String res = OkHttpUtil.postJsonParams((String)this.getUrl(ApiEnum.terminate.getUri()), (String)JSONObject.toJSONString((Object)paramMap));
            return res;
        }
        catch (IOException e) {
            log.error("terminate error,{}", (Object)e.getMessage());
            return "";
        }
    }

    public String terminateAll(JSONObject param) {
        log.info("TerminateAll Task OrderId = {}", (Object)param);
        try {
            String res = OkHttpUtil.postJsonParams((String)this.getUrl(ApiEnum.terminate.getUri()), (String)JSONObject.toJSONString((Object)param));
            return res;
        }
        catch (IOException e) {
            log.error("terminate error,{}", (Object)e.getMessage());
            return "";
        }
    }

    public String terminateAndIsExec(List<String> vehicles, Boolean disableVehicle) {
        HashMap paramMap = Maps.newHashMap();
        paramMap.put("idList", vehicles);
        paramMap.put("disableVehicle", disableVehicle);
        log.info("terminateAndIsExec AGV Params = {}", (Object)paramMap);
        try {
            String res = OkHttpUtil.postJsonParams((String)this.getUrl(ApiEnum.terminate.getUri()), (String)JSONObject.toJSONString((Object)paramMap));
            return res;
        }
        catch (IOException e) {
            log.error("terminateAndIsExec error,{}", (Object)e.getMessage());
            return "";
        }
    }

    public String post(String uri, String requestBody) {
        HttpHeaders headers = new HttpHeaders();
        MediaType type = MediaType.parseMediaType((String)"text/plain; charset=UTF-8");
        headers.setContentType(type);
        HttpEntity entity = new HttpEntity((Object)requestBody, (MultiValueMap)headers);
        String result = (String)this.restTemplate.postForObject(PropConfig.getRdsCoreBaseUrl() + uri, (Object)entity, String.class, new Object[0]);
        log.info(result);
        return result;
    }

    public String get(String uri) {
        String result = (String)this.restTemplate.getForObject(PropConfig.getRdsCoreBaseUrl() + uri, String.class, new Object[0]);
        return result;
    }

    /*
     * WARNING - Removed try catching itself - possible behaviour change.
     */
    public void download(String uri, String fileName) {
        String sceneDir = this.propConfig.getSceneDir();
        HttpComponentsClientHttpRequestFactory httpRequestFactory = new HttpComponentsClientHttpRequestFactory();
        httpRequestFactory.setConnectionRequestTimeout(5000);
        httpRequestFactory.setConnectTimeout(5000);
        httpRequestFactory.setReadTimeout(ConfigFileController.commonConfig.getRdscore().getDownloadSceneReadTimeout());
        httpRequestFactory.setBufferRequestBody(false);
        RestTemplate template = new RestTemplate((ClientHttpRequestFactory)httpRequestFactory);
        HttpComponentsClientHttpRequestFactory clientFactory = new HttpComponentsClientHttpRequestFactory();
        template.setRequestFactory((ClientHttpRequestFactory)clientFactory);
        HttpHeaders headers = new HttpHeaders();
        HttpEntity httpEntity = new HttpEntity((MultiValueMap)headers);
        ResponseEntity bytes = template.exchange(PropConfig.getRdsCoreBaseUrl() + uri, HttpMethod.GET, httpEntity, byte[].class, new Object[0]);
        File f = null;
        f = fileName == null ? new File(sceneDir + "scene.zip") : new File(fileName + "scene.zip");
        try {
            File areasDirectory;
            File robotsDirectory;
            if (f.exists()) {
                f.delete();
            }
            if ((robotsDirectory = new File(sceneDir + "robots/")).exists() && robotsDirectory.isDirectory()) {
                FileUtils.deleteDirectory((File)robotsDirectory);
            }
            if ((areasDirectory = new File(sceneDir + "areas/")).exists() && areasDirectory.isDirectory()) {
                FileUtils.deleteDirectory((File)areasDirectory);
            }
            f.createNewFile();
        }
        catch (IOException e) {
            log.error("scene file clear error.", (Throwable)e);
        }
        FileOutputStream out = null;
        try {
            out = new FileOutputStream(f);
            out.write((byte[])bytes.getBody(), 0, ((byte[])bytes.getBody()).length);
            out.flush();
            this.unzip(f, new File(sceneDir));
            this.conversion();
        }
        catch (Exception e) {
            log.error("unzip error", (Throwable)e);
        }
        finally {
            if (out != null) {
                try {
                    out.close();
                }
                catch (IOException e) {
                    log.error("unzip IOException", (Throwable)e);
                }
            }
        }
    }

    private void conversion() {
        try {
            File tmp = new File(this.propConfig.getSceneDir() + "areas/");
            if (!tmp.exists()) {
                return;
            }
            File[] files = tmp.listFiles();
            for (int i = 0; i < files.length; ++i) {
                File file = files[i];
                if (file.isDirectory()) {
                    File[] files1 = file.listFiles(s -> s.isFile() && s.getName().endsWith(".bmp"));
                    for (int j = 0; j < files1.length; ++j) {
                        this.imageConversion(files1[j]);
                    }
                    continue;
                }
                if (!file.getName().endsWith(".bmp")) continue;
                this.imageConversion(file);
            }
        }
        catch (Exception e) {
            log.error("conversion error {}", (Throwable)e);
        }
    }

    private void imageConversion(File file) {
        File outFile = new File(file.getAbsolutePath().replace(".bmp", ".png"));
        if (outFile.exists()) {
            return;
        }
        BufferedImage bmpImage = null;
        try {
            bmpImage = ImageIO.read(file);
        }
        catch (IOException e) {
            log.error("imageConversion read fileName = {}, error = {}", (Object)file.getName(), (Object)e);
        }
        BufferedImage pngImage = new BufferedImage(bmpImage.getWidth(), bmpImage.getHeight(), 2);
        pngImage.getGraphics().drawImage(bmpImage, 0, 0, null);
        try {
            ImageIO.write((RenderedImage)pngImage, "PNG", outFile);
        }
        catch (IOException e) {
            log.error("imageConversion fileName = {}, error = {}", (Object)file.getName(), (Object)e);
        }
    }

    public void downloadByTemplate(String uri, String fileName) throws IOException {
        String sceneDir = this.propConfig.getSceneDir();
        HttpComponentsClientHttpRequestFactory httpRequestFactory = new HttpComponentsClientHttpRequestFactory();
        httpRequestFactory.setConnectionRequestTimeout(5000);
        httpRequestFactory.setConnectTimeout(5000);
        httpRequestFactory.setReadTimeout(ConfigFileController.commonConfig.getRdscore().getDownloadSceneReadTimeout());
        httpRequestFactory.setBufferRequestBody(false);
        RestTemplate template = new RestTemplate((ClientHttpRequestFactory)httpRequestFactory);
        HttpComponentsClientHttpRequestFactory clientFactory = new HttpComponentsClientHttpRequestFactory();
        template.setRequestFactory((ClientHttpRequestFactory)clientFactory);
        HttpHeaders headers = new HttpHeaders();
        HttpEntity httpEntity = new HttpEntity((MultiValueMap)headers);
        ResponseEntity bytes = template.exchange(PropConfig.getRdsCoreBaseUrl() + uri, HttpMethod.GET, httpEntity, byte[].class, new Object[0]);
        File f = null;
        f = fileName == null ? new File(sceneDir + "scene.zip") : new File(fileName + "scene.zip");
        try {
            if (f.exists()) {
                f.delete();
            }
            f.createNewFile();
        }
        catch (IOException e) {
            log.error("downloadByTemplate IOException", (Throwable)e);
        }
        FileOutputStream out = null;
        try {
            out = new FileOutputStream(f);
            out.write((byte[])bytes.getBody(), 0, ((byte[])bytes.getBody()).length);
            out.flush();
            this.unzip(f, new File(sceneDir));
        }
        catch (Exception e) {
            log.error("unzip error", (Throwable)e);
            throw e;
        }
        finally {
            if (out != null) {
                try {
                    out.close();
                }
                catch (IOException e) {
                    log.error("downloadByTemplate close Exception", (Throwable)e);
                }
            }
        }
    }

    public String upload(String uri, byte[] fileBytes) {
        SimpleClientHttpRequestFactory clientHttpRequestFactory = new SimpleClientHttpRequestFactory();
        clientHttpRequestFactory.setReadTimeout(200000);
        RestTemplate restTemplate = new RestTemplate();
        restTemplate.setRequestFactory((ClientHttpRequestFactory)clientHttpRequestFactory);
        return (String)restTemplate.postForObject(PropConfig.getRdsCoreBaseUrl() + uri, (Object)fileBytes, String.class, new Object[0]);
    }

    public void unzip(File zipFile, File targetDirectory) {
        try (FileInputStream inputStream = new FileInputStream(zipFile);
             BufferedInputStream bufferedInputStream = new BufferedInputStream(inputStream);
             ZipArchiveInputStream zis = new ZipArchiveInputStream((InputStream)bufferedInputStream, "utf-8", true, true);){
            ZipArchiveEntry entry = null;
            while ((entry = zis.getNextZipEntry()) != null) {
                File entryDestination = new File(targetDirectory, entry.getName());
                if (!entryDestination.getCanonicalPath().startsWith(targetDirectory.getCanonicalPath() + File.separator)) {
                    throw new IllegalAccessException("Entry is outside of the target dir: " + entry.getName());
                }
                if (entry.isDirectory()) {
                    entryDestination.mkdirs();
                    continue;
                }
                entryDestination.getParentFile().mkdirs();
                try (FileOutputStream out = new FileOutputStream(entryDestination);){
                    IOUtils.copy((InputStream)zis, (OutputStream)out);
                }
            }
        }
        catch (Exception e) {
            log.error("*********Unzip zip package failed.", (Throwable)e);
        }
    }

    private String getUrl(String uri) {
        return PropConfig.getRdsCoreBaseUrl() + uri;
    }

    public List<RobotInfoVo> getLiteRobotsStatus() {
        Object cache = GlobalCacheConfig.getCache((String)"robotsStatus");
        ArrayList<RobotInfoVo> resList = new ArrayList<RobotInfoVo>();
        if (cache == null) {
            log.error("robotsStatus info is null");
            return null;
        }
        JSONObject robotInfoJSON = JSONObject.parseObject((String)cache.toString());
        JSONArray reportArray = JSONArray.parseArray((String)robotInfoJSON.get((Object)"report").toString());
        for (Object reportObj : reportArray) {
            JSONObject reportJson = JSONObject.parseObject((String)reportObj.toString());
            String uuid = reportJson.get((Object)"uuid").toString();
            Boolean dispatchAble = reportJson.get((Object)"dispatchable") == null ? null : Boolean.valueOf(Boolean.parseBoolean(reportJson.get((Object)"dispatchable").toString()));
            JSONObject basicInfoJson = JSON.parseObject((String)reportJson.get((Object)"basic_info").toString());
            String IP = null == basicInfoJson.get((Object)"ip") ? "" : basicInfoJson.get((Object)"ip").toString();
            String currentGroup = basicInfoJson.get((Object)"current_group") == null ? null : basicInfoJson.get((Object)"current_group").toString();
            String currentMap = basicInfoJson.get((Object)"current_map") == null ? null : basicInfoJson.get((Object)"current_map").toString();
            JSONObject unDispatchAbleReasonJson = reportJson.get((Object)"undispatchable_reason") == null ? null : JSON.parseObject((String)reportJson.get((Object)"undispatchable_reason").toString());
            Boolean disconnect = unDispatchAbleReasonJson.get((Object)"disconnect") == null ? null : Boolean.valueOf(Boolean.parseBoolean(unDispatchAbleReasonJson.get((Object)"disconnect").toString()));
            Boolean unConfirmedReLoc = unDispatchAbleReasonJson.get((Object)"unconfirmed_reloc") == null ? null : Boolean.valueOf(Boolean.parseBoolean(unDispatchAbleReasonJson.get((Object)"unconfirmed_reloc").toString()));
            Integer unlock = unDispatchAbleReasonJson.get((Object)"unlock") == null ? null : Integer.valueOf(unDispatchAbleReasonJson.get((Object)"unlock").toString());
            Boolean lowBattery = unDispatchAbleReasonJson.get((Object)"low_battery") == null ? null : Boolean.valueOf(Boolean.parseBoolean(unDispatchAbleReasonJson.get((Object)"low_battery").toString()));
            Boolean currentMapInvalid = unDispatchAbleReasonJson.get((Object)"current_map_invalid") == null ? null : Boolean.valueOf(Boolean.parseBoolean(unDispatchAbleReasonJson.get((Object)"current_map_invalid").toString()));
            Integer disPatchableStatus = unDispatchAbleReasonJson.get((Object)"dispatchable_status") == null ? null : Integer.valueOf(unDispatchAbleReasonJson.get((Object)"dispatchable_status").toString());
            JSONObject rbkReportJson = JSON.parseObject((String)reportJson.get((Object)"rbk_report").toString());
            JSONArray DI = rbkReportJson.get((Object)"DI") == null ? null : JSONArray.parseArray((String)rbkReportJson.get((Object)"DI").toString());
            JSONArray DO = rbkReportJson.get((Object)"DO") == null ? null : JSONArray.parseArray((String)rbkReportJson.get((Object)"DO").toString());
            Integer reLocStatus = rbkReportJson.get((Object)"reloc_status") == null ? null : Integer.valueOf(rbkReportJson.get((Object)"reloc_status").toString());
            JSONArray errors = rbkReportJson.get((Object)"errors") == null ? null : JSONArray.parseArray((String)rbkReportJson.get((Object)"errors").toString());
            Double batteryLevel = rbkReportJson.get((Object)"battery_level") == null ? null : Double.valueOf(Double.parseDouble(rbkReportJson.get((Object)"battery_level").toString()));
            Double confidence = rbkReportJson.get((Object)"confidence") == null ? null : Double.valueOf(Double.parseDouble(rbkReportJson.get((Object)"confidence").toString()));
            Integer taskStatus = rbkReportJson.get((Object)"task_status") == null ? null : Integer.valueOf(Integer.parseInt(rbkReportJson.get((Object)"task_status").toString()));
            JSONObject currentOrderJson = JSON.parseObject((String)reportJson.get((Object)"current_order").toString());
            String externalId = currentOrderJson == null ? "" : currentOrderJson.getString("externalId");
            String outOrderNo = this.windTaskRecordMapper.findOutOrderNoById(externalId);
            String orderId = currentOrderJson == null ? "" : currentOrderJson.getString("id");
            String state = currentOrderJson == null ? "" : currentOrderJson.getString("state");
            RobotInfoVo robotInfoVo = new RobotInfoVo(uuid, IP, currentGroup, dispatchAble, disPatchableStatus, currentMapInvalid, disconnect, lowBattery, unConfirmedReLoc, unlock, DI, DO, errors, batteryLevel, confidence, reLocStatus, taskStatus, currentMap, orderId, outOrderNo, state);
            resList.add(robotInfoVo);
        }
        return resList;
    }

    public RobotInfoVo getLiteRobotsStatuById(String agvId) {
        Object cache = GlobalCacheConfig.getCache((String)"robotsStatus");
        ArrayList resList = new ArrayList();
        if (cache == null) {
            log.error("robotsStatus info is null");
            return null;
        }
        JSONObject robotInfoJSON = JSONObject.parseObject((String)cache.toString());
        JSONArray reportArray = JSONArray.parseArray((String)robotInfoJSON.get((Object)"report").toString());
        HashMap<String, RobotInfoVo> map = new HashMap<String, RobotInfoVo>();
        for (Object reportObj : reportArray) {
            JSONObject reportJson = JSONObject.parseObject((String)reportObj.toString());
            String uuid = reportJson.get((Object)"uuid").toString();
            Boolean dispatchAble = reportJson.get((Object)"dispatchable") == null ? null : Boolean.valueOf(Boolean.parseBoolean(reportJson.get((Object)"dispatchable").toString()));
            JSONObject basicInfoJson = JSON.parseObject((String)reportJson.get((Object)"basic_info").toString());
            String IP = null == basicInfoJson.get((Object)"ip") ? "" : basicInfoJson.get((Object)"ip").toString();
            String currentGroup = basicInfoJson.get((Object)"current_group") == null ? null : basicInfoJson.get((Object)"current_group").toString();
            String currentMap = basicInfoJson.get((Object)"current_map") == null ? null : basicInfoJson.get((Object)"current_map").toString();
            JSONObject unDispatchAbleReasonJson = reportJson.get((Object)"undispatchable_reason") == null ? null : JSON.parseObject((String)reportJson.get((Object)"undispatchable_reason").toString());
            Boolean disconnect = unDispatchAbleReasonJson.get((Object)"disconnect") == null ? null : Boolean.valueOf(Boolean.parseBoolean(unDispatchAbleReasonJson.get((Object)"disconnect").toString()));
            Boolean unConfirmedReLoc = unDispatchAbleReasonJson.get((Object)"unconfirmed_reloc") == null ? null : Boolean.valueOf(Boolean.parseBoolean(unDispatchAbleReasonJson.get((Object)"unconfirmed_reloc").toString()));
            Integer unlock = unDispatchAbleReasonJson.get((Object)"unlock") == null ? null : Integer.valueOf(unDispatchAbleReasonJson.get((Object)"unlock").toString());
            Boolean lowBattery = unDispatchAbleReasonJson.get((Object)"low_battery") == null ? null : Boolean.valueOf(Boolean.parseBoolean(unDispatchAbleReasonJson.get((Object)"low_battery").toString()));
            Boolean currentMapInvalid = unDispatchAbleReasonJson.get((Object)"current_map_invalid") == null ? null : Boolean.valueOf(Boolean.parseBoolean(unDispatchAbleReasonJson.get((Object)"current_map_invalid").toString()));
            Integer disPatchableStatus = unDispatchAbleReasonJson.get((Object)"dispatchable_status") == null ? null : Integer.valueOf(unDispatchAbleReasonJson.get((Object)"dispatchable_status").toString());
            JSONObject rbkReportJson = JSON.parseObject((String)reportJson.get((Object)"rbk_report").toString());
            JSONArray DI = rbkReportJson.get((Object)"DI") == null ? null : JSONArray.parseArray((String)rbkReportJson.get((Object)"DI").toString());
            JSONArray DO = rbkReportJson.get((Object)"DO") == null ? null : JSONArray.parseArray((String)rbkReportJson.get((Object)"DO").toString());
            Integer reLocStatus = rbkReportJson.get((Object)"reloc_status") == null ? null : Integer.valueOf(rbkReportJson.get((Object)"reloc_status").toString());
            JSONArray errors = rbkReportJson.get((Object)"errors") == null ? null : JSONArray.parseArray((String)rbkReportJson.get((Object)"errors").toString());
            Double batteryLevel = rbkReportJson.get((Object)"battery_level") == null ? null : Double.valueOf(Double.parseDouble(rbkReportJson.get((Object)"battery_level").toString()));
            Double confidence = rbkReportJson.get((Object)"confidence") == null ? null : Double.valueOf(Double.parseDouble(rbkReportJson.get((Object)"confidence").toString()));
            Integer taskStatus = rbkReportJson.get((Object)"task_status") == null ? null : Integer.valueOf(Integer.parseInt(rbkReportJson.get((Object)"task_status").toString()));
            JSONObject currentOrderJson = reportJson.get((Object)"current_order") == null ? null : JSON.parseObject((String)reportJson.get((Object)"current_order").toString());
            String externalId = currentOrderJson == null ? "" : currentOrderJson.getString("externalId");
            String outOrderNo = this.windTaskRecordMapper.findOutOrderNoById(externalId);
            String orderId = currentOrderJson == null ? "" : currentOrderJson.getString("id");
            String state = currentOrderJson == null ? "" : currentOrderJson.getString("state");
            RobotInfoVo robotInfoVo = new RobotInfoVo(uuid, IP, currentGroup, dispatchAble, disPatchableStatus, currentMapInvalid, disconnect, lowBattery, unConfirmedReLoc, unlock, DI, DO, errors, batteryLevel, confidence, reLocStatus, taskStatus, currentMap, orderId, outOrderNo, state);
            map.put(uuid, robotInfoVo);
        }
        if (map.containsKey(agvId)) {
            return (RobotInfoVo)map.get(agvId);
        }
        return null;
    }

    public void changeDestination(ChangeDestinationReq req) {
        log.info("\u7ec8\u6b62\u524d\u4e00\u4e2a\u8fd0\u5355");
        String orderId = UUID.randomUUID().toString();
        req.setOrderId(orderId);
        changeDestinationReq.put(req.taskRecordId, req);
        WindTaskRecord windTaskRecord = null;
        Optional taskRecord = this.windTaskRecordMapper.findById((Object)req.getTaskRecordId());
        if (taskRecord.isPresent()) {
            windTaskRecord = (WindTaskRecord)taskRecord.get();
            this.stopOriginalAgv(windTaskRecord.getAgvId());
        }
        log.info("\u7ec8\u6b62\u5b8c\u6210");
    }

    public void changeAgv(ChangeRobotReq req) throws Exception {
        log.info("\u7ec8\u6b62\u9700\u8981\u6362\u8f66\u7684agv\u7684\u8fd0\u5355");
        boolean ifHaveError = false;
        this.stopOriginalAgv(req.getOriginalAgvId());
        log.info("\u7ec8\u6b62\u5b8c\u6210");
        Optional windTaskRecordById = this.judgeTaskIfUseWindTask(req);
        boolean windTaskIfNull = windTaskRecordById.isPresent();
        WindTaskRecord windTaskRecord = null;
        String orderId = UUID.randomUUID().toString();
        if (windTaskIfNull) {
            log.info("agv\u6267\u884c\u7684\u662f\u5929\u98ce\u4efb\u52a1");
            windTaskRecord = (WindTaskRecord)windTaskRecordById.get();
            windTaskRecord.getOrderId().set(orderId);
        }
        Boolean ifFilled = req.getIfFilled();
        ChangeAgvProgress changeAgvProgress = ChangeAgvProgress.builder().orderId(orderId).originalOrderId(req.getOriginalOrderId()).reason(req.getReason()).executorTime(new Date()).originalRobot(req.getOriginalAgvId()).status(Integer.valueOf(ChangeRobotStatusEnum.choosingRobot.getStatus())).build();
        this.changeAgvProgressMapper.saveAndFlush((Object)changeAgvProgress);
        String agvId = "";
        try {
            log.info("\u5f00\u59cb\u9009\u8f66");
            HashMap changeAgvMap = this.selectChangeAgvNew(req, windTaskRecord, orderId);
            agvId = (String)changeAgvMap.get("agvId");
            orderId = (String)changeAgvMap.get("orderId");
        }
        catch (RuntimeException e) {
            log.error("changeAgv RuntimeException", (Throwable)e);
            this.completeAndTerminate(orderId);
            changeAgvProgress.setStatus(Integer.valueOf(ChangeRobotStatusEnum.choosingRobotError.getStatus()));
            changeAgvProgress.setErrorMsg(e.getMessage());
        }
        catch (Exception e) {
            log.error("changeAgv Exception", (Throwable)e);
            changeAgvProgress.setStatus(Integer.valueOf(ChangeRobotStatusEnum.choosingRobotError.getStatus()));
            changeAgvProgress.setErrorMsg(e.getMessage());
        }
        if (!StringUtils.isNotEmpty((CharSequence)agvId)) {
            this.changeAgvProgressMapper.saveAndFlush((Object)changeAgvProgress);
            return;
        }
        changeAgvProgress.setOrderId(orderId);
        changeAgvProgress.setReplaceRobot(agvId);
        changeAgvProgress.setStatus(Integer.valueOf(ChangeRobotStatusEnum.assigned.getStatus()));
        this.changeAgvProgressMapper.saveAndFlush((Object)changeAgvProgress);
        if (ifFilled.booleanValue()) {
            log.info("\u9700\u8981\u6362\u8f66\u7684agv\u5df2\u8f7d\u8d27");
            try {
                log.info("\u524d\u5f80\u53d6\u8d27\u70b9");
                this.queryChangeAgvOperation(req, windTaskRecord, agvId, changeAgvProgress, orderId);
            }
            catch (RuntimeException e) {
                this.completeAndTerminate(orderId);
                log.error("changeAgv RuntimeException", (Throwable)e);
                changeAgvProgress.setStatus(Integer.valueOf(ChangeRobotStatusEnum.RobotActionFailure.getStatus()));
                changeAgvProgress.setErrorMsg(e.getMessage());
                this.changeAgvProgressMapper.saveAndFlush((Object)changeAgvProgress);
                return;
            }
            catch (Exception e) {
                log.error("changeAgv Exception", (Throwable)e);
                changeAgvProgress.setStatus(Integer.valueOf(ChangeRobotStatusEnum.RobotActionFailure.getStatus()));
                changeAgvProgress.setErrorMsg(e.getMessage());
                this.changeAgvProgressMapper.saveAndFlush((Object)changeAgvProgress);
                return;
            }
        }
        changeAgvProgress.setStatus(Integer.valueOf(ChangeRobotStatusEnum.end.getStatus()));
        this.changeAgvProgressMapper.saveAndFlush((Object)changeAgvProgress);
        if (!windTaskIfNull) {
            log.info("\u7ee7\u7eed\u6267\u884ccore\u7684\u8fd0\u5355");
            this.setCoreOrderWithoutWindTask(req, orderId, agvId);
        }
    }

    private void completeAndTerminate(String orderId) {
        log.info("complete task, orderId={}", (Object)orderId);
        this.agvApiService.terminate(orderId);
    }

    private List<Object> getBlocksParamter(JSONArray blocksArr, ChangeRobotReq req) {
        return blocksArr.stream().map(blockStr -> CompletableFuture.supplyAsync(() -> {
            CAgvOperationBp.Blocks block = new CAgvOperationBp.Blocks();
            JSONObject blockObj = (JSONObject)blockStr;
            String blockId = blockObj.getString("blockId");
            String state = blockObj.getString("state");
            if ("STOPPED".equals(state)) {
                String blockRes = null;
                while (blockRes == null) {
                    try {
                        blockRes = OkHttpUtil.get((String)(RootBp.getUrl((String)ApiEnum.getBlocks.getUri()) + "/" + blockId));
                    }
                    catch (IOException e) {
                        log.error("getBlocksParameter IOException", (Throwable)e);
                    }
                    log.info("query task block result,orderId={}, status={},from core", (Object)req.getOriginalOrderId(), (Object)blockRes);
                    try {
                        Thread.sleep(2000L);
                    }
                    catch (InterruptedException e) {
                        log.error("getBlocksParameter InterruptedException", (Throwable)e);
                    }
                }
                if (!"".equals(blockRes)) {
                    JSONObject blockResObj = JSONObject.parseObject(blockRes);
                    block.setBinTask(blockResObj.getString("binTask"));
                    block.setGoodsId(blockResObj.getString("goodsId"));
                    block.setLocation(blockResObj.getString("location"));
                    block.setOperation(blockResObj.getString("operation"));
                    Map operation_args = (Map)JSONObject.parseObject((String)blockResObj.getString("operation_args"), Map.class);
                    block.setOperationArgs(operation_args);
                    block.setBlockId(String.valueOf(UUID.randomUUID()));
                    block.setScriptName(blockResObj.getString("script_name"));
                    Map script_args = (Map)JSONObject.parseObject((String)blockResObj.getString("script_args"), Map.class);
                    block.setScriptArgs(script_args);
                }
            }
            return block;
        })).collect(Collectors.toList()).stream().map(CompletableFuture::join).collect(Collectors.toList());
    }

    private void setCoreOrderWithoutWindTask(ChangeRobotReq req, String orderId, String agvId) {
        HashMap paramMap = Maps.newHashMap();
        String res = null;
        while (res == null) {
            res = queryOrderListSchedule.queryOrder((String)req.getOriginalOrderId(), (Instant)Instant.now());
            if (res == null) {
                try {
                    res = OkHttpUtil.get((String)(RootBp.getUrl((String)ApiEnum.orderDetails.getUri()) + "/" + req.getOriginalOrderId()));
                }
                catch (IOException e) {
                    log.error("setCoreOrderWithoutWindTask IOException", (Throwable)e);
                }
                log.info("query task block result,orderId={}, status={},from core", (Object)req.getOriginalOrderId(), (Object)res);
            } else {
                log.info("query task block result,orderId={}, status={},from cache", (Object)req.getOriginalOrderId(), (Object)res);
            }
            try {
                Thread.sleep(2000L);
            }
            catch (InterruptedException e) {
                log.error("setCoreOrderWithoutWindTask InterruptedException", (Throwable)e);
            }
        }
        JSONObject resObj = JSONObject.parseObject(res);
        JSONArray blocksArr = resObj.getJSONArray("blocks");
        List blocks = this.getBlocksParamter(blocksArr, req);
        paramMap.put("id", orderId);
        paramMap.put("blocks", blocks);
        paramMap.put("complete", true);
        String addBlockParam = JSONObject.toJSONString((Object)paramMap);
        while (true) {
            try {
                String sendBlockRes;
                while (!StringUtils.isNotEmpty((CharSequence)(sendBlockRes = OkHttpUtil.postJsonParams((String)RootBp.getUrl((String)ApiEnum.addBlocks.getUri()), (String)addBlockParam)))) {
                }
            }
            catch (Exception e) {
                try {
                    Thread.sleep(3000L);
                }
                catch (InterruptedException ex) {
                    log.error("setOrder InterruptedException", (Throwable)e);
                }
                log.error("setOrder error,retry", (Throwable)e);
                continue;
            }
            break;
        }
    }

    private Optional<WindTaskRecord> judgeTaskIfUseWindTask(ChangeRobotReq req) {
        String res = null;
        while (res == null) {
            res = queryOrderListSchedule.queryOrder((String)req.getOriginalOrderId(), (Instant)Instant.now());
            if (res == null) {
                try {
                    res = OkHttpUtil.get((String)(RootBp.getUrl((String)ApiEnum.orderDetails.getUri()) + "/" + req.getOriginalOrderId()));
                }
                catch (IOException e) {
                    log.error("judgeTaskIfUseWindTask IOException", (Throwable)e);
                }
                log.info("query task block result,orderId={}, status={},from core", (Object)req.getOriginalOrderId(), (Object)res);
            } else {
                log.info("query task block result,orderId={}, status={},from cache", (Object)req.getOriginalOrderId(), (Object)res);
            }
            try {
                Thread.sleep(2000L);
            }
            catch (InterruptedException e) {
                log.error("judgeTaskIfUseWindTask InterruptedException", (Throwable)e);
            }
        }
        JSONObject resObj = JSONObject.parseObject(res);
        String externalId = (String)resObj.get((Object)"externalId");
        return this.windTaskRecordMapper.findById((Object)externalId);
    }

    private void stopOriginalAgv(String agvId) {
        HashMap paramMap = Maps.newHashMap();
        paramMap.put("problemVehicle", agvId);
        log.info("Change AGV Params = {}", (Object)paramMap);
        String res = "";
        while (StringUtils.isEmpty((CharSequence)res)) {
            try {
                res = OkHttpUtil.postJsonParams((String)this.getUrl(ApiEnum.terminate.getUri()), (String)JSONObject.toJSONString((Object)paramMap));
                Thread.sleep(2000L);
            }
            catch (IOException | InterruptedException e) {
                log.error("Change AGV error,{}", (Object)e.getMessage());
            }
        }
    }

    private void changeAgvDuringPickUpTheGoods(WindTaskRecord taskRecord) {
        String orderId = UUID.randomUUID().toString();
        changeRobotOrderId.put(taskRecord.getId(), orderId);
    }

    private void queryChangeAgvOperation(ChangeRobotReq req, WindTaskRecord taskRecord, String agvId, ChangeAgvProgress changeAgvProgress, String orderId) {
        boolean taskStatus = true;
        CAgvOperationBp.Blocks block = new CAgvOperationBp.Blocks();
        ArrayList blocks = Lists.newArrayList();
        String addBlockId = UUID.randomUUID().toString();
        String state = "";
        if (taskRecord != null) {
            this.windService.saveLog(TaskLogLevelEnum.info.getLevel(), "[CChangeAgvOperationBp]@{wind.bp.robotCommon}\uff1aagvId: " + agvId + ", targetSite: " + req.getLocation(), taskRecord.getProjectId(), taskRecord.getDefId(), taskRecord.getId(), null);
        }
        block.setOperation(req.getOperation());
        block.setBinTask(req.getBinTask());
        block.setLocation(req.getLocation());
        Map operationArgs = (Map)JSONObject.parseObject((String)req.getOperationArgs(), Map.class);
        block.setOperationArgs(operationArgs);
        Map scriptArgs = (Map)JSONObject.parseObject((String)req.getScriptArgs(), Map.class);
        block.setScriptArgs(scriptArgs);
        block.setScriptName(req.getScriptName());
        block.setBlockId(addBlockId);
        blocks.add(block);
        HashMap paramMap = Maps.newHashMap();
        if (taskRecord != null) {
            String distributeBpFrom;
            String string = distributeBpFrom = RootBp.distributeOrderCache.get(taskRecord.getDefId() + taskRecord.getId()) != null ? (String)((InheritableThreadLocal)RootBp.distributeOrderCache.get(taskRecord.getDefId() + taskRecord.getId())).get() : "";
            if (StringUtils.equals((CharSequence)distributeBpFrom, (CharSequence)orderId)) {
                orderId = "fromOrder" + distributeBpFrom;
            }
        }
        log.info("CAgvOperationBp orderId\uff1a" + (String)orderId);
        paramMap.put("id", orderId);
        paramMap.put("blocks", blocks);
        String addBlockParam = JSONObject.toJSONString((Object)paramMap);
        boolean terminateStatus = true;
        boolean over = false;
        int index = 0;
        while (terminateStatus) {
            Boolean aBoolean = (Boolean)changeAgvIfContinue.get(req.getOriginalOrderId());
            if (!aBoolean.booleanValue()) {
                throw new RuntimeException("Cancel the transfer");
            }
            if (taskRecord != null) {
                Object terminateStatusObj = GlobalCacheConfig.getCache((String)(taskRecord.getDefId() + taskRecord.getId()));
                terminateStatus = terminateStatusObj == null || ((Integer)terminateStatusObj).intValue() == TaskStatusEnum.running.getStatus();
            }
            try {
                if (index > 10) {
                    throw new RuntimeException("send Order Failed");
                }
                log.info("addBlocks request, orderId={}, param={}", orderId, (Object)addBlockParam);
                String res = OkHttpUtil.postJsonParams((String)RootBp.getUrl((String)ApiEnum.addBlocks.getUri()), (String)addBlockParam);
                if (StringUtils.isNotEmpty((CharSequence)res)) {
                    JSONObject resObj = JSONObject.parseObject((String)res);
                    Integer code = resObj.getInteger("code");
                    String msg = resObj.getString("msg");
                    if (code != null) {
                        if (code.equals(0)) break;
                        if (code.equals(50001) && StringUtils.isNotEmpty((CharSequence)msg) && msg.contains("already exist")) {
                            log.info("{}-{} already exist.", orderId, (Object)addBlockId);
                            throw new RuntimeException("BlockId already exist,orderId: " + (String)orderId + " blockId: " + addBlockId);
                        }
                        log.info("{}-{} addBlocks return {}", new Object[]{orderId, addBlockId, res});
                        over = true;
                        if (taskRecord != null) {
                            this.windService.saveLog(TaskLogLevelEnum.error.getLevel(), "[CChangAgvOperationBp]@{wind.bp.robotOperate}:orderId=" + (String)orderId + ",blockId=" + addBlockId + ",@{wind.bp.reason}=" + msg, taskRecord.getProjectId(), taskRecord.getDefId(), taskRecord.getId(), null);
                        }
                        throw new RuntimeException("@{wind.bp.robotOperate}: orderId=" + (String)orderId + ", blockId=" + addBlockId + " , @{wind.bp.reason}= " + msg);
                    }
                    log.error("Core addBlocks:orderId-{},blockId-{} API return code null", orderId, (Object)addBlockId);
                }
            }
            catch (RuntimeException e) {
                throw e;
            }
            catch (Exception ee) {
                try {
                    Thread.sleep(3000L);
                }
                catch (InterruptedException ex) {
                    log.error("InterruptedException error", (Throwable)ex);
                }
                log.error("{}-{} addBlocks error,retry", orderId, (Object)addBlockId);
            }
            ++index;
        }
        try {
            Thread.sleep(100L);
        }
        catch (InterruptedException e) {
            log.error("InterruptedException error", (Throwable)e);
        }
        if (!terminateStatus) {
            throw new RuntimeException("task was terminated");
        }
        int times = 0;
        Object taskStatusObj = null;
        block11: while (!over && taskStatus) {
            ++times;
            if (taskRecord != null) {
                taskStatusObj = GlobalCacheConfig.getCache((String)(taskRecord.getDefId() + taskRecord.getId()));
                taskStatus = taskStatusObj == null || ((Integer)taskStatusObj).intValue() == TaskStatusEnum.running.getStatus();
            }
            try {
                JSONArray errArray;
                JSONObject resObj;
                Thread.sleep(500L);
                String res = queryOrderListSchedule.queryOrder((String)orderId, (Instant)Instant.now());
                if (res == null) {
                    res = OkHttpUtil.get((String)(RootBp.getUrl((String)ApiEnum.orderDetails.getUri()) + "/" + (String)orderId));
                    log.info("query task block result,orderId={}, status={},from core", orderId, (Object)res);
                } else {
                    log.info("query task block result,orderId={}, status={},from cache", orderId, (Object)res);
                }
                Boolean aBoolean = (Boolean)changeAgvIfContinue.get(req.getOriginalOrderId());
                if (!aBoolean.booleanValue()) {
                    throw new RuntimeException("Cancel the transfer");
                }
                if (StringUtils.isEmpty((CharSequence)res) && taskRecord != null) {
                    this.windService.saveLog(TaskLogLevelEnum.error.getLevel(), "[CChangeAgvOperationBp]@{wind.bp.robotQuery}:" + res, taskRecord.getProjectId(), taskRecord.getDefId(), taskRecord.getId(), null);
                }
                if ("FAILED".equals(state = (resObj = JSONObject.parseObject((String)res)).getString("state"))) {
                    if (times != 1 && times % 500 != 0) continue;
                    errArray = resObj.getJSONArray("errors");
                    String reason = "";
                    if (CollectionUtils.isNotEmpty((Collection)errArray)) {
                        reason = ((JSONObject)errArray.get(0)).getString("desc");
                    }
                    this.windService.saveLog(TaskLogLevelEnum.error.getLevel(), "[CChangeAgvOperationBp]@{wind.bp.robotOperate}:orderId=" + resObj.getString("id") + ",@{wind.bp.reason}=" + reason, taskRecord.getProjectId(), taskRecord.getDefId(), taskRecord.getId(), null);
                    taskRecord.setEndedReason("[CAgvOperationBp]@{wind.bp.robotOperate}");
                    this.windService.updateTaskRecord(taskRecord);
                    continue;
                }
                if ("STOPPED".equals(state)) {
                    errArray = resObj.getJSONArray("errors");
                    String reason = "";
                    if (CollectionUtils.isNotEmpty((Collection)errArray)) {
                        reason = ((JSONObject)errArray.get(0)).getString("desc");
                    }
                    if (taskRecord != null) {
                        this.windService.saveLog(TaskLogLevelEnum.error.getLevel(), "[CChangeAgvOperationBp]@{wind.bp.stopHand}:orderId=" + resObj.getString("id") + ",@{wind.bp.reason}=" + reason, taskRecord.getProjectId(), taskRecord.getDefId(), taskRecord.getId(), null);
                    }
                    throw new RuntimeException(reason);
                }
                JSONArray blocksArr = resObj.getJSONArray("blocks");
                for (int i = 0; i < blocksArr.size(); ++i) {
                    JSONObject blockObj = blocksArr.getJSONObject(i);
                    String blockId = blockObj.getString("blockId");
                    if (!addBlockId.equals(blockId)) continue;
                    String blockState = blockObj.getString("state");
                    if (!AgvActionStatusEnum.FINISHED.getStatus().equals(blockState) && !AgvActionStatusEnum.MANUAL_FINISHED.getStatus().equals(blockState)) continue;
                    over = true;
                    continue block11;
                }
            }
            catch (RuntimeException e) {
                throw e;
            }
            catch (Exception e) {
                log.error("query task block status error", (Throwable)e);
                if (times != 1 || taskRecord == null) continue;
                this.windService.saveLog(TaskLogLevelEnum.error.getLevel(), "[CChangeAgvOperationBp]@{wind.bp.robotQueryOperate}\uff1a" + e.getMessage(), taskRecord.getProjectId(), taskRecord.getDefId(), taskRecord.getId(), null);
            }
        }
        if (!taskStatus) {
            throw new RuntimeException("task was terminated");
        }
        if (req.getPickUpMode().intValue() == PickUpModeEnum.Artificial.getStatus()) {
            changeRobotWaitingForRelease.put(orderId, Thread.currentThread());
            changeAgvProgress.setStatus(Integer.valueOf(ChangeRobotStatusEnum.WaitingForRelease.getStatus()));
            this.changeAgvProgressMapper.save((Object)changeAgvProgress);
            LockSupport.park(Thread.currentThread());
            Thread.interrupted();
            log.info("\u6362\u8f66\u653e\u884c,orderId: " + (String)orderId + ", agvId: " + agvId);
        }
        if (taskRecord != null) {
            changeRobotOrderId.put(taskRecord.getId(), orderId);
        }
    }

    private HashMap<String, String> selectChangeAgvNew(ChangeRobotReq req, WindTaskRecord windTaskRecord, String orderId) throws Exception {
        WorkSite workSite;
        List<Object> keyRoute = Lists.newArrayList();
        CSelectAgvBp initObj = new CSelectAgvBp();
        String tag = "";
        String group = "";
        if (windTaskRecord != null) {
            windTaskRecord.getOrderId().set((String)windTaskRecord.getOrderId().get());
            initObj.setExternalId(windTaskRecord.getId());
            List blockRecords = this.blockRecordMapper.findByTaskIdAndTaskRecordId(windTaskRecord.getDefId(), windTaskRecord.getId());
            WindBlockRecord windBlockRecord = blockRecords.stream().filter(e -> e.getStatus().intValue() == TaskBlockStatusEnum.running.getStatus() && req.getOriginalOrderId().equals(e.getOrderId()) && "CSelectAgvBp".equals(e.getBlockName())).findFirst().orElse(null);
            if (windBlockRecord != null) {
                JSONObject groupObject;
                String blockInputParams = windBlockRecord.getBlockInputParams();
                JSONObject jsonObject = JSONObject.parseObject((String)blockInputParams);
                JSONObject tagObject = jsonObject.getJSONObject("tag");
                if (tagObject != null) {
                    tag = tagObject.getString("value");
                }
                if ((groupObject = jsonObject.getJSONObject("group")) != null) {
                    group = groupObject.getString("value");
                }
            }
        }
        if (req.getToChangeAgvId() != null) {
            initObj.setVehicle(req.getToChangeAgvId());
        } else {
            if (StringUtils.isNotEmpty((CharSequence)req.getToChangeLabel())) {
                initObj.setLabel(req.getToChangeLabel());
            } else {
                initObj.setLabel(tag);
            }
            if (StringUtils.isNotEmpty((CharSequence)req.getToChangeGroup())) {
                initObj.setGroup(req.getToChangeGroup());
            } else {
                initObj.setGroup(group);
            }
        }
        initObj.setId(orderId);
        initObj.setPriority(Integer.valueOf(1000));
        if (StringUtils.isNotEmpty((CharSequence)req.getLocation())) {
            keyRoute = Arrays.asList(req.getLocation().split(","));
        }
        if (keyRoute.size() == 0) {
            String keyRouteLocation = this.getKeyRoute(req);
            keyRoute.add(keyRouteLocation);
        }
        initObj.setKeyRoute((List)keyRoute);
        List bySiteId = this.workSiteMapper.findBySiteId(req.getLocation());
        if (bySiteId.size() > 0 && (workSite = (WorkSite)bySiteId.get(0)).getDisabled() == 1) {
            throw new Exception(req.getLocation() + " is disabled ");
        }
        String param = JSONObject.toJSONString((Object)initObj);
        log.info("slelect AGV CSelectAgvBp setOrder orderId={}, param={}", (Object)orderId, (Object)param);
        boolean taskStatus = true;
        int index = 0;
        while (true) {
            try {
                Boolean aBoolean = (Boolean)changeAgvIfContinue.get(req.getOriginalOrderId());
                if (!aBoolean.booleanValue()) {
                    throw new RuntimeException("Cancel the transfer");
                }
                if (index > 10) {
                    throw new RuntimeException("send Order Failed");
                }
                OkHttpUtil.postJsonParams((String)RootBp.getUrl((String)ApiEnum.setOrder.getUri()), (String)param);
            }
            catch (Exception e2) {
                try {
                    Thread.sleep(3000L);
                }
                catch (InterruptedException ex) {
                    log.error("setOrder InterruptedException", (Throwable)ex);
                }
                log.error("setOrder error,retry", (Throwable)e2);
                ++index;
                continue;
            }
            break;
        }
        String agvId = this.querySelectAgv(req, windTaskRecord, orderId);
        if (!req.getIfFilled().booleanValue() && StringUtils.isNotEmpty((CharSequence)agvId) && windTaskRecord != null) {
            changeRobotOrderId.put(windTaskRecord.getId(), (String)windTaskRecord.getOrderId().get());
        }
        HashMap<String, String> objectObjectHashMap = new HashMap<String, String>();
        objectObjectHashMap.put("agvId", agvId);
        objectObjectHashMap.put("orderId", orderId);
        return objectObjectHashMap;
    }

    private String getKeyRoute(ChangeRobotReq req) {
        String location = "";
        while (true) {
            try {
                String taskRes = OkHttpUtil.get((String)(RootBp.getUrl((String)ApiEnum.orderDetails.getUri()) + "/" + req.getOriginalOrderId()));
                JSONObject jsonRes = JSONObject.parseObject((String)taskRes);
                JSONArray blocks = jsonRes.getJSONArray("blocks");
                for (int i = 0; i < blocks.size(); ++i) {
                    JSONObject blockObject = JSONObject.parseObject((String)blocks.get(i).toString());
                    String state = blockObject.getString("state");
                    String locationNew = blockObject.getString("location");
                    if (StringUtils.isNotEmpty((CharSequence)locationNew)) {
                        location = locationNew;
                    }
                    if (!"STOPPED".equals(state)) continue;
                    return locationNew;
                }
            }
            catch (IOException e) {
                log.error("getKeyRoute IOException", (Throwable)e);
                continue;
            }
            break;
        }
        return location;
    }

    private String querySelectAgv(ChangeRobotReq req, WindTaskRecord taskRecord, String orderId) {
        String agvId = "";
        String orderState = "";
        try {
            Thread.sleep(1000L);
        }
        catch (InterruptedException e) {
            log.error("CSelectAgvBp error", (Throwable)e);
        }
        boolean taskStatus = true;
        boolean firstQuery = true;
        while (taskStatus) {
            Boolean aBoolean = (Boolean)changeAgvIfContinue.get(req.getOriginalOrderId());
            if (!aBoolean.booleanValue()) {
                throw new RuntimeException("Cancel the transfer");
            }
            if (taskRecord != null) {
                Object taskStatusObj = GlobalCacheConfig.getCache((String)(taskRecord.getDefId() + taskRecord.getId()));
                taskStatus = taskStatusObj == null || ((Integer)taskStatusObj).intValue() == TaskStatusEnum.running.getStatus();
            }
            try {
                JSONObject jsonRes;
                String taskRes = OkHttpUtil.get((String)(RootBp.getUrl((String)ApiEnum.orderDetails.getUri()) + "/" + orderId));
                if (firstQuery) {
                    log.info("CSelectAgvBp setOrder orderId={},  result={}", (Object)orderId, (Object)taskRes);
                    firstQuery = false;
                }
                if (StringUtils.isNotEmpty((CharSequence)taskRes) && !"null".equals(taskRes) && "STOPPED".equals(orderState = (jsonRes = JSONObject.parseObject((String)taskRes)).getString("state"))) {
                    JSONArray errArray = jsonRes.getJSONArray("errors");
                    String reason = "";
                    if (CollectionUtils.isNotEmpty((Collection)errArray)) {
                        reason = ((JSONObject)errArray.get(0)).getString("desc");
                    }
                    throw new RuntimeException("select agv error: " + reason);
                }
                if (StringUtils.isNotEmpty((CharSequence)taskRes) && Objects.nonNull(JSONObject.parseObject((String)taskRes)) && JSONObject.parseObject((String)taskRes).containsKey((Object)CSelectAgvBpField.vehicle) && StringUtils.isNotEmpty((CharSequence)JSONObject.parseObject((String)taskRes).getString(CSelectAgvBpField.vehicle)) && ("WAITING".equals(orderState) || "FAILED".equals(orderState))) {
                    agvId = JSONObject.parseObject((String)taskRes).getString(CSelectAgvBpField.vehicle);
                    log.info("CSelectAgvBp setOrder orderId={}, result={}", (Object)orderId, (Object)taskRes);
                    break;
                }
                Thread.sleep(1000L);
            }
            catch (RuntimeException e) {
                throw e;
            }
            catch (IOException e) {
                log.error("SelectAgvBp query core error: ", (Throwable)e);
            }
            catch (Exception e) {
                log.error("querySelectAgv error: ", (Throwable)e);
            }
        }
        log.info("Select Robot Results agvId={}", (Object)agvId);
        if (StringUtils.isEmpty((CharSequence)agvId)) {
            log.info("can't select matched agv");
            throw new RuntimeException("can't select matched agv");
        }
        if (taskRecord != null) {
            WindTaskLog taskLog = WindTaskLog.builder().createTime(new Date()).level(TaskLogLevelEnum.info.getLevel()).message("[ChangeAgv]@{wind.bp.selectRobotResult}:agvId=" + agvId).projectId(taskRecord.getProjectId()).taskRecordId(taskRecord.getId()).taskId(taskRecord.getDefId()).build();
            this.windService.saveLog(taskLog);
            taskRecord.setEndedReason("[ChangeAgv]@{wind.bp.end}\uff0cagvId=" + agvId);
            WindTaskRecord updateRecord = this.windService.findByTaskIdAndTaskRecordId(taskRecord.getDefId(), taskRecord.getId());
            Object existAgvId = "";
            if (updateRecord != null) {
                existAgvId = updateRecord.getAgvId();
            }
            if (StringUtils.isNotEmpty((CharSequence)existAgvId)) {
                if (!((String)existAgvId).contains(agvId)) {
                    existAgvId = (String)existAgvId + "," + agvId;
                }
            } else {
                existAgvId = agvId;
            }
            taskRecord.setAgvId((String)existAgvId);
            this.windService.updateTaskRecord(taskRecord);
        }
        return agvId;
    }

    public void changeAgvRelease(String orderId) {
        Thread thread = (Thread)changeRobotWaitingForRelease.get(orderId);
        if (thread != null) {
            LockSupport.unpark(thread);
        }
        changeRobotWaitingForRelease.remove(orderId);
    }

    /*
     * WARNING - Removed try catching itself - possible behaviour change.
     */
    public void cancelChangeAgv(String originalOrderId, String orderId) {
        try {
            changeAgvIfContinue.put(originalOrderId, false);
            changeRobotOrderId.remove(orderId);
            if (StringUtils.isNotEmpty((CharSequence)orderId)) {
                log.info("complete task, orderId={}", (Object)orderId);
                JSONObject param = new JSONObject();
                param.put("id", (Object)orderId);
                new Thread((Runnable)new /* Unavailable Anonymous Inner Class!! */).start();
            }
        }
        finally {
            changeAgvIfContinue.remove(originalOrderId);
            changeRobotOrderId.remove(orderId);
        }
    }

    public PaginationResponseVo findChangeProgressList(int page, int size, ChangingProgressReq req) {
        PageRequest pageable = PageRequest.of((int)(page - 1), (int)size);
        String replaceRobot = req.getReplaceRobot();
        String originalRobot = req.getOriginalRobot();
        Integer status = req.getStatus();
        String orderId = req.getOrderId();
        3 spec = new /* Unavailable Anonymous Inner Class!! */;
        Page changeAgvProgressList = this.changeAgvProgressMapper.findAll((Specification)spec, (Pageable)pageable);
        ArrayList<ChangeProgressResp> changeProgressRespList = new ArrayList<ChangeProgressResp>();
        for (int i = 0; i < changeAgvProgressList.getContent().size(); ++i) {
            ChangeProgressResp changeProgressResp = new ChangeProgressResp();
            changeProgressResp.setOriginalOrderId(((ChangeAgvProgress)changeAgvProgressList.getContent().get(i)).getOriginalOrderId());
            changeProgressResp.setId(((ChangeAgvProgress)changeAgvProgressList.getContent().get(i)).getId());
            changeProgressResp.setErrorMsg(((ChangeAgvProgress)changeAgvProgressList.getContent().get(i)).getErrorMsg());
            changeProgressResp.setExecutorTime(((ChangeAgvProgress)changeAgvProgressList.getContent().get(i)).getExecutorTime());
            changeProgressResp.setOrderId(((ChangeAgvProgress)changeAgvProgressList.getContent().get(i)).getOrderId());
            changeProgressResp.setStatus(((ChangeAgvProgress)changeAgvProgressList.getContent().get(i)).getStatus());
            changeProgressResp.setReason(((ChangeAgvProgress)changeAgvProgressList.getContent().get(i)).getReason());
            changeProgressResp.setReplaceRobot(((ChangeAgvProgress)changeAgvProgressList.getContent().get(i)).getReplaceRobot());
            changeProgressResp.setOriginalRobot(((ChangeAgvProgress)changeAgvProgressList.getContent().get(i)).getOriginalRobot());
            changeProgressRespList.add(changeProgressResp);
        }
        PaginationResponseVo paginationResponseVo = new PaginationResponseVo();
        paginationResponseVo.setTotalCount(Long.valueOf(changeAgvProgressList.getTotalElements()));
        paginationResponseVo.setCurrentPage(Integer.valueOf(page));
        paginationResponseVo.setPageSize(Integer.valueOf(size));
        paginationResponseVo.setTotalPage(Integer.valueOf(changeAgvProgressList.getTotalPages()));
        paginationResponseVo.setPageList(changeProgressRespList);
        return paginationResponseVo;
    }

    @Transactional
    public void updateChangeRobotProgress(ChangeAgvProgress cap) {
        this.changeAgvProgressMapper.save((Object)cap);
    }

    public List<ChangeAgvProgress> findByStatusIn(List<Integer> status) {
        return this.changeAgvProgressMapper.findByStatusIn(status);
    }

    public List<AgvAttr> findAllAttrAgv() {
        return this.agvAttrMapper.findAll();
    }

    @Transactional
    public void deleteAttrAgvByAgvName(String agvName) {
        this.agvAttrMapper.deleteAgvAttrByAgvName(agvName);
    }

    @Transactional
    public void saveOrUpdateAttrAgv(AgvAttr agvAttr) {
        this.agvAttrMapper.save((Object)agvAttr);
    }

    public String getBlockGroupStatus(List<String> blockGroups) {
        HashMap req = Maps.newHashMap();
        req.put("blockGroup", blockGroups);
        try {
            String res = OkHttpUtil.postJsonParams((String)this.getUrl(ApiEnum.blockGroupStatus.getUri()), (String)JSONObject.toJSONString((Object)req));
            return res;
        }
        catch (IOException e) {
            log.error("getBlockGroupStatus error,{}", (Throwable)e);
            return "";
        }
    }

    public String setAgvBlockGroupFill(String id, List<String> blockGroups) {
        HashMap req = Maps.newHashMap();
        req.put("id", id);
        req.put("blockGroup", blockGroups);
        try {
            String res = OkHttpUtil.postJsonParams((String)this.getUrl(ApiEnum.getBlockGroup.getUri()), (String)JSONObject.toJSONString((Object)req));
            return res;
        }
        catch (IOException e) {
            log.error("getBlockGroupStatus error,{}", (Throwable)e);
            return "";
        }
    }

    public String releaseBlockGroup(String id, List<String> blockGroups) {
        HashMap req = Maps.newHashMap();
        req.put("id", id);
        req.put("blockGroup", blockGroups);
        try {
            String res = OkHttpUtil.postJsonParams((String)this.getUrl(ApiEnum.releaseBlockGroup.getUri()), (String)JSONObject.toJSONString((Object)req));
            return res;
        }
        catch (IOException e) {
            log.error("releaseBlockGroup error,{}", (Throwable)e);
            return "";
        }
    }

    public Map<String, String> setSoftStop(SetRobotIOReq req) {
        HashMap codeReq = Maps.newHashMap();
        codeReq.put("vehicle", req.getVehicle());
        codeReq.put("status", req.getStatus());
        log.info("setSoftStop vehicleId = {}", (Object)codeReq);
        try {
            Map result = OkHttpUtil.postJson((String)this.getUrl(ApiEnum.setSoftStop.getUri()), (String)JSONObject.toJSONString((Object)codeReq));
            return result;
        }
        catch (IOException e) {
            log.error("setSoftStop error,{}", (Throwable)e);
            return null;
        }
    }

    public String ParsingAgvDataBasedOnPermission(String data) {
        boolean ifEnableShiro = PropConfig.ifEnableShiro();
        if (!ifEnableShiro) {
            return data;
        }
        boolean ifShowAllAgv = this.dataPermissionManager.ifShowAllAgv();
        if (ifShowAllAgv) {
            return data;
        }
        JSONObject robotStatus = JSONObject.parseObject((String)data);
        String report = robotStatus.getString("report");
        JSONArray reportArray = JSONObject.parseArray((String)report);
        JSONArray showAgvArray = new JSONArray();
        for (Object e : reportArray) {
            String uuid = JSONObject.parseObject((String)e.toString()).getString("uuid");
            if (!this.DataPermissionManager.checkIfHavePermission("data:vehicle:" + uuid).booleanValue()) continue;
            showAgvArray.add(e);
        }
        robotStatus.put("report", (Object)showAgvArray);
        return JSON.toJSONString((Object)robotStatus);
    }

    public List<AgvNormalAndRssiPositionListVo> getRssiListAndPositionListByVehicle(String[] agvs) {
        Object cache = GlobalCacheConfig.getCache((String)"robotsStatus");
        List collect = Arrays.stream(agvs).collect(Collectors.toList());
        ArrayList<AgvNormalAndRssiPositionListVo> result = new ArrayList<AgvNormalAndRssiPositionListVo>();
        HashMap<String, String> uuidAndMapName = new HashMap<String, String>();
        if (null != cache) {
            JSONObject robotInfoJSON = JSONObject.parseObject((String)cache.toString());
            JSONArray reportArray = JSONArray.parseArray((String)robotInfoJSON.get((Object)"report").toString());
            for (Object reportObj : reportArray) {
                JSONObject reportJson = JSONObject.parseObject((String)reportObj.toString());
                String uuid = reportJson.get((Object)"uuid").toString();
                if (!collect.contains(uuid)) continue;
                JSONObject rbkReportJson = JSON.parseObject((String)reportJson.get((Object)"rbk_report").toString());
                if (rbkReportJson.get((Object)"current_map") == null) {
                    return null;
                }
                String mapName = rbkReportJson.get((Object)"current_map").toString();
                uuidAndMapName.put(uuid, mapName);
            }
            if (!uuidAndMapName.isEmpty()) {
                String sceneDir = this.propConfig.getSceneDir();
                for (Map.Entry entry : uuidAndMapName.entrySet()) {
                    try {
                        String smapStr = FileUtils.readFileToString((File)new File(sceneDir + "robots/" + (String)entry.getKey() + "/maps/" + (String)entry.getValue() + ".smap"), (Charset)StandardCharsets.UTF_8);
                        JSONObject smapJson = JSONObject.parseObject((String)smapStr);
                        String normalPosListStr = smapJson.getString("normalPosList");
                        String rssiPosListStr = smapJson.getString("rssiPosList");
                        List normalPosList = JSONObject.parseArray((String)normalPosListStr, XyVo.class);
                        List rssiPosList = JSONObject.parseArray((String)rssiPosListStr, XyVo.class);
                        result.add(new AgvNormalAndRssiPositionListVo((String)entry.getKey(), normalPosList, rssiPosList));
                    }
                    catch (IOException e) {
                        log.error("\u5730\u56fe\u6587\u4ef6\u8bfb\u53d6\u5931\u8d25: {}", (Object)e.getMessage());
                        throw new RuntimeException("Failed to read map file.");
                    }
                }
            }
        }
        return result;
    }

    public MapRssiPosReponse getRssiListAndPositionListByMaps(RssiMapReq mapNames) {
        String sceneDir = this.propConfig.getSceneDir();
        MapRssiPosReponse mapRssiPosReponse = new MapRssiPosReponse();
        ArrayList<MapRssiPosAllVo> mapRssiPosInfos = new ArrayList<MapRssiPosAllVo>();
        mapRssiPosReponse.setRssiInfos(mapRssiPosInfos);
        block2: for (String mapName : mapNames.getMapNames()) {
            boolean mapFound = false;
            try {
                File directory = new File(sceneDir + "robots/");
                File[] robotFiles = directory.listFiles();
                if (robotFiles == null) continue;
                block3: for (File robotDirectory : robotFiles) {
                    File[] mapFiles;
                    if (mapFound) continue block2;
                    File mapDirectory = FileUtils.getFile((File)robotDirectory, (String[])new String[]{"maps"});
                    if (mapDirectory == null || (mapFiles = mapDirectory.listFiles()) == null) continue;
                    for (File mapFile : mapFiles) {
                        if (!mapFile.getName().equals(mapName)) continue;
                        String smapStr = FileUtils.readFileToString((File)mapFile, (Charset)StandardCharsets.UTF_8);
                        JSONObject smapJson = JSONObject.parseObject((String)smapStr);
                        String normalPosListStr = smapJson.getString("normalPosList");
                        String rssiPosListStr = smapJson.getString("rssiPosList");
                        List normalPosList = JSONObject.parseArray((String)normalPosListStr, XyVo.class);
                        List rssiPosList = JSONObject.parseArray((String)rssiPosListStr, XyVo.class);
                        MapRssiPosAllVo mapRssiPosInfo = new MapRssiPosAllVo();
                        mapRssiPosInfo.setMapName(mapName);
                        MapRssiPosVo mapRssiPosDetail = new MapRssiPosVo();
                        mapRssiPosDetail.setNormalPosList(normalPosList);
                        mapRssiPosDetail.setRssiPosList(rssiPosList);
                        mapRssiPosInfo.setMapRssiPosDetail(mapRssiPosDetail);
                        mapRssiPosInfos.add(mapRssiPosInfo);
                        mapFound = true;
                        continue block3;
                    }
                }
            }
            catch (IOException e) {
                log.error("\u5730\u56fe\u6587\u4ef6\u8bfb\u53d6\u5931\u8d25: {}", (Object)e.getMessage());
                throw new RuntimeException("Failed to read map file.");
            }
        }
        return mapRssiPosReponse;
    }

    public String getFireStatus() {
        try {
            String res = OkHttpUtil.get((String)this.getUrl(ApiEnum.fireStatus.getUri()));
            return res;
        }
        catch (IOException e) {
            log.error("getFireStatus error,{}", (Throwable)e);
            return "";
        }
    }

    public String getDutyStatus() {
        try {
            String res = OkHttpUtil.get((String)this.getUrl(ApiEnum.dutyStatus.getUri()));
            return res;
        }
        catch (IOException e) {
            log.error("getDutyStatus error,{}", (Throwable)e);
            return "";
        }
    }

    public String dutyOperations(DutyOperationsReq dutyOperationsReq) {
        try {
            JSONObject jsonObject;
            String dutyStatus = this.getStatus();
            if ((dutyStatus.equals("executingOffDuty") || dutyStatus.equals("offDuty")) && !dutyOperationsReq.getOnDuty().booleanValue()) {
                return "";
            }
            if (dutyStatus.equals("onDuty") && dutyOperationsReq.getOnDuty().booleanValue()) {
                return "";
            }
            String res = OkHttpUtil.postJsonParams((String)this.getUrl(ApiEnum.dutyOperations.getUri()), (String)JSONObject.toJSONString((Object)dutyOperationsReq));
            if (StringUtils.isNotEmpty((CharSequence)res) && !"null".equals(res) && (jsonObject = JSONObject.parseObject((String)res)).getInteger("code").equals(0)) {
                this.dutyRecordMapper.save((Object)DutyRecord.builder().onDuty(dutyOperationsReq.getOnDuty()).recordedOn(new Date()).build());
                if (!dutyOperationsReq.getOnDuty().booleanValue()) {
                    this.asyncFindIsOnDuty();
                }
            }
            return res;
        }
        catch (IOException e) {
            log.error("dutyOperations error,{}", (Throwable)e);
            return "";
        }
    }

    public void asyncFindIsOnDuty() {
        CompletableFuture.runAsync(() -> {
            try {
                while (true) {
                    String res = OkHttpUtil.get((String)this.getUrl(ApiEnum.dutyStatus.getUri()));
                    JSONObject jsonResult = JSONObject.parseObject((String)res);
                    String dutyStatus = this.getStatus();
                    if ("offDuty".equals(dutyStatus)) {
                        this.reportToUpperComputer(this.propConfig.getDutyUrl(), res);
                        break;
                    }
                    Thread.sleep(3000L);
                }
            }
            catch (Exception e) {
                log.error("Error in asyncFindIsOnDuty", (Throwable)e);
            }
        });
    }

    public String getStatus() throws IOException {
        String res = OkHttpUtil.get((String)this.getUrl(ApiEnum.dutyStatus.getUri()));
        JSONObject jsonResult = JSONObject.parseObject((String)res);
        String dutyStatus = jsonResult.getString("dutyStatus");
        return dutyStatus;
    }

    public void reportToUpperComputer(String url, String res) {
        try {
            Map result = OkHttpUtil.postJson((String)url, (String)res);
            System.out.println("result:" + result);
        }
        catch (IOException e) {
            log.error("Error in reportToUpperComputer", (Throwable)e);
        }
    }

    public Page<DutyRecord> findDutyRecordsByConditionPaging(String startTime, String endTime, Boolean onDuty, int currentPage, int pageSize) {
        4 spec = new /* Unavailable Anonymous Inner Class!! */;
        PageRequest pageable = PageRequest.of((int)(currentPage - 1), (int)pageSize, (Sort)Sort.by((Sort.Direction)Sort.Direction.fromString((String)"DESC"), (String[])new String[]{"recordedOn"}));
        return this.dutyRecordMapper.findAll((Specification)spec, (Pageable)pageable);
    }

    public Integer deleteDutyRecord(List<String> ids) {
        return this.dutyRecordMapper.deleteDutyRecordByids(ids);
    }

    public PropConfig getPropConfig() {
        return this.propConfig;
    }

    public RestTemplate getRestTemplate() {
        return this.restTemplate;
    }

    public WindTaskDefMapper getWindTaskDefMapper() {
        return this.windTaskDefMapper;
    }

    public WindTaskRecordMapper getWindTaskRecordMapper() {
        return this.windTaskRecordMapper;
    }

    public RobotStatusMapper getRobotStatusMapper() {
        return this.robotStatusMapper;
    }

    public RootBp getRootBp() {
        return this.rootBp;
    }

    public WindService getWindService() {
        return this.windService;
    }

    public WorkSiteMapper getWorkSiteMapper() {
        return this.workSiteMapper;
    }

    public AgvApiService getAgvApiService() {
        return this.agvApiService;
    }

    public ChangeAgvProgressMapper getChangeAgvProgressMapper() {
        return this.changeAgvProgressMapper;
    }

    public WindBlockRecordMapper getBlockRecordMapper() {
        return this.blockRecordMapper;
    }

    public AgvAttrMapper getAgvAttrMapper() {
        return this.agvAttrMapper;
    }

    public DataPermissionManager getDataPermissionManager() {
        return this.dataPermissionManager;
    }

    public DutyRecordMapper getDutyRecordMapper() {
        return this.dutyRecordMapper;
    }
}

