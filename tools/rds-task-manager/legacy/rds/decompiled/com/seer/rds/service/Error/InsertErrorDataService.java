/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.alibaba.fastjson.JSONObject
 *  com.seer.rds.config.GlobalCacheConfig
 *  com.seer.rds.config.configview.CommonConfig
 *  com.seer.rds.constant.ShieldingTypeEnum
 *  com.seer.rds.constant.VehicleAlarmsEnum
 *  com.seer.rds.dao.CoreAlarmsMapper
 *  com.seer.rds.dao.RobotAlarmsMapper
 *  com.seer.rds.dao.TaskAlarmsMapper
 *  com.seer.rds.model.alarms.CoreAlarms
 *  com.seer.rds.model.alarms.RobotAlarms
 *  com.seer.rds.model.alarms.TaskAlarms
 *  com.seer.rds.service.Error.InsertErrorDataService
 *  com.seer.rds.vo.core.RbkReportVo
 *  com.seer.rds.vo.core.ReportVo
 *  com.seer.rds.vo.core.RobotVo
 *  com.seer.rds.vo.response.AlarmsDetailVo
 *  com.seer.rds.vo.response.AlarmsVo
 *  com.seer.rds.vo.wind.TaskErrorVo
 *  com.seer.rds.web.config.ConfigFileController
 *  org.apache.commons.collections.CollectionUtils
 *  org.apache.commons.lang3.StringUtils
 *  org.slf4j.Logger
 *  org.slf4j.LoggerFactory
 *  org.springframework.stereotype.Component
 */
package com.seer.rds.service.Error;

import com.alibaba.fastjson.JSONObject;
import com.seer.rds.config.GlobalCacheConfig;
import com.seer.rds.config.configview.CommonConfig;
import com.seer.rds.constant.ShieldingTypeEnum;
import com.seer.rds.constant.VehicleAlarmsEnum;
import com.seer.rds.dao.CoreAlarmsMapper;
import com.seer.rds.dao.RobotAlarmsMapper;
import com.seer.rds.dao.TaskAlarmsMapper;
import com.seer.rds.model.alarms.CoreAlarms;
import com.seer.rds.model.alarms.RobotAlarms;
import com.seer.rds.model.alarms.TaskAlarms;
import com.seer.rds.vo.core.RbkReportVo;
import com.seer.rds.vo.core.ReportVo;
import com.seer.rds.vo.core.RobotVo;
import com.seer.rds.vo.response.AlarmsDetailVo;
import com.seer.rds.vo.response.AlarmsVo;
import com.seer.rds.vo.wind.TaskErrorVo;
import com.seer.rds.web.config.ConfigFileController;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;
import org.apache.commons.collections.CollectionUtils;
import org.apache.commons.lang3.StringUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

@Component
public class InsertErrorDataService {
    private static final Logger log = LoggerFactory.getLogger(InsertErrorDataService.class);
    private final CoreAlarmsMapper coreAlarmsMapper;
    private final RobotAlarmsMapper robotAlarmsMapper;
    private final TaskAlarmsMapper taskAlarmsMapper;

    public InsertErrorDataService(CoreAlarmsMapper coreAlarmsMapper, RobotAlarmsMapper robotAlarmsMapper, TaskAlarmsMapper taskAlarmsMapper) {
        this.coreAlarmsMapper = coreAlarmsMapper;
        this.robotAlarmsMapper = robotAlarmsMapper;
        this.taskAlarmsMapper = taskAlarmsMapper;
    }

    public void insertAlarmData() {
        String cache = (String)GlobalCacheConfig.getCache((String)"robotsStatus");
        CommonConfig commonConfig = ConfigFileController.commonConfig;
        String shieldingType = commonConfig.getSendAlarms().getShieldingType();
        if (ShieldingTypeEnum.NightShielding.getType().equals(shieldingType)) {
            LocalTime currentTime = LocalTime.now();
            LocalTime nightStart = LocalTime.of(20, 0);
            LocalTime nightEnd = LocalTime.of(6, 0);
            if (currentTime.isAfter(nightStart) || currentTime.isBefore(nightEnd)) {
                return;
            }
        } else if (ShieldingTypeEnum.CustomShielding.getType().equals(shieldingType)) {
            Integer shieldingStartTime = commonConfig.getSendAlarms().getShieldingStartTime();
            Integer shieldingEndTime = commonConfig.getSendAlarms().getShieldingEndTime();
            LocalTime currentTime = LocalTime.now();
            LocalTime nightStart = LocalTime.of(shieldingStartTime, 0);
            LocalTime nightEnd = LocalTime.of(shieldingEndTime, 0);
            if (currentTime.isAfter(nightStart) && currentTime.isBefore(nightEnd)) {
                return;
            }
        }
        List reportErrorType = commonConfig.getSendAlarms().getReportErrorType();
        List reportLevel = commonConfig.getSendAlarms().getReportLevel();
        ConcurrentHashMap allTaskErrorCache = GlobalCacheConfig.getAllTaskErrorCache();
        if (StringUtils.isNotEmpty((CharSequence)cache) || allTaskErrorCache != null) {
            RobotVo robotVo = (RobotVo)JSONObject.parseObject((String)cache, RobotVo.class);
            this.processCoreAlarm(robotVo, reportErrorType, reportLevel);
            this.processRbkAlarm(robotVo, reportErrorType, reportLevel);
            this.processTaskAlarm(allTaskErrorCache, reportErrorType);
        }
    }

    private void processCoreAlarm(RobotVo robotVo, List<String> reportErrorType, List<String> reportLevel) {
        AlarmsVo alarms = robotVo.getAlarms();
        ArrayList insertCoreAlarm = new ArrayList();
        if (alarms != null && reportErrorType.contains("core")) {
            List fatals = this.getAlarmsDetailIfLevelValid(reportLevel, alarms.getFatals(), VehicleAlarmsEnum.VehicleFatals);
            List errors = this.getAlarmsDetailIfLevelValid(reportLevel, alarms.getErrors(), VehicleAlarmsEnum.VehicleErrors);
            List warnings = this.getAlarmsDetailIfLevelValid(reportLevel, alarms.getWarnings(), VehicleAlarmsEnum.VehicleWarnings);
            this.addCoreAlarms(fatals, insertCoreAlarm, VehicleAlarmsEnum.VehicleFatals.getLevel());
            this.addCoreAlarms(errors, insertCoreAlarm, VehicleAlarmsEnum.VehicleErrors.getLevel());
            this.addCoreAlarms(warnings, insertCoreAlarm, VehicleAlarmsEnum.VehicleWarnings.getLevel());
            this.coreAlarmsMapper.saveAll(insertCoreAlarm);
            this.updateRecordMark(fatals, errors, warnings);
        }
    }

    private List<AlarmsDetailVo> getAlarmsDetailIfLevelValid(List<String> reportLevel, List<AlarmsDetailVo> alarmsDetail, VehicleAlarmsEnum alarmsEnum) {
        return reportLevel.contains(alarmsEnum.getLevel()) ? alarmsDetail : new ArrayList();
    }

    private void processRbkAlarm(RobotVo robotVo, List<String> reportErrorType, List<String> reportLevel) {
        List reports = robotVo.getReport();
        if (reports != null && reportErrorType.contains("rbk")) {
            for (ReportVo reportVo : reports) {
                String agvId = reportVo.getUuid();
                RbkReportVo rbkReport = reportVo.getRbk_report();
                if (rbkReport == null) continue;
                ArrayList insertRbkAlarm = new ArrayList();
                AlarmsVo rbkAlarms = rbkReport.getAlarms();
                if (rbkAlarms == null) continue;
                List fatals = this.getAlarmsDetailIfLevelValid(reportLevel, rbkAlarms.getFatals(), VehicleAlarmsEnum.VehicleFatals);
                List errors = this.getAlarmsDetailIfLevelValid(reportLevel, rbkAlarms.getErrors(), VehicleAlarmsEnum.VehicleErrors);
                List warnings = this.getAlarmsDetailIfLevelValid(reportLevel, rbkAlarms.getWarnings(), VehicleAlarmsEnum.VehicleWarnings);
                this.addRbkAlarms(fatals, insertRbkAlarm, VehicleAlarmsEnum.VehicleFatals.getLevel(), agvId);
                this.addRbkAlarms(errors, insertRbkAlarm, VehicleAlarmsEnum.VehicleErrors.getLevel(), agvId);
                this.addRbkAlarms(warnings, insertRbkAlarm, VehicleAlarmsEnum.VehicleWarnings.getLevel(), agvId);
                this.robotAlarmsMapper.saveAll(insertRbkAlarm);
                this.updateRecordMark(agvId, fatals, errors, warnings);
            }
        }
    }

    private void processTaskAlarm(ConcurrentHashMap<String, TaskErrorVo> allTaskErrorCache, List<String> reportErrorType) {
        ArrayList insertTaskAlarm = new ArrayList();
        if (allTaskErrorCache != null && reportErrorType.contains("task")) {
            ArrayList<TaskErrorVo> taskErrorVoList = new ArrayList<TaskErrorVo>(allTaskErrorCache.values());
            this.addTaskAlarms(taskErrorVoList, insertTaskAlarm);
            this.taskAlarmsMapper.saveAll(insertTaskAlarm);
            this.updateRecordMark(taskErrorVoList);
        }
    }

    private void updateRecordMark(List<TaskErrorVo> taskErrorVoList) {
        List list = this.taskAlarmsMapper.findAllByRecordMarkEquals(1);
        if (CollectionUtils.isEmpty((Collection)list)) {
            return;
        }
        if (CollectionUtils.isEmpty(taskErrorVoList)) {
            list.forEach(it -> it.setRecordMark(Integer.valueOf(2)));
            this.taskAlarmsMapper.saveAll((Iterable)list);
            return;
        }
        List res = list.stream().filter(it -> {
            List collect = taskErrorVoList.stream().filter(e -> StringUtils.equals((CharSequence)e.getMislabeling(), (CharSequence)it.getMislabeling())).collect(Collectors.toList());
            return !CollectionUtils.isNotEmpty(collect);
        }).peek(it -> it.setRecordMark(Integer.valueOf(2))).collect(Collectors.toList());
        this.taskAlarmsMapper.saveAll(res);
    }

    private void updateRecordMark(List<AlarmsDetailVo> fatals, List<AlarmsDetailVo> errors, List<AlarmsDetailVo> warnings) {
        List list = this.coreAlarmsMapper.findAllByRecordMarkEquals(1);
        if (CollectionUtils.isEmpty((Collection)list)) {
            return;
        }
        if (CollectionUtils.isEmpty(fatals) && CollectionUtils.isEmpty(errors) && CollectionUtils.isEmpty(warnings) && CollectionUtils.isNotEmpty((Collection)list)) {
            list.forEach(it -> it.setRecordMark(Integer.valueOf(2)));
            this.coreAlarmsMapper.saveAll((Iterable)list);
            return;
        }
        List res = list.stream().filter(it -> {
            List tmp1 = fatals.stream().filter(e -> e.getCode().intValue() == it.getCode().intValue() && StringUtils.equals((CharSequence)it.getLevel(), (CharSequence)VehicleAlarmsEnum.VehicleFatals.getLevel())).collect(Collectors.toList());
            if (CollectionUtils.isNotEmpty(tmp1)) {
                return false;
            }
            List tmp2 = errors.stream().filter(e -> e.getCode().intValue() == it.getCode().intValue() && StringUtils.equals((CharSequence)it.getLevel(), (CharSequence)VehicleAlarmsEnum.VehicleErrors.getLevel())).collect(Collectors.toList());
            if (CollectionUtils.isNotEmpty(tmp2)) {
                return false;
            }
            List tmp3 = warnings.stream().filter(e -> e.getCode().intValue() == it.getCode().intValue() && StringUtils.equals((CharSequence)it.getLevel(), (CharSequence)VehicleAlarmsEnum.VehicleWarnings.getLevel())).collect(Collectors.toList());
            return !CollectionUtils.isNotEmpty(tmp3);
        }).peek(it -> it.setRecordMark(Integer.valueOf(2))).collect(Collectors.toList());
        this.coreAlarmsMapper.saveAll(res);
    }

    private void updateRecordMark(String agvId, List<AlarmsDetailVo> fatals, List<AlarmsDetailVo> errors, List<AlarmsDetailVo> warnings) {
        List list = this.robotAlarmsMapper.findAllByAgvIdEqualsAndRecordMarkEquals(agvId, 1);
        if (CollectionUtils.isEmpty((Collection)list)) {
            return;
        }
        if (CollectionUtils.isEmpty(fatals) && CollectionUtils.isEmpty(errors) && CollectionUtils.isEmpty(warnings) && CollectionUtils.isNotEmpty((Collection)list)) {
            list.forEach(it -> it.setRecordMark(Integer.valueOf(2)));
            this.robotAlarmsMapper.saveAll((Iterable)list);
            return;
        }
        List res = list.stream().filter(it -> {
            List tmp1 = fatals.stream().filter(e -> e.getCode().intValue() == it.getCode().intValue() && StringUtils.equals((CharSequence)it.getLevel(), (CharSequence)VehicleAlarmsEnum.VehicleFatals.getLevel())).collect(Collectors.toList());
            if (CollectionUtils.isNotEmpty(tmp1)) {
                return false;
            }
            List tmp2 = errors.stream().filter(e -> e.getCode().intValue() == it.getCode().intValue() && StringUtils.equals((CharSequence)it.getLevel(), (CharSequence)VehicleAlarmsEnum.VehicleErrors.getLevel())).collect(Collectors.toList());
            if (CollectionUtils.isNotEmpty(tmp2)) {
                return false;
            }
            List tmp3 = warnings.stream().filter(e -> e.getCode().intValue() == it.getCode().intValue() && StringUtils.equals((CharSequence)it.getLevel(), (CharSequence)VehicleAlarmsEnum.VehicleWarnings.getLevel())).collect(Collectors.toList());
            return !CollectionUtils.isNotEmpty(tmp3);
        }).peek(it -> it.setRecordMark(Integer.valueOf(2))).collect(Collectors.toList());
        this.robotAlarmsMapper.saveAll(res);
    }

    private void addTaskAlarms(List<TaskErrorVo> alarms, List<TaskAlarms> insertTaskAlarm) {
        if (CollectionUtils.isNotEmpty(alarms)) {
            insertTaskAlarm.addAll(alarms.stream().filter(it -> {
                TaskAlarms vo = this.taskAlarmsMapper.findTaskAlarmsByMislabelingEqualsAndRecordMarkEquals(it.getMislabeling(), Integer.valueOf(1));
                return vo == null;
            }).map(it -> {
                TaskAlarms taskAlarms = new TaskAlarms();
                taskAlarms.setMislabeling(it.getMislabeling());
                taskAlarms.setSendMsg(it.getErrorMsg());
                taskAlarms.setCreateTime(it.getCreateTime());
                taskAlarms.setLevel("error");
                taskAlarms.setIsOk(Integer.valueOf(0));
                taskAlarms.setAgvId(it.getAgvId());
                taskAlarms.setRecordId(it.getRecordId());
                taskAlarms.setOutOrderId(it.getOutOrderId());
                taskAlarms.setCurrentNo(Integer.valueOf(0));
                taskAlarms.setRecordMark(Integer.valueOf(1));
                return taskAlarms;
            }).collect(Collectors.toList()));
        }
    }

    private void addCoreAlarms(List<AlarmsDetailVo> alarms, List<CoreAlarms> insertCoreAlarm, String level) {
        if (CollectionUtils.isNotEmpty(alarms)) {
            insertCoreAlarm.addAll(alarms.stream().filter(it -> {
                CoreAlarms vo = this.coreAlarmsMapper.findCoreAlarmsByCodeEqualsAndRecordMarkEquals(it.getCode().intValue(), 1);
                return vo == null;
            }).map(it -> {
                CoreAlarms coreAlarms = new CoreAlarms();
                coreAlarms.setCode(it.getCode());
                coreAlarms.setSendMsg(it.getDesc());
                coreAlarms.setLevel(level);
                coreAlarms.setErrorTime(Integer.valueOf(it.getTimestamp().intValue()));
                coreAlarms.setIsOk(Integer.valueOf(0));
                coreAlarms.setCurrentNo(Integer.valueOf(0));
                coreAlarms.setRecordMark(Integer.valueOf(1));
                return coreAlarms;
            }).collect(Collectors.toList()));
        }
    }

    private void addRbkAlarms(List<AlarmsDetailVo> alarms, List<RobotAlarms> insertRbkAlarm, String level, String agvId) {
        insertRbkAlarm.addAll(alarms.stream().filter(it -> {
            RobotAlarms vo = this.robotAlarmsMapper.findRobotAlarmsByAgvIdEqualsAndCodeEqualsAndRecordMarkEquals(agvId, it.getCode().intValue(), it.getTimes().intValue());
            return vo == null;
        }).map(it -> {
            RobotAlarms v = new RobotAlarms();
            v.setCode(it.getCode());
            v.setSendMsg(it.getDesc());
            v.setLevel(level);
            v.setErrorTime(Integer.valueOf(it.getTimestamp().intValue()));
            v.setAgvId(agvId);
            v.setIsOk(Integer.valueOf(0));
            v.setCurrentNo(Integer.valueOf(0));
            v.setRecordMark(Integer.valueOf(1));
            return v;
        }).collect(Collectors.toList()));
    }
}

