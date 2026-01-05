/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.alibaba.fastjson.JSON
 *  com.alibaba.fastjson.JSONObject
 *  com.alibaba.fastjson.serializer.SerializeConfig
 *  com.alibaba.fastjson.serializer.SerializerFeature
 *  com.seer.rds.annotation.SysLog
 *  com.seer.rds.config.GlobalCacheConfig
 *  com.seer.rds.config.PropConfig
 *  com.seer.rds.constant.CommonCodeEnum
 *  com.seer.rds.constant.TemplateNameEnum
 *  com.seer.rds.dao.WindTaskDefHistoryMapper
 *  com.seer.rds.model.wind.WindTaskDef
 *  com.seer.rds.model.wind.WindTaskDefHistory
 *  com.seer.rds.model.wind.WindTaskRestrictions
 *  com.seer.rds.service.Archiving.ArchivingService
 *  com.seer.rds.service.agv.WindService
 *  com.seer.rds.service.agv.WindTaskDefService
 *  com.seer.rds.service.agv.WindTaskService
 *  com.seer.rds.vo.ResultVo
 *  com.seer.rds.vo.req.ErrorHandleReq
 *  com.seer.rds.vo.req.LoadHistoryReq
 *  com.seer.rds.vo.req.PaginationReq
 *  com.seer.rds.vo.req.WindTaskDefReq
 *  com.seer.rds.vo.req.WindTaskRestrictionsReq
 *  com.seer.rds.vo.response.PaginationResponseVo
 *  com.seer.rds.vo.response.WindTaskDefExport
 *  com.seer.rds.web.agv.WindTaskController
 *  io.swagger.annotations.Api
 *  io.swagger.annotations.ApiOperation
 *  javax.servlet.ServletOutputStream
 *  javax.servlet.http.HttpServletResponse
 *  org.apache.commons.io.FileUtils
 *  org.apache.commons.lang3.StringUtils
 *  org.slf4j.Logger
 *  org.slf4j.LoggerFactory
 *  org.springframework.beans.factory.annotation.Autowired
 *  org.springframework.dao.DataIntegrityViolationException
 *  org.springframework.stereotype.Controller
 *  org.springframework.web.bind.annotation.GetMapping
 *  org.springframework.web.bind.annotation.PostMapping
 *  org.springframework.web.bind.annotation.RequestBody
 *  org.springframework.web.bind.annotation.RequestMapping
 *  org.springframework.web.bind.annotation.ResponseBody
 *  springfox.documentation.annotations.ApiIgnore
 */
package com.seer.rds.web.agv;

import com.alibaba.fastjson.JSON;
import com.alibaba.fastjson.JSONObject;
import com.alibaba.fastjson.serializer.SerializeConfig;
import com.alibaba.fastjson.serializer.SerializerFeature;
import com.seer.rds.annotation.SysLog;
import com.seer.rds.config.GlobalCacheConfig;
import com.seer.rds.config.PropConfig;
import com.seer.rds.constant.CommonCodeEnum;
import com.seer.rds.constant.TemplateNameEnum;
import com.seer.rds.dao.WindTaskDefHistoryMapper;
import com.seer.rds.model.wind.WindTaskDef;
import com.seer.rds.model.wind.WindTaskDefHistory;
import com.seer.rds.model.wind.WindTaskRestrictions;
import com.seer.rds.service.Archiving.ArchivingService;
import com.seer.rds.service.agv.WindService;
import com.seer.rds.service.agv.WindTaskDefService;
import com.seer.rds.service.agv.WindTaskService;
import com.seer.rds.vo.ResultVo;
import com.seer.rds.vo.req.ErrorHandleReq;
import com.seer.rds.vo.req.LoadHistoryReq;
import com.seer.rds.vo.req.PaginationReq;
import com.seer.rds.vo.req.WindTaskDefReq;
import com.seer.rds.vo.req.WindTaskRestrictionsReq;
import com.seer.rds.vo.response.PaginationResponseVo;
import com.seer.rds.vo.response.WindTaskDefExport;
import io.swagger.annotations.Api;
import io.swagger.annotations.ApiOperation;
import java.io.File;
import java.io.IOException;
import java.io.OutputStream;
import java.io.OutputStreamWriter;
import java.io.Writer;
import java.nio.charset.Charset;
import java.time.Instant;
import java.util.Date;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;
import javax.servlet.ServletOutputStream;
import javax.servlet.http.HttpServletResponse;
import org.apache.commons.io.FileUtils;
import org.apache.commons.lang3.StringUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseBody;
import springfox.documentation.annotations.ApiIgnore;

@Controller
@RequestMapping(value={"api"})
@Api(tags={"\u5929\u98ce\u4efb\u52a1\u7ba1\u7406"})
public class WindTaskController {
    private static final Logger log = LoggerFactory.getLogger(WindTaskController.class);
    @Autowired
    private WindTaskDefService windTaskDefService;
    @Autowired
    private WindService windService;
    @Autowired
    private PropConfig propConfig;
    @Autowired
    private ArchivingService archivingService;
    @Autowired
    private WindTaskDefHistoryMapper windTaskDefHistoryMapper;
    @Autowired
    private WindTaskService windTaskService;

    @ApiOperation(value="\u4fdd\u5b58/\u66f4\u65b0\u4efb\u52a1")
    @PostMapping(value={"/create-taskdef/createOrUpdateTaskDef"})
    @ResponseBody
    public ResultVo<Object> createTask(@RequestBody WindTaskDef def, @ApiIgnore HttpServletResponse response) throws IOException {
        try {
            Integer maxVersion = this.windTaskDefHistoryMapper.findMaxVersion(def.getLabel());
            if (maxVersion != null) {
                def.setVersion(Integer.valueOf(maxVersion + 1));
            }
            def.setCreateDate(new Date());
            if (def.getWindcategoryId() == null) {
                def.setWindcategoryId(Long.valueOf(0L));
            }
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
            def.setStatus(Integer.valueOf(0));
            def.setTemplateName("userTemplate");
            this.windTaskDefService.saveTask(def);
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
        catch (DataIntegrityViolationException e) {
            log.error("createTask error", (Throwable)e);
            return ResultVo.error((int)CommonCodeEnum.WIND_LABEL_ERROR.getCode(), (String)CommonCodeEnum.WIND_LABEL_ERROR.getMsg(), null);
        }
    }

    @ApiOperation(value="\u5929\u98ce\u4efb\u52a1\u5217\u8868\u67e5\u8be2(\u5206\u9875\u67e5\u8be2)")
    @PostMapping(value={"/findAll-taskdef/findTaskDefsByCondition"})
    @ResponseBody
    public ResultVo<Object> findTaskDefByCondition(@RequestBody PaginationReq<WindTaskDefReq> req) throws Exception {
        WindTaskDefReq queryParam = (WindTaskDefReq)req.getQueryParam();
        PaginationResponseVo paginationResponseVo = this.windTaskDefService.findTaskDef(req.getCurrentPage(), req.getPageSize(), queryParam);
        return ResultVo.response((Object)paginationResponseVo);
    }

    @ApiOperation(value="\u52a8\u4f5c\u5757\u4eba\u5de5\u5b8c\u6210")
    @PostMapping(value={"/manualEnd"})
    @ResponseBody
    public ResultVo<Object> manualEnd(@RequestBody ErrorHandleReq req) throws Exception {
        GlobalCacheConfig.cacheInterrupt((String)req.getRecordId(), (String)"ManualEndKey");
        return ResultVo.success();
    }

    @ApiOperation(value="\u52a8\u4f5c\u5757\u91cd\u505a")
    @PostMapping(value={"/redoFailedOrder"})
    @ResponseBody
    public ResultVo<Object> redoFailedOrder(@RequestBody ErrorHandleReq req) throws Exception {
        GlobalCacheConfig.cacheInterrupt((String)req.getRecordId(), (String)"RedoFailedOrder");
        return ResultVo.success();
    }

    @ApiOperation(value="\u5220\u9664\u5929\u98ce\u4efb\u52a1")
    @PostMapping(value={"/delete-windTaskdef/deleteTaskDefs"})
    @ResponseBody
    public ResultVo<Object> deleteWorkSite(@RequestBody List<String> ids) throws Exception {
        try {
            if (ids != null) {
                for (String id : ids) {
                    if (!StringUtils.isNotEmpty((CharSequence)id)) continue;
                    WindTaskDef taskById = this.windTaskDefService.findTaskById(id);
                    if (taskById != null && StringUtils.equals((CharSequence)taskById.getTemplateName(), (CharSequence)TemplateNameEnum.generalTemplate.getName())) {
                        return ResultVo.error((CommonCodeEnum)CommonCodeEnum.General_Delete_Msg);
                    }
                    this.windTaskDefService.deleteTaskDef(id);
                }
                return ResultVo.success();
            }
        }
        catch (Exception e) {
            log.error("deleteTasks error", (Throwable)e);
            return ResultVo.error();
        }
        return ResultVo.success();
    }

    @ApiOperation(value="\u663e\u793a\u5386\u53f2\u5929\u98ce\u4efb\u52a1\u5217\u8868")
    @PostMapping(value={"/showHistoryTaskList"})
    @ResponseBody
    public ResultVo<Object> showHistoryList() throws Exception {
        String filename = this.propConfig.getRdsHistoryDir() + "task";
        List someSortedHistoryList = this.archivingService.getSomeSortedHistoryList(filename);
        return ResultVo.response((Object)someSortedHistoryList);
    }

    @ApiOperation(value="\u663e\u793a\u5386\u53f2\u7684\u67d0\u4e2a\u5929\u98ce\u4efb\u52a1")
    @PostMapping(value={"/showHistoryTask"})
    @ResponseBody
    public ResultVo<Object> showHistoryTask(@RequestBody LoadHistoryReq req) throws Exception {
        String resp = FileUtils.readFileToString((File)new File(this.propConfig.getRdsHistoryDir() + "task/" + req.getName()), (String)"utf-8");
        JSONObject jsonObject = JSON.parseObject((String)resp);
        return ResultVo.response((Object)JSON.toJSONString((Object)jsonObject, (SerializeConfig)WindTaskService.config, (SerializerFeature[])new SerializerFeature[0]));
    }

    @ApiOperation(value="\u5207\u6362\u5929\u98ce\u4efb\u52a1")
    @PostMapping(value={"/switchTask"})
    @ResponseBody
    public ResultVo<Object> switchTask(@RequestBody LoadHistoryReq req) throws Exception {
        String resp = FileUtils.readFileToString((File)new File(this.propConfig.getRdsHistoryDir() + "task/" + req.getName()), (String)"utf-8");
        WindTaskDef windTaskDef = (WindTaskDef)JSON.parseObject((String)resp, WindTaskDef.class);
        this.windTaskDefService.saveTask(windTaskDef);
        return ResultVo.success();
    }

    /*
     * WARNING - Removed try catching itself - possible behaviour change.
     */
    @ApiOperation(value="\u6279\u91cf\u5bfc\u51fa\u5929\u98ce\u4efb\u52a1\u5217\u8868")
    @PostMapping(value={"/windTaskdef/batchExportTask"})
    @ResponseBody
    public void batchExportTask(@RequestBody List<String> ids, @ApiIgnore HttpServletResponse response) throws Exception {
        List list = this.windTaskDefService.findTaskDef(1, 1000, new WindTaskDefReq()).getPageList();
        response.setCharacterEncoding("UTF-8");
        response.setContentType("application/octet-stream; charset=UTF-8");
        response.setHeader("Content-Disposition", "attachment; filename=taskDef.task");
        ServletOutputStream outputStream = response.getOutputStream();
        OutputStreamWriter writer = new OutputStreamWriter((OutputStream)outputStream, "UTF-8");
        try (ServletOutputStream out = response.getOutputStream();){
            List collect = list.stream().filter(e -> ids.contains(e.getId())).map(w -> {
                WindTaskDefExport resp = new WindTaskDefExport();
                resp.setId(w.getId());
                resp.setProjectId(w.getProjectId());
                resp.setDetail(w.getDetail());
                resp.setVersion(w.getVersion());
                resp.setLabel(w.getLabel());
                resp.setStatus(w.getStatus());
                resp.setRemark(w.getRemark());
                resp.setTemplateDescription(w.getTemplateDescription());
                resp.setTemplateName(w.getTemplateName());
                resp.setPeriod(w.getPeriod());
                resp.setPeriodicTask(w.getPeriodicTask());
                resp.setIfEnable(Integer.valueOf(0));
                resp.setPeriod(w.getPeriod());
                resp.setDelay(w.getDelay());
                resp.setWindcategoryId(w.getWindcategoryId());
                return resp;
            }).collect(Collectors.toList());
            writer.write(JSON.toJSONString(collect));
            ((Writer)writer).flush();
            ((Writer)writer).close();
        }
        catch (IOException e2) {
            log.error("\u5bfc\u51fa\u5929\u98ce\u4efb\u52a1\u5931\u8d25", (Throwable)e2);
        }
        finally {
            try {
                ((Writer)writer).close();
            }
            catch (IOException e3) {
                log.error("\u5bfc\u51fa\u5929\u98ce\u4efb\u52a1\u5931\u8d25", (Throwable)e3);
            }
        }
    }

    @ApiOperation(value="\u4fee\u6539\u5929\u98ce\u4efb\u52a1\u540d")
    @PostMapping(value={"/windTaskdef/modifyWindTaskDefName"})
    @ResponseBody
    public ResultVo<Object> modifyWindTaskDefName(@RequestBody WindTaskDef def) {
        try {
            WindTaskDef taskByLabel = this.windTaskDefService.findTaskByLabel(def.getLabel());
            if (taskByLabel == null) {
                WindTaskDef taskdef = this.windTaskDefService.findTaskById(def.getId());
                taskdef.setLabel(def.getLabel());
                taskdef.setCreateDate(new Date());
                this.windTaskDefService.saveTask(taskdef);
                return ResultVo.success();
            }
            return ResultVo.error((int)CommonCodeEnum.WIND_LABEL_ERROR.getCode(), (String)CommonCodeEnum.WIND_LABEL_ERROR.getMsg(), null);
        }
        catch (DataIntegrityViolationException e) {
            log.error("modifyWindTaskDefName error", (Throwable)e);
            return ResultVo.error((int)CommonCodeEnum.WIND_LABEL_ERROR.getCode(), (String)CommonCodeEnum.WIND_LABEL_ERROR.getMsg(), null);
        }
    }

    @PostMapping(value={"/windTask/updateWindTaskRestrictionsStrategy"})
    @ResponseBody
    public ResultVo<Object> updateWindTaskRestrictionsStrategy(@RequestBody WindTaskRestrictionsReq def) {
        log.info("updateWindTaskRestrictions params {}", (Object)def);
        String strategy = def.getStrategy();
        if (StringUtils.isNotEmpty((CharSequence)strategy)) {
            String[] arr = strategy.split(";");
            for (int i = 0; i < arr.length; ++i) {
                if (arr[i].contains("-")) {
                    String[] split = arr[i].split("-");
                    if (split.length != 2) {
                        return ResultVo.error((CommonCodeEnum)CommonCodeEnum.TASK_RESTRICTIONS_ERROR);
                    }
                    for (int j = 0; j < split.length; ++j) {
                        if (StringUtils.isNumeric((CharSequence)split[j]) && Integer.parseInt(split[j]) <= 24) continue;
                        return ResultVo.error((CommonCodeEnum)CommonCodeEnum.TASK_RESTRICTIONS_ERROR);
                    }
                    continue;
                }
                if (StringUtils.isNumeric((CharSequence)arr[i])) continue;
                return ResultVo.error((CommonCodeEnum)CommonCodeEnum.TASK_RESTRICTIONS_ERROR);
            }
        }
        WindTaskRestrictions windTaskRestrictions = new WindTaskRestrictions();
        windTaskRestrictions.setStrategy(def.getStrategy());
        this.windTaskService.updateWindTaskRestrictionsStrategy(windTaskRestrictions);
        return ResultVo.success();
    }

    @SysLog(operation="RestrictionsRepair", message="@{script.controller.RestrictionsRepair}")
    @PostMapping(value={"/windTask/updateWindTaskRestrictionsRepair"})
    @ResponseBody
    public ResultVo<Object> updateWindTaskRestrictionsRepair(@RequestBody WindTaskRestrictionsReq def) {
        log.info("updateWindTaskRestrictionsRepair params {}", (Object)def);
        if (def.getRepair() == null) {
            return ResultVo.error();
        }
        WindTaskRestrictions windTaskRestrictions = new WindTaskRestrictions();
        windTaskRestrictions.setRepair(def.getRepair());
        this.windTaskService.updateWindTaskRestrictionsRepair(windTaskRestrictions);
        return ResultVo.success();
    }

    @GetMapping(value={"/windTask/queryWindTaskRestrictionsRepair"})
    @ResponseBody
    public ResultVo<Object> queryWindTaskRestrictionsRepair() {
        return ResultVo.response((Object)this.windTaskService.queryWindTaskRestrictionsStrategy());
    }

    @GetMapping(value={"/windTask/checkRestrictionsRepair"})
    @ResponseBody
    public ResultVo<Object> checkRestrictionsRepair() {
        ResultVo objectResultVo = WindTaskService.checkWindTask();
        return ResultVo.response((Object)(objectResultVo.getCode().intValue() == CommonCodeEnum.SUCCESS.getCode().intValue() ? 1 : 0));
    }
}

