/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.constant.SiteGroupTransferDemandStatus
 *  com.seer.rds.model.SiteGroupDemand.SiteGroupDemand
 *  com.seer.rds.service.agv.SiteGroupDemandService
 *  com.seer.rds.vo.ResultVo
 *  com.seer.rds.vo.req.PaginationReq
 *  com.seer.rds.vo.req.SiteGroupDemandReq
 *  com.seer.rds.web.agv.SiteGroupDemandController
 *  io.swagger.annotations.Api
 *  io.swagger.annotations.ApiOperation
 *  javax.validation.Valid
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

import com.seer.rds.constant.SiteGroupTransferDemandStatus;
import com.seer.rds.model.SiteGroupDemand.SiteGroupDemand;
import com.seer.rds.service.agv.SiteGroupDemandService;
import com.seer.rds.vo.ResultVo;
import com.seer.rds.vo.req.PaginationReq;
import com.seer.rds.vo.req.SiteGroupDemandReq;
import io.swagger.annotations.Api;
import io.swagger.annotations.ApiOperation;
import java.util.Date;
import java.util.List;
import javax.validation.Valid;
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
@RequestMapping(value={"api"})
@Api(tags={"\u5e93\u533a\u8f6c\u8fd0"})
public class SiteGroupDemandController {
    private static final Logger log = LoggerFactory.getLogger(SiteGroupDemandController.class);
    @Autowired
    private SiteGroupDemandService siteGroupDemandService;

    @ApiOperation(value="\u6dfb\u52a0\u5e93\u533a\u8f6c\u8fd0\u9700\u6c42")
    @PostMapping(value={"/siteGroupDemand/add"})
    @ResponseBody
    public ResultVo<Object> addSiteGroupDemand(@RequestBody SiteGroupDemandReq siteGroupDemandReq) {
        if (StringUtils.isEmpty((CharSequence)siteGroupDemandReq.getFromGroup()) || StringUtils.isEmpty((CharSequence)siteGroupDemandReq.getToGroup())) {
            return ResultVo.error();
        }
        SiteGroupDemand siteGroupDemand = new SiteGroupDemand();
        siteGroupDemand.setCreatedOn(new Date());
        siteGroupDemand.setFromGroup(siteGroupDemandReq.getFromGroup());
        siteGroupDemand.setToGroup(siteGroupDemandReq.getToGroup());
        siteGroupDemand.setGroupName(siteGroupDemandReq.getGroupName());
        siteGroupDemand.setVehicleName(siteGroupDemandReq.getVehicleName());
        siteGroupDemand.setVehicleMaxNumber(siteGroupDemandReq.getVehicleMaxNumber());
        siteGroupDemand.setStatus(Integer.valueOf(SiteGroupTransferDemandStatus.running.getStatus()));
        new Thread(() -> {
            this.siteGroupDemandService.addOrUpdate(siteGroupDemand);
            this.siteGroupDemandService.runDemand(siteGroupDemand);
        }).start();
        return ResultVo.success();
    }

    @ApiOperation(value="\u83b7\u53d6\u5e93\u533a\u8f6c\u8fd0\u9700\u6c42\u5217\u8868")
    @PostMapping(value={"/siteGroupDemand/get"})
    @ResponseBody
    public ResultVo<Object> getSiteGroupDemand(@RequestBody @Valid PaginationReq req) {
        return ResultVo.response((Object)this.siteGroupDemandService.findByConditionForExternalInterfacesPaging(Integer.valueOf(req.getCurrentPage()), Integer.valueOf(req.getPageSize())));
    }

    @ApiOperation(value="\u83b7\u53d6\u672a\u5b8c\u6210\u7684\u5e93\u533a\u8f6c\u8fd0\u9700\u6c42\u5217\u8868\u6570\u91cf")
    @PostMapping(value={"/siteGroupDemand/getNotStopped"})
    @ResponseBody
    public ResultVo<Object> getNotStoppedSiteGroupDemand() {
        return ResultVo.response((Object)this.siteGroupDemandService.getNotStopped());
    }

    @ApiOperation(value="\u6839\u636eid\u83b7\u53d6\u5e93\u533a\u8f6c\u8fd0\u9700\u6c42\u5217\u8868")
    @PostMapping(value={"/siteGroupDemand/getById"})
    @ResponseBody
    public ResultVo<Object> getSiteGroupDemandById(@RequestBody SiteGroupDemandReq siteGroupDemandReq) {
        return ResultVo.response((Object)this.siteGroupDemandService.getById(siteGroupDemandReq.getId()));
    }

    @ApiOperation(value="\u7ec8\u6b62\u5355\u4e2a\u5e93\u533a\u8f6c\u8fd0\u9700\u6c42\u5217\u8868")
    @PostMapping(value={"/siteGroupDemand/stop"})
    @ResponseBody
    public ResultVo<Object> stopSiteGroupDemand(@RequestBody List<SiteGroupDemandReq> siteGroupDemandList) {
        siteGroupDemandList.forEach(e -> this.siteGroupDemandService.stop(e.getId()));
        return ResultVo.success();
    }

    @ApiOperation(value="\u7ec8\u6b62\u6240\u6709\u5e93\u533a\u8f6c\u8fd0\u9700\u6c42\u5217\u8868")
    @PostMapping(value={"/siteGroupDemand/stopAll"})
    @ResponseBody
    public ResultVo<Object> stopAllSiteGroupDemand() {
        this.siteGroupDemandService.stopAll();
        return ResultVo.success();
    }

    @ApiOperation(value="\u6682\u505c\u5355\u4e2a\u5e93\u533a\u8f6c\u8fd0\u9700\u6c42\u5217\u8868")
    @PostMapping(value={"/siteGroupDemand/interrupt"})
    @ResponseBody
    public ResultVo<Object> interruptGroupDemand(@RequestBody List<SiteGroupDemandReq> siteGroupDemandList) {
        siteGroupDemandList.forEach(e -> this.siteGroupDemandService.interrupt(e.getId()));
        return ResultVo.success();
    }

    @ApiOperation(value="\u6682\u505c\u6240\u6709\u5e93\u533a\u8f6c\u8fd0\u9700\u6c42\u5217\u8868")
    @PostMapping(value={"/siteGroupDemand/interruptAll"})
    @ResponseBody
    public ResultVo<Object> interruptAllSiteGroupDemand() {
        this.siteGroupDemandService.interruptAll();
        return ResultVo.success();
    }

    @ApiOperation(value="\u6062\u590d\u5355\u4e2a\u5e93\u533a\u8f6c\u8fd0\u9700\u6c42\u5217\u8868")
    @PostMapping(value={"/siteGroupDemand/resume"})
    @ResponseBody
    public ResultVo<Object> resumeGroupDemand(@RequestBody List<SiteGroupDemandReq> siteGroupDemandList) {
        siteGroupDemandList.forEach(e -> this.siteGroupDemandService.resume(e.getId()));
        return ResultVo.success();
    }

    @ApiOperation(value="\u6062\u590d\u6240\u6709\u5e93\u533a\u8f6c\u8fd0\u9700\u6c42\u5217\u8868")
    @PostMapping(value={"/siteGroupDemand/resumeAll"})
    @ResponseBody
    public ResultVo<Object> resumeAllSiteGroupDemand() {
        this.siteGroupDemandService.resumeAll();
        return ResultVo.success();
    }
}

