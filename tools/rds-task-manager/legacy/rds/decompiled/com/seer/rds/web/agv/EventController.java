/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.alibaba.fastjson.JSON
 *  com.alibaba.fastjson.JSONArray
 *  com.alibaba.fastjson.JSONObject
 *  com.seer.rds.annotation.SysLog
 *  com.seer.rds.constant.CommonCodeEnum
 *  com.seer.rds.dao.EventDefHistoryMapper
 *  com.seer.rds.dao.EventDefMapper
 *  com.seer.rds.dao.EventRecordMapper
 *  com.seer.rds.model.wind.EventDef
 *  com.seer.rds.model.wind.EventDefHistory
 *  com.seer.rds.model.wind.EventRecord
 *  com.seer.rds.service.agv.EventService
 *  com.seer.rds.service.agv.WindService
 *  com.seer.rds.service.threadPool.LinkedBqThreadPool
 *  com.seer.rds.service.wind.EventRootBp
 *  com.seer.rds.vo.ResultVo
 *  com.seer.rds.vo.req.BatchStopTaskReq
 *  com.seer.rds.vo.req.EventRecordReq
 *  com.seer.rds.vo.req.PaginationReq
 *  com.seer.rds.vo.req.SetOrderReq
 *  com.seer.rds.vo.req.taskListAndVersionReq
 *  com.seer.rds.vo.response.EventDefExport
 *  com.seer.rds.web.agv.EventController
 *  io.swagger.annotations.Api
 *  io.swagger.annotations.ApiOperation
 *  javax.servlet.ServletOutputStream
 *  javax.servlet.http.HttpServletRequest
 *  javax.servlet.http.HttpServletResponse
 *  org.apache.commons.collections.CollectionUtils
 *  org.apache.commons.lang3.StringUtils
 *  org.slf4j.Logger
 *  org.slf4j.LoggerFactory
 *  org.springframework.beans.factory.annotation.Autowired
 *  org.springframework.stereotype.Controller
 *  org.springframework.web.bind.annotation.PostMapping
 *  org.springframework.web.bind.annotation.RequestBody
 *  org.springframework.web.bind.annotation.RequestMapping
 *  org.springframework.web.bind.annotation.ResponseBody
 *  org.springframework.web.multipart.MultipartFile
 *  springfox.documentation.annotations.ApiIgnore
 */
package com.seer.rds.web.agv;

import com.alibaba.fastjson.JSON;
import com.alibaba.fastjson.JSONArray;
import com.alibaba.fastjson.JSONObject;
import com.seer.rds.annotation.SysLog;
import com.seer.rds.constant.CommonCodeEnum;
import com.seer.rds.dao.EventDefHistoryMapper;
import com.seer.rds.dao.EventDefMapper;
import com.seer.rds.dao.EventRecordMapper;
import com.seer.rds.model.wind.EventDef;
import com.seer.rds.model.wind.EventDefHistory;
import com.seer.rds.model.wind.EventRecord;
import com.seer.rds.service.agv.EventService;
import com.seer.rds.service.agv.WindService;
import com.seer.rds.service.threadPool.LinkedBqThreadPool;
import com.seer.rds.service.wind.EventRootBp;
import com.seer.rds.vo.ResultVo;
import com.seer.rds.vo.req.BatchStopTaskReq;
import com.seer.rds.vo.req.EventRecordReq;
import com.seer.rds.vo.req.PaginationReq;
import com.seer.rds.vo.req.SetOrderReq;
import com.seer.rds.vo.req.taskListAndVersionReq;
import com.seer.rds.vo.response.EventDefExport;
import io.swagger.annotations.Api;
import io.swagger.annotations.ApiOperation;
import java.io.IOException;
import java.io.OutputStream;
import java.io.OutputStreamWriter;
import java.io.Writer;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Date;
import java.util.List;
import java.util.stream.Collectors;
import javax.servlet.ServletOutputStream;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import org.apache.commons.collections.CollectionUtils;
import org.apache.commons.lang3.StringUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseBody;
import org.springframework.web.multipart.MultipartFile;
import springfox.documentation.annotations.ApiIgnore;

@Controller
@RequestMapping(value={"event"})
@Api(tags={"\u4efb\u52a1\u4e8b\u4ef6\u63a5\u53e3\u8c03\u7528"})
public class EventController {
    private static final Logger log = LoggerFactory.getLogger(EventController.class);
    @Autowired
    private EventRecordMapper eventRecordMapper;
    @Autowired
    private EventService eventService;
    @Autowired
    private EventDefMapper eventDefMapper;
    @Autowired
    private EventRootBp rootBp;
    @Autowired
    private WindService windService;
    @Autowired
    private EventDefHistoryMapper eventDefHistoryMapper;

    @ApiOperation(value="\u8fd0\u884c\u4e8b\u4ef6")
    @PostMapping(value={"/run"})
    @ResponseBody
    public ResultVo<Object> runEvent(@RequestBody SetOrderReq req) {
        EventRecord eventRecord;
        ResultVo resultVo = new ResultVo();
        if (StringUtils.isEmpty((CharSequence)req.getTaskId()) && StringUtils.isEmpty((CharSequence)req.getTaskLabel())) {
            log.error("TaskId And TaskLabel Have At Least One Field That Is Not Empty");
            resultVo.setMsg("TaskId And TaskLabel Have At Least One Field That Is Not Empty");
            resultVo.setCode(Integer.valueOf(-1));
            return resultVo;
        }
        EventDef res = null;
        if (StringUtils.isNotEmpty((CharSequence)req.getTaskId())) {
            res = this.eventDefMapper.findById((Object)req.getTaskId()).orElse(null);
        }
        if (res == null && StringUtils.isNotEmpty((CharSequence)req.getTaskLabel())) {
            res = this.eventDefMapper.findAllByLabel(req.getTaskLabel());
        }
        if (res == null) {
            log.error("No Task Definition Was Queried");
            resultVo.setMsg("No Task Definition Was Queried");
            resultVo.setCode(Integer.valueOf(-1));
            return resultVo;
        }
        if (!res.getIfEnable().booleanValue()) {
            resultVo.setMsg("event not enable");
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
        if (StringUtils.isNotEmpty((CharSequence)req.getTaskRecordId()) && (eventRecord = (EventRecord)this.eventRecordMapper.findById((Object)req.getTaskRecordId()).orElse(null)) != null) {
            log.error("Task Instance Id Repeat");
            resultVo.setMsg("Task Instance Id Repeat");
            resultVo.setCode(Integer.valueOf(-1));
            return resultVo;
        }
        LinkedBqThreadPool taskPool = LinkedBqThreadPool.getInstance();
        int taskNum = taskPool.getTaskNum();
        log.info("current running task number is:" + taskNum);
        req.setEventDef(res);
        taskPool.execute((Runnable)new /* Unavailable Anonymous Inner Class!! */);
        resultVo.setMsg("SUCCESS");
        resultVo.setCode(Integer.valueOf(200));
        return resultVo;
    }

    @SysLog(operation="/stop-all-task", message="@{wind.controller.stopAllTask}")
    @ApiOperation(value="\u6279\u91cf\u7ec8\u6b62\u4efb\u52a1")
    @PostMapping(value={"/stop-all-task"})
    @ResponseBody
    public ResultVo<Object> stopAll(@ApiIgnore HttpServletRequest request, @ApiIgnore HttpServletResponse response, @RequestBody BatchStopTaskReq req) {
        log.info("Prepare to terminate the task");
        int releaseSite = req.getReleaseSite();
        List stopTaskList = req.getStopTaskList();
        List taskRecordIds = CollectionUtils.isNotEmpty((Collection)stopTaskList) ? this.windService.stopAllEvent(stopTaskList) : this.windService.stopAllEvent(null);
        log.info("stopAll task params taskRecordIds = {} releaseSite = {}", (Object)taskRecordIds, (Object)releaseSite);
        return ResultVo.response(null);
    }

    @ApiOperation(value="\u67e5\u627e\u5bf9\u5e94\u7684\u4efb\u52a1\u5b9a\u4e49")
    @PostMapping(value={"/findTaskDef"})
    @ResponseBody
    public ResultVo<Object> findOneTaskDef(@RequestBody taskListAndVersionReq taskListAndVersionReq2, @ApiIgnore HttpServletResponse response) throws IOException {
        log.info("findTaskDefAll id = {}", (Object)taskListAndVersionReq2);
        return ResultVo.response((Object)this.eventDefHistoryMapper.findByLabelAndVersion(taskListAndVersionReq2.getDefLabel(), taskListAndVersionReq2.getVersion()));
    }

    @ApiOperation(value="\u83b7\u53d6\u4e8b\u4ef6\u5b9a\u4e49\u5217\u8868")
    @PostMapping(value={"/def/getList"})
    @ResponseBody
    public ResultVo<Object> getEventDefList() {
        try {
            List all = this.eventService.findAll();
            return ResultVo.response((Object)all);
        }
        catch (Exception e) {
            log.error("createTaskInterface error", (Throwable)e);
            return ResultVo.error((int)CommonCodeEnum.WIND_LABEL_ERROR.getCode(), (String)CommonCodeEnum.WIND_LABEL_ERROR.getMsg(), null);
        }
    }

    @ApiOperation(value="\u83b7\u53d6\u6307\u5b9a\u4e8b\u4ef6\u5b9a\u4e49\u4fe1\u606f")
    @PostMapping(value={"/getEventDefByCondition"})
    @ResponseBody
    public ResultVo<Object> getEventRecordDefById(@RequestBody EventDef eventDef) throws Exception {
        EventDef EventDef2 = this.eventService.findDefById(eventDef.getId());
        return ResultVo.response((Object)EventDef2);
    }

    @ApiOperation(value="\u83b7\u53d6\u6307\u5b9a\u5b9e\u4f8b\u4fe1\u606f")
    @PostMapping(value={"/getEventRecordById"})
    @ResponseBody
    public ResultVo<Object> getEventRecordById(@RequestBody EventRecord record) throws Exception {
        EventRecord eventRecord = this.eventService.findRecordById(record.getId());
        return ResultVo.response((Object)eventRecord);
    }

    @ApiOperation(value="\u5bfc\u5165\u4e8b\u4ef6\u6587\u4ef6")
    @PostMapping(value={"/importEventDef"})
    @ResponseBody
    public ResultVo<Object> importEventDef(@RequestBody MultipartFile file) {
        try {
            if (file.isEmpty()) {
                return ResultVo.error((CommonCodeEnum)CommonCodeEnum.DATA_NON);
            }
            byte[] bytes = file.getBytes();
            String content = new String(bytes, StandardCharsets.UTF_8);
            ArrayList<JSONObject> result = new ArrayList<JSONObject>();
            JSONArray jsonArray = JSON.parseArray((String)content);
            for (int i = 0; i < jsonArray.size(); ++i) {
                result.add(jsonArray.getJSONObject(i));
            }
            return ResultVo.response(result);
        }
        catch (Exception e) {
            log.error("importEventDef error", (Throwable)e);
            return ResultVo.error((CommonCodeEnum)CommonCodeEnum.ERROR);
        }
    }

    @ApiOperation(value="\u5220\u9664\u4e8b\u4ef6\u5b9a\u4e49")
    @PostMapping(value={"/deleteEventDef"})
    @ResponseBody
    public ResultVo<Object> deleteEventDef(@RequestBody EventDef eventDef) {
        try {
            this.eventService.deleteEventDef(eventDef.getId());
            return ResultVo.success();
        }
        catch (Exception e) {
            log.error("createTaskInterface error", (Throwable)e);
            return ResultVo.error();
        }
    }

    @ApiOperation(value="\u4fdd\u5b58\u4e8b\u4ef6\u5b9a\u4e49")
    @PostMapping(value={"/createOrUpdateEventDef"})
    @ResponseBody
    public ResultVo<Object> updateEventDef(@RequestBody EventDef eventDef) {
        try {
            List byLabel;
            if (StringUtils.isNotEmpty((CharSequence)eventDef.getLabel()) && ((byLabel = this.eventDefMapper.findByLabel(eventDef.getLabel())) == null || byLabel.size() == 0 || eventDef.getId().equals(((EventDef)byLabel.get(0)).getId()))) {
                Integer maxVersion = this.eventDefHistoryMapper.findMaxVersion(eventDef.getLabel());
                if (maxVersion != null) {
                    eventDef.setVersion(Integer.valueOf(maxVersion + 1));
                }
                eventDef.setCreateDate(new Date());
                if (eventDef.getVersion() == null) {
                    eventDef.setVersion(Integer.valueOf(1));
                }
                this.eventService.saveOrUpdateEventDef(eventDef);
                EventDefHistory eventDefHistory = EventDefHistory.builder().msg(eventDef.getMsg()).label(eventDef.getLabel()).version(eventDef.getVersion()).detail(eventDef.getDetail()).createDate(new Date()).build();
                try {
                    this.eventDefHistoryMapper.save((Object)eventDefHistory);
                }
                catch (Exception e) {
                    log.error(e.getMessage());
                }
                return ResultVo.success();
            }
            return ResultVo.error((CommonCodeEnum)CommonCodeEnum.Event_IS_EXIST);
        }
        catch (Exception e) {
            log.error("createEventDef error", (Throwable)e);
            return ResultVo.error((int)CommonCodeEnum.WIND_LABEL_ERROR.getCode(), (String)CommonCodeEnum.WIND_LABEL_ERROR.getMsg(), null);
        }
    }

    @ApiOperation(value="\u83b7\u53d6\u6240\u6709\u4e8b\u4ef6\u5b9e\u4f8b\u4fe1\u606f")
    @PostMapping(value={"/getAllEventRecordByCondition"})
    @ResponseBody
    public ResultVo<Object> getAllEventRecordList(@RequestBody PaginationReq<EventRecordReq> paginationReq) {
        return ResultVo.response((Object)this.eventService.findEventRecordByCondition((EventRecordReq)paginationReq.getQueryParam(), Integer.valueOf(paginationReq.getCurrentPage()), Integer.valueOf(paginationReq.getPageSize())));
    }

    @ApiOperation(value="\u8bbe\u7f6e\u542f\u7528/\u7981\u7528")
    @PostMapping(value={"/setEnableOr"})
    @ResponseBody
    public ResultVo<Object> getAllEventRecordList(@RequestBody EventDef eventDef) {
        this.eventService.setEnable(eventDef.getIfEnable(), eventDef.getId());
        return ResultVo.success();
    }

    /*
     * WARNING - Removed try catching itself - possible behaviour change.
     */
    @SysLog(operation="export", message="exportEventDef")
    @ApiOperation(value="\u5bfc\u51fa\u54cd\u5e94\u4e8b\u4ef6\u5b9a\u4e49")
    @PostMapping(value={"/eventDef/export"})
    @ResponseBody
    public void batchExportTask(@RequestBody List<String> ids, @ApiIgnore HttpServletResponse response) throws Exception {
        List eventDefLists = this.eventDefMapper.findAll();
        response.setCharacterEncoding("UTF-8");
        response.setContentType("application/octet-stream; charset=UTF-8");
        response.setHeader("Content-Disposition", "attachment; filename=event.task");
        ServletOutputStream outputStream = response.getOutputStream();
        OutputStreamWriter writer = new OutputStreamWriter((OutputStream)outputStream, "UTF-8");
        try (ServletOutputStream out = response.getOutputStream();){
            List collect = eventDefLists.stream().filter(e -> ids.contains(e.getId())).map(w -> {
                EventDefExport resp = new EventDefExport();
                resp.setId(w.getId());
                resp.setProjectId(w.getProjectId());
                resp.setDetail(w.getDetail());
                resp.setMsg(w.getMsg());
                resp.setLabel(w.getLabel());
                resp.setIfEnable(Boolean.valueOf(false));
                return resp;
            }).collect(Collectors.toList());
            writer.write(JSON.toJSONString(collect));
            ((Writer)writer).flush();
            ((Writer)writer).close();
        }
        catch (IOException e2) {
            log.error("\u5bfc\u51fa\u4e8b\u4ef6\u5b9a\u4e49\u4efb\u52a1\u5931\u8d25", (Throwable)e2);
        }
        finally {
            try {
                ((Writer)writer).close();
            }
            catch (IOException e3) {
                log.error("\u5bfc\u51fa\u4e8b\u4ef6\u5b9a\u4e49\u4efb\u52a1\u5931\u8d25", (Throwable)e3);
            }
        }
    }
}

