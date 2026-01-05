/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.alibaba.fastjson.JSON
 *  com.alibaba.fastjson.JSONArray
 *  com.alibaba.fastjson.JSONObject
 *  com.seer.rds.annotation.CheckRequest
 *  com.seer.rds.annotation.SysLog
 *  com.seer.rds.config.PropConfig
 *  com.seer.rds.constant.CommonCodeEnum
 *  com.seer.rds.dao.InterfaceDefHistoryMapper
 *  com.seer.rds.dao.InterfaceHandleMapper
 *  com.seer.rds.model.wind.InterfaceDefHistory
 *  com.seer.rds.model.wind.InterfaceHandleRecord
 *  com.seer.rds.model.wind.InterfacePreHandle
 *  com.seer.rds.service.agv.InterfaceService
 *  com.seer.rds.service.agv.WindTaskService
 *  com.seer.rds.vo.ResultVo
 *  com.seer.rds.vo.req.InterfacePreHandleReq
 *  com.seer.rds.vo.req.PaginationReq
 *  com.seer.rds.vo.req.taskListAndVersionReq
 *  com.seer.rds.vo.response.InterfaceDefExport
 *  com.seer.rds.web.agv.InterfaceHandleController
 *  io.swagger.annotations.Api
 *  io.swagger.annotations.ApiOperation
 *  javax.servlet.ServletOutputStream
 *  javax.servlet.http.HttpServletRequest
 *  javax.servlet.http.HttpServletResponse
 *  org.slf4j.Logger
 *  org.slf4j.LoggerFactory
 *  org.springframework.beans.factory.annotation.Autowired
 *  org.springframework.http.HttpStatus
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
import com.seer.rds.annotation.CheckRequest;
import com.seer.rds.annotation.SysLog;
import com.seer.rds.config.PropConfig;
import com.seer.rds.constant.CommonCodeEnum;
import com.seer.rds.dao.InterfaceDefHistoryMapper;
import com.seer.rds.dao.InterfaceHandleMapper;
import com.seer.rds.model.wind.InterfaceDefHistory;
import com.seer.rds.model.wind.InterfaceHandleRecord;
import com.seer.rds.model.wind.InterfacePreHandle;
import com.seer.rds.service.agv.InterfaceService;
import com.seer.rds.service.agv.WindTaskService;
import com.seer.rds.vo.ResultVo;
import com.seer.rds.vo.req.InterfacePreHandleReq;
import com.seer.rds.vo.req.PaginationReq;
import com.seer.rds.vo.req.taskListAndVersionReq;
import com.seer.rds.vo.response.InterfaceDefExport;
import io.swagger.annotations.Api;
import io.swagger.annotations.ApiOperation;
import java.io.IOException;
import java.io.OutputStream;
import java.io.OutputStreamWriter;
import java.io.Writer;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import javax.servlet.ServletOutputStream;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseBody;
import org.springframework.web.multipart.MultipartFile;
import springfox.documentation.annotations.ApiIgnore;

@Controller
@RequestMapping(value={"handle"})
@Api(tags={"\u5929\u98ce\u4efb\u52a1\u63a5\u53e3\u8c03\u7528"})
public class InterfaceHandleController {
    private static final Logger log = LoggerFactory.getLogger(InterfaceHandleController.class);
    private final PropConfig propConfig;
    private final InterfaceService interfaceService;
    private final InterfaceHandleMapper interfaceHandleMapper;
    @Autowired
    private InterfaceDefHistoryMapper interfaceDefHistoryMapper;

    public InterfaceHandleController(InterfaceService interfaceService, InterfaceHandleMapper interfaceHandleMapper, PropConfig propConfig) {
        this.interfaceService = interfaceService;
        this.interfaceHandleMapper = interfaceHandleMapper;
        this.propConfig = propConfig;
    }

    @ApiOperation(value="\u521b\u5efa\u63a5\u53e3\u8c03\u7528")
    @PostMapping(value={"/create-interface/createOrUpdateInterfaceDef"})
    @ResponseBody
    public ResultVo<Object> createInterface(@RequestBody InterfacePreHandle interfacePreHandle) {
        try {
            List byUrlAndMethod = this.interfaceHandleMapper.findByUrlAndMethod(interfacePreHandle.getUrl(), interfacePreHandle.getMethod());
            if (byUrlAndMethod == null || byUrlAndMethod.size() == 0) {
                Integer maxVersion = this.interfaceDefHistoryMapper.findMaxVersion(interfacePreHandle.getUrl(), interfacePreHandle.getMethod());
                if (maxVersion != null) {
                    interfacePreHandle.setVersion(Integer.valueOf(maxVersion + 1));
                }
                if (interfacePreHandle.getVersion() == null) {
                    interfacePreHandle.setVersion(Integer.valueOf(1));
                }
                this.interfaceService.saveInterface(interfacePreHandle);
                InterfaceDefHistory interfaceDefHistory = InterfaceDefHistory.builder().url(interfacePreHandle.getUrl()).detail(interfacePreHandle.getDetail()).method(interfacePreHandle.getMethod()).version(interfacePreHandle.getVersion()).createDate(new Date()).build();
                try {
                    this.interfaceDefHistoryMapper.save((Object)interfaceDefHistory);
                }
                catch (Exception e) {
                    log.error(e.getMessage());
                }
            } else {
                return ResultVo.error((CommonCodeEnum)CommonCodeEnum.Interface_IS_EXIST);
            }
            return ResultVo.success();
        }
        catch (Exception e) {
            log.error("createTaskInterface error", (Throwable)e);
            return ResultVo.error((int)CommonCodeEnum.WIND_LABEL_ERROR.getCode(), (String)CommonCodeEnum.WIND_LABEL_ERROR.getMsg(), null);
        }
    }

    @ApiOperation(value="\u4fdd\u5b58\u63a5\u53e3\u8c03\u7528")
    @PostMapping(value={"/create-interface/updateInterfaceDef"})
    @ResponseBody
    public ResultVo<Object> updateInterface(@RequestBody InterfacePreHandle interfacePreHandle) {
        try {
            List byUrlAndMethod = this.interfaceHandleMapper.findByUrlAndMethod(interfacePreHandle.getUrl(), interfacePreHandle.getMethod());
            if (byUrlAndMethod == null || byUrlAndMethod.size() == 0 || interfacePreHandle.getId().equals(((InterfacePreHandle)byUrlAndMethod.get(0)).getId())) {
                Integer maxVersion = this.interfaceDefHistoryMapper.findMaxVersion(interfacePreHandle.getUrl(), interfacePreHandle.getMethod());
                if (maxVersion != null) {
                    interfacePreHandle.setVersion(Integer.valueOf(maxVersion + 1));
                }
                interfacePreHandle.setCreateDate(new Date());
                this.interfaceService.saveInterface(interfacePreHandle);
                InterfaceDefHistory interfaceDefHistory = InterfaceDefHistory.builder().url(interfacePreHandle.getUrl()).detail(interfacePreHandle.getDetail()).method(interfacePreHandle.getMethod()).version(interfacePreHandle.getVersion()).createDate(new Date()).build();
                try {
                    this.interfaceDefHistoryMapper.save((Object)interfaceDefHistory);
                }
                catch (Exception e) {
                    log.error(e.getMessage());
                }
                return ResultVo.success();
            }
            return ResultVo.error((CommonCodeEnum)CommonCodeEnum.Interface_IS_EXIST);
        }
        catch (Exception e) {
            log.error("createTaskInterface error", (Throwable)e);
            return ResultVo.error((int)CommonCodeEnum.WIND_LABEL_ERROR.getCode(), (String)CommonCodeEnum.WIND_LABEL_ERROR.getMsg(), null);
        }
    }

    @ApiOperation(value="\u83b7\u53d6\u63a5\u53e3\u5b9a\u4e49\u5217\u8868")
    @PostMapping(value={"/getInterfaceList"})
    @ResponseBody
    public ResultVo<Object> getInterfaceList() {
        try {
            List all = this.interfaceService.findAll();
            return ResultVo.response((Object)all);
        }
        catch (Exception e) {
            log.error("createTaskInterface error", (Throwable)e);
            return ResultVo.error((int)CommonCodeEnum.WIND_LABEL_ERROR.getCode(), (String)CommonCodeEnum.WIND_LABEL_ERROR.getMsg(), null);
        }
    }

    @ApiOperation(value="\u67e5\u627e\u5bf9\u5e94\u7684\u4efb\u52a1\u5b9a\u4e49")
    @PostMapping(value={"/findTaskDef"})
    @ResponseBody
    public ResultVo<Object> findOneTaskDef(@RequestBody taskListAndVersionReq taskListAndVersionReq2, @ApiIgnore HttpServletResponse response) throws IOException {
        return ResultVo.response((Object)this.interfaceDefHistoryMapper.findByLabelAndVersion(taskListAndVersionReq2.getUrl(), taskListAndVersionReq2.getMethod(), taskListAndVersionReq2.getVersion()));
    }

    @ApiOperation(value="\u83b7\u53d6\u63a5\u53e3baseUrl")
    @PostMapping(value={"/getInterfaceBaseUrl"})
    @ResponseBody
    public ResultVo<Object> getInterfaceBaseUrl() {
        try {
            String basicUrl = this.propConfig.getSslEnabled() ? "https://ip:" + this.propConfig.getPort() : "http://ip:" + this.propConfig.getHttpPort();
            return ResultVo.response((Object)basicUrl);
        }
        catch (Exception e) {
            log.error("getInterfaceBaseUrl error", (Throwable)e);
            return ResultVo.error();
        }
    }

    @ApiOperation(value="\u5220\u9664\u63a5\u53e3\u8c03\u7528")
    @PostMapping(value={"/delete-interface"})
    @ResponseBody
    public ResultVo<Object> deleteInterface(@RequestBody InterfacePreHandle interfacePreHandle) {
        try {
            this.interfaceService.deleteInterface(interfacePreHandle.getId());
            return ResultVo.success();
        }
        catch (Exception e) {
            log.error("createTaskInterface error", (Throwable)e);
            return ResultVo.error();
        }
    }

    @CheckRequest
    @ApiOperation(value="\u63a5\u53e3\u8c03\u7528\u7684\u63a5\u53e3")
    @RequestMapping(value={"/register/**"}, produces={"application/json"}, consumes={"application/json"})
    @ResponseBody
    public Object boot(@RequestBody(required=false) String functionArgs, @ApiIgnore HttpServletRequest request, @ApiIgnore HttpServletResponse response) {
        String method = request.getMethod();
        String path = request.getServletPath();
        Map params = request.getParameterMap();
        try {
            ResultVo objectResultVo = WindTaskService.checkWindTask();
            if (objectResultVo.getCode().intValue() != CommonCodeEnum.SUCCESS.getCode().intValue()) {
                response.setStatus(HttpStatus.BAD_REQUEST.value());
                return objectResultVo;
            }
            Object resp = this.interfaceService.dispatcherWildCard(method, path, functionArgs, params);
            if (resp == null) {
                throw new IllegalArgumentException("Invalid response from interfaceService.dispatcherWildCard()");
            }
            Map result = (Map)resp;
            response.setStatus(Integer.parseInt(result.get("code").toString()));
            return result.get("body");
        }
        catch (Exception e) {
            log.error("Error occurred in boot(): ", (Throwable)e);
            response.setStatus(HttpStatus.BAD_REQUEST.value());
            return ResultVo.error((CommonCodeEnum)CommonCodeEnum.SCRIPT_INIT_ERROR);
        }
    }

    @ApiOperation(value="\u83b7\u53d6\u6240\u6709\u63a5\u53e3\u5b9e\u4f8b\u4fe1\u606f")
    @PostMapping(value={"/getAllInterfaceByCondition"})
    @ResponseBody
    public ResultVo<Object> getAllInterfaceList(@RequestBody PaginationReq<InterfacePreHandleReq> paginationReq) {
        return ResultVo.response((Object)this.interfaceService.findInterfaceByCondition((InterfacePreHandleReq)paginationReq.getQueryParam(), Integer.valueOf(paginationReq.getCurrentPage()), Integer.valueOf(paginationReq.getPageSize())));
    }

    @ApiOperation(value="\u83b7\u53d6\u6307\u5b9a\u63a5\u53e3\u5b9a\u4e49\u4fe1\u606f")
    @PostMapping(value={"/getInterfaceByCondition"})
    @ResponseBody
    public ResultVo<Object> getInterfaceDef(@RequestBody InterfacePreHandleReq req) throws Exception {
        InterfacePreHandle InterfacePreHandleById = this.interfaceService.findDefById(req.getId());
        return ResultVo.response((Object)InterfacePreHandleById);
    }

    @ApiOperation(value="\u83b7\u53d6\u6307\u5b9a\u63a5\u53e3\u5b9e\u4f8b\u4fe1\u606f")
    @PostMapping(value={"/getInterfaceInstanceByCondition"})
    @ResponseBody
    public ResultVo<Object> getInterfaceInstanceById(@RequestBody InterfacePreHandleReq req) throws Exception {
        InterfaceHandleRecord instanceById = this.interfaceService.findInstanceById(req.getId());
        return ResultVo.response((Object)instanceById);
    }

    @ApiOperation(value="\u5bfc\u5165\u63a5\u53e3\u6587\u4ef6")
    @PostMapping(value={"/importInterface"})
    @ResponseBody
    public ResultVo<Object> importInterface(@RequestBody MultipartFile file) {
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
            log.error("importTaskInterface error", (Throwable)e);
            return ResultVo.error((CommonCodeEnum)CommonCodeEnum.ERROR);
        }
    }

    /*
     * WARNING - Removed try catching itself - possible behaviour change.
     */
    @SysLog(operation="export", message="exportInterfaceDef")
    @ApiOperation(value="\u5bfc\u51fa\u63a5\u53e3\u5b9a\u4e49")
    @PostMapping(value={"/interfaceDef/export"})
    @ResponseBody
    public void batchExportTask(@RequestBody List<String> ids, @ApiIgnore HttpServletResponse response) throws Exception {
        List eventDefLists = this.interfaceHandleMapper.findAll();
        response.setCharacterEncoding("UTF-8");
        response.setContentType("application/octet-stream; charset=UTF-8");
        response.setHeader("Content-Disposition", "attachment; filename=interface.task");
        ServletOutputStream outputStream = response.getOutputStream();
        OutputStreamWriter writer = new OutputStreamWriter((OutputStream)outputStream, "UTF-8");
        try (ServletOutputStream out = response.getOutputStream();){
            List collect = eventDefLists.stream().filter(e -> ids.contains(e.getId())).map(w -> {
                InterfaceDefExport resp = new InterfaceDefExport();
                resp.setId(w.getId());
                resp.setProjectId(w.getProjectId());
                resp.setDetail(w.getDetail());
                resp.setMethod(w.getMethod());
                resp.setTaskDefLabel(w.getTaskDefLabel());
                resp.setPda(w.getPda());
                resp.setUrl(w.getUrl());
                return resp;
            }).collect(Collectors.toList());
            writer.write(JSON.toJSONString(collect));
            ((Writer)writer).flush();
            ((Writer)writer).close();
        }
        catch (IOException e2) {
            log.error("\u5bfc\u51fa\u63a5\u53e3\u5b9a\u4e49\u4efb\u52a1\u5931\u8d25", (Throwable)e2);
        }
        finally {
            try {
                ((Writer)writer).close();
            }
            catch (IOException e3) {
                log.error("\u5bfc\u51fa\u63a5\u53e3\u5b9a\u4e49\u4efb\u52a1\u5931\u8d25", (Throwable)e3);
            }
        }
    }

    public List<InterfacePreHandle> findInterfaceTaskDefByInterfaceCategoryIdIs() {
        return this.interfaceHandleMapper.findInterfaceTaskDefByInterfaceCategoryIdIs();
    }

    public void updateInterfaceCategoryId(InterfacePreHandle interfacePreHandle) {
        this.interfaceHandleMapper.updateInterfaceCategoryId(interfacePreHandle.getIntertfaceCategoryId(), interfacePreHandle.getId());
    }

    @ApiOperation(value="\u4fee\u6539\u63a5\u53e3\u540d\u79f0")
    @PostMapping(value={"/modifyInterfaceName"})
    @ResponseBody
    public ResultVo<Object> modifyInterfaceName(@RequestBody InterfacePreHandleReq req) throws Exception {
        try {
            List byUrlAndMethod = this.interfaceHandleMapper.findByUrlAndMethod(req.getUrl(), req.getMethod());
            if (byUrlAndMethod != null && byUrlAndMethod.size() != 0) {
                return ResultVo.error((CommonCodeEnum)CommonCodeEnum.Interface_IS_EXIST);
            }
            InterfacePreHandle interfacePreHandleById = this.interfaceService.findDefById(req.getId());
            interfacePreHandleById.setTaskDefLabel(req.getTaskDefLabel());
            interfacePreHandleById.setUrl(req.getUrl());
            this.interfaceService.saveInterface(interfacePreHandleById);
            return ResultVo.success();
        }
        catch (Exception e) {
            log.error("modifyInterfaceName error", (Throwable)e);
            return ResultVo.error((int)CommonCodeEnum.WIND_LABEL_ERROR.getCode(), (String)CommonCodeEnum.WIND_LABEL_ERROR.getMsg(), null);
        }
    }
}

