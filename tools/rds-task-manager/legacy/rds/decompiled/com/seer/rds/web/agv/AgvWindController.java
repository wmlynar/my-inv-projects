/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.alibaba.fastjson.JSON
 *  com.alibaba.fastjson.JSONArray
 *  com.alibaba.fastjson.JSONObject
 *  com.alibaba.fastjson.parser.Feature
 *  com.alibaba.fastjson.serializer.SerializeConfig
 *  com.alibaba.fastjson.serializer.SerializerFeature
 *  com.google.common.collect.Lists
 *  com.seer.rds.annotation.Description
 *  com.seer.rds.annotation.SysLog
 *  com.seer.rds.config.PropConfig
 *  com.seer.rds.config.configview.CommonConfig
 *  com.seer.rds.config.configview.operator.OperatorWorkStation
 *  com.seer.rds.config.configview.operator.OperatorWorkType
 *  com.seer.rds.constant.ApiEnum
 *  com.seer.rds.constant.CommonCodeEnum
 *  com.seer.rds.constant.SiteOperationEnum
 *  com.seer.rds.constant.TaskStatusEnum
 *  com.seer.rds.dao.UserMapper
 *  com.seer.rds.dao.WindBlockRecordMapper
 *  com.seer.rds.dao.WindTaskDefHistoryMapper
 *  com.seer.rds.dao.WindTaskRecordMapper
 *  com.seer.rds.dao.WorkSiteMapper
 *  com.seer.rds.model.admin.User
 *  com.seer.rds.model.wind.BaseRecord
 *  com.seer.rds.model.wind.WindBlockRecord
 *  com.seer.rds.model.wind.WindDataCacheSplit
 *  com.seer.rds.model.wind.WindTaskDef
 *  com.seer.rds.model.wind.WindTaskDefHistory
 *  com.seer.rds.model.wind.WindTaskLog
 *  com.seer.rds.model.wind.WindTaskRecord
 *  com.seer.rds.model.worksite.WorkSite
 *  com.seer.rds.runnable.RobotsStatusRunnable
 *  com.seer.rds.schedule.GeneralBusinessSchedule
 *  com.seer.rds.service.agv.AgvApiService
 *  com.seer.rds.service.agv.WindBlockRecordService
 *  com.seer.rds.service.agv.WindService
 *  com.seer.rds.service.agv.WindTaskDefService
 *  com.seer.rds.service.agv.WindTaskService
 *  com.seer.rds.service.agv.WorkSiteService
 *  com.seer.rds.service.system.DataPermissionManager
 *  com.seer.rds.service.wind.RootBp
 *  com.seer.rds.service.wind.commonBp.CacheDataBp
 *  com.seer.rds.util.ExcelUtil
 *  com.seer.rds.util.FileUploadUtil
 *  com.seer.rds.util.LocaleMessageUtil
 *  com.seer.rds.util.OkHttpUtil
 *  com.seer.rds.util.ResourceUtil
 *  com.seer.rds.util.SpringUtil
 *  com.seer.rds.util.WokSiteLogUtil
 *  com.seer.rds.util.device.PagerUtil
 *  com.seer.rds.vo.CommonParametersVo
 *  com.seer.rds.vo.ResultVo
 *  com.seer.rds.vo.StopAllTaskReq$StopTask
 *  com.seer.rds.vo.WindTaskRecordImportVo
 *  com.seer.rds.vo.req.BatchStopTaskReq
 *  com.seer.rds.vo.req.EnablePeriodicTasReq
 *  com.seer.rds.vo.req.PaginationReq
 *  com.seer.rds.vo.req.QueryBlockRecordsAndTaskStatusReq
 *  com.seer.rds.vo.req.QueryTaskRecordReq
 *  com.seer.rds.vo.req.QueryWindTaskDefReq
 *  com.seer.rds.vo.req.QueryWindTaskLogReq
 *  com.seer.rds.vo.req.SetOrderReq
 *  com.seer.rds.vo.req.StopTaskReq
 *  com.seer.rds.vo.req.TerminateAndIsExecReq
 *  com.seer.rds.vo.req.WindTaskLogReq
 *  com.seer.rds.vo.req.WindTaskPriorityReq
 *  com.seer.rds.vo.req.taskListAndVersionReq
 *  com.seer.rds.vo.response.FindBlocksByTaskRecordIdVo
 *  com.seer.rds.vo.response.PaginationResponseVo
 *  com.seer.rds.vo.response.WindTaskLogResp
 *  com.seer.rds.vo.wind.BpDefVo
 *  com.seer.rds.web.agv.AgvWindController
 *  com.seer.rds.web.config.ConfigFileController
 *  io.swagger.annotations.Api
 *  io.swagger.annotations.ApiOperation
 *  javax.servlet.http.HttpServletRequest
 *  javax.servlet.http.HttpServletResponse
 *  javax.servlet.http.HttpSession
 *  org.apache.commons.collections.CollectionUtils
 *  org.apache.commons.io.FileUtils
 *  org.apache.commons.lang3.StringUtils
 *  org.apache.commons.lang3.reflect.FieldUtils
 *  org.apache.commons.lang3.time.DateFormatUtils
 *  org.json.JSONObject
 *  org.slf4j.Logger
 *  org.slf4j.LoggerFactory
 *  org.springframework.beans.factory.annotation.Autowired
 *  org.springframework.context.i18n.LocaleContextHolder
 *  org.springframework.dao.DataIntegrityViolationException
 *  org.springframework.data.domain.Page
 *  org.springframework.http.ResponseEntity
 *  org.springframework.stereotype.Controller
 *  org.springframework.web.bind.annotation.GetMapping
 *  org.springframework.web.bind.annotation.PathVariable
 *  org.springframework.web.bind.annotation.PostMapping
 *  org.springframework.web.bind.annotation.RequestBody
 *  org.springframework.web.bind.annotation.RequestHeader
 *  org.springframework.web.bind.annotation.RequestMapping
 *  org.springframework.web.bind.annotation.RequestParam
 *  org.springframework.web.bind.annotation.ResponseBody
 *  springfox.documentation.annotations.ApiIgnore
 */
package com.seer.rds.web.agv;

import com.alibaba.fastjson.JSON;
import com.alibaba.fastjson.JSONArray;
import com.alibaba.fastjson.parser.Feature;
import com.alibaba.fastjson.serializer.SerializeConfig;
import com.alibaba.fastjson.serializer.SerializerFeature;
import com.google.common.collect.Lists;
import com.seer.rds.annotation.Description;
import com.seer.rds.annotation.SysLog;
import com.seer.rds.config.PropConfig;
import com.seer.rds.config.configview.CommonConfig;
import com.seer.rds.config.configview.operator.OperatorWorkStation;
import com.seer.rds.config.configview.operator.OperatorWorkType;
import com.seer.rds.constant.ApiEnum;
import com.seer.rds.constant.CommonCodeEnum;
import com.seer.rds.constant.SiteOperationEnum;
import com.seer.rds.constant.TaskStatusEnum;
import com.seer.rds.dao.UserMapper;
import com.seer.rds.dao.WindBlockRecordMapper;
import com.seer.rds.dao.WindTaskDefHistoryMapper;
import com.seer.rds.dao.WindTaskRecordMapper;
import com.seer.rds.dao.WorkSiteMapper;
import com.seer.rds.model.admin.User;
import com.seer.rds.model.wind.BaseRecord;
import com.seer.rds.model.wind.WindBlockRecord;
import com.seer.rds.model.wind.WindDataCacheSplit;
import com.seer.rds.model.wind.WindTaskDef;
import com.seer.rds.model.wind.WindTaskDefHistory;
import com.seer.rds.model.wind.WindTaskLog;
import com.seer.rds.model.wind.WindTaskRecord;
import com.seer.rds.model.worksite.WorkSite;
import com.seer.rds.runnable.RobotsStatusRunnable;
import com.seer.rds.schedule.GeneralBusinessSchedule;
import com.seer.rds.service.agv.AgvApiService;
import com.seer.rds.service.agv.WindBlockRecordService;
import com.seer.rds.service.agv.WindService;
import com.seer.rds.service.agv.WindTaskDefService;
import com.seer.rds.service.agv.WindTaskService;
import com.seer.rds.service.agv.WorkSiteService;
import com.seer.rds.service.system.DataPermissionManager;
import com.seer.rds.service.wind.RootBp;
import com.seer.rds.service.wind.commonBp.CacheDataBp;
import com.seer.rds.util.ExcelUtil;
import com.seer.rds.util.FileUploadUtil;
import com.seer.rds.util.LocaleMessageUtil;
import com.seer.rds.util.OkHttpUtil;
import com.seer.rds.util.ResourceUtil;
import com.seer.rds.util.SpringUtil;
import com.seer.rds.util.WokSiteLogUtil;
import com.seer.rds.util.device.PagerUtil;
import com.seer.rds.vo.CommonParametersVo;
import com.seer.rds.vo.ResultVo;
import com.seer.rds.vo.StopAllTaskReq;
import com.seer.rds.vo.WindTaskRecordImportVo;
import com.seer.rds.vo.req.BatchStopTaskReq;
import com.seer.rds.vo.req.EnablePeriodicTasReq;
import com.seer.rds.vo.req.PaginationReq;
import com.seer.rds.vo.req.QueryBlockRecordsAndTaskStatusReq;
import com.seer.rds.vo.req.QueryTaskRecordReq;
import com.seer.rds.vo.req.QueryWindTaskDefReq;
import com.seer.rds.vo.req.QueryWindTaskLogReq;
import com.seer.rds.vo.req.SetOrderReq;
import com.seer.rds.vo.req.StopTaskReq;
import com.seer.rds.vo.req.TerminateAndIsExecReq;
import com.seer.rds.vo.req.WindTaskLogReq;
import com.seer.rds.vo.req.WindTaskPriorityReq;
import com.seer.rds.vo.req.taskListAndVersionReq;
import com.seer.rds.vo.response.FindBlocksByTaskRecordIdVo;
import com.seer.rds.vo.response.PaginationResponseVo;
import com.seer.rds.vo.response.WindTaskLogResp;
import com.seer.rds.vo.wind.BpDefVo;
import com.seer.rds.web.config.ConfigFileController;
import io.swagger.annotations.Api;
import io.swagger.annotations.ApiOperation;
import java.io.BufferedInputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.OutputStream;
import java.lang.reflect.Field;
import java.nio.charset.Charset;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collection;
import java.util.Date;
import java.util.Iterator;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import javax.servlet.http.HttpSession;
import org.apache.commons.collections.CollectionUtils;
import org.apache.commons.io.FileUtils;
import org.apache.commons.lang3.StringUtils;
import org.apache.commons.lang3.reflect.FieldUtils;
import org.apache.commons.lang3.time.DateFormatUtils;
import org.json.JSONObject;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.i18n.LocaleContextHolder;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseBody;
import springfox.documentation.annotations.ApiIgnore;

@Controller
@RequestMapping(value={"api"})
@Api(tags={"\u673a\u5668\u4eba\u4efb\u52a1"})
public class AgvWindController {
    private static final Logger log = LoggerFactory.getLogger(AgvWindController.class);
    @Autowired
    private AgvApiService agvApiService;
    @Autowired
    private WindService windService;
    @Autowired
    private WindTaskService windTaskService;
    @Autowired
    private WindBlockRecordService windBlockRecordService;
    @Autowired
    private WorkSiteService workSiteService;
    @Autowired
    private LocaleMessageUtil localeMessageUtil;
    @Autowired
    private WindTaskDefService windTaskDefService;
    @Autowired
    private WindTaskRecordMapper windTaskRecordMapper;
    @Autowired
    private WindBlockRecordMapper windBlockRecordMapper;
    @Autowired
    private DataPermissionManager dataPermissionManager;
    @Autowired
    private PropConfig propConfig;
    @Autowired
    private WorkSiteMapper workSiteMapper;
    @Autowired
    private UserMapper userMapper;
    @Autowired
    private WindTaskDefHistoryMapper windTaskDefHistoryMapper;

    @ApiOperation(value="\u4efb\u52a1\u5757\u5b9a\u4e49")
    @GetMapping(value={"/block"})
    @ResponseBody
    public ResultVo<Object> field(@ApiIgnore HttpSession session, @ApiIgnore HttpServletRequest request, @ApiIgnore HttpServletResponse response) {
        ArrayList result = Lists.newArrayList();
        try {
            PropConfig propConfig = (PropConfig)SpringUtil.getBean(PropConfig.class);
            List bpDefStr = Lists.newArrayList();
            Locale locale = LocaleContextHolder.getLocale();
            if (locale.toString().equals("ru") || locale.equals(Locale.GERMAN) || locale.equals(Locale.FRENCH) || locale.equals(Locale.ITALIAN) || locale.toString().equals("pl") || locale.toString().equals("th") || locale.toString().equals("hi") || locale.toString().equals("id") || locale.toString().equals("es") || locale.toString().equals("pt") || locale.equals(Locale.KOREAN) || locale.toString().equals("vi") || locale.toString().equals("sk")) {
                locale = Locale.US;
            }
            bpDefStr = locale.equals(Locale.TAIWAN) ? ResourceUtil.readFileToString((String)(propConfig.getConfigDir() + "block"), (String)(locale.toString() + ".json")) : ResourceUtil.readFileToString((String)(propConfig.getConfigDir() + "block"), (String)(locale.toString().split("_")[0] + ".json"));
            for (int i = 0; i < BpDefVo.LABELS.size(); ++i) {
                String code = (String)BpDefVo.LABELS.get(i);
                this.getBlocksVo((List)result, bpDefStr, this.localeMessageUtil.getMessage(code, locale), i);
            }
        }
        catch (Exception e) {
            log.error("get block def error", (Throwable)e);
        }
        return ResultVo.response((Object)result);
    }

    private void getBlocksVo(List<BpDefVo> result, List<String> bpDefStr, String parentLabel, int order) {
        BpDefVo vo = new BpDefVo();
        ArrayList blocks = Lists.newArrayList();
        for (String content : bpDefStr) {
            com.alibaba.fastjson.JSONObject bpDefJson = com.alibaba.fastjson.JSONObject.parseObject((String)content, (Feature[])new Feature[]{Feature.OrderedField});
            String bplabel = bpDefJson.getString("label");
            if (bplabel == null || !bplabel.equals(parentLabel)) continue;
            com.alibaba.fastjson.JSONObject bpblock = bpDefJson.getJSONObject("block");
            blocks.add(bpblock);
        }
        vo.setLabel(parentLabel);
        vo.setOrder(order);
        vo.setBlocks((List)blocks);
        result.add(vo);
    }

    @SysLog(operation="setOrder", message="@{wind.controller.setOrder}")
    @ApiOperation(value="\u8fd0\u884c\u4efb\u52a1")
    @PostMapping(value={"/set-order"})
    @ResponseBody
    public ResultVo<Object> setOrder(@RequestBody SetOrderReq req, @ApiIgnore HttpServletResponse response) throws IOException {
        log.info("AgvWindController setOrder params = {}", (Object)req);
        ResultVo resultVo = this.agvApiService.asyncSetOrder(req);
        return resultVo;
    }

    @SysLog(operation="setSingleForkOrders", message="@{wind.controller.setSingleForkOrders}")
    @ApiOperation(value="\u6279\u91cf\u8fd0\u884c\u5355\u4f53\u53c9\u8f66\u4efb\u52a1")
    @PostMapping(value={"/singleFork/set-orders"})
    @ResponseBody
    public ResultVo<Object> setSingleForkOrders(@RequestBody List<SetOrderReq> reqList, @ApiIgnore HttpServletResponse response) throws IOException {
        log.info("AgvWindController setSingleForkOrders params = {}", reqList);
        String info = GeneralBusinessSchedule.info;
        if (StringUtils.isEmpty((CharSequence)info)) {
            return ResultVo.error((CommonCodeEnum)CommonCodeEnum.ROBOT_STATUS_SYC_EXCEPTION);
        }
        com.alibaba.fastjson.JSONObject infoObject = com.alibaba.fastjson.JSONObject.parseObject((String)info);
        JSONArray features = infoObject.getJSONArray("features");
        boolean flag = true;
        for (int i = 0; i < features.size(); ++i) {
            if (!StringUtils.equals((CharSequence)features.getJSONObject(i).getString("name"), (CharSequence)"rds_forkApp") || !features.getJSONObject(i).getBoolean("active").booleanValue()) continue;
            flag = false;
            break;
        }
        if (flag) {
            return ResultVo.error((int)CommonCodeEnum.OAUTH_INVALID.getCode(), (String)CommonCodeEnum.OAUTH_INVALID.getMsg(), null);
        }
        for (SetOrderReq req : reqList) {
            Long fromCount;
            String inputParams = req.getInputParams();
            if (req.getTaskLabel().equals("SingleForkScene_dispatch") || req.getTaskLabel().equals("SingleForkScene_charge")) continue;
            JSONObject jsonObject = new JSONObject(inputParams);
            String from = "";
            if (jsonObject.has("from") && (fromCount = Long.valueOf(this.workSiteService.findCountBySiteIdAndLockedAndFilled(from = jsonObject.getString("from"), Integer.valueOf(0), Integer.valueOf(1)))) == 0L) {
                return ResultVo.error((int)9000, (String)("The " + from + " does not meet the conditions to initiate a task, please check and reissue the task"), null);
            }
            String to = jsonObject.getString("to");
            Long toCount = this.workSiteService.findCountBySiteIdAndLockedAndFilled(to, Integer.valueOf(0), Integer.valueOf(0));
            if (toCount != 0L) continue;
            return ResultVo.error((int)9000, (String)("The " + to + " does not meet the conditions to initiate a task, please check and reissue the task"), null);
        }
        ResultVo resultVo = this.agvApiService.asyncSetOrders(reqList);
        return resultVo;
    }

    @SysLog(operation="ifEnablePeriodicTask", message="@{wind.controller.ifEnablePeriodicTask}")
    @ApiOperation(value="\u542f\u7528\u6216\u7981\u7528\u5468\u671f\u4efb\u52a1")
    @PostMapping(value={"/IFEnablePeriodicTask"})
    @ResponseBody
    public ResultVo<Object> enablePeriodicTask(@RequestBody EnablePeriodicTasReq req, @ApiIgnore HttpServletResponse response) throws IOException {
        log.info("AgvWindController setOrder params = {}", (Object)req);
        this.windTaskDefService.enablePeriodicTask(req);
        return ResultVo.success();
    }

    @ApiOperation(value="\u67e5\u627e\u5bf9\u5e94\u7684\u4efb\u52a1\u5b9a\u4e49")
    @PostMapping(value={"/findTaskDef"})
    @ResponseBody
    public ResultVo<Object> findOneTaskDef(@RequestBody taskListAndVersionReq taskListAndVersionReq2, @ApiIgnore HttpServletResponse response) throws IOException {
        log.info("findTaskDefAll id = {}", (Object)taskListAndVersionReq2);
        return ResultVo.response((Object)this.windTaskDefHistoryMapper.findByLabelAndVersion(taskListAndVersionReq2.getDefLabel(), taskListAndVersionReq2.getVersion()));
    }

    @SysLog(operation="stop-task", message="@{wind.controller.stopTask}")
    @ApiOperation(value="\u64a4\u9500/\u7ec8\u6b62\u4efb\u52a1\uff0c\u5bf9\u5916\u4f7f\u7528\u63a5\u53e3")
    @PostMapping(value={"/stop-task"})
    @ResponseBody
    public ResultVo<Object> stop(@ApiIgnore HttpServletRequest request, @ApiIgnore HttpServletResponse response, @RequestBody StopTaskReq req) throws Exception {
        log.info("Prepare to terminate the mission.");
        String taskRecordId = req.getTaskRecordId();
        String taskLabel = req.getTaskLabel();
        int releaseSite = req.getReleaseSite();
        if (null == taskRecordId && null == taskLabel) {
            return ResultVo.error((int)9000, (String)"taskRecordId and taskLabel cannot both be null.", null);
        }
        if (releaseSite != 1 && releaseSite != 0) {
            return ResultVo.error((CommonCodeEnum)CommonCodeEnum.REQUIRED_0OR1_ERROR);
        }
        log.info("stop task params taskRecordId = {}, taskLabel = {}, releaseSite = {}", new Object[]{taskRecordId, taskLabel, releaseSite});
        if (null != taskRecordId) {
            String taskId = this.windTaskService.getDefIdById(taskRecordId);
            if (null == taskId) {
                return ResultVo.error((int)9000, (String)("Incorrect taskRecordId: " + taskRecordId), null);
            }
            StopAllTaskReq.StopTask task = new StopAllTaskReq.StopTask(taskId, taskRecordId);
            ArrayList stopList = Lists.newArrayList((Object[])new StopAllTaskReq.StopTask[]{task});
            this.windService.stopAllTask((List)stopList);
            if (1 == releaseSite) {
                List siteIds = this.workSiteService.findSiteIdsByLockedBy(taskRecordId);
                this.workSiteService.updateSiteUnlockedByLockedBy(taskRecordId);
                WokSiteLogUtil.saveLog((HttpServletRequest)request, (List)siteIds, (int)SiteOperationEnum.UNLOCK.getStatus(), (String)"Terminate Task From Public Interface.");
            }
            if (taskRecordId.startsWith("pager-start-")) {
                String label = this.windTaskService.findLabelById(taskRecordId);
                PagerUtil.resetPagerValue((String)label, (String)taskRecordId);
            }
        } else {
            List records = this.windTaskService.getIdAndDefIdByDefLabel(taskLabel);
            if (CollectionUtils.isEmpty((Collection)records)) {
                return ResultVo.error((int)9000, (String)("No running " + taskLabel + " tasks"), null);
            }
            List stopList = records.stream().map(r -> new StopAllTaskReq.StopTask(r.getDefId(), r.getId())).collect(Collectors.toList());
            List taskRecordIds = records.stream().map(BaseRecord::getId).collect(Collectors.toList());
            this.windService.stopAllTask(stopList);
            if (1 == releaseSite) {
                List siteIds = this.workSiteService.findSiteIdsInLockedBy(taskRecordIds);
                this.workSiteService.updateSiteUnlockedInLockedBy(taskRecordIds);
                WokSiteLogUtil.saveLog((HttpServletRequest)request, (List)siteIds, (int)SiteOperationEnum.UNLOCK.getStatus(), (String)"Terminate Task From Public Interface.");
            }
            for (WindTaskRecord record : records) {
                String id = record.getId();
                if (!id.startsWith("pager-start-")) continue;
                String label = this.windTaskService.findLabelById(id);
                PagerUtil.resetPagerValue((String)label, (String)id);
            }
        }
        return ResultVo.response(null);
    }

    @SysLog(operation="suspend-task", message="@{wind.controller.pauseTask}")
    @ApiOperation(value="\u6682\u505c\u4efb\u52a1")
    @GetMapping(value={"/suspend-task/{taskId}/{taskRecordId}"})
    @ResponseBody
    public ResultVo<Object> suspend(@PathVariable String taskId, @PathVariable String taskRecordId, @ApiIgnore HttpServletResponse response) throws IOException {
        try {
            log.info("\u6682\u505c\u4efb\u52a1 taskId = {}, taskRecordId = {}", (Object)taskId, (Object)taskRecordId);
            ResultVo resultVo = this.windService.suspendTask(taskId, taskRecordId);
        }
        catch (Exception e) {
            log.error("Suspend Task Exception", (Throwable)e);
        }
        return ResultVo.response(null);
    }

    @SysLog(operation="start-task", message="@{user.controller.startTask}")
    @ApiOperation(value="\u5f00\u542f\u6682\u505c\u4efb\u52a1")
    @GetMapping(value={"/start-task/{taskId}/{taskRecordId}"})
    @ResponseBody
    public ResultVo<Object> startSuspendTask(@PathVariable String taskId, @PathVariable String taskRecordId, @ApiIgnore HttpServletResponse response) throws IOException {
        try {
            log.info("\u6062\u590d\u6682\u505c\u7684\u4efb\u52a1, taskId = {}, taskRecordId = {}", (Object)taskId, (Object)taskRecordId);
            ResultVo resultVo = this.windService.startSuspendTask(taskId, taskRecordId);
        }
        catch (Exception e) {
            log.error("Start Task", (Throwable)e);
        }
        return ResultVo.response(null);
    }

    @SysLog(operation="restart-task", message="@{user.controller.restartTask}")
    @ApiOperation(value="\u6062\u590d\u4efb\u52a1")
    @GetMapping(value={"/restart-task/{taskId}/{taskRecordId}"})
    @ResponseBody
    public ResultVo<Object> restartTask(@PathVariable String taskId, @PathVariable String taskRecordId, @ApiIgnore HttpServletResponse response) throws IOException {
        try {
            log.info("restartTask, taskId = {}, taskRecordId = {}", (Object)taskId, (Object)taskRecordId);
            ResultVo resultVo = this.windService.interruptAndReloadTask(taskId, taskRecordId);
        }
        catch (Exception e) {
            log.error("restartTask Exception", (Throwable)e);
        }
        return ResultVo.success();
    }

    @SysLog(operation="/stop-all-task", message="@{wind.controller.stopAllTask}")
    @ApiOperation(value="\u6279\u91cf\u7ec8\u6b62\u4efb\u52a1")
    @PostMapping(value={"/stop-all-task"})
    @ResponseBody
    public ResultVo<Object> stopAll(@ApiIgnore HttpServletRequest request, @ApiIgnore HttpServletResponse response, @RequestBody BatchStopTaskReq req) {
        List collect;
        log.info("Prepare to terminate the task");
        int releaseSite = req.getReleaseSite();
        List stopTaskList = req.getStopTaskList();
        List taskRecordIds = CollectionUtils.isNotEmpty((Collection)stopTaskList) ? this.windService.stopAllTask(stopTaskList) : this.windService.stopAllTask(null);
        log.info("stopAll task params taskRecordIds = {} releaseSite = {}", (Object)taskRecordIds, (Object)releaseSite);
        if (1 == releaseSite) {
            List siteIds = this.workSiteService.findSiteIdsInLockedBy(taskRecordIds);
            this.workSiteService.updateSiteUnlockedInLockedBy(taskRecordIds);
            WokSiteLogUtil.saveLog((HttpServletRequest)request, (List)siteIds, (int)SiteOperationEnum.UNLOCK.getStatus(), (String)"Page Task Records, Button Terminate Task.");
        }
        if (CollectionUtils.isNotEmpty(collect = taskRecordIds.stream().filter(record -> record.startsWith("pager-start-")).collect(Collectors.toList()))) {
            List labels = this.windTaskService.findIdLabelByIdIn(collect);
            for (WindTaskRecord record2 : labels) {
                PagerUtil.resetPagerValue((String)record2.getDefLabel(), (String)record2.getId());
            }
        }
        return ResultVo.response(null);
    }

    @ApiOperation(value="\u6279\u91cf\u7ec8\u6b62\u4efb\u52a1")
    @PostMapping(value={"/singleFork/stop-all-task"})
    @ResponseBody
    public ResultVo<Object> stopSingleForkAll(@ApiIgnore HttpServletRequest request, @ApiIgnore HttpServletResponse response, @RequestBody BatchStopTaskReq req) {
        return this.stopAll(request, response, req);
    }

    @SysLog(operation="/manual-end", message="@{wind.controller.manualEnd}")
    @ApiOperation(value="\u4eba\u5de5\u5b8c\u6210")
    @PostMapping(value={"/manual-end"})
    @ResponseBody
    public ResultVo<Object> manualEnd(@ApiIgnore HttpServletRequest request, @ApiIgnore HttpServletResponse response, @RequestBody BatchStopTaskReq req) {
        int releaseSite = req.getReleaseSite();
        List stopTaskList = req.getStopTaskList();
        List taskRecordIds = CollectionUtils.isNotEmpty((Collection)stopTaskList) ? this.windService.manualEndTask(stopTaskList) : this.windService.manualEndTask(null);
        log.info("stopAll task params taskRecordIds = {} releaseSite = {}", (Object)taskRecordIds, (Object)releaseSite);
        if (1 == releaseSite) {
            List siteIds = this.workSiteService.findSiteIdsInLockedBy(taskRecordIds);
            this.workSiteService.updateSiteUnlockedInLockedBy(taskRecordIds);
            WokSiteLogUtil.saveLog((HttpServletRequest)request, (List)siteIds, (int)SiteOperationEnum.UNLOCK.getStatus(), (String)"Page Task Records, Button Manual End.");
        }
        return ResultVo.response(null);
    }

    @SysLog(operation="/delete-all-task", message="@{wind.controller.deleteAllTask}")
    @ApiOperation(value="\u5220\u9664\u5168\u90e8\u4efb\u52a1")
    @GetMapping(value={"/delete-all-task"})
    @ResponseBody
    public ResultVo<Object> deleteAll(@ApiIgnore HttpServletResponse response) throws IOException {
        try {
            this.windService.deleteAllTask();
        }
        catch (Exception e) {
            log.error("DeleteAll task exception", (Throwable)e);
        }
        return ResultVo.response(null);
    }

    @SysLog(operation="/delete-task", message="@{wind.controller.deleteTaskById}")
    @PostMapping(value={"/delete-task"})
    @ResponseBody
    public ResultVo<Object> deleteTask(@RequestBody List<String> taskIds) {
        log.info("deleteTask params {}", taskIds);
        int num = 0;
        try {
            num = this.windService.deleteTaskByIds(taskIds);
        }
        catch (Exception e) {
            log.info("deleteTask error {}", (Throwable)e);
            return ResultVo.error();
        }
        return ResultVo.response((Object)num);
    }

    @PostMapping(value={"/singleFork/delete-task"})
    @ResponseBody
    public ResultVo<Object> deleteSingleForkTask(@RequestBody List<String> taskIds) {
        return this.deleteTask(taskIds);
    }

    @SysLog(operation="create-task", message="@{wind.controller.createTask}")
    @ApiOperation(value="\u4fdd\u5b58/\u66f4\u65b0\u4efb\u52a1")
    @PostMapping(value={"/create-task"})
    @ResponseBody
    public ResultVo<Object> createTask(@RequestBody WindTaskDef def, @ApiIgnore HttpServletResponse response) throws IOException {
        try {
            if (this.windService.findWindTaskDefByLabel(def.getLabel()).size() != 0) {
                throw new RuntimeException(CommonCodeEnum.WIND_LABEL_ERROR.getMsg());
            }
            Integer maxVersion = this.windTaskDefHistoryMapper.findMaxVersion(def.getLabel());
            if (maxVersion != null) {
                def.setVersion(Integer.valueOf(maxVersion + 1));
            }
            def.setCreateDate(new Date());
            if (def.getVersion() == null) {
                def.setVersion(Integer.valueOf(1));
            }
            def.setTemplateName("userTemplate");
            if (StringUtils.isEmpty((CharSequence)def.getId())) {
                def.setId(UUID.randomUUID().toString());
            }
            if (def.getIfEnable() == null) {
                def.setIfEnable(Integer.valueOf(0));
            }
            if (def.getPeriodicTask() == null) {
                def.setPeriodicTask(Integer.valueOf(0));
            }
            if (def.getDelay() == null) {
                def.setDelay(Long.valueOf(1000L));
            }
            if (def.getPeriod() == null) {
                def.setPeriod(Long.valueOf(3000L));
            }
            def.setCreateDate(new Date());
            if (def.getWindcategoryId() == null) {
                def.setWindcategoryId(Long.valueOf(0L));
            }
            def.setIfEnable(Integer.valueOf(0));
            this.windService.saveTask(def);
            WindTaskDefHistory windTaskDefHistory = WindTaskDefHistory.builder().createDate(new Date()).label(def.getLabel()).detail(def.getDetail()).version(def.getVersion()).build();
            try {
                this.windTaskDefHistoryMapper.save((Object)windTaskDefHistory);
            }
            catch (Exception e) {
                log.error(e.getMessage());
            }
            String task = JSON.toJSONString((Object)def, (SerializeConfig)WindTaskService.config, (SerializerFeature[])new SerializerFeature[0]);
            FileUtils.writeStringToFile((File)new File(this.propConfig.getRdsHistoryDir() + "task", def.getLabel() + "-" + Instant.now().toEpochMilli() + ".task"), (String)task, (Charset)Charset.forName("UTF-8"));
            return ResultVo.success();
        }
        catch (Exception e) {
            log.error("createTask error", (Throwable)e);
            return ResultVo.error((int)CommonCodeEnum.WIND_LABEL_ERROR.getCode(), (String)CommonCodeEnum.WIND_LABEL_ERROR.getMsg(), null);
        }
    }

    @ApiOperation(value="\u67e5\u8be2\u4efb\u52a1\u8fd0\u884c\u8bb0\u5f55")
    @PostMapping(value={"/queryTaskRecord"})
    @ResponseBody
    public ResultVo<Object> queryTaskRecord(@RequestBody PaginationReq<QueryTaskRecordReq> paginationReq) throws Exception {
        try {
            Locale locale = LocaleContextHolder.getLocale();
            PaginationResponseVo taskRecordByConditionPage = this.windTaskService.findByConditionPage((QueryTaskRecordReq)paginationReq.getQueryParam(), Integer.valueOf(paginationReq.getCurrentPage()), Integer.valueOf(paginationReq.getPageSize()), locale, true);
            return ResultVo.response((Object)taskRecordByConditionPage);
        }
        catch (DataIntegrityViolationException e) {
            log.error("queryTaskRecord error", (Throwable)e);
            return ResultVo.error((int)CommonCodeEnum.WIND_QUERY_ERROR.getCode(), (String)CommonCodeEnum.WIND_QUERY_ERROR.getMsg(), null);
        }
    }

    @ApiOperation(value="\u53c9\u8f66\u5e94\u7528\u67e5\u8be2\u4efb\u52a1\u8fd0\u884c\u8bb0\u5f55")
    @PostMapping(value={"/singleFork/queryTaskRecord"})
    @ResponseBody
    public ResultVo<Object> singleForkQueryTaskRecord(@RequestBody PaginationReq<QueryTaskRecordReq> paginationReq) throws Exception {
        return this.queryTaskRecord(paginationReq);
    }

    @SysLog(operation="taskRecordExport", message="@{wind.controller.taskRecordExport}")
    @ApiOperation(value="\u5bfc\u51fa\u4efb\u52a1\u5b9e\u4f8b")
    @RequestMapping(value={"/taskRecordExport"})
    @ResponseBody
    public void taskRecordExport(@RequestHeader(value="language", required=false) String language, @RequestParam(name="taskId", required=false) String taskId, @RequestParam(name="defLabel", required=false) String defLabel, @RequestParam(name="taskRecordId", required=false) String taskRecordId, @RequestParam(name="status", required=false) Integer status, @RequestParam(name="agvId", required=false) String agvId, @RequestParam(name="startDate", required=false) String startDate, @RequestParam(name="endDate", required=false) String endDate, @RequestParam(name="ifPeriodTask", required=false) Integer ifPeriodTask, @RequestParam(name="outOrderNo", required=false) String outOrderNo, @RequestParam(name="ifParentOrChildOrAll", required=false) Integer ifParentOrChildOrAll, @RequestParam(name="isOrderDesc", required=false) Boolean isOrderDesc, @RequestParam(name="stateDescription", required=false) String stateDescription, @RequestParam(name="agvIdList", required=false) List<String> agvIdList, @ApiIgnore HttpServletResponse response) throws Exception {
        long starta = System.currentTimeMillis();
        Locale locale = LocaleContextHolder.getLocale();
        QueryTaskRecordReq req = new QueryTaskRecordReq();
        req.setAgvId(agvId);
        req.setTaskId(taskId);
        req.setTaskRecordId(taskRecordId);
        req.setTaskLabel(defLabel);
        req.setStatus(status);
        req.setStartDate(startDate);
        req.setEndDate(endDate);
        req.setIsOrderDesc(isOrderDesc);
        req.setIfPeriodTask(ifPeriodTask);
        req.setOutOrderNo(outOrderNo);
        req.setIfParentOrChildOrAll(ifParentOrChildOrAll);
        req.setStateDescription(stateDescription);
        req.setAgvIdList(agvIdList);
        long start = System.currentTimeMillis();
        List authorizedTasks = this.dataPermissionManager.getAuthorizedGetTasks();
        Long countByCondition = this.windTaskService.findCountByCondition(req, authorizedTasks);
        long end = System.currentTimeMillis();
        log.info(String.format("Total all count Time\uff1a%d ms", end - start));
        if (countByCondition > 30000L) {
            throw new RuntimeException(this.localeMessageUtil.getMessageMatch("@{response.code.ExportLimit30000Error}", LocaleContextHolder.getLocale()));
        }
        List records = this.windTaskService.findByCondition(req, true);
        List collect = records.stream().map(taskRecord -> {
            WindTaskRecordImportVo vo = WindTaskRecordImportVo.builder().defLabel(taskRecord.getDefLabel()).agvId(taskRecord.getAgvId()).status((Object)(taskRecord.getStatus() == null ? "" : this.localeMessageUtil.getMessageMatch(TaskStatusEnum.getTaskStatusEnum((int)taskRecord.getStatus()).getDesc(), locale))).id(taskRecord.getId()).createdOn(taskRecord.getCreatedOn() != null ? DateFormatUtils.format((Date)taskRecord.getCreatedOn(), (String)"yyyy-MM-dd HH:mm:ss") : "").endedOn(taskRecord.getEndedOn() != null ? DateFormatUtils.format((Date)taskRecord.getEndedOn(), (String)"yyyy-MM-dd HH:mm:ss") : "").firstExecutorTime(taskRecord.getFirstExecutorTime() != null ? DateFormatUtils.format((Date)taskRecord.getFirstExecutorTime(), (String)"yyyy-MM-dd HH:mm:ss") : "").stateDescription(taskRecord.getStateDescription()).executorTime(Integer.valueOf(taskRecord.getExecutorTime() != null ? taskRecord.getExecutorTime() : 0)).endedReason(taskRecord.getEndedReason() == null ? "" : this.localeMessageUtil.getMessageMatch(taskRecord.getEndedReason(), locale)).path(taskRecord.getPath() == null ? "" : this.localeMessageUtil.getMessageMatch(taskRecord.getPath(), locale)).defVersion(taskRecord.getDefVersion()).outOrderNo(taskRecord.getOutOrderNo()).callWorkType(taskRecord.getCallWorkType()).callWorkStation(taskRecord.getCallWorkStation()).build();
            return vo;
        }).collect(Collectors.toList());
        List excelExportEntityList = this.windTaskService.getExcelExportEntityList();
        start = System.currentTimeMillis();
        ExcelUtil.exportBigExcel(collect, (String)"wind_task_record", (String)"wind_task_record", (List)excelExportEntityList, (String)"wind_task_record.xlsx", (HttpServletResponse)response);
        end = System.currentTimeMillis();
        log.info(String.format("Total all excel Time\uff1a%d ms", end - start));
        log.info(String.format("Total all  Time\uff1a%d ms", end - starta));
    }

    @ApiOperation(value="\u83b7\u53d6core\u673a\u5668\u4eba\u8fd0\u5355\u4fe1\u606f")
    @RequestMapping(value={"/getCoreRobotOrderInfo"})
    @ResponseBody
    public String getCoreRobotOrderInfo(@RequestParam(value="url") String url) {
        String result = null;
        try {
            String rdsCoreBaseUrl = PropConfig.getRdsCoreBaseUrl();
            if (!url.startsWith(rdsCoreBaseUrl)) {
                return null;
            }
            result = OkHttpUtil.get((String)url);
        }
        catch (Exception e) {
            log.error("getCoreRobotOrderInfo error", (Throwable)e);
        }
        return result;
    }

    @ApiOperation(value="\u83b7\u53d6core\u673a\u5668\u4eba\u8fd0\u5355\u4fe1\u606f(\u652f\u6301\u591a\u72b6\u6001)")
    @RequestMapping(value={"/getCoreRobotOrders"})
    @ResponseBody
    public String getCoreRobotOrders(@RequestBody Map<String, Object> param) {
        String result = null;
        try {
            String url = (String)param.get("url");
            String rdsCoreBaseUrl = PropConfig.getRdsCoreBaseUrl();
            if (!url.startsWith(rdsCoreBaseUrl)) {
                return null;
            }
            result = OkHttpUtil.get((String)url);
        }
        catch (Exception e) {
            log.error("getCoreRobotOrders error", (Throwable)e);
        }
        return result;
    }

    @ApiOperation(value="\u83b7\u53d6core\u6388\u6743\u4fe1\u606f")
    @RequestMapping(value={"/getCoreLicInfo"})
    @ResponseBody
    public String getLicInfo() {
        String result = null;
        try {
            result = OkHttpUtil.get((String)(PropConfig.getRdsCoreBaseUrl() + ApiEnum.licInfo.getUri()));
        }
        catch (Exception e) {
            log.error("getLicInfo error", (Throwable)e);
        }
        return result;
    }

    @SysLog(operation="terminateAndIsExec", message="@{wind.controller.terminateAndIsExec}")
    @ApiOperation(value="\u7ec8\u6b62/\u7ec8\u6b62\u5e76\u4e0d\u63a5\u5355")
    @RequestMapping(value={"/terminateAndIsExec/{agvArray}/{disable}"})
    @ResponseBody
    public ResultVo terminateAndIsExec(@PathVariable String agvArray, @PathVariable Boolean disable) {
        log.info("terminateAndIsExec agvArray={} ,disable={}", (Object)agvArray, (Object)disable);
        String result = null;
        try {
            String[] split = agvArray.split(",");
            result = this.agvApiService.terminateAndIsExec(Arrays.asList(split), disable);
        }
        catch (Exception e) {
            log.error("terminateAndIsExec error", (Throwable)e);
        }
        return ResultVo.response(result);
    }

    @SysLog(operation="terminateAndUnlockSites", message="@{wind.controller.terminateAndIsExec}")
    @ApiOperation(value="\u7ec8\u6b62\u8fd0\u5355\u5e76\u6839\u636e\u5916\u90e8\u8fd0\u5355\u53f7\u89e3\u9501\u5173\u8054\u5e93\u4f4d")
    @RequestMapping(value={"/terminateAndUnlockSites"})
    @ResponseBody
    public ResultVo terminateAndIsExec(@RequestBody TerminateAndIsExecReq req) {
        String agvArray = req.getAgvArray();
        String taskRecordArray = req.getTaskRecordArray();
        Boolean disable = req.getDisable();
        Boolean isUnlockSite = req.getIsUnlockSite();
        log.info("terminateAndUnlockSites agvArray={} ,disable={}", (Object)agvArray, (Object)disable);
        String result = null;
        try {
            String[] split = agvArray.split(",");
            result = this.agvApiService.terminateAndIsExec(Arrays.asList(split), disable);
            if (taskRecordArray != null && !taskRecordArray.isEmpty() && isUnlockSite.booleanValue()) {
                String[] taskRecordStrList = taskRecordArray.split(",");
                List<String> taskRecordList = Arrays.asList(taskRecordStrList);
                List siteIdsInLockedByTaskRecordList = this.workSiteService.findSiteIdsInLockedBy(taskRecordList);
                this.workSiteService.updateSiteUnlockedInLockedBy(taskRecordList);
                log.info("stopAll task params taskRecordIds = {} releaseSite = {}", taskRecordList, (Object)siteIdsInLockedByTaskRecordList);
            }
        }
        catch (Exception e) {
            log.error("terminateAndIsExec error", (Throwable)e);
        }
        return ResultVo.response(result);
    }

    @SysLog(operation="markComplete", message="@{wind.controller.markComplete}")
    @ApiOperation(value="\u6279\u91cf\u5c01\u53e3")
    @RequestMapping(value={"/markComplete/{orderIdArray}"})
    @ResponseBody
    public ResultVo markComplete(@PathVariable String orderIdArray) {
        log.info("markComplete orderIdArray={}", (Object)orderIdArray);
        try {
            String[] orderIds;
            for (String orderId : orderIds = orderIdArray.split(",")) {
                com.alibaba.fastjson.JSONObject param = new com.alibaba.fastjson.JSONObject();
                param.put("id", (Object)orderId);
                OkHttpUtil.postJsonParams((String)RootBp.getUrl((String)ApiEnum.markComplete.getUri()), (String)param.toJSONString());
            }
        }
        catch (Exception e) {
            log.error("markComplete error", (Throwable)e);
        }
        return ResultVo.success();
    }

    @SysLog(operation="deleteAllOrders", message="@{wind.controller.deleteAllOrders}")
    @ApiOperation(value="\u5220\u9664\u5168\u90e8\u8fd0\u5355")
    @RequestMapping(value={"/deleteAllOrders"})
    @ResponseBody
    public ResultVo<Object> deleteAllOrders() {
        log.info("deleteAllOrders");
        try {
            OkHttpUtil.postJsonParams((String)RootBp.getUrl((String)ApiEnum.deleteAllOrders.getUri()), (String)"");
        }
        catch (Exception e) {
            log.error("deleteAllOrders error", (Throwable)e);
        }
        return ResultVo.success();
    }

    /*
     * WARNING - Removed try catching itself - possible behaviour change.
     */
    @ApiOperation(value="\u83b7\u53d6\u9875\u9762icon")
    @RequestMapping(value={"/icon/{img}"})
    @ResponseBody
    public void getIcon(@PathVariable String img, HttpServletResponse response) {
        PropConfig propConfig = (PropConfig)SpringUtil.getBean(PropConfig.class);
        if (PropConfig.isRdsIconDisplay()) {
            String folderPath = propConfig.getRdsScriptDir() + "img" + File.separator;
            String filename = FileUploadUtil.getFileNameByPrefix((String)folderPath, (String)img);
            if (StringUtils.isEmpty((CharSequence)filename)) {
                return;
            }
            File imgFile = new File(folderPath + filename);
            byte[] buffer = new byte[1024];
            FileInputStream fis = null;
            BufferedInputStream bis = null;
            OutputStream os = null;
            try {
                fis = new FileInputStream(imgFile);
                bis = new BufferedInputStream(fis);
                os = response.getOutputStream();
                int len = 0;
                while ((len = bis.read(buffer)) != -1) {
                    os.write(buffer, 0, len);
                }
            }
            catch (Exception e) {
                log.error("getIcon Exception", (Throwable)e);
            }
            finally {
                if (fis != null) {
                    try {
                        fis.close();
                    }
                    catch (IOException iOException) {}
                }
                if (bis != null) {
                    try {
                        bis.close();
                    }
                    catch (IOException iOException) {}
                }
                if (os != null) {
                    try {
                        os.close();
                    }
                    catch (IOException iOException) {}
                }
            }
        }
    }

    /*
     * Exception decompiling
     */
    @RequestMapping(value={"/getExtUiByFileName/{filename}"})
    @ResponseBody
    public ResponseEntity<byte[]> getExtUi(@PathVariable String filename, HttpServletResponse response) {
        /*
         * This method has failed to decompile.  When submitting a bug report, please provide this stack trace, and (if you hold appropriate legal rights) the relevant class file.
         * 
         * org.benf.cfr.reader.util.ConfusedCFRException: Started 3 blocks at once
         *     at org.benf.cfr.reader.bytecode.analysis.opgraph.Op04StructuredStatement.getStartingBlocks(Op04StructuredStatement.java:412)
         *     at org.benf.cfr.reader.bytecode.analysis.opgraph.Op04StructuredStatement.buildNestedBlocks(Op04StructuredStatement.java:487)
         *     at org.benf.cfr.reader.bytecode.analysis.opgraph.Op03SimpleStatement.createInitialStructuredBlock(Op03SimpleStatement.java:736)
         *     at org.benf.cfr.reader.bytecode.CodeAnalyser.getAnalysisInner(CodeAnalyser.java:850)
         *     at org.benf.cfr.reader.bytecode.CodeAnalyser.getAnalysisOrWrapFail(CodeAnalyser.java:278)
         *     at org.benf.cfr.reader.bytecode.CodeAnalyser.getAnalysis(CodeAnalyser.java:201)
         *     at org.benf.cfr.reader.entities.attributes.AttributeCode.analyse(AttributeCode.java:94)
         *     at org.benf.cfr.reader.entities.Method.analyse(Method.java:531)
         *     at org.benf.cfr.reader.entities.ClassFile.analyseMid(ClassFile.java:1055)
         *     at org.benf.cfr.reader.entities.ClassFile.analyseTop(ClassFile.java:942)
         *     at org.benf.cfr.reader.Driver.doJarVersionTypes(Driver.java:257)
         *     at org.benf.cfr.reader.Driver.doJar(Driver.java:139)
         *     at org.benf.cfr.reader.CfrDriverImpl.analyse(CfrDriverImpl.java:76)
         *     at org.benf.cfr.reader.Main.main(Main.java:54)
         */
        throw new IllegalStateException("Decompilation failed");
    }

    /*
     * WARNING - Removed try catching itself - possible behaviour change.
     */
    @ApiOperation(value="\u83b7\u53d6\u9875\u9762icon")
    @RequestMapping(value={"/background/{img}"})
    @ResponseBody
    public void getBackground(@PathVariable String img, HttpServletResponse response) {
        PropConfig propConfig = (PropConfig)SpringUtil.getBean(PropConfig.class);
        String folderPath = propConfig.getRdsScriptDir() + "img" + File.separator;
        String filename = FileUploadUtil.getFileNameByPrefix((String)folderPath, (String)img);
        if (StringUtils.isEmpty((CharSequence)filename)) {
            return;
        }
        File imgFile = new File(folderPath + filename);
        byte[] buffer = new byte[1024];
        FileInputStream fis = null;
        BufferedInputStream bis = null;
        OutputStream os = null;
        try {
            fis = new FileInputStream(imgFile);
            bis = new BufferedInputStream(fis);
            os = response.getOutputStream();
            int len = 0;
            while ((len = bis.read(buffer)) != -1) {
                os.write(buffer, 0, len);
            }
        }
        catch (Exception e) {
            log.error("getBackground Exception", (Throwable)e);
        }
        finally {
            if (fis != null) {
                try {
                    fis.close();
                }
                catch (IOException e) {}
            }
            if (bis != null) {
                try {
                    bis.close();
                }
                catch (IOException e) {
                    log.error("getBackground IOException", (Throwable)e);
                }
            }
            if (os != null) {
                try {
                    os.close();
                }
                catch (IOException e) {
                    log.error("getBackground IOException", (Throwable)e);
                }
            }
        }
    }

    @ApiOperation(value="post\u8f6c\u53d1\u63a5\u53e3")
    @PostMapping(value={"/postForwarding"})
    @ResponseBody
    public String postForwarding(@RequestParam(value="url") String url, @RequestBody Object request) {
        log.info("postForwarding url:{}, request:{}", (Object)url, (Object)com.alibaba.fastjson.JSONObject.toJSONString((Object)request));
        String result = null;
        try {
            String rdsCoreBaseUrl = PropConfig.getRdsCoreBaseUrl();
            if (!url.startsWith(rdsCoreBaseUrl)) {
                return null;
            }
            result = OkHttpUtil.postJsonParams((String)url, (String)com.alibaba.fastjson.JSONObject.toJSONString((Object)request));
        }
        catch (Exception e) {
            log.error("postForwarding error", (Throwable)e);
        }
        log.info("postForwarding url:{}, result:{}", (Object)url, (Object)result);
        return result;
    }

    @ApiOperation(value="\u67e5\u8be2\u5929\u98ce\u4efb\u52a1\u5b9e\u4f8b")
    @PostMapping(value={"/queryWindTask"})
    @ResponseBody
    public ResultVo queryWindTask(@RequestBody PaginationReq<QueryTaskRecordReq> paginationReq) throws Exception {
        int pageSize = paginationReq.getPageSize();
        if (pageSize > 500 || pageSize < 1) {
            throw new RuntimeException("The pageSize field takes values in the range of 1-500.");
        }
        if (paginationReq.getCurrentPage() < 0) {
            throw new RuntimeException("The currentPage field takes values must be greater than 0 .");
        }
        if (paginationReq.getCurrentPage() == 0) {
            paginationReq.setCurrentPage(1);
        }
        if (StringUtils.isNotEmpty((CharSequence)((QueryTaskRecordReq)paginationReq.getQueryParam()).getDefLabel())) {
            ((QueryTaskRecordReq)paginationReq.getQueryParam()).setTaskLabel(((QueryTaskRecordReq)paginationReq.getQueryParam()).getDefLabel());
        }
        Locale locale = LocaleContextHolder.getLocale();
        PaginationResponseVo result = this.windTaskService.findByConditionPage((QueryTaskRecordReq)paginationReq.getQueryParam(), Integer.valueOf(paginationReq.getCurrentPage()), Integer.valueOf(pageSize), locale, false);
        List windTaskRecords = JSONArray.parseArray((String)com.alibaba.fastjson.JSONObject.toJSONString((Object)result.getPageList()), WindTaskRecord.class);
        result.setPageList(this.windTaskService.transformationWindTaskRecord(windTaskRecords, locale));
        return ResultVo.response((Object)result);
    }

    @ApiOperation(value="\u6839\u636eID\u67e5\u8be2\u5929\u98ce\u4efb\u52a1")
    @PostMapping(value={"/queryTaskDefById"})
    @ResponseBody
    public ResultVo queryWindTaskById(@RequestBody QueryWindTaskDefReq req) throws Exception {
        try {
            return ResultVo.response((Object)JSON.toJSONString((Object)this.windService.findTaskDefById(req.getId()), (SerializeConfig)WindTaskService.config, (SerializerFeature[])new SerializerFeature[0]));
        }
        catch (DataIntegrityViolationException e) {
            log.error("queryWindTaskById error", (Throwable)e);
            return ResultVo.error((int)CommonCodeEnum.WIND_QUERY_ERROR.getCode(), (String)CommonCodeEnum.WIND_QUERY_ERROR.getMsg(), null);
        }
    }

    @ApiOperation(value="\u6839\u636eId\u67e5\u8be2\u4efb\u52a1\u8fd0\u884c\u8bb0\u5f55")
    @PostMapping(value={"/queryTaskRecordById"})
    @ResponseBody
    public ResultVo queryTaskRecordById(@RequestBody QueryTaskRecordReq req) throws IOException {
        try {
            return ResultVo.response((Object)JSON.toJSONString((Object)this.windService.findById(req.getTaskId()), (SerializeConfig)WindTaskService.config, (SerializerFeature[])new SerializerFeature[0]));
        }
        catch (DataIntegrityViolationException e) {
            log.error("queryTaskRecordById error", (Throwable)e);
            return ResultVo.error((int)CommonCodeEnum.WIND_QUERY_ERROR.getCode(), (String)CommonCodeEnum.WIND_QUERY_ERROR.getMsg(), null);
        }
    }

    @ApiOperation(value="\u6839\u636e\u4efb\u52a1Id\u67e5\u8be2\u4efb\u52a1\u65e5\u5fd7")
    @PostMapping(value={"/queryLogsByTaskRecordId"})
    @ResponseBody
    public ResultVo<Object> queryLogsByTaskRecordId(@RequestBody QueryWindTaskLogReq req) throws Exception {
        try {
            List windTaskLogs = this.windService.findLogByTaskRecordId(req.getTaskRecordId());
            Locale locale = LocaleContextHolder.getLocale();
            for (WindTaskLog taskLog : windTaskLogs) {
                taskLog.setMessage(this.localeMessageUtil.getMessageMatch(taskLog.getMessage(), locale));
            }
            return ResultVo.response((Object)JSON.toJSONString((Object)windTaskLogs, (SerializeConfig)WindTaskService.config, (SerializerFeature[])new SerializerFeature[0]));
        }
        catch (DataIntegrityViolationException e) {
            log.error("queryLogsByTaskRecordId error", (Throwable)e);
            return ResultVo.error((int)CommonCodeEnum.WIND_QUERY_ERROR.getCode(), (String)CommonCodeEnum.WIND_QUERY_ERROR.getMsg(), null);
        }
    }

    @ApiOperation(value="\u6839\u636e\u4efb\u52a1Id\u5206\u9875\u67e5\u8be2\u4efb\u52a1\u65e5\u5fd7")
    @PostMapping(value={"/queryLogsByTaskRecordIdPageAble"})
    @ResponseBody
    public ResultVo<Object> queryLogsByTaskRecordIdPageAble(@RequestBody PaginationReq<WindTaskLogReq> req) throws Exception {
        int currPage = req.getCurrentPage();
        int pageSize = req.getPageSize();
        WindTaskLogReq logReq = (WindTaskLogReq)req.getQueryParam();
        Page windTaskLogPage = this.windService.findLogByTaskRecordIdAndLevelIn(logReq.getTaskRecordId(), logReq.getLevels(), currPage, pageSize);
        List collect = windTaskLogPage.getContent().stream().map(w -> {
            WindTaskLogResp resp = new WindTaskLogResp();
            resp.setId(w.getId());
            resp.setLevel(w.getLevel());
            resp.setMessage(w.getMessage());
            resp.setCreateTime(w.getCreateTime().toString());
            resp.setTaskBlockId(w.getTaskBlockId());
            return resp;
        }).collect(Collectors.toList());
        Locale locale = LocaleContextHolder.getLocale();
        for (WindTaskLogResp taskLog : collect) {
            taskLog.setMessage(this.localeMessageUtil.getMessageMatch(taskLog.getMessage(), locale));
        }
        PaginationResponseVo paginationResponseVo = new PaginationResponseVo(Long.valueOf(windTaskLogPage.getTotalElements()), Integer.valueOf(currPage), Integer.valueOf(pageSize), Integer.valueOf(windTaskLogPage.getTotalPages()), collect);
        return ResultVo.response((Object)paginationResponseVo);
    }

    @ApiOperation(value="\u67e5\u8be2\u5757\u8fd0\u884c\u5217\u8868\uff0c\u5bf9\u5916\u63a5\u53e3\u4f7f\u7528")
    @PostMapping(value={"/queryBlocksByTaskId"})
    @ResponseBody
    public ResultVo queryBlocksByTaskId(@RequestBody QueryBlockRecordsAndTaskStatusReq req) throws Exception {
        Locale locale = LocaleContextHolder.getLocale();
        String taskRecordId = req.getTaskRecordId();
        Integer status = this.windTaskService.findStatusByTaskRecordId(taskRecordId);
        List blockList = this.windBlockRecordService.findByTaskRecordId(taskRecordId, locale);
        FindBlocksByTaskRecordIdVo BlocksByTaskRecordIdVo = FindBlocksByTaskRecordIdVo.builder().blockList(blockList).taskStatus(status).build();
        return ResultVo.response((Object)BlocksByTaskRecordIdVo);
    }

    @ApiOperation(value="\u6839\u636e\u4efb\u52a1Id\u67e5\u8be2\u5757\u8fd0\u884c\u5217\u8868\uff0c\u4efb\u52a1\u76d1\u63a7\u9875\u9762\u4f7f\u7528")
    @PostMapping(value={"/queryBlocksByTaskRecordId"})
    @ResponseBody
    public ResultVo<Object> queryBlocksByTaskRecordId(@RequestBody QueryBlockRecordsAndTaskStatusReq req) throws Exception {
        try {
            return ResultVo.response((Object)JSON.toJSONString((Object)this.windBlockRecordService.findBlocksByTaskRecordId(req.getTaskRecordId()), (SerializeConfig)WindTaskService.config, (SerializerFeature[])new SerializerFeature[0]));
        }
        catch (DataIntegrityViolationException e) {
            log.error("queryLogsByTaskRecordId error", (Throwable)e);
            return ResultVo.error((int)CommonCodeEnum.WIND_QUERY_ERROR.getCode(), (String)CommonCodeEnum.WIND_QUERY_ERROR.getMsg(), null);
        }
    }

    @ApiOperation(value="\u6839\u636e\u4efb\u52a1Id\u5206\u9875\u67e5\u8be2\u5757\u8fd0\u884c\u5217\u8868\uff0c\u76ee\u524d\u6ca1\u4f7f\u7528")
    @PostMapping(value={"/queryBlocksByTaskRecordIdPageAble"})
    @ResponseBody
    public ResultVo<Object> queryBlocksByTaskRecordIdPageAble(@RequestBody PaginationReq<QueryBlockRecordsAndTaskStatusReq> paginationReq) throws Exception {
        try {
            int currentPage = paginationReq.getCurrentPage();
            int pageSize = paginationReq.getPageSize();
            Page blockList = this.windBlockRecordService.findBlocksByTaskRecordIdPageAble(currentPage, pageSize, ((QueryBlockRecordsAndTaskStatusReq)paginationReq.getQueryParam()).getTaskRecordId());
            PaginationResponseVo paginationResponseVo = new PaginationResponseVo();
            paginationResponseVo.setTotalCount(Long.valueOf(blockList.getTotalElements()));
            paginationResponseVo.setCurrentPage(Integer.valueOf(currentPage));
            paginationResponseVo.setPageSize(Integer.valueOf(pageSize));
            paginationResponseVo.setTotalPage(Integer.valueOf(blockList.getTotalPages()));
            paginationResponseVo.setPageList(blockList.getContent());
            return ResultVo.response((Object)paginationResponseVo);
        }
        catch (DataIntegrityViolationException e) {
            log.error("queryBlocksByTaskRecordIdPageAble error", (Throwable)e);
            return ResultVo.error((int)CommonCodeEnum.WIND_QUERY_ERROR.getCode(), (String)CommonCodeEnum.WIND_QUERY_ERROR.getMsg(), null);
        }
    }

    @SysLog(operation="setTaskPriority", message="@{agv.controller.setTaskPriority}")
    @ApiOperation(value="\u6839\u636e\u4efb\u52a1\u5b9e\u4f8bId\u8bbe\u7f6e\u4efb\u52a1\u4f18\u5148\u7ea7")
    @PostMapping(value={"/setTaskPriority"})
    @ResponseBody
    public ResultVo setTaskPriority(@RequestBody WindTaskPriorityReq req) {
        log.info("setTaskPriority info {}", (Object)req);
        try {
            if (CollectionUtils.isEmpty((Collection)req.getTaskRecordIds()) || req.getPriority() == null) {
                return ResultVo.error((int)CommonCodeEnum.WIND_SETPRIORITY_ERROR.getCode(), (String)CommonCodeEnum.WIND_SETPRIORITY_ERROR.getMsg(), (Object)"");
            }
            List collect = this.windTaskService.getTaskRecordById(req.getTaskRecordIds()).stream().filter(it -> it.getStatus().intValue() != TaskStatusEnum.end.getStatus() && it.getStatus().intValue() != TaskStatusEnum.end_error.getStatus() && it.getStatus().intValue() != TaskStatusEnum.stop.getStatus() && it.getStatus().intValue() != TaskStatusEnum.manual_end.getStatus()).collect(Collectors.toList());
            if (collect == null || CollectionUtils.isEmpty(collect)) {
                return ResultVo.error((int)CommonCodeEnum.WIND_SETPRIORITY_TASKRECORDEND.getCode(), (String)CommonCodeEnum.WIND_SETPRIORITY_TASKRECORDEND.getMsg(), (Object)"");
            }
            ArrayList<String> ids = new ArrayList<String>();
            for (WindTaskRecord windTaskRecord : collect) {
                if (RootBp.windTaskRecordMap.get(windTaskRecord.getId()) != null) {
                    ((WindTaskRecord)RootBp.windTaskRecordMap.get(windTaskRecord.getId())).setPriority(req.getPriority());
                }
                RootBp.taskPriority.put(windTaskRecord.getId(), req.getPriority());
                windTaskRecord.setPriority(req.getPriority());
                ids.add(windTaskRecord.getId());
                String siteId = WindTaskService.siteNodeHashTable.getNodeByTaskRecordId(windTaskRecord.getId());
                if (!StringUtils.isNotEmpty((CharSequence)siteId)) continue;
                WindTaskService.siteNodeHashTable.hashLinkedList(siteId).reconstructionList(windTaskRecord.getId(), req.getPriority().intValue());
            }
            this.windTaskRecordMapper.saveAll(collect);
            List blockRecord = this.windBlockRecordMapper.findByTaskIdsAndTaskRecordIds(ids).stream().filter(it -> StringUtils.isNotEmpty((CharSequence)it.getOrderId())).collect(Collectors.toList());
            for (WindBlockRecord windBlockRecord : blockRecord) {
                com.alibaba.fastjson.JSONObject param = new com.alibaba.fastjson.JSONObject();
                param.put("id", (Object)windBlockRecord.getOrderId());
                param.put("priority", (Object)req.getPriority());
                Map stringStringMap = OkHttpUtil.postJson((String)(PropConfig.getRdsCoreBaseUrl() + ApiEnum.updateOrderPriority.getUri()), (String)param.toJSONString());
                log.info("setTaskPriority core info {}", (Object)stringStringMap);
            }
            return ResultVo.success();
        }
        catch (Exception e) {
            log.error("setTaskPriority error", (Throwable)e);
            return ResultVo.error();
        }
    }

    @GetMapping(value={"/windTaskParameters"})
    @ResponseBody
    public ResultVo windTaskCommonParameters(@RequestParam(value="param", required=false) String param, @RequestParam(value="type", required=false) String type) {
        CommonConfig commonConfig;
        List sites;
        CommonParametersVo vo = new CommonParametersVo();
        if (StringUtils.equals((CharSequence)type, (CharSequence)"workSiteIds")) {
            sites = this.workSiteMapper.findAll();
            List resultSites = sites.stream().filter(it -> {
                if (StringUtils.isNotEmpty((CharSequence)param)) {
                    return StringUtils.isNotEmpty((CharSequence)it.getSiteId()) && it.getSiteId().contains(param);
                }
                return true;
            }).map(WorkSite::getSiteId).sorted().collect(Collectors.toList());
            vo.setWorkSiteIds(resultSites);
        }
        if (StringUtils.equals((CharSequence)type, (CharSequence)"workSiteGroups")) {
            sites = this.workSiteMapper.findAll();
            List resultGroup = sites.stream().filter(it -> {
                if (StringUtils.isNotEmpty((CharSequence)param)) {
                    return StringUtils.isNotEmpty((CharSequence)it.getGroupName()) && it.getGroupName().contains(param);
                }
                return StringUtils.isNotEmpty((CharSequence)it.getGroupName());
            }).map(WorkSite::getGroupName).distinct().sorted().collect(Collectors.toList());
            vo.setWorkSiteGroups(resultGroup);
        }
        if (StringUtils.isEmpty((CharSequence)type) || StringUtils.equals((CharSequence)type, (CharSequence)"robotIds")) {
            List resultRobotId = RobotsStatusRunnable.robotId.stream().filter(it -> {
                if (StringUtils.isNotEmpty((CharSequence)param)) {
                    return it.contains(param);
                }
                return true;
            }).sorted().collect(Collectors.toList());
            vo.setRobotIds(resultRobotId);
        }
        if (StringUtils.equals((CharSequence)type, (CharSequence)"robotGroup")) {
            List resultRobotGroup = RobotsStatusRunnable.group.stream().filter(it -> {
                if (StringUtils.isNotEmpty((CharSequence)param)) {
                    return it.contains(param);
                }
                return true;
            }).sorted().collect(Collectors.toList());
            vo.setRobotGroup(resultRobotGroup);
        }
        if (StringUtils.equals((CharSequence)type, (CharSequence)"robotLabels")) {
            List resultRobotLabel = RobotsStatusRunnable.label.stream().filter(it -> {
                if (StringUtils.isNotEmpty((CharSequence)param)) {
                    return it.contains(param);
                }
                return true;
            }).sorted().collect(Collectors.toList());
            vo.setRobotLabels(resultRobotLabel);
        }
        if (StringUtils.equals((CharSequence)type, (CharSequence)"points")) {
            Collection values = RobotsStatusRunnable.points.values();
            ArrayList resultPonit = new ArrayList();
            for (List value : values) {
                resultPonit.addAll(value.stream().filter(it -> {
                    if (StringUtils.isNotEmpty((CharSequence)param)) {
                        return it.contains(param);
                    }
                    return true;
                }).collect(Collectors.toList()));
            }
            vo.setPoints(resultPonit.stream().distinct().sorted().collect(Collectors.toList()));
        }
        if ((commonConfig = ConfigFileController.commonConfig) != null && commonConfig.getOperator() != null) {
            if (StringUtils.equals((CharSequence)type, (CharSequence)"workStations")) {
                List resultWorkStationId = commonConfig.getOperator().getWorkStations().stream().filter(it -> {
                    if (StringUtils.isNotEmpty((CharSequence)param)) {
                        return it.getId().contains(param);
                    }
                    return true;
                }).map(OperatorWorkStation::getId).sorted().collect(Collectors.toList());
                vo.setWorkStations(resultWorkStationId);
            }
            if (StringUtils.equals((CharSequence)type, (CharSequence)"workTypes")) {
                List resultWorkTypeId = commonConfig.getOperator().getWorkTypes().stream().filter(it -> {
                    if (StringUtils.isNotEmpty((CharSequence)param)) {
                        return it.getId().contains(param);
                    }
                    return true;
                }).map(OperatorWorkType::getId).sorted().collect(Collectors.toList());
                vo.setWorkTypes(resultWorkTypeId);
            }
        }
        if (StringUtils.equals((CharSequence)type, (CharSequence)"user")) {
            List resultUser = this.userMapper.findAll().stream().filter(it -> {
                if (it.getStatus() != null && it.getStatus() == 2) {
                    return false;
                }
                if (StringUtils.isNotEmpty((CharSequence)param)) {
                    return it.getUsername().contains(param);
                }
                return true;
            }).map(User::getUsername).sorted().collect(Collectors.toList());
            vo.setUser(resultUser);
        }
        if (StringUtils.equals((CharSequence)type, (CharSequence)"caches")) {
            Iterator iterator = CacheDataBp.cacheMap.entrySet().iterator();
            ArrayList<String> resultCache = new ArrayList<String>();
            while (iterator.hasNext()) {
                Map.Entry entry = iterator.next();
                String key = (String)entry.getKey();
                if (StringUtils.isNotEmpty((CharSequence)param)) {
                    if (!key.contains(param)) continue;
                    resultCache.add(key);
                    continue;
                }
                resultCache.add(key);
            }
            vo.setCaches(resultCache.stream().distinct().sorted().collect(Collectors.toList()));
        }
        if (StringUtils.equals((CharSequence)type, (CharSequence)"binTask")) {
            List resultBinTask = RobotsStatusRunnable.binTask.stream().filter(it -> {
                if (StringUtils.isNotEmpty((CharSequence)param)) {
                    return it.contains(param);
                }
                return true;
            }).distinct().sorted().collect(Collectors.toList());
            vo.setBinTask(resultBinTask);
        }
        return ResultVo.response((Object)vo);
    }

    @SysLog(operation="releaseWaitPassBlock", message="@{wind.controller.setSingleForkOrders}")
    @ApiOperation(value="\u6279\u91cf\u653e\u884c\u7b49\u5f85\u653e\u884c\u5757")
    @PostMapping(value={"/releaseWaitPassBlock"})
    @ResponseBody
    public ResultVo<Object> releaseWaitPassBlock(@RequestBody List<String> agvIds, @ApiIgnore HttpServletResponse response) throws IOException {
        log.info("releaseWaitPassBlock params = {}", agvIds);
        ArrayList<WindDataCacheSplit> caches = new ArrayList<WindDataCacheSplit>();
        for (String agvId : agvIds) {
            CacheDataBp.cacheMap.put("waitPass_" + agvId, "true");
            caches.add(new WindDataCacheSplit("waitPass_" + agvId, "true", new Date(), Integer.valueOf(1)));
        }
        this.windService.dataCacheAll(caches);
        return ResultVo.success();
    }

    @ApiOperation(value="\u83b7\u53d6\u4ea4\u901a\u4ea4\u4e92\u5386\u53f2")
    @RequestMapping(value={"/otherSysBlockGroup"})
    @ResponseBody
    public String getOtherSysBlockGroup(@RequestBody Map<String, Object> param) {
        String result = null;
        try {
            String url = (String)param.get("url");
            String rdsCoreBaseUrl = PropConfig.getRdsCoreBaseUrl();
            if (!url.startsWith(rdsCoreBaseUrl)) {
                return null;
            }
            result = OkHttpUtil.get((String)url);
        }
        catch (Exception e) {
            log.error("getOtherSysBlockGroup error", (Throwable)e);
        }
        return result;
    }

    @PostMapping(value={"/getProperties"})
    @ResponseBody
    public String getProperties(@RequestBody List<String> classNames) {
        JSONArray classList = new JSONArray();
        Locale locale = LocaleContextHolder.getLocale();
        for (String className : classNames) {
            try {
                Field[] allFields;
                Class<?> clazz = Class.forName(className);
                com.alibaba.fastjson.JSONObject classInfo = new com.alibaba.fastjson.JSONObject();
                classInfo.put("className", (Object)className);
                JSONArray fieldsList = new JSONArray();
                for (Field field : allFields = FieldUtils.getAllFields(clazz)) {
                    Description description = field.getAnnotation(Description.class);
                    if (description == null) continue;
                    com.alibaba.fastjson.JSONObject fieldInfo = new com.alibaba.fastjson.JSONObject();
                    fieldInfo.put("fieldName", (Object)field.getName());
                    String messageMatch = this.localeMessageUtil.getMessageMatch(description.value(), locale);
                    fieldInfo.put("description", (Object)messageMatch);
                    fieldsList.add((Object)fieldInfo);
                }
                classInfo.put("fields", (Object)fieldsList);
                classList.add((Object)classInfo);
            }
            catch (ClassNotFoundException classNotFoundException) {}
        }
        com.alibaba.fastjson.JSONObject result = new com.alibaba.fastjson.JSONObject();
        result.put("classList", (Object)classList);
        String jsonResult = result.toJSONString();
        return jsonResult;
    }
}

