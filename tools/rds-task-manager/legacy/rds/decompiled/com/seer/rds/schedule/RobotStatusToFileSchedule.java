/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.alibaba.fastjson.JSON
 *  com.alibaba.fastjson.JSONObject
 *  com.seer.rds.config.GlobalCacheConfig
 *  com.seer.rds.config.PropConfig
 *  com.seer.rds.schedule.RobotStatusToFileSchedule
 *  com.seer.rds.vo.core.BasicInfoVo
 *  com.seer.rds.vo.core.ChassisVo
 *  com.seer.rds.vo.core.CurrentOrderVo
 *  com.seer.rds.vo.core.LockInfoVo
 *  com.seer.rds.vo.core.RbkReportVo
 *  com.seer.rds.vo.core.ReportVo
 *  com.seer.rds.vo.core.RobotVo
 *  com.seer.rds.vo.core.UndispatchableReasonVo
 *  com.seer.rds.vo.response.AlarmsVo
 *  org.apache.commons.lang3.StringUtils
 *  org.slf4j.Logger
 *  org.slf4j.LoggerFactory
 *  org.springframework.context.annotation.Configuration
 *  org.springframework.scheduling.annotation.EnableScheduling
 *  org.springframework.scheduling.annotation.Scheduled
 */
package com.seer.rds.schedule;

import com.alibaba.fastjson.JSON;
import com.alibaba.fastjson.JSONObject;
import com.seer.rds.config.GlobalCacheConfig;
import com.seer.rds.config.PropConfig;
import com.seer.rds.vo.core.BasicInfoVo;
import com.seer.rds.vo.core.ChassisVo;
import com.seer.rds.vo.core.CurrentOrderVo;
import com.seer.rds.vo.core.LockInfoVo;
import com.seer.rds.vo.core.RbkReportVo;
import com.seer.rds.vo.core.ReportVo;
import com.seer.rds.vo.core.RobotVo;
import com.seer.rds.vo.core.UndispatchableReasonVo;
import com.seer.rds.vo.response.AlarmsVo;
import java.util.ArrayList;
import java.util.List;
import org.apache.commons.lang3.StringUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;

@Configuration
@EnableScheduling
public class RobotStatusToFileSchedule {
    private static final Logger log = LoggerFactory.getLogger(RobotStatusToFileSchedule.class);
    private static Logger replayAGVLogger = LoggerFactory.getLogger((String)"REPLAY_AGV_FILE");

    @Scheduled(fixedDelay=1000L)
    public void saveRobotStatusToFile() {
        if (PropConfig.ifEnableReplay().booleanValue()) {
            this.doSaveRobotStatusToFile();
        }
    }

    private void doSaveRobotStatusToFile() {
        String replayRobotStatus = this.getReplyRobotStatus();
        if ("{}".equals(replayRobotStatus)) {
            return;
        }
        replayAGVLogger.info(replayRobotStatus);
    }

    private String getReplyRobotStatus() {
        String robotStr = (String)GlobalCacheConfig.getCache((String)"robotsStatus");
        if (StringUtils.isEmpty((CharSequence)robotStr)) {
            return "{}";
        }
        RobotVo robotStatus = (RobotVo)JSONObject.parseObject((String)robotStr, RobotVo.class);
        AlarmsVo alarms = robotStatus.getAlarms();
        List disable_paths = robotStatus.getDisable_paths();
        List disable_points = robotStatus.getDisable_points();
        List errors = robotStatus.getErrors();
        List fatals = robotStatus.getFatals();
        List notices = robotStatus.getNotices();
        String scene_md5 = robotStatus.getScene_md5();
        List warnings = robotStatus.getWarnings();
        ArrayList<ReportVo> reports = new ArrayList<ReportVo>();
        List originReports = robotStatus.getReport();
        for (ReportVo reportVo : originReports) {
            List area_resources_occupied = reportVo.getArea_resources_occupied();
            BasicInfoVo basic_info = reportVo.getBasic_info();
            ChassisVo chassis = reportVo.getChassis();
            Integer connection_status = reportVo.getConnection_status();
            CurrentOrderVo current_order = reportVo.getCurrent_order();
            Boolean dispatchable = reportVo.getDispatchable();
            Boolean procBusiness = reportVo.getProcBusiness();
            LockInfoVo lock_info = reportVo.getLock_info();
            UndispatchableReasonVo undispatchable_reason = reportVo.getUndispatchable_reason();
            String uuid = reportVo.getUuid();
            String vehicle_id = reportVo.getVehicle_id();
            RbkReportVo originRbk_report = reportVo.getRbk_report();
            RbkReportVo rbk_report = new RbkReportVo(originRbk_report.getAvailable_containers(), originRbk_report.getCurrent_map(), originRbk_report.getReloc_status(), originRbk_report.getAngle(), originRbk_report.getCurrent_station(), originRbk_report.getBattery_level(), originRbk_report.getVoltage(), originRbk_report.getCharging(), originRbk_report.getConfidence(), originRbk_report.getErrors(), originRbk_report.getFatals(), originRbk_report.getWarnings(), originRbk_report.getNotices(), originRbk_report.getX(), originRbk_report.getY(), originRbk_report.getW(), originRbk_report.getOdo());
            ReportVo report = new ReportVo(area_resources_occupied, basic_info, chassis, connection_status, current_order, dispatchable, procBusiness, lock_info, rbk_report, undispatchable_reason, uuid, vehicle_id);
            reports.add(report);
        }
        RobotVo replyRobotStatus = new RobotVo(alarms, disable_points, disable_paths, errors, fatals, notices, warnings, scene_md5, reports);
        return JSON.toJSONString((Object)replyRobotStatus);
    }
}

