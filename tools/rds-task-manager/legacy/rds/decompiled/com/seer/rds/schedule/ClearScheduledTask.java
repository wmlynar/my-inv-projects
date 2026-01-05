/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.config.PropConfig
 *  com.seer.rds.constant.StatLevelEnum
 *  com.seer.rds.dao.AlarmsRecordMapper
 *  com.seer.rds.dao.AlarmsRecordMergeMapper
 *  com.seer.rds.dao.BatteryLevelRecordMapper
 *  com.seer.rds.dao.CoreAlarmsMapper
 *  com.seer.rds.dao.CoreAlarmsRecordMapper
 *  com.seer.rds.dao.DistributePointRecordMapper
 *  com.seer.rds.dao.DistributeRecordMapper
 *  com.seer.rds.dao.InterfaceHandleRecordMapper
 *  com.seer.rds.dao.ModbusReadLogMapper
 *  com.seer.rds.dao.ModbusWriteLogMapper
 *  com.seer.rds.dao.RobotAlarmsMapper
 *  com.seer.rds.dao.RobotStatusMapper
 *  com.seer.rds.dao.SceneMapper
 *  com.seer.rds.dao.StatAgvLoadedTimeMapper
 *  com.seer.rds.dao.StatRecordDuplicateMapper
 *  com.seer.rds.dao.StatRecordMapper
 *  com.seer.rds.dao.SysLogMapper
 *  com.seer.rds.dao.WindBlockRecordMapper
 *  com.seer.rds.dao.WindDataCacheSplitMapper
 *  com.seer.rds.dao.WindTaskLogMapper
 *  com.seer.rds.dao.WindTaskRecordMapper
 *  com.seer.rds.dao.WorkSiteLogMapper
 *  com.seer.rds.schedule.ClearScheduledTask
 *  com.seer.rds.service.agv.WindService
 *  com.seer.rds.service.replay.ReplayService
 *  com.seer.rds.util.DateUtil
 *  com.seer.rds.util.SpringUtil
 *  com.seer.rds.web.config.ConfigFileController
 *  org.apache.commons.collections.CollectionUtils
 *  org.apache.commons.io.FileUtils
 *  org.apache.commons.lang3.StringUtils
 *  org.apache.commons.lang3.time.CalendarUtils
 *  org.slf4j.Logger
 *  org.slf4j.LoggerFactory
 *  org.springframework.beans.factory.annotation.Autowired
 *  org.springframework.context.annotation.Configuration
 *  org.springframework.scheduling.annotation.EnableScheduling
 *  org.springframework.scheduling.annotation.Scheduled
 */
package com.seer.rds.schedule;

import com.seer.rds.config.PropConfig;
import com.seer.rds.constant.StatLevelEnum;
import com.seer.rds.dao.AlarmsRecordMapper;
import com.seer.rds.dao.AlarmsRecordMergeMapper;
import com.seer.rds.dao.BatteryLevelRecordMapper;
import com.seer.rds.dao.CoreAlarmsMapper;
import com.seer.rds.dao.CoreAlarmsRecordMapper;
import com.seer.rds.dao.DistributePointRecordMapper;
import com.seer.rds.dao.DistributeRecordMapper;
import com.seer.rds.dao.InterfaceHandleRecordMapper;
import com.seer.rds.dao.ModbusReadLogMapper;
import com.seer.rds.dao.ModbusWriteLogMapper;
import com.seer.rds.dao.RobotAlarmsMapper;
import com.seer.rds.dao.RobotStatusMapper;
import com.seer.rds.dao.SceneMapper;
import com.seer.rds.dao.StatAgvLoadedTimeMapper;
import com.seer.rds.dao.StatRecordDuplicateMapper;
import com.seer.rds.dao.StatRecordMapper;
import com.seer.rds.dao.SysLogMapper;
import com.seer.rds.dao.WindBlockRecordMapper;
import com.seer.rds.dao.WindDataCacheSplitMapper;
import com.seer.rds.dao.WindTaskLogMapper;
import com.seer.rds.dao.WindTaskRecordMapper;
import com.seer.rds.dao.WorkSiteLogMapper;
import com.seer.rds.service.agv.WindService;
import com.seer.rds.service.replay.ReplayService;
import com.seer.rds.util.DateUtil;
import com.seer.rds.util.SpringUtil;
import com.seer.rds.web.config.ConfigFileController;
import java.io.File;
import java.io.IOException;
import java.text.SimpleDateFormat;
import java.util.Arrays;
import java.util.Calendar;
import java.util.Date;
import java.util.List;
import java.util.regex.Pattern;
import java.util.stream.Collectors;
import org.apache.commons.collections.CollectionUtils;
import org.apache.commons.io.FileUtils;
import org.apache.commons.lang3.StringUtils;
import org.apache.commons.lang3.time.CalendarUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;

@Configuration
@EnableScheduling
public class ClearScheduledTask {
    private static final Logger log = LoggerFactory.getLogger(ClearScheduledTask.class);
    @Autowired
    private WindTaskRecordMapper windTaskRecordMapper;
    @Autowired
    private WindBlockRecordMapper WindBlockRecordMapper;
    @Autowired
    private SysLogMapper sysLogMapper;
    @Autowired
    private WindTaskLogMapper windTaskLogMapper;
    @Autowired
    private WorkSiteLogMapper workSiteLogMapper;
    @Autowired
    private RobotStatusMapper robotStatusMapper;
    @Autowired
    private StatRecordMapper statRecordMapper;
    @Autowired
    private StatRecordDuplicateMapper statRecordDuplicateMapper;
    @Autowired
    private AlarmsRecordMapper alarmsRecordMapper;
    @Autowired
    private AlarmsRecordMergeMapper alarmsRecordMergeMapper;
    @Autowired
    private BatteryLevelRecordMapper batteryLevelRecordMapper;
    @Autowired
    private ModbusReadLogMapper modbusReadLogMapper;
    @Autowired
    private ModbusWriteLogMapper modbusWriteLogMapper;
    @Autowired
    private PropConfig propConfig;
    @Autowired
    private InterfaceHandleRecordMapper interfaceHandleRecordMapper;
    @Autowired
    private ReplayService replayService;
    @Autowired
    private SceneMapper sceneMapper;
    @Autowired
    private DistributeRecordMapper distributeRecordMapper;
    @Autowired
    private DistributePointRecordMapper distributePointRecordMapper;
    @Autowired
    private StatAgvLoadedTimeMapper statAgvLoadedTimeMapper;
    @Autowired
    private CoreAlarmsRecordMapper coreAlarmsRecordMapper;
    @Autowired
    private CoreAlarmsMapper coreAlarmsMapper;
    @Autowired
    private RobotAlarmsMapper robotAlarmsMapper;
    @Autowired
    private WindDataCacheSplitMapper windDataCacheSplitMapper;

    @Scheduled(cron="0 0 1 * * ?")
    public void clear() {
        try {
            Calendar c = Calendar.getInstance();
            c.setTime(new Date());
            int num = ConfigFileController.commonConfig.getKeepDataConfigs().getClearDateMonth();
            int statNum = ConfigFileController.commonConfig.getKeepDataConfigs().getClearStatRecordInterval();
            int statsMonthNum = ConfigFileController.commonConfig.getKeepDataConfigs().getClearStatsIntervalMonth();
            int clearAlarmsRecordsMonth = ConfigFileController.commonConfig.getKeepDataConfigs().getClearAlarmsRecordsMonth();
            int clearBatteryLevelRecordDay = ConfigFileController.commonConfig.getKeepDataConfigs().getClearBatteryLevelRecordDay();
            c.add(2, -num);
            c.getTime();
            log.info("task record block record \u9700\u8981\u6e05\u7406\u7684\u65f6\u95f4\u662f\uff1a{}", (Object)c.getTime());
            Date time = Date.from(c.toInstant());
            int windTaskRecordTotal = this.windTaskRecordMapper.clearWindTaskRecord(time);
            log.info("t_windtaskrecord delete total {}", (Object)windTaskRecordTotal);
            int windBlockRecordTotal = this.WindBlockRecordMapper.clearWindBlockRecord(time);
            log.info("t_windblockrecord delete total {}", (Object)windBlockRecordTotal);
            int sysLogTotal = this.sysLogMapper.clearSysLog(time);
            log.info("t_syslog delete total {}", (Object)sysLogTotal);
            int windTaskLogTotal = this.windTaskLogMapper.clearWindTaskLog(time);
            log.info("t_windtasklog delete total {}", (Object)windTaskLogTotal);
            int workSiteLogTotal = this.workSiteLogMapper.clearWorkSiteLog(time);
            log.info("t_worksite_log delete total {}", (Object)workSiteLogTotal);
            c.clear();
            c.setTime(new Date());
            c.set(2, CalendarUtils.INSTANCE.getMonth() - statsMonthNum);
            String pattern = StatLevelEnum.getDatePatternByLevelName((String)"Hour");
            SimpleDateFormat dateFormat = new SimpleDateFormat(pattern);
            log.info("stat \u9700\u8981\u6e05\u7406\u7684\u65f6\u95f4\u662f\uff1a{}", (Object)c.getTime());
            int statHourTotal = this.statRecordMapper.clearStatRecord(dateFormat.format(c.getTime()), "Hour");
            log.info("t_statrecord delete total {}", (Object)statHourTotal);
            int statDuplicateHourTotal = this.statRecordDuplicateMapper.clearStatRecordDuplicate(dateFormat.format(c.getTime()), "Hour");
            log.info("t_statrecord_duplicate delete total {}", (Object)statDuplicateHourTotal);
            int agvLoadedTotal = this.statAgvLoadedTimeMapper.deleteByUpdateTimeBefore(c.getTime());
            log.info("t_statagvloadedtime delete total {}", (Object)agvLoadedTotal);
            c.set(2, CalendarUtils.INSTANCE.getMonth() - statNum);
            int robotStatusTotal = this.robotStatusMapper.clearRobotStatusRecord(c.getTime());
            log.info("t_robotstatusrecord delete total {}", (Object)robotStatusTotal);
            c.clear();
            c.setTime(new Date());
            c.set(2, CalendarUtils.INSTANCE.getMonth() - clearAlarmsRecordsMonth);
            log.info("alarms \u9700\u8981\u6e05\u7406\u7684\u65f6\u95f4\u662f\uff1a{}", (Object)c.getTime());
            int alarmsRecordTotal = this.alarmsRecordMapper.clearAlarmsRecord(c.getTime());
            log.info("t_alarmsrecord delete total {}", (Object)alarmsRecordTotal);
            int alarmsRecordMergeTotal = this.alarmsRecordMergeMapper.clearAlarmsRecord(c.getTime());
            log.info("t_alarmsrecord_merge delete total {}", (Object)alarmsRecordMergeTotal);
            int i = this.coreAlarmsRecordMapper.clearCoreAlarmsRecord(c.getTime());
            log.info("t_core_alarmsrecord delete total {}", (Object)i);
            int res = this.coreAlarmsMapper.clearCoreAlarms(c.getTime());
            log.info("t_core_alarms delete total {}", (Object)res);
            int robotRes = this.robotAlarmsMapper.clearRobotAlarms(c.getTime());
            log.info("t_robot_alarms delete total {}", (Object)robotRes);
            c.clear();
            c.setTime(new Date());
            c.set(5, c.get(5) - clearBatteryLevelRecordDay);
            dateFormat = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss");
            log.info("battery \u9700\u8981\u6e05\u7406\u7684\u65f6\u95f4\u662f\uff1a{}", (Object)c.getTime());
            int batteryLevelRecordTotal = this.batteryLevelRecordMapper.clearBatteryLevelRecord(dateFormat.format(c.getTime()));
            log.info("t_batterylevelrecord delete total {}", (Object)batteryLevelRecordTotal);
            c.clear();
            c.setTime(new Date());
            c.set(2, CalendarUtils.INSTANCE.getMonth() - 1);
            int clear = this.interfaceHandleRecordMapper.clear(c.getTime());
            log.info("t_preinterfacecallrecord delete total {}", (Object)clear);
            c.clear();
            c.setTime(new Date());
            c.set(2, CalendarUtils.INSTANCE.getMonth() - 1);
            int delReadCount = this.modbusReadLogMapper.deleteByCreateTime(c.getTime());
            int delWriteCount = this.modbusWriteLogMapper.deleteByCreateTime(c.getTime());
            log.info("t_modbus_read_log delete total {}", (Object)delReadCount);
            log.info("t_modbus_write_log delete total {}", (Object)delWriteCount);
            int distributeRecord = this.distributeRecordMapper.deleteAllByCreateTimeIsBefore(time);
            log.info("t_distribute_record delete total {}", (Object)distributeRecord);
            int distributePoint = this.distributePointRecordMapper.deleteAllByCreateTimeIsBefore(time);
            log.info("t_distribute_point delete total {}", (Object)distributePoint);
            c.clear();
            c.setTime(new Date());
            int clearDataCacheDay = ConfigFileController.commonConfig.getKeepDataConfigs().getClearDataCacheDay();
            if (clearDataCacheDay > 0) {
                c.set(5, c.get(5) - clearDataCacheDay);
                WindService windService = (WindService)SpringUtil.getBean(WindService.class);
                int outdatedCount = windService.removeDataCacheBefore(c.getTime());
                log.info("t_winddatacachesplit removed cache data counts: {}", (Object)outdatedCount);
            } else {
                log.info("t_winddatacachesplit keep all cache data");
            }
        }
        catch (Exception e) {
            log.error("clear data error", (Throwable)e);
        }
    }

    @Scheduled(fixedDelay=3600000L)
    public void deleteReplayFileAndData() {
        if (!PropConfig.ifEnableReplay().booleanValue()) {
            return;
        }
        Calendar c = Calendar.getInstance();
        c.add(5, -15);
        c.set(11, 0);
        c.set(12, 0);
        c.set(13, 0);
        c.set(14, 0);
        Date time = c.getTime();
        String timeString = DateUtil.fmtDate2String((Date)time, (String)"yyyy-MM-dd_HH-mm-ss");
        this.delFiles(timeString);
        this.sceneMapper.deleteByCreateTime(time);
    }

    private void delFiles(String timeString) {
        String replaySitesDir = this.propConfig.getReplaySitesDir();
        String replayRobotStatusesDir = this.propConfig.getReplayRobotStatusesDir();
        String replayScenesDir = this.propConfig.getReplayScenesDir();
        this.doDelFiles(timeString, replaySitesDir);
        this.doDelFiles(timeString, replayRobotStatusesDir);
        this.doDelFiles(timeString, replayScenesDir);
    }

    private void doDelFiles(String timeString, String path) {
        File file = new File(path);
        String[] fileNames = file.list();
        if (fileNames != null) {
            String nearestFileName = this.replayService.getNearestFullFileName(path, timeString + ".log");
            if (StringUtils.isNotEmpty((CharSequence)nearestFileName)) {
                nearestFileName = nearestFileName.endsWith(".log") ? nearestFileName.substring(nearestFileName.length() - 23) : nearestFileName.substring(nearestFileName.length() - 25);
            }
            Pattern pattern = Pattern.compile("^\\d{4}-\\d{2}-\\d{2}_\\d{2}-\\d{2}-\\d{2}\\.(scene|log)$");
            String finalNearestFileName = nearestFileName;
            List delSiteFileNames = Arrays.stream(fileNames).filter(pattern.asPredicate()).filter(name -> name.compareTo(timeString) < 0).filter(name -> !name.equals(finalNearestFileName)).collect(Collectors.toList());
            if (CollectionUtils.isNotEmpty(delSiteFileNames)) {
                log.info("clear replay file: {}", delSiteFileNames);
            }
            for (String delSiteFileName : delSiteFileNames) {
                try {
                    FileUtils.forceDelete((File)new File(path + delSiteFileName));
                }
                catch (IOException e) {
                    log.error("clear replay file error: " + e);
                }
            }
        }
    }
}

