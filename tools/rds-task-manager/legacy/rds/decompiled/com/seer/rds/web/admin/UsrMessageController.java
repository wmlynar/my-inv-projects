/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.annotation.SysLog
 *  com.seer.rds.dao.UserMessageMapper
 *  com.seer.rds.service.admin.UserMessageService
 *  com.seer.rds.vo.ResultVo
 *  com.seer.rds.vo.UserMessageHqlCondition
 *  com.seer.rds.vo.UserMessageUpdateReq
 *  com.seer.rds.vo.popWindowsVo
 *  com.seer.rds.vo.req.PaginationReq
 *  com.seer.rds.web.admin.UsrMessageController
 *  io.swagger.annotations.Api
 *  io.swagger.annotations.ApiOperation
 *  org.slf4j.Logger
 *  org.slf4j.LoggerFactory
 *  org.springframework.beans.factory.annotation.Autowired
 *  org.springframework.stereotype.Controller
 *  org.springframework.web.bind.annotation.GetMapping
 *  org.springframework.web.bind.annotation.PathVariable
 *  org.springframework.web.bind.annotation.PostMapping
 *  org.springframework.web.bind.annotation.RequestBody
 *  org.springframework.web.bind.annotation.RequestMapping
 *  org.springframework.web.bind.annotation.ResponseBody
 */
package com.seer.rds.web.admin;

import com.seer.rds.annotation.SysLog;
import com.seer.rds.dao.UserMessageMapper;
import com.seer.rds.service.admin.UserMessageService;
import com.seer.rds.vo.ResultVo;
import com.seer.rds.vo.UserMessageHqlCondition;
import com.seer.rds.vo.UserMessageUpdateReq;
import com.seer.rds.vo.popWindowsVo;
import com.seer.rds.vo.req.PaginationReq;
import io.swagger.annotations.Api;
import io.swagger.annotations.ApiOperation;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseBody;

@Controller
@RequestMapping(value={"UsrMessage"})
@Api(tags={"\u7528\u6237\u4fe1\u606f\u63a5\u53e3"})
public class UsrMessageController {
    private static final Logger log = LoggerFactory.getLogger(UsrMessageController.class);
    private final UserMessageMapper userMessageMapper;
    private final UserMessageService userMessageService;

    @Autowired
    public UsrMessageController(UserMessageMapper userMessageMapper, UserMessageService userMessageService) {
        this.userMessageService = userMessageService;
        this.userMessageMapper = userMessageMapper;
    }

    @SysLog(operation="setRead", message="@{wind.controller.setRead}")
    @ApiOperation(value="\u8bbe\u7f6e\u4e3a\u5df2\u8bfb/\u672a\u8bfb")
    @PostMapping(value={"/setRead"})
    @ResponseBody
    public void updateIfReadById(@RequestBody UserMessageUpdateReq req) {
        this.userMessageMapper.updateReadById(req.getMessageId(), req.getIfRead());
    }

    @ApiOperation(value="\u83b7\u53d6\u6240\u6709\u7528\u6237\u4fe1\u606f")
    @PostMapping(value={"/getAllMessageByCondition"})
    @ResponseBody
    public ResultVo<Object> getAllMessage(@RequestBody PaginationReq<UserMessageHqlCondition> paginationReq) {
        return ResultVo.response((Object)this.userMessageService.findUserMessageByCondition((UserMessageHqlCondition)paginationReq.getQueryParam(), Integer.valueOf(paginationReq.getCurrentPage()), Integer.valueOf(paginationReq.getPageSize())));
    }

    @SysLog(operation="deleteTask", message="@{wind.controller.deleteTask}")
    @ApiOperation(value="\u5220\u9664\u6d88\u606f\u8bb0\u5f55")
    @GetMapping(value={"/deleteTask/{Id}"})
    @ResponseBody
    public ResultVo<Object> deleteTask(@PathVariable String Id) {
        this.userMessageMapper.deleteById(Id);
        return ResultVo.success();
    }

    @SysLog(operation="setAllRead", message="@{wind.controller.setAllRead}")
    @ApiOperation(value="\u5168\u90e8\u8bbe\u7f6e\u4e3a\u5df2\u8bfb")
    @GetMapping(value={"/setAllRead"})
    @ResponseBody
    public void updateAllRead() {
        this.userMessageMapper.updateAllRead();
    }

    @ApiOperation(value="\u8bbe\u7f6e\u5f39\u7a97\u7c7b\u522b")
    @SysLog(operation="setPopLevel", message="@{wind.controller.setPopLevel}")
    @PostMapping(value={"/setPopLevel"})
    @ResponseBody
    public ResultVo<Object> setPopLevel(@RequestBody popWindowsVo params) {
        this.userMessageService.setPopWindowsLevel(params);
        return ResultVo.success();
    }
}

