/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.alibaba.fastjson.JSONObject
 *  com.seer.rds.annotation.SysLog
 *  com.seer.rds.constant.ApiEnum
 *  com.seer.rds.service.wind.RootBp
 *  com.seer.rds.util.OkHttpUtil
 *  com.seer.rds.vo.MonitorPathReq
 *  com.seer.rds.vo.ResultVo
 *  com.seer.rds.web.monitor.MonitorController
 *  org.slf4j.Logger
 *  org.slf4j.LoggerFactory
 *  org.springframework.stereotype.Controller
 *  org.springframework.web.bind.annotation.PostMapping
 *  org.springframework.web.bind.annotation.RequestBody
 *  org.springframework.web.bind.annotation.RequestMapping
 *  org.springframework.web.bind.annotation.ResponseBody
 */
package com.seer.rds.web.monitor;

import com.alibaba.fastjson.JSONObject;
import com.seer.rds.annotation.SysLog;
import com.seer.rds.constant.ApiEnum;
import com.seer.rds.service.wind.RootBp;
import com.seer.rds.util.OkHttpUtil;
import com.seer.rds.vo.MonitorPathReq;
import com.seer.rds.vo.ResultVo;
import java.io.IOException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseBody;

@Controller
@RequestMapping(value={"monitor"})
public class MonitorController {
    private static final Logger log = LoggerFactory.getLogger(MonitorController.class);

    @SysLog(operation="disablePoint", message="@{user.controller.disablePoint}")
    @PostMapping(value={"disablePoint"})
    @ResponseBody
    public ResultVo<Object> disablePoint(@RequestBody MonitorPathReq mpr) {
        log.info("disablePoint {}", (Object)mpr);
        try {
            String res = OkHttpUtil.postJsonParams((String)RootBp.getUrl((String)ApiEnum.disablePoint.getUri()), (String)JSONObject.toJSONString((Object)mpr));
            return ResultVo.response((Object)res);
        }
        catch (IOException e) {
            log.error("disablePoint error {}", (Object)e.getMessage());
            return ResultVo.error();
        }
    }

    @SysLog(operation="enablePoint", message="@{user.controller.enablePoint}")
    @PostMapping(value={"enablePoint"})
    @ResponseBody
    public ResultVo<Object> enablePoint(@RequestBody MonitorPathReq mpr) {
        log.info("enablePoint {}", (Object)mpr);
        try {
            String res = OkHttpUtil.postJsonParams((String)RootBp.getUrl((String)ApiEnum.enablePoint.getUri()), (String)JSONObject.toJSONString((Object)mpr));
            return ResultVo.response((Object)res);
        }
        catch (IOException e) {
            log.error("enablePoint error {}", (Object)e.getMessage());
            return ResultVo.error();
        }
    }

    @SysLog(operation="disablePath", message="@{user.controller.disablePath}")
    @PostMapping(value={"disablePath"})
    @ResponseBody
    public ResultVo<Object> disablePath(@RequestBody MonitorPathReq mpr) {
        log.info("disablePath {}", (Object)mpr);
        try {
            String res = OkHttpUtil.postJsonParams((String)RootBp.getUrl((String)ApiEnum.disablePath.getUri()), (String)JSONObject.toJSONString((Object)mpr));
            return ResultVo.response((Object)res);
        }
        catch (IOException e) {
            log.error("disablePath error {}", (Object)e.getMessage());
            return ResultVo.error();
        }
    }

    @SysLog(operation="enablePath", message="@{user.controller.enablePath}")
    @PostMapping(value={"enablePath"})
    @ResponseBody
    public ResultVo<Object> enablePath(@RequestBody MonitorPathReq mpr) {
        log.info("enablePath {}", (Object)mpr);
        try {
            String res = OkHttpUtil.postJsonParams((String)RootBp.getUrl((String)ApiEnum.enablePath.getUri()), (String)JSONObject.toJSONString((Object)mpr));
            return ResultVo.response((Object)res);
        }
        catch (IOException e) {
            log.error("enablePath error {}", (Object)e.getMessage());
            return ResultVo.error();
        }
    }
}

