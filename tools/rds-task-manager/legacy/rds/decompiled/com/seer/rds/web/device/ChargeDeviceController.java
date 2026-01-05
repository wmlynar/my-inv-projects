/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.service.device.ChargeDeviceService
 *  com.seer.rds.vo.ResultVo
 *  com.seer.rds.vo.req.ChargeModelReq
 *  com.seer.rds.web.device.ChargeDeviceController
 *  io.swagger.annotations.Api
 *  io.swagger.annotations.ApiOperation
 *  org.slf4j.Logger
 *  org.slf4j.LoggerFactory
 *  org.springframework.stereotype.Controller
 *  org.springframework.web.bind.annotation.GetMapping
 *  org.springframework.web.bind.annotation.PostMapping
 *  org.springframework.web.bind.annotation.RequestBody
 *  org.springframework.web.bind.annotation.RequestMapping
 *  org.springframework.web.bind.annotation.ResponseBody
 */
package com.seer.rds.web.device;

import com.seer.rds.service.device.ChargeDeviceService;
import com.seer.rds.vo.ResultVo;
import com.seer.rds.vo.req.ChargeModelReq;
import io.swagger.annotations.Api;
import io.swagger.annotations.ApiOperation;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseBody;

@Controller
@RequestMapping(value={"chargers"})
@Api(tags={"\u8bbe\u5907"})
public class ChargeDeviceController {
    private static final Logger log = LoggerFactory.getLogger(ChargeDeviceController.class);

    @ApiOperation(value="\u67e5\u8be2\u5145\u7535\u8bbe\u5907\u5217\u8868\uff0c\u5bf9\u5916\u63a5\u53e3\u4f7f\u7528")
    @GetMapping(value={"/queryChargers"})
    @ResponseBody
    public ResultVo queryChargers() throws Exception {
        return ResultVo.response((Object)ChargeDeviceService.chargeInfo);
    }

    @ApiOperation(value="\u63d0\u4ea4\u5145\u7535\u6570\u636e\uff0c\u5bf9\u5916\u63a5\u53e3\u4f7f\u7528")
    @PostMapping(value={"/updateChargeModels"})
    @ResponseBody
    public ResultVo queryBlocksByTaskId(@RequestBody List<ChargeModelReq> req) throws Exception {
        try {
            ChargeDeviceService.chargeInfo.clear();
            ChargeDeviceService.chargeInfo.addAll(req);
            return ResultVo.success();
        }
        catch (Exception e) {
            return ResultVo.response((Object)e);
        }
    }
}

