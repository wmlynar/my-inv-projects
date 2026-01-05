/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.alibaba.fastjson.JSONObject
 *  com.seer.rds.annotation.SysLog
 *  com.seer.rds.constant.ApiEnum
 *  com.seer.rds.constant.CommonCodeEnum
 *  com.seer.rds.service.agv.AgvApiService
 *  com.seer.rds.service.wind.RootBp
 *  com.seer.rds.util.OkHttpUtil
 *  com.seer.rds.vo.ResultVo
 *  com.seer.rds.vo.RoboktiAPIVo
 *  com.seer.rds.vo.req.EnergyThresholdBody
 *  com.seer.rds.vo.req.LoopSpeedBody
 *  com.seer.rds.vo.req.RelocStartBody
 *  com.seer.rds.web.agv.AgvOperatorController
 *  io.swagger.annotations.Api
 *  io.swagger.annotations.ApiOperation
 *  org.slf4j.Logger
 *  org.slf4j.LoggerFactory
 *  org.springframework.beans.factory.annotation.Autowired
 *  org.springframework.web.bind.annotation.PathVariable
 *  org.springframework.web.bind.annotation.PostMapping
 *  org.springframework.web.bind.annotation.RequestBody
 *  org.springframework.web.bind.annotation.RequestMapping
 *  org.springframework.web.bind.annotation.RequestParam
 *  org.springframework.web.bind.annotation.ResponseBody
 *  org.springframework.web.bind.annotation.RestController
 */
package com.seer.rds.web.agv;

import com.alibaba.fastjson.JSONObject;
import com.seer.rds.annotation.SysLog;
import com.seer.rds.constant.ApiEnum;
import com.seer.rds.constant.CommonCodeEnum;
import com.seer.rds.service.agv.AgvApiService;
import com.seer.rds.service.wind.RootBp;
import com.seer.rds.util.OkHttpUtil;
import com.seer.rds.vo.ResultVo;
import com.seer.rds.vo.RoboktiAPIVo;
import com.seer.rds.vo.req.EnergyThresholdBody;
import com.seer.rds.vo.req.LoopSpeedBody;
import com.seer.rds.vo.req.RelocStartBody;
import io.swagger.annotations.Api;
import io.swagger.annotations.ApiOperation;
import java.io.IOException;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping(value={"/api/controlled-agv"})
@Api(tags={"\u673a\u5668\u4eba\u64cd\u4f5c"})
public class AgvOperatorController {
    private static final Logger log = LoggerFactory.getLogger(AgvOperatorController.class);
    @Autowired
    private AgvApiService agvService;

    @SysLog(operation="reLocStart", message="@{agv.controller.reLocStart}")
    @PostMapping(value={"/{id}/start-re-loc"})
    @ApiOperation(value="\u673a\u5668\u4eba\u91cd\u5b9a\u4f4d")
    @ResponseBody
    public ResultVo<Object> reLocStart(@PathVariable String id, @RequestBody RelocStartBody req) {
        String res = this.agvService.startReLoc(id, req);
        return ResultVo.response((Object)res);
    }

    @SysLog(operation="confirmReLoc", message="@{agv.controller.confirmReLoc}")
    @PostMapping(value={"/{id}/confirm-re-loc"})
    @ApiOperation(value="\u786e\u8ba4\u5b9a\u4f4d")
    @ResponseBody
    public ResultVo<Object> confirmReLoc(@PathVariable String id) {
        List<String> vehicles = Arrays.asList(id.split(","));
        String res = this.agvService.confirmReLoc(vehicles);
        return ResultVo.response((Object)res);
    }

    @SysLog(operation="cancelReLoc", message="@{agv.controller.cancelReLoc}")
    @PostMapping(value={"/{id}/cancel-re-loc"})
    @ApiOperation(value="\u53d6\u6d88\u91cd\u5b9a\u4f4d")
    @ResponseBody
    public ResultVo<Object> cancelReLoc(@PathVariable String id) {
        List<String> vehicles = Arrays.asList(id.split(","));
        String res = this.agvService.cancelReLoc(vehicles);
        return ResultVo.response((Object)res);
    }

    @SysLog(operation="enableSoftEms", message="@{agv.controller.enableSoftEms}")
    @PostMapping(value={"/{id}/enable-soft-ems"})
    @ApiOperation(value="\u542f\u7528\u8f6f\u6025\u505c")
    @ResponseBody
    public ResultVo<Object> enableSoftEms(@PathVariable String id) {
        List<String> vehicles = Arrays.asList(id.split(","));
        String res = this.agvService.enableSoftEms(vehicles);
        return ResultVo.response((Object)res);
    }

    @SysLog(operation="disableSoftEms", message="@{agv.controller.disableSoftEms}")
    @PostMapping(value={"/{id}/disable-sSoft-ems"})
    @ApiOperation(value="\u53d6\u6d88\u8f6f\u6025\u505c")
    @ResponseBody
    public ResultVo<Object> disableSoftEms(@PathVariable String id) {
        List<String> vehicles = Arrays.asList(id.split(","));
        String res = this.agvService.disableSoftEms(vehicles);
        return ResultVo.response((Object)res);
    }

    @SysLog(operation="startGotoSite", message="@{agv.controller.startGotoSite}")
    @PostMapping(value={"/{id}/goto-site/start"})
    @ApiOperation(value="\u5f00\u59cb\u5bfc\u822a")
    @ResponseBody
    public ResultVo<Object> startGotoSite(@PathVariable String id, @RequestParam(value="siteLabel") String siteLabel) {
        String res = this.agvService.gotoSiteStart(id, siteLabel);
        return ResultVo.response((Object)res);
    }

    @SysLog(operation="pauseGotoSite", message="@{agv.controller.pauseGotoSite}")
    @PostMapping(value={"/{id}/goto-site/pause"})
    @ApiOperation(value="\u6682\u505c\u5bfc\u822a")
    @ResponseBody
    public ResultVo<Object> pauseGotoSite(@PathVariable String id) {
        List<String> vehicles = Arrays.asList(id.split(","));
        String res = this.agvService.gotoSitePause(vehicles);
        return ResultVo.response((Object)res);
    }

    @SysLog(operation="resumeGotoSite", message="@{agv.controller.resumeGotoSite}")
    @PostMapping(value={"/{id}/goto-site/resume"})
    @ApiOperation(value="\u7ee7\u7eed\u5bfc\u822a")
    @ResponseBody
    public ResultVo<Object> resumeGotoSite(@PathVariable String id) {
        List<String> vehicles = Arrays.asList(id.split(","));
        String res = this.agvService.gotoSiteResume(vehicles);
        return ResultVo.response((Object)res);
    }

    @SysLog(operation="cancelGotoSite", message="@{agv.controller.cancelGotoSite}")
    @PostMapping(value={"/{id}/goto-site/cancel"})
    @ApiOperation(value="\u53d6\u6d88\u5bfc\u822a")
    @ResponseBody
    public ResultVo<Object> cancelGotoSite(@PathVariable String id) {
        List<String> vehicles = Arrays.asList(id.split(","));
        String res = this.agvService.cancelGotoSite(vehicles);
        return ResultVo.response((Object)res);
    }

    @SysLog(operation="clearMoveList", message="@{agv.controller.clearMoveList}")
    @PostMapping(value={"/{id}/clear-move-list"})
    @ApiOperation(value="\u6e05\u9664\u6240\u6709\u5bfc\u822a\u8def\u5f84")
    @ResponseBody
    public ResultVo<Object> clearMoveList(@PathVariable String id) {
        List<String> vehicles = Arrays.asList(id.split(","));
        String res = this.agvService.clearMoveList(vehicles);
        return ResultVo.response((Object)res);
    }

    @SysLog(operation="clearAllErrors", message="@{agv.controller.clearAllErrors}")
    @PostMapping(value={"/clear-all-errors"})
    @ApiOperation(value="\u6e05\u9664\u6240\u6709\u9519\u8bef\u4fe1\u606f")
    @ResponseBody
    public ResultVo<Object> clearAllErrors() {
        String res = this.agvService.clearAllErrors();
        return ResultVo.response((Object)res);
    }

    @SysLog(operation="clearRobotAllError", message="@{agv.controller.clearRobotAllError}")
    @PostMapping(value={"/{id}/clear-robot-all-errors"})
    @ApiOperation(value="\u6e05\u9664\u6240\u6709\u673a\u5668\u4eba\u9519\u8bef\u4fe1\u606f")
    @ResponseBody
    public ResultVo<Object> clearRobotAllError(@PathVariable String id) {
        List<String> vehicles = Arrays.asList(id.split(","));
        String res = this.agvService.clearRobotAllError(vehicles);
        return ResultVo.response((Object)res);
    }

    @SysLog(operation="lock", message="@{agv.controller.lock}")
    @PostMapping(value={"/{id}/lock"})
    @ApiOperation(value="\u83b7\u53d6\u673a\u5668\u4eba\u63a7\u5236\u6743")
    @ResponseBody
    public ResultVo<Object> lock(@PathVariable String id) {
        List<String> vehicles = Arrays.asList(id.split(","));
        String res = this.agvService.lock(vehicles);
        return ResultVo.response((Object)res);
    }

    @SysLog(operation="unlock", message="@{agv.controller.unlock}")
    @PostMapping(value={"/{id}/unlock"})
    @ApiOperation(value="\u91ca\u653e\u673a\u5668\u4eba\u63a7\u5236\u6743")
    @ResponseBody
    public ResultVo<Object> unlock(@PathVariable String id) {
        List<String> vehicles = Arrays.asList(id.split(","));
        String res = this.agvService.unlock(vehicles);
        return ResultVo.response((Object)res);
    }

    @SysLog(operation="setDispatchable", message="@{agv.controller.setDispatchable}")
    @ResponseBody
    @PostMapping(value={"/{id}/dispatchable/{type}"})
    @ApiOperation(value="\u8bbe\u7f6e\u673a\u5668\u4eba\u53ef\u63a5\u5355/\u4e0d\u53ef\u63a5\u5355", notes="type\u53d6\u503c\uff1a\u53ef\u63a5\u5355-dispatchable\uff0c\u4e0d\u53ef\u63a5\u5355\u5c0f\u8f66\u5360\u7528\u8d44\u6e90-undispatchable_unignore\uff0c\u4e0d\u53ef\u63a5\u5355\u5c0f\u8f66\u4e0d\u5360\u7528\u8d44\u6e90-undispatchable_ignore")
    public ResultVo<Object> setDispatchable(@PathVariable String id, @PathVariable String type) {
        List<String> vehicles = Arrays.asList(id.split(","));
        String res = this.agvService.dispatchable(type, vehicles);
        return ResultVo.response((Object)res);
    }

    @SysLog(operation="setSingleForkDispatchable", message="@{agv.controller.setSingleForkDispatchable}")
    @ResponseBody
    @PostMapping(value={"/singleFork/{id}/dispatchable/{type}"})
    @ApiOperation(value="\u8bbe\u7f6e\u673a\u5668\u4eba\u53ef\u63a5\u5355/\u4e0d\u53ef\u63a5\u5355", notes="type\u53d6\u503c\uff1a\u53ef\u63a5\u5355-dispatchable\uff0c\u4e0d\u53ef\u63a5\u5355\u5c0f\u8f66\u5360\u7528\u8d44\u6e90-undispatchable_unignore\uff0c\u4e0d\u53ef\u63a5\u5355\u5c0f\u8f66\u4e0d\u5360\u7528\u8d44\u6e90-undispatchable_ignore")
    public ResultVo<Object> setSingleForkDispatchable(@PathVariable String id, @PathVariable String type) {
        return this.setDispatchable(id, type);
    }

    @SysLog(operation="openLoop", message="@{agv.controller.openLoop}")
    @ResponseBody
    @PostMapping(value={"/{id}/open-loop"})
    @ApiOperation(value="\u5f00\u73af\u8fd0\u52a8")
    public ResultVo<Object> openLoop(@PathVariable String id, @RequestBody LoopSpeedBody req) {
        String res = this.agvService.openLoop(id, req);
        return ResultVo.response((Object)res);
    }

    @SysLog(operation="energyThreshold", message="@{agv.controller.energyThreshold}")
    @ResponseBody
    @PostMapping(value={"/{id}/energy-threshold"})
    @ApiOperation(value="\u8bbe\u7f6e\u7535\u91cf\u9608\u503c")
    public ResultVo<Object> energyThreshold(@PathVariable String id, @RequestBody EnergyThresholdBody req) {
        List<String> vehicles = Arrays.asList(id.split(","));
        String res = this.agvService.energyThreshold(vehicles, req);
        return ResultVo.response((Object)res);
    }

    @ResponseBody
    @PostMapping(value={"/robokitAPI"})
    public ResultVo<Object> generalRobokitAPI(@RequestBody RoboktiAPIVo req) {
        try {
            Map stringStringMap = OkHttpUtil.postJson((String)RootBp.getUrl((String)ApiEnum.generalRobokitAPI.getUri()), (String)JSONObject.toJSONString((Object)req));
            return ResultVo.response((Object)stringStringMap);
        }
        catch (IOException e) {
            log.error("robokitAPI error {}", (Throwable)e);
            return ResultVo.error((CommonCodeEnum)CommonCodeEnum.ROBOT_STATUS_SYC_EXCEPTION);
        }
    }
}

