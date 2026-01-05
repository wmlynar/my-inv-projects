/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.alibaba.fastjson.JSONObject
 *  com.google.common.collect.Maps
 *  com.seer.rds.config.PropConfig
 *  com.seer.rds.constant.CommonCodeEnum
 *  com.seer.rds.service.admin.DataCacheService
 *  com.seer.rds.service.system.StackMemInfoService
 *  com.seer.rds.service.system.SystemLogService
 *  com.seer.rds.util.feiShuApi.TranslationUtils
 *  com.seer.rds.util.server.Server
 *  com.seer.rds.vo.ResultVo
 *  com.seer.rds.vo.req.PaginationReq
 *  com.seer.rds.vo.req.StackMemInfoReq
 *  com.seer.rds.vo.req.SystemLogReq
 *  com.seer.rds.vo.req.TransLateReq
 *  com.seer.rds.vo.response.DataCacheResp
 *  com.seer.rds.vo.response.PaginationResponseVo
 *  com.seer.rds.web.system.SystemController
 *  io.swagger.annotations.Api
 *  io.swagger.annotations.ApiOperation
 *  org.slf4j.Logger
 *  org.slf4j.LoggerFactory
 *  org.springframework.beans.factory.annotation.Autowired
 *  org.springframework.context.MessageSource
 *  org.springframework.context.i18n.LocaleContextHolder
 *  org.springframework.stereotype.Controller
 *  org.springframework.web.bind.annotation.GetMapping
 *  org.springframework.web.bind.annotation.PostMapping
 *  org.springframework.web.bind.annotation.RequestBody
 *  org.springframework.web.bind.annotation.RequestHeader
 *  org.springframework.web.bind.annotation.RequestMapping
 *  org.springframework.web.bind.annotation.ResponseBody
 */
package com.seer.rds.web.system;

import com.alibaba.fastjson.JSONObject;
import com.google.common.collect.Maps;
import com.seer.rds.config.PropConfig;
import com.seer.rds.constant.CommonCodeEnum;
import com.seer.rds.service.admin.DataCacheService;
import com.seer.rds.service.system.StackMemInfoService;
import com.seer.rds.service.system.SystemLogService;
import com.seer.rds.util.feiShuApi.TranslationUtils;
import com.seer.rds.util.server.Server;
import com.seer.rds.vo.ResultVo;
import com.seer.rds.vo.req.PaginationReq;
import com.seer.rds.vo.req.StackMemInfoReq;
import com.seer.rds.vo.req.SystemLogReq;
import com.seer.rds.vo.req.TransLateReq;
import com.seer.rds.vo.response.DataCacheResp;
import com.seer.rds.vo.response.PaginationResponseVo;
import io.swagger.annotations.Api;
import io.swagger.annotations.ApiOperation;
import java.util.Date;
import java.util.List;
import java.util.Locale;
import java.util.ResourceBundle;
import java.util.Set;
import java.util.concurrent.ConcurrentMap;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.MessageSource;
import org.springframework.context.i18n.LocaleContextHolder;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseBody;

@Controller
@RequestMapping(value={"system"})
@Api(tags={"\u7cfb\u7edf"})
public class SystemController {
    private static final Logger log = LoggerFactory.getLogger(SystemController.class);
    private static final String BUNDLE_NAME = "i18n/messages";
    private final PropConfig propConfig;
    @Autowired
    private MessageSource messageSource;
    @Autowired
    private SystemLogService systemLogService;
    @Autowired
    private DataCacheService dataCacheService;
    @Autowired
    private StackMemInfoService StackMemInfoService;

    public SystemController(PropConfig propConfig) {
        this.propConfig = propConfig;
    }

    @GetMapping(value={"/getLanguagePack"})
    @ResponseBody
    @ApiOperation(value="\u83b7\u53d6\u8bed\u8a00\u5305")
    public ResultVo<Object> getLanguagePack(@RequestHeader(value="language", required=false) String language) {
        ConcurrentMap map = Maps.newConcurrentMap();
        Locale locale = LocaleContextHolder.getLocale();
        log.info("Locale Language Params,{},{}", (Object)locale);
        try {
            ResourceBundle messages = ResourceBundle.getBundle(BUNDLE_NAME, locale);
            Set<String> code = messages.keySet();
            code.stream().forEach(it -> map.put(it, messages.getString((String)it)));
            return ResultVo.response((Object)map);
        }
        catch (Exception e) {
            log.error("Failed To Get Language Pack,{},{}", (Object)locale, (Object)e.getMessage());
            return ResultVo.error((CommonCodeEnum)CommonCodeEnum.SYSTEM_LANGUAGE_ERROR);
        }
    }

    @PostMapping(value={"/translateSourceFile"})
    @ResponseBody
    @ApiOperation(value="\u7ed9\u6307\u5b9a\u6587\u4ef6\u751f\u6210\u7ffb\u8bd1")
    public ResultVo<Object> translateSourceFile(@RequestBody TransLateReq req) {
        int length = req.getTargetLanguageArray().length;
        String[] glossaryFileNameArray = new String[length];
        if (req.getFileType().equals("rdsFrontTs")) {
            for (int i = 0; i < length; ++i) {
                glossaryFileNameArray[i] = "glossary.properties";
            }
        }
        int[] countArray = TranslationUtils.translateFileBySourceFile((String)req.getSourceFilePath(), (String[])glossaryFileNameArray, (String)req.getSourceFilePath(), (String[])req.getTargetLanguageArray(), (String)req.getFileType());
        return ResultVo.success((CommonCodeEnum)CommonCodeEnum.SUCCESS, (Object)countArray);
    }

    @ApiOperation(value="\u83b7\u53d6\u7cfb\u7edf\u65e5\u5fd7(\u5206\u9875\u67e5\u8be2)")
    @PostMapping(value={"/getSystemLog"})
    @ResponseBody
    public ResultVo<Object> getSystemLog(@RequestBody PaginationReq<SystemLogReq> req) throws Exception {
        SystemLogReq queryParam = (SystemLogReq)req.getQueryParam();
        PaginationResponseVo paginationResponseVo = this.systemLogService.findSystemLog(req.getCurrentPage(), req.getPageSize(), queryParam);
        return ResultVo.response((Object)paginationResponseVo);
    }

    @ApiOperation(value="\u83b7\u53d6\u7f13\u5b58\u6570\u636e(\u5206\u9875\u67e5\u8be2)")
    @PostMapping(value={"/getCacheData"})
    @ResponseBody
    public ResultVo<Object> getCacheData(@RequestBody PaginationReq<DataCacheResp> req) throws Exception {
        DataCacheResp queryParam = (DataCacheResp)req.getQueryParam();
        PaginationResponseVo paginationResponseVo = this.dataCacheService.findAllDataCache(req.getCurrentPage(), req.getPageSize(), queryParam);
        return ResultVo.response((Object)paginationResponseVo);
    }

    @GetMapping(value={"/getSystemInfo"})
    @ResponseBody
    @ApiOperation(value="\u83b7\u53d6\u7cfb\u7edf\u4fe1\u606f")
    public ResultVo<Object> getSystemInfo() {
        try {
            Server server = new Server();
            server.copyTo();
            return ResultVo.response((Object)server);
        }
        catch (Exception e) {
            log.error("Failed To getSystemInfo  {}", (Object)e.getMessage());
            return ResultVo.error();
        }
    }

    @GetMapping(value={"/getNowStackMemoryProportion"})
    @ResponseBody
    @ApiOperation(value="\u83b7\u53d6\u5f53\u524d\u5806\u5185\u5b58\u6240\u5360\u5185\u5b58\u7684\u767e\u5206\u6bd4")
    public ResultVo<Object> getNowStackMemoryProportion() {
        try {
            List memoryList = this.StackMemInfoService.getNowStackMemoryPercent();
            return ResultVo.response(memoryList.get(0));
        }
        catch (Exception e) {
            log.error("Failed To getStackMemoryProportion  {}", (Object)e.getMessage());
            return ResultVo.error();
        }
    }

    @PostMapping(value={"/getAvgStackMemoryProportion"})
    @ResponseBody
    @ApiOperation(value="\u83b7\u53d6\u5f53\u5929\u6bcf\u4e2a\u5c0f\u65f6\u7684\u5e73\u5747\u5806\u5185\u5b58\u5360\u7528\u7387")
    public ResultVo<Object> getAvgStackMemoryProportion(@RequestBody StackMemInfoReq req) throws Exception {
        Date date = new Date(req.getDate());
        JSONObject avgStackMemPercent = this.StackMemInfoService.getAvgStackMemPercent(date);
        return ResultVo.response((Object)avgStackMemPercent);
    }
}

