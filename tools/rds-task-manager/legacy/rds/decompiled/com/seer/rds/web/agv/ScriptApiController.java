/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.annotation.CheckRequest
 *  com.seer.rds.constant.CommonCodeEnum
 *  com.seer.rds.script.ScriptService
 *  com.seer.rds.service.agv.WindTaskService
 *  com.seer.rds.util.ExcelUtil
 *  com.seer.rds.util.MessageConversionUtils
 *  com.seer.rds.vo.ExcelExportVo
 *  com.seer.rds.vo.ResultVo
 *  com.seer.rds.web.agv.ScriptApiController
 *  io.swagger.annotations.Api
 *  io.swagger.annotations.ApiOperation
 *  javax.servlet.http.HttpServletRequest
 *  javax.servlet.http.HttpServletResponse
 *  org.slf4j.Logger
 *  org.slf4j.LoggerFactory
 *  org.springframework.beans.factory.annotation.Autowired
 *  org.springframework.http.HttpStatus
 *  org.springframework.stereotype.Controller
 *  org.springframework.web.bind.annotation.GetMapping
 *  org.springframework.web.bind.annotation.PostMapping
 *  org.springframework.web.bind.annotation.RequestBody
 *  org.springframework.web.bind.annotation.RequestMapping
 *  org.springframework.web.bind.annotation.ResponseBody
 *  springfox.documentation.annotations.ApiIgnore
 */
package com.seer.rds.web.agv;

import com.seer.rds.annotation.CheckRequest;
import com.seer.rds.constant.CommonCodeEnum;
import com.seer.rds.script.ScriptService;
import com.seer.rds.service.agv.WindTaskService;
import com.seer.rds.util.ExcelUtil;
import com.seer.rds.util.MessageConversionUtils;
import com.seer.rds.vo.ExcelExportVo;
import com.seer.rds.vo.ResultVo;
import io.swagger.annotations.Api;
import io.swagger.annotations.ApiOperation;
import java.util.List;
import java.util.Map;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseBody;
import springfox.documentation.annotations.ApiIgnore;

@Controller
@RequestMapping(value={"script-api"})
@Api(tags={"\u63a5\u6536\u5904\u7406\u811a\u672c\u6ce8\u518c\u7684api\u8bf7\u6c42"})
public class ScriptApiController {
    private static final Logger log = LoggerFactory.getLogger(ScriptApiController.class);
    @Autowired
    private ScriptService scriptService;

    @ApiOperation(value="Excel-export")
    @GetMapping(value={"/downLoad/exportExcel"})
    @ResponseBody
    @CheckRequest
    public void exportExcel(@ApiIgnore HttpServletRequest request, @ApiIgnore HttpServletResponse response) throws Exception {
        String funcName = request.getParameter("funcName");
        String param = request.getParameter("funcParam");
        String folderName = request.getParameter("folderName");
        ExcelExportVo exportVo = this.scriptService.dispatcherExport(funcName, param, folderName == null ? "boot" : folderName);
        ExcelUtil.exportBigXlsx((HttpServletResponse)response, (String)exportVo.getFileName(), (Map)exportVo.getHeadMap(), (List)exportVo.getDataList());
    }

    @ApiOperation(value="\u811a\u672c\u6ce8\u518c\u7684\u63a5\u53e3")
    @PostMapping(value={"/**"}, produces={"application/xml"}, consumes={"application/xml"})
    @ResponseBody
    @CheckRequest
    public Object boot1(@RequestBody(required=false) String param, @ApiIgnore HttpServletRequest request, @ApiIgnore HttpServletResponse response) {
        ResultVo objectResultVo = WindTaskService.checkWindTask();
        if (objectResultVo.getCode().intValue() != CommonCodeEnum.SUCCESS.getCode().intValue()) {
            response.setStatus(HttpStatus.BAD_REQUEST.value());
            return objectResultVo;
        }
        String jsonString = MessageConversionUtils.xmlToJson((String)param);
        try {
            response.setStatus(HttpStatus.OK.value());
            String method = request.getMethod().toString();
            String path = request.getServletPath();
            Map params = request.getParameterMap();
            ResultVo res = this.scriptService.dispatcherWildCard(method, path, jsonString, params);
            if (res == null) {
                log.error("boot res is {}", (Object)res);
                response.setStatus(HttpStatus.BAD_REQUEST.value());
                return ResultVo.error((CommonCodeEnum)CommonCodeEnum.SCRIPT_INIT_ERROR);
            }
            if (res.getCode() > 9000) {
                response.setStatus(HttpStatus.BAD_REQUEST.value());
                return res;
            }
            response.setStatus(res.getCode() != null ? res.getCode().intValue() : HttpStatus.OK.value());
            return res.getData();
        }
        catch (Exception e) {
            log.error("script-api error", (Throwable)e);
            response.setStatus(HttpStatus.BAD_REQUEST.value());
            return ResultVo.error((CommonCodeEnum)CommonCodeEnum.SCRIPT_INIT_ERROR);
        }
    }

    @ApiOperation(value="\u811a\u672c\u6ce8\u518c\u7684\u63a5\u53e3")
    @RequestMapping(value={"/**"})
    @ResponseBody
    @CheckRequest
    public Object boot(@RequestBody(required=false) String functionArgs, @ApiIgnore HttpServletRequest request, @ApiIgnore HttpServletResponse response) {
        try {
            ResultVo objectResultVo = WindTaskService.checkWindTask();
            if (objectResultVo.getCode().intValue() != CommonCodeEnum.SUCCESS.getCode().intValue()) {
                response.setStatus(HttpStatus.BAD_REQUEST.value());
                return objectResultVo;
            }
            response.setStatus(HttpStatus.OK.value());
            String method = request.getMethod().toString();
            String path = request.getServletPath();
            Map params = request.getParameterMap();
            ResultVo res = this.scriptService.dispatcherWildCard(method, path, functionArgs, params);
            if (res == null) {
                log.error("boot res is {}", (Object)res);
                response.setStatus(HttpStatus.BAD_REQUEST.value());
                return ResultVo.error((int)CommonCodeEnum.SCRIPT_INIT_ERROR.getCode(), (String)"This request url or param is bad!", null);
            }
            if (res.getCode() > 9000) {
                response.setStatus(HttpStatus.BAD_REQUEST.value());
                return res;
            }
            response.setStatus(res.getCode() != null ? res.getCode().intValue() : HttpStatus.OK.value());
            return res.getData();
        }
        catch (Exception e) {
            log.error("script-api error", (Throwable)e);
            response.setStatus(HttpStatus.BAD_REQUEST.value());
            return ResultVo.error((int)CommonCodeEnum.SCRIPT_INIT_ERROR.getCode(), (String)e.getMessage(), null);
        }
    }
}

