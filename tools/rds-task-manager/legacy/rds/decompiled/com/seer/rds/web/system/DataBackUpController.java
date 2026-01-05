/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.annotation.SysLog
 *  com.seer.rds.constant.ApiEnum
 *  com.seer.rds.constant.DatabaseType
 *  com.seer.rds.service.Archiving.database.DatabaseBackupService
 *  com.seer.rds.service.Archiving.database.DatabaseBackupServiceFactory
 *  com.seer.rds.service.agv.StatService
 *  com.seer.rds.service.agv.WindTaskService
 *  com.seer.rds.service.wind.RootBp
 *  com.seer.rds.util.OkHttpUtil
 *  com.seer.rds.vo.ResultVo
 *  com.seer.rds.web.system.DataBackUpController
 *  io.swagger.annotations.Api
 *  io.swagger.annotations.ApiOperation
 *  org.slf4j.Logger
 *  org.slf4j.LoggerFactory
 *  org.springframework.beans.factory.annotation.Autowired
 *  org.springframework.stereotype.Controller
 *  org.springframework.web.bind.annotation.PostMapping
 *  org.springframework.web.bind.annotation.RequestMapping
 *  org.springframework.web.bind.annotation.ResponseBody
 */
package com.seer.rds.web.system;

import com.seer.rds.annotation.SysLog;
import com.seer.rds.constant.ApiEnum;
import com.seer.rds.constant.DatabaseType;
import com.seer.rds.service.Archiving.database.DatabaseBackupService;
import com.seer.rds.service.Archiving.database.DatabaseBackupServiceFactory;
import com.seer.rds.service.agv.StatService;
import com.seer.rds.service.agv.WindTaskService;
import com.seer.rds.service.wind.RootBp;
import com.seer.rds.util.OkHttpUtil;
import com.seer.rds.vo.ResultVo;
import io.swagger.annotations.Api;
import io.swagger.annotations.ApiOperation;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseBody;

@Controller
@RequestMapping(value={"data"})
@Api(tags={"\u6570\u636e\u5e93"})
public class DataBackUpController {
    private static final Logger log = LoggerFactory.getLogger(DataBackUpController.class);
    @Autowired
    private WindTaskService windTaskService;
    @Autowired
    private StatService statService;

    @ApiOperation(value="\u5907\u4efd\u6570\u636e\u5e93")
    @PostMapping(value={"/backUp"})
    @ResponseBody
    public ResultVo<Object> backUp() throws Exception {
        DatabaseBackupService mysql = DatabaseBackupServiceFactory.getBackupService((DatabaseType)DatabaseType.valueOf((String)"MYSQL"));
        mysql.backupDatabase();
        return ResultVo.success();
    }

    @SysLog(operation="clearDB", message="@{user.controller.clearDB}")
    @ApiOperation(value="\u5220\u9664\u6570\u636e\u5e93\u4efb\u52a1\u53ca\u7edf\u8ba1\u6570\u636e\u53ca\u8fd0\u5355\u6570\u636e")
    @PostMapping(value={"/deleteTaskRecordAndStatAndOrderData"})
    @ResponseBody
    public ResultVo<Object> deleteTaskRecordAndStatData() throws Exception {
        log.info("deleteAllTaskRecord-------------------------");
        this.windTaskService.deleteAllTaskRecordData();
        log.info("deleteAllStat-----------------------");
        this.statService.deleteAllStatData();
        log.info("deleteAllOrders-------------");
        try {
            OkHttpUtil.postJsonParams((String)RootBp.getUrl((String)ApiEnum.deleteAllOrders.getUri()), (String)"");
        }
        catch (Exception e) {
            log.error("deleteAllOrders error", (Throwable)e);
        }
        return ResultVo.success();
    }
}

