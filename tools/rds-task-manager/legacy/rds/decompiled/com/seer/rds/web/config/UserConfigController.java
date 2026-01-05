/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.model.admin.UserConfigRecord
 *  com.seer.rds.service.system.ConfigService
 *  com.seer.rds.vo.ResultVo
 *  com.seer.rds.vo.req.UserMapConfigReq
 *  com.seer.rds.web.config.UserConfigController
 *  io.swagger.annotations.Api
 *  io.swagger.annotations.ApiOperation
 *  org.springframework.beans.factory.annotation.Autowired
 *  org.springframework.web.bind.annotation.PostMapping
 *  org.springframework.web.bind.annotation.RequestBody
 *  org.springframework.web.bind.annotation.RequestMapping
 *  org.springframework.web.bind.annotation.ResponseBody
 *  org.springframework.web.bind.annotation.RestController
 */
package com.seer.rds.web.config;

import com.seer.rds.model.admin.UserConfigRecord;
import com.seer.rds.service.system.ConfigService;
import com.seer.rds.vo.ResultVo;
import com.seer.rds.vo.req.UserMapConfigReq;
import io.swagger.annotations.Api;
import io.swagger.annotations.ApiOperation;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping(value={"/api/userConfig"})
@Api(tags={"\u7528\u6237\u914d\u7f6e"})
public class UserConfigController {
    @Autowired
    private ConfigService configService;

    @ApiOperation(value="\u83b7\u53d6\u8fd0\u884c\u76d1\u63a7\u754c\u9762\u5730\u56fe\u914d\u7f6e\u4fe1\u606f")
    @PostMapping(value={"/getUserMapConfig"})
    @ResponseBody
    public ResultVo<Object> getUserMapConfig(@RequestBody UserMapConfigReq mapConfig) {
        UserConfigRecord userConfigRecord = this.configService.getMapConfigByUserKey(mapConfig.getUserKey());
        return ResultVo.response((Object)userConfigRecord);
    }

    @ApiOperation(value="\u4fdd\u5b58\u8fd0\u884c\u76d1\u63a7\u754c\u9762\u5730\u56fe\u914d\u7f6e\u4fe1\u606f")
    @PostMapping(value={"/saveUserMapConfig"})
    @ResponseBody
    public ResultVo<Object> saveUserMapConfig(@RequestBody UserMapConfigReq mapConfig) {
        this.configService.saveMapConfig(mapConfig);
        return ResultVo.success();
    }

    @ApiOperation(value="\u67e5\u8be2\u7f51\u9875\u5c0f\u6807\u7b7e")
    @PostMapping(value={"/getTittleConfig"})
    @ResponseBody
    public ResultVo<Object> getTittleConfig(@RequestBody UserMapConfigReq mapConfig) {
        UserConfigRecord userConfigRecord = this.configService.getTittleConfigByUserKey(mapConfig.getUserKey());
        return ResultVo.response((Object)userConfigRecord);
    }

    @ApiOperation(value="\u4fdd\u5b58\u7f51\u9875\u5c0f\u6807\u7b7e")
    @PostMapping(value={"/saveTittleConfig"})
    @ResponseBody
    public ResultVo<Object> saveTittleConfig(@RequestBody UserMapConfigReq mapConfig) {
        this.configService.saveMapConfig(mapConfig);
        return ResultVo.success();
    }
}

