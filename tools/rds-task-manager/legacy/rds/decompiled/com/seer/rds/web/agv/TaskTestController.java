/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.alibaba.fastjson.JSONObject
 *  com.seer.rds.model.wind.TestRecord
 *  com.seer.rds.service.agv.TestService
 *  com.seer.rds.service.threadPool.LinkedBqThreadPool
 *  com.seer.rds.service.wind.TestRootBp
 *  com.seer.rds.vo.ResultVo
 *  com.seer.rds.vo.req.SetOrderReq
 *  com.seer.rds.vo.req.TestRecordReq
 *  com.seer.rds.web.agv.TaskTestController
 *  io.swagger.annotations.Api
 *  io.swagger.annotations.ApiOperation
 *  org.apache.commons.lang3.StringUtils
 *  org.slf4j.Logger
 *  org.slf4j.LoggerFactory
 *  org.springframework.beans.factory.annotation.Autowired
 *  org.springframework.stereotype.Controller
 *  org.springframework.web.bind.annotation.PostMapping
 *  org.springframework.web.bind.annotation.RequestBody
 *  org.springframework.web.bind.annotation.RequestMapping
 *  org.springframework.web.bind.annotation.ResponseBody
 */
package com.seer.rds.web.agv;

import com.alibaba.fastjson.JSONObject;
import com.seer.rds.model.wind.TestRecord;
import com.seer.rds.service.agv.TestService;
import com.seer.rds.service.threadPool.LinkedBqThreadPool;
import com.seer.rds.service.wind.TestRootBp;
import com.seer.rds.vo.ResultVo;
import com.seer.rds.vo.req.SetOrderReq;
import com.seer.rds.vo.req.TestRecordReq;
import io.swagger.annotations.Api;
import io.swagger.annotations.ApiOperation;
import java.util.List;
import org.apache.commons.lang3.StringUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseBody;

@Controller
@RequestMapping(value={"test"})
@Api(tags={"\u4efb\u52a1\u6d4b\u8bd5"})
public class TaskTestController {
    private static final Logger log = LoggerFactory.getLogger(TaskTestController.class);
    @Autowired
    private TestRootBp rootBp;
    @Autowired
    private TestService testService;

    @ApiOperation(value="\u8fd0\u884c\u4e8b\u4ef6")
    @PostMapping(value={"/run"})
    @ResponseBody
    public ResultVo<Object> runTest(@RequestBody SetOrderReq req) {
        ResultVo resultVo = new ResultVo();
        if (StringUtils.isEmpty((CharSequence)req.getTaskId()) && StringUtils.isEmpty((CharSequence)req.getTaskLabel())) {
            log.error("TaskId And TaskLabel Have At Least One Field That Is Not Empty");
            resultVo.setMsg("TaskId And TaskLabel Have At Least One Field That Is Not Empty");
            resultVo.setCode(Integer.valueOf(-1));
            return resultVo;
        }
        JSONObject jsonObject = JSONObject.parseObject((String)req.getDetail());
        if (jsonObject.getJSONObject("rootBlock") == null || jsonObject.getJSONObject("rootBlock").getJSONObject("children").size() == 0) {
            log.error("Task details undefined");
            resultVo.setMsg("Task details undefined");
            resultVo.setCode(Integer.valueOf(-1));
            return resultVo;
        }
        LinkedBqThreadPool taskPool = LinkedBqThreadPool.getInstance();
        int taskNum = taskPool.getTaskNum();
        log.info("current running task number is:" + taskNum);
        taskPool.execute((Runnable)new /* Unavailable Anonymous Inner Class!! */);
        resultVo.setMsg("SUCCESS");
        resultVo.setCode(Integer.valueOf(200));
        return resultVo;
    }

    @ApiOperation(value="\u83b7\u53d6\u6307\u5b9a\u5b9e\u4f8b\u4fe1\u606f")
    @PostMapping(value={"/getTestRecordById"})
    @ResponseBody
    public ResultVo<Object> getTestRecordById(@RequestBody TestRecord record) throws Exception {
        TestRecord testRecord = this.testService.findRecordById(record.getId());
        testRecord.setOrderId(null);
        return ResultVo.response((Object)testRecord);
    }

    @ApiOperation(value="\u83b7\u53d6\u5bf9\u5e94\u7684\u6d4b\u8bd5\u4efb\u52a1\u5b9e\u4f8b\u5217\u8868")
    @PostMapping(value={"/getTestRecordListByDefLabel"})
    @ResponseBody
    public ResultVo<Object> getTestRecordListByDefLabel(@RequestBody TestRecordReq testRecordReq) throws Exception {
        List testRecord = this.testService.findTestRecord(testRecordReq.getTaskLabel());
        testRecord.forEach(record -> record.setOrderId(null));
        return ResultVo.response((Object)testRecord);
    }
}

