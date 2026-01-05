/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.annotation.SysLog
 *  com.seer.rds.constant.CommonCodeEnum
 *  com.seer.rds.dao.ModbusInstanceMapper
 *  com.seer.rds.modbus.Modbus4jUtils
 *  com.seer.rds.model.modbus.ModbusInstance
 *  com.seer.rds.model.modbus.ModbusReadLog
 *  com.seer.rds.model.modbus.ModbusWriteLog
 *  com.seer.rds.service.modbus.ModbusService
 *  com.seer.rds.util.LocaleMessageUtil
 *  com.seer.rds.vo.ResultVo
 *  com.seer.rds.vo.req.PaginationReq
 *  com.seer.rds.vo.response.ModbusReadResponseVo
 *  com.seer.rds.vo.response.ModbusWriteResponseVo
 *  com.seer.rds.vo.response.PaginationResponseVo
 *  com.seer.rds.web.agv.ModbusController
 *  io.swagger.annotations.Api
 *  io.swagger.annotations.ApiOperation
 *  javax.servlet.http.HttpServletResponse
 *  org.apache.commons.lang3.StringUtils
 *  org.slf4j.Logger
 *  org.slf4j.LoggerFactory
 *  org.springframework.beans.factory.annotation.Autowired
 *  org.springframework.context.i18n.LocaleContextHolder
 *  org.springframework.data.domain.Page
 *  org.springframework.stereotype.Controller
 *  org.springframework.web.bind.annotation.PostMapping
 *  org.springframework.web.bind.annotation.RequestBody
 *  org.springframework.web.bind.annotation.RequestMapping
 *  org.springframework.web.bind.annotation.ResponseBody
 *  springfox.documentation.annotations.ApiIgnore
 */
package com.seer.rds.web.agv;

import com.seer.rds.annotation.SysLog;
import com.seer.rds.constant.CommonCodeEnum;
import com.seer.rds.dao.ModbusInstanceMapper;
import com.seer.rds.modbus.Modbus4jUtils;
import com.seer.rds.model.modbus.ModbusInstance;
import com.seer.rds.model.modbus.ModbusReadLog;
import com.seer.rds.model.modbus.ModbusWriteLog;
import com.seer.rds.service.modbus.ModbusService;
import com.seer.rds.util.LocaleMessageUtil;
import com.seer.rds.vo.ResultVo;
import com.seer.rds.vo.req.PaginationReq;
import com.seer.rds.vo.response.ModbusReadResponseVo;
import com.seer.rds.vo.response.ModbusWriteResponseVo;
import com.seer.rds.vo.response.PaginationResponseVo;
import io.swagger.annotations.Api;
import io.swagger.annotations.ApiOperation;
import java.util.Date;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import java.util.stream.Collectors;
import javax.servlet.http.HttpServletResponse;
import org.apache.commons.lang3.StringUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.i18n.LocaleContextHolder;
import org.springframework.data.domain.Page;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseBody;
import springfox.documentation.annotations.ApiIgnore;

@Controller
@RequestMapping(value={"api"})
@Api(tags={"Modbus \u8bfb\u5199\u7ba1\u7406"})
public class ModbusController {
    private static final Logger log = LoggerFactory.getLogger(ModbusController.class);
    @Autowired
    private ModbusService modbusService;
    @Autowired
    private ModbusInstanceMapper modbusInstanceMapper;
    @Autowired
    private LocaleMessageUtil localeMessageUtil;

    @ApiOperation(value="modbus \u8bfb\u8bb0\u5f55")
    @PostMapping(value={"/modbus/findReadLogs"})
    @ResponseBody
    public ResultVo<Object> findReadLogs(@RequestBody PaginationReq<ModbusReadLog> request, @ApiIgnore HttpServletResponse response) {
        int currPage = request.getCurrentPage();
        int pageSize = request.getPageSize();
        Page modbusReadLogs = this.modbusService.findAllReadLog(currPage, pageSize);
        List content = modbusReadLogs.getContent();
        List resList = content.stream().map(m -> ModbusReadResponseVo.builder().id(m.getId()).createTime(m.getCreateTime().toString()).mHost(m.getMHost()).mPort(m.getMPort()).functionCode(m.getFunctionCode()).slaveId(m.getSlaveId()).mOffset(m.getMOffset()).readLength(m.getReadLength()).oldValues(m.getOldValues()).newValues(m.getNewValues()).remark(m.getRemark()).build()).collect(Collectors.toList());
        PaginationResponseVo paginationResponseVo = new PaginationResponseVo();
        paginationResponseVo.setTotalCount(Long.valueOf(modbusReadLogs.getTotalElements()));
        paginationResponseVo.setCurrentPage(Integer.valueOf(currPage));
        paginationResponseVo.setPageSize(Integer.valueOf(pageSize));
        paginationResponseVo.setTotalPage(Integer.valueOf(modbusReadLogs.getTotalPages()));
        paginationResponseVo.setPageList(resList);
        return ResultVo.response((Object)paginationResponseVo);
    }

    @ApiOperation(value="modbus \u5199\u8bb0\u5f55")
    @PostMapping(value={"/modbus/findWriteLogs"})
    @ResponseBody
    public ResultVo<Object> findWriteLogs(@RequestBody PaginationReq<ModbusWriteLog> request, @ApiIgnore HttpServletResponse response) {
        int currPage = request.getCurrentPage();
        int pageSize = request.getPageSize();
        Page modbusReadLogs = this.modbusService.findAllWriteLog(currPage, pageSize);
        List content = modbusReadLogs.getContent();
        List resList = content.stream().map(m -> ModbusWriteResponseVo.builder().id(m.getId()).createTime(m.getCreateTime().toString()).mHost(m.getMHost()).mPort(m.getMPort()).functionCode(m.getFunctionCode()).slaveId(m.getSlaveId()).mOffset(m.getMOffset()).writeLength(m.getWriteLength()).writeValues(m.getWriteValues()).remark(m.getRemark()).build()).collect(Collectors.toList());
        PaginationResponseVo paginationResponseVo = new PaginationResponseVo();
        paginationResponseVo.setTotalCount(Long.valueOf(modbusReadLogs.getTotalElements()));
        paginationResponseVo.setCurrentPage(Integer.valueOf(currPage));
        paginationResponseVo.setPageSize(Integer.valueOf(pageSize));
        paginationResponseVo.setTotalPage(Integer.valueOf(modbusReadLogs.getTotalPages()));
        paginationResponseVo.setPageList(resList);
        return ResultVo.response((Object)paginationResponseVo);
    }

    @PostMapping(value={"/modbus/instance/find"})
    @ApiOperation(value="\u67e5\u8be2modbus\u5b9e\u4f8b")
    @ResponseBody
    public ResultVo<Object> find(@RequestBody(required=false) ModbusInstance request) {
        try {
            return ResultVo.response((Object)this.modbusService.findInstanceByCondition(request));
        }
        catch (Exception e) {
            log.error("get modbus instance error", (Throwable)e);
            return ResultVo.error((String)e.getMessage());
        }
    }

    @PostMapping(value={"/modbus/instance/findByPagination"})
    @ApiOperation(value="\u5206\u9875\u67e5\u8be2modbus\u5b9e\u4f8b")
    @ResponseBody
    public ResultVo<Object> findByPagination(@RequestBody PaginationReq<ModbusInstance> request) {
        try {
            PaginationResponseVo paginationResponseVo = this.modbusService.findInstancePaginationByCondition(request.getCurrentPage(), request.getPageSize(), (ModbusInstance)request.getQueryParam());
            return ResultVo.response((Object)paginationResponseVo);
        }
        catch (Exception e) {
            log.error("get modbus instance error", (Throwable)e);
            return ResultVo.error((String)e.getMessage());
        }
    }

    @PostMapping(value={"/modbus/instance/add"})
    @ApiOperation(value="\u65b0\u589emodbus\u5b9e\u4f8b")
    @ResponseBody
    @SysLog(operation="addModbusInstance", message="add modbus instance")
    public ResultVo<Object> add(@RequestBody ModbusInstance instance) {
        if (instance.getId() != null) {
            return ResultVo.error((String)"unnecessary field 'id'");
        }
        ResultVo resultVo = this.checkInstanceRequiredFields(instance);
        if (resultVo != null) {
            return resultVo;
        }
        List tempInstances = this.modbusInstanceMapper.findAllByNameOrHostAndPortAndSlaveIdAndTypeAndTargetAddr(instance.getName(), instance.getHost(), instance.getPort().intValue(), instance.getSlaveId().intValue(), instance.getType(), instance.getTargetAddr());
        if (tempInstances != null && !tempInstances.isEmpty()) {
            return ResultVo.error((String)this.localeMessageUtil.getMessageMatch("@{modbus.instance.duplicated}", LocaleContextHolder.getLocale()));
        }
        instance.setId(UUID.randomUUID().toString());
        instance.setCreateTime(new Date());
        instance.setUpdateTime(new Date());
        this.modbusService.saveInstance(instance);
        Modbus4jUtils.putInstance((String)instance.getName(), (ModbusInstance)instance);
        return ResultVo.success();
    }

    @PostMapping(value={"/modbus/instance/edit"})
    @ApiOperation(value="\u4fee\u6539modbus\u5b9e\u4f8b")
    @ResponseBody
    @SysLog(operation="editModbusInstance", message="edit modbus instance")
    public ResultVo<Object> edit(@RequestBody ModbusInstance instance) {
        if (instance == null) {
            return ResultVo.error((String)this.localeMessageUtil.getMessageMatch("@{modbus.instance.missing}", LocaleContextHolder.getLocale()));
        }
        if (instance.getId() == null) {
            return ResultVo.error((CommonCodeEnum)CommonCodeEnum.ID_MISSING);
        }
        ResultVo resultVo = this.checkInstanceRequiredFields(instance);
        if (resultVo != null) {
            return resultVo;
        }
        ModbusInstance tempInstance = this.modbusInstanceMapper.findOneById(instance.getId());
        if (tempInstance == null) {
            return ResultVo.error((String)this.localeMessageUtil.getMessageMatch("@{modbus.instance.missing}", LocaleContextHolder.getLocale()));
        }
        List otherInstances = this.modbusInstanceMapper.findAllByNameOrHostAndPortAndSlaveIdAndTypeAndTargetAddr(instance.getName(), instance.getHost(), instance.getPort().intValue(), instance.getSlaveId().intValue(), instance.getType(), instance.getTargetAddr());
        if (otherInstances != null && !otherInstances.isEmpty()) {
            for (ModbusInstance other : otherInstances) {
                if (Objects.equals(other.getId(), instance.getId())) continue;
                if (Objects.equals(other.getName(), instance.getName())) {
                    return ResultVo.error((String)this.localeMessageUtil.getMessageMatch("@{modbus.instance.duplicated}", LocaleContextHolder.getLocale()));
                }
                if (!Objects.equals(other.getHost(), instance.getHost()) || !Objects.equals(other.getPort(), instance.getPort()) || !Objects.equals(other.getSlaveId(), instance.getSlaveId()) || !Objects.equals(other.getType(), instance.getType()) || !Objects.equals(other.getTargetAddr(), instance.getTargetAddr())) continue;
                return ResultVo.error((String)this.localeMessageUtil.getMessageMatch("@{modbus.instance.duplicated}", LocaleContextHolder.getLocale()));
            }
        }
        instance.setCreateTime(tempInstance.getCreateTime());
        instance.setUpdateTime(new Date());
        this.modbusService.saveInstance(instance);
        Modbus4jUtils.removeInstance((String)tempInstance.getName());
        Modbus4jUtils.putInstance((String)instance.getName(), (ModbusInstance)instance);
        return ResultVo.success();
    }

    @PostMapping(value={"/modbus/instance/remove"})
    @ApiOperation(value="\u5220\u9664modbus\u5b9e\u4f8b")
    @ResponseBody
    @SysLog(operation="removeModbusInstance", message="remove modbus instance")
    public ResultVo<Object> remove(@RequestBody List<String> ids) {
        int updateNums = this.modbusService.deleteInstanceByIds(ids);
        return ResultVo.response(Map.of("update", updateNums));
    }

    @PostMapping(value={"/modbus/instance/conn"})
    @ApiOperation(value="\u8fde\u63a5modbus\u5b9e\u4f8b")
    @ResponseBody
    @SysLog(operation="connModbusInstance", message="connect modbus instance")
    public ResultVo<Object> tryConnect(@RequestBody ModbusInstance instance) {
        if (StringUtils.isEmpty((CharSequence)instance.getName())) {
            return ResultVo.error((CommonCodeEnum)CommonCodeEnum.NAME_MISSING);
        }
        try {
            Number value = Modbus4jUtils.readSingleValueByInstanceName((String)instance.getName(), null, (String)("try connect: " + instance.getName()));
            ResultVo resultVo = new ResultVo();
            resultVo.setCode(CommonCodeEnum.SUCCESS.getCode());
            resultVo.setMsg(this.localeMessageUtil.getMessageMatch("@{modbus.instance.connSuccess}", LocaleContextHolder.getLocale()));
            resultVo.setData((Object)value);
            return resultVo;
        }
        catch (Exception e) {
            log.error(e.getMessage());
            if (!e.getMessage().isBlank() && !e.getMessage().contains("Connection refused: connect")) {
                return ResultVo.error((String)e.getMessage());
            }
            return ResultVo.error((String)this.localeMessageUtil.getMessageMatch("@{modbus.instance.connFailed}", LocaleContextHolder.getLocale()));
        }
    }

    private ResultVo<Object> checkInstanceRequiredFields(ModbusInstance instance) {
        if (instance.getName() == null) {
            return ResultVo.error((CommonCodeEnum)CommonCodeEnum.NAME_MISSING);
        }
        if (instance.getHost() == null) {
            return ResultVo.error((String)"'host' is required!");
        }
        if (instance.getPort() == null) {
            return ResultVo.error((String)"'port' is required!");
        }
        if (instance.getSlaveId() == null) {
            return ResultVo.error((String)"'slaveId' is required!");
        }
        if (instance.getType() == null) {
            return ResultVo.error((String)"'type' is required!");
        }
        if (instance.getTargetAddr() == null) {
            return ResultVo.error((String)"'targetAddr' is required!");
        }
        return null;
    }
}

