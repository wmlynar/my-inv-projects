/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.alibaba.fastjson.JSONArray
 *  com.alibaba.fastjson.JSONObject
 *  com.google.common.collect.Maps
 *  com.seer.rds.config.GlobalCacheConfig
 *  com.seer.rds.constant.VehicleAlarmsEnum
 *  com.seer.rds.dao.AlarmsRecordMapper
 *  com.seer.rds.dao.AlarmsRecordMergeMapper
 *  com.seer.rds.dao.CoreAlarmsRecordMapper
 *  com.seer.rds.dao.RobotItemMapper
 *  com.seer.rds.listener.EventSource
 *  com.seer.rds.listener.WindEvent
 *  com.seer.rds.model.stat.AlarmsRecord
 *  com.seer.rds.model.stat.AlarmsRecordMerge
 *  com.seer.rds.model.stat.CoreAlarmsRecord
 *  com.seer.rds.schedule.AlarmsSchedule
 *  com.seer.rds.schedule.AlarmsSchedule$VehicleStation
 *  com.seer.rds.util.SpringUtil
 *  com.seer.rds.vo.response.RobotAlarm
 *  org.apache.commons.collections.CollectionUtils
 *  org.apache.commons.lang3.StringUtils
 *  org.slf4j.Logger
 *  org.slf4j.LoggerFactory
 *  org.springframework.beans.factory.annotation.Autowired
 *  org.springframework.context.annotation.Configuration
 *  org.springframework.scheduling.annotation.EnableScheduling
 *  org.springframework.scheduling.annotation.Scheduled
 */
package com.seer.rds.schedule;

import com.alibaba.fastjson.JSONArray;
import com.alibaba.fastjson.JSONObject;
import com.google.common.collect.Maps;
import com.seer.rds.config.GlobalCacheConfig;
import com.seer.rds.constant.VehicleAlarmsEnum;
import com.seer.rds.dao.AlarmsRecordMapper;
import com.seer.rds.dao.AlarmsRecordMergeMapper;
import com.seer.rds.dao.CoreAlarmsRecordMapper;
import com.seer.rds.dao.RobotItemMapper;
import com.seer.rds.listener.EventSource;
import com.seer.rds.listener.WindEvent;
import com.seer.rds.model.stat.AlarmsRecord;
import com.seer.rds.model.stat.AlarmsRecordMerge;
import com.seer.rds.model.stat.CoreAlarmsRecord;
import com.seer.rds.schedule.AlarmsSchedule;
import com.seer.rds.util.SpringUtil;
import com.seer.rds.vo.response.RobotAlarm;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Objects;
import java.util.Queue;
import java.util.concurrent.ConcurrentLinkedQueue;
import java.util.stream.Collectors;
import org.apache.commons.collections.CollectionUtils;
import org.apache.commons.lang3.StringUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;

@Configuration
@EnableScheduling
public class AlarmsSchedule {
    private static final Logger log = LoggerFactory.getLogger(AlarmsSchedule.class);
    @Autowired
    private AlarmsRecordMapper alarmsRecordMapper;
    @Autowired
    private AlarmsRecordMergeMapper alarmsRecordMergeMapper;
    @Autowired
    private RobotItemMapper robotItemMapper;
    @Autowired
    private CoreAlarmsRecordMapper coreAlarmsRecordMapper;
    private final Queue<AlarmsRecord> tempAlarmsRecords = new ConcurrentLinkedQueue();
    private final Queue<AlarmsRecordMerge> tempAlarmsRecordsMerge = new ConcurrentLinkedQueue();

    @Autowired
    public AlarmsSchedule(AlarmsRecordMapper alarmsMapper) {
        this.alarmsRecordMapper = alarmsMapper;
    }

    /*
     * WARNING - Removed try catching itself - possible behaviour change.
     */
    @Scheduled(cron="0/5 * * * * ?")
    public void alarmsRecord() {
        try {
            EventSource eventSource = (EventSource)SpringUtil.getBean(EventSource.class);
            HashMap vehicleStationHashMap = Maps.newHashMap();
            List alarmsRecords = this.alarmsRecordMapper.findByTypeIsZero();
            List alarmsRecordsMerge = this.alarmsRecordMergeMapper.findByTypeIsZero();
            List itemVehicles = this.robotItemMapper.findUuidGroupByUuid();
            ArrayList allVehicles = new ArrayList(Collections.emptyList());
            if (Objects.nonNull(itemVehicles)) {
                allVehicles.addAll(itemVehicles);
            }
            String cache = (String)GlobalCacheConfig.getCache((String)"robotsStatus");
            ArrayList endList = new ArrayList();
            if (StringUtils.isEmpty((CharSequence)cache) || Objects.equals(cache, "null")) {
                ArrayList cacheRecords;
                Date now = new Date();
                if (!alarmsRecords.isEmpty()) {
                    cacheRecords = new ArrayList(Collections.emptyList());
                    this.splitAlarmsRecords(now, alarmsRecords, cacheRecords);
                }
                if (!alarmsRecordsMerge.isEmpty()) {
                    cacheRecords = new ArrayList(Collections.emptyList());
                    this.mergeAlarmsRecords(now, alarmsRecordsMerge, cacheRecords, endList);
                }
                log.error("get core error, set vehicle status to disconnected.");
            } else {
                ArrayList cacheRecords = new ArrayList(Collections.emptyList());
                ArrayList cacheRecordsMerge = new ArrayList(Collections.emptyList());
                Date now = new Date();
                JSONObject obj = JSONObject.parseObject((String)cache);
                JSONArray reports = obj.getJSONArray("report");
                if (reports == null || reports.isEmpty()) {
                    log.error("AlarmStat error, rbk report null");
                    return;
                }
                for (int i = 0; i < reports.size(); ++i) {
                    JSONObject report = reports.getJSONObject(i);
                    String vehicleId = report.getString("uuid");
                    JSONObject rbkReport = report.getJSONObject("rbk_report");
                    JSONObject alarms = rbkReport.getJSONObject("alarms");
                    if (!vehicleStationHashMap.containsKey(vehicleId)) {
                        String string = rbkReport.getString("current_station");
                        String lastStation = rbkReport.getString("last_station");
                        VehicleStation vehicleStation = new VehicleStation(this);
                        vehicleStation.setStation(string);
                        vehicleStation.setLastStation(lastStation);
                        vehicleStationHashMap.put(vehicleId, vehicleStation);
                    }
                    for (VehicleAlarmsEnum vehicleAlarmsEnum : VehicleAlarmsEnum.values()) {
                        JSONArray level = alarms.getJSONArray(vehicleAlarmsEnum.getLevel());
                        for (int j = 0; j < level.size(); ++j) {
                            JSONObject error = level.getJSONObject(j);
                            String code = error.getString("code");
                            String desc = error.getString("desc");
                            if (desc.length() > 1024) {
                                desc = desc.substring(0, 1024);
                            }
                            AlarmsRecord newOneRecord = AlarmsRecord.builder().alarmsCode(code).alarmsDesc(desc).startedOn(now).vehicleId(vehicleId).level(vehicleAlarmsEnum.getLevel()).type(Integer.valueOf(0)).build();
                            cacheRecords.add(newOneRecord);
                            AlarmsRecordMerge newOneRecordMerge = AlarmsRecordMerge.builder().alarmsCode(code).alarmsDesc(desc).startedOn(now).vehicleId(vehicleId).level(vehicleAlarmsEnum.getLevel()).type(Integer.valueOf(0)).build();
                            cacheRecordsMerge.add(newOneRecordMerge);
                        }
                    }
                }
                List newRecords = cacheRecords.stream().filter(item -> !alarmsRecords.stream().map(e -> e.getVehicleId() + "&" + e.getAlarmsCode()).collect(Collectors.toList()).contains(item.getVehicleId() + "&" + item.getAlarmsCode())).collect(Collectors.toList());
                List newRecordsMerge = cacheRecordsMerge.stream().filter(item -> !alarmsRecordsMerge.stream().map(e -> e.getVehicleId() + "&" + e.getAlarmsCode()).collect(Collectors.toList()).contains(item.getVehicleId() + "&" + item.getAlarmsCode())).collect(Collectors.toList());
                this.tempAlarmsRecords.addAll(newRecords);
                this.tempAlarmsRecordsMerge.addAll(newRecordsMerge);
                Date endTime = new Date();
                this.splitAlarmsRecords(endTime, alarmsRecords, cacheRecords);
                this.mergeAlarmsRecords(endTime, alarmsRecordsMerge, cacheRecordsMerge, endList);
                if (!newRecordsMerge.isEmpty()) {
                    for (AlarmsRecordMerge newRecord : newRecordsMerge) {
                        WindEvent windEvent = new WindEvent();
                        windEvent.setType(Integer.valueOf(9));
                        windEvent.setData((Object)RobotAlarm.builder().alarmsCode(newRecord.getAlarmsCode()).alarmsDesc(newRecord.getAlarmsDesc()).startedOn(newRecord.getStartedOn()).vehicleId(newRecord.getVehicleId()).level(newRecord.getLevel()).station(((VehicleStation)vehicleStationHashMap.get(newRecord.getVehicleId())).getStation()).lastStation(((VehicleStation)vehicleStationHashMap.get(newRecord.getVehicleId())).getLastStation()).build());
                        eventSource.notify(windEvent);
                    }
                }
                cacheRecords.clear();
                cacheRecordsMerge.clear();
            }
            if (!this.tempAlarmsRecords.isEmpty()) {
                this.alarmsRecordMapper.saveAll((Iterable)this.tempAlarmsRecords);
                this.alarmsRecordMapper.flush();
            }
            if (!this.tempAlarmsRecordsMerge.isEmpty()) {
                this.alarmsRecordMergeMapper.saveAll((Iterable)this.tempAlarmsRecordsMerge);
                this.alarmsRecordMergeMapper.flush();
                this.noticeScriptVechileErrorEnd(endList, vehicleStationHashMap);
            }
            this.insertCoreAlarm();
        }
        catch (Exception e) {
            log.error("stat alarmsRecrod error", (Throwable)e);
        }
        finally {
            this.tempAlarmsRecords.clear();
            this.tempAlarmsRecordsMerge.clear();
        }
    }

    private void noticeScriptVechileErrorEnd(List<AlarmsRecordMerge> endList, HashMap<String, VehicleStation> vehicleStationHashMap) {
        EventSource eventSource = (EventSource)SpringUtil.getBean(EventSource.class);
        for (AlarmsRecordMerge newRecord : endList) {
            WindEvent event = new WindEvent();
            event.setType(Integer.valueOf(13));
            event.setData((Object)RobotAlarm.builder().alarmsCode(newRecord.getAlarmsCode()).alarmsDesc(newRecord.getAlarmsDesc()).startedOn(newRecord.getStartedOn()).vehicleId(newRecord.getVehicleId()).level(newRecord.getLevel()).station(vehicleStationHashMap.containsKey(newRecord.getVehicleId()) ? vehicleStationHashMap.get(newRecord.getVehicleId()).getStation() : "").lastStation(vehicleStationHashMap.containsKey(newRecord.getVehicleId()) ? vehicleStationHashMap.get(newRecord.getVehicleId()).getLastStation() : "").build());
            eventSource.notify(event);
        }
    }

    private void splitAlarmsRecords(Date endTime, List<AlarmsRecord> lastRecords, List<AlarmsRecord> cacheRecords) {
        block0: for (AlarmsRecord ar : lastRecords) {
            Instant lastRecordHour;
            AlarmsRecord tempRecord = null;
            Instant thisHour = endTime.toInstant().truncatedTo(ChronoUnit.HOURS);
            if (!Objects.equals(thisHour, lastRecordHour = ar.getStartedOn().toInstant().truncatedTo(ChronoUnit.HOURS))) {
                Instant tempTime = ar.getStartedOn().toInstant();
                while (endTime.toInstant().isAfter(tempTime)) {
                    AlarmsRecord newOneRecord;
                    Instant tempHour = tempTime.truncatedTo(ChronoUnit.HOURS);
                    if (Objects.equals(tempHour, thisHour)) {
                        boolean present = cacheRecords.stream().anyMatch(i -> i.getAlarmsCode().equals(ar.getAlarmsCode()) && i.getVehicleId().equals(ar.getVehicleId()));
                        newOneRecord = present ? AlarmsRecord.builder().alarmsCode(tempRecord.getAlarmsCode()).alarmsDesc(tempRecord.getAlarmsDesc()).startedOn(tempRecord.getEndedOn()).vehicleId(tempRecord.getVehicleId()).level(tempRecord.getLevel()).type(Integer.valueOf(0)).build() : AlarmsRecord.builder().alarmsCode(tempRecord.getAlarmsCode()).alarmsDesc(tempRecord.getAlarmsDesc()).startedOn(tempRecord.getEndedOn()).vehicleId(tempRecord.getVehicleId()).level(tempRecord.getLevel()).endedOn(endTime).alarmsCostTime(BigDecimal.valueOf(endTime.getTime() - tempRecord.getEndedOn().getTime())).type(Integer.valueOf(1)).build();
                        this.tempAlarmsRecords.add(newOneRecord);
                        continue block0;
                    }
                    tempTime = tempTime.plus(1L, ChronoUnit.HOURS).truncatedTo(ChronoUnit.HOURS);
                    newOneRecord = tempRecord == null ? ar.withEndedOn(Date.from(tempTime)).withAlarmsCostTime(BigDecimal.valueOf(tempTime.toEpochMilli() - ar.getStartedOn().toInstant().toEpochMilli())).withType(Integer.valueOf(1)) : AlarmsRecord.builder().vehicleId(tempRecord.getVehicleId()).alarmsCode(tempRecord.getAlarmsCode()).alarmsDesc(tempRecord.getAlarmsDesc()).startedOn(tempRecord.getEndedOn()).level(tempRecord.getLevel()).endedOn(Date.from(tempTime)).alarmsCostTime(BigDecimal.valueOf(tempTime.toEpochMilli() - tempRecord.getEndedOn().toInstant().toEpochMilli())).type(Integer.valueOf(1)).build();
                    tempRecord = newOneRecord;
                    this.tempAlarmsRecords.add(newOneRecord);
                }
                continue;
            }
            boolean present = cacheRecords.stream().anyMatch(i -> i.getAlarmsCode().equals(ar.getAlarmsCode()) && i.getVehicleId().equals(ar.getVehicleId()));
            if (present) continue;
            AlarmsRecord alarmsRecord = ar.withEndedOn(endTime).withType(Integer.valueOf(1)).withAlarmsCostTime(BigDecimal.valueOf(endTime.getTime() - ar.getStartedOn().getTime()));
            this.tempAlarmsRecords.add(alarmsRecord);
        }
    }

    public void mergeAlarmsRecords(Date endTime, List<AlarmsRecordMerge> lastRecords, List<AlarmsRecordMerge> cacheRecords, List<AlarmsRecordMerge> endList) {
        List oldRecords = lastRecords.stream().filter(item -> !cacheRecords.stream().map(e -> e.getVehicleId() + "&" + e.getAlarmsCode()).collect(Collectors.toList()).contains(item.getVehicleId() + "&" + item.getAlarmsCode())).collect(Collectors.toList());
        for (AlarmsRecordMerge ar : oldRecords) {
            BigDecimal alarmsCostTime = BigDecimal.valueOf(endTime.getTime() - ar.getStartedOn().getTime());
            AlarmsRecordMerge alarmsRecord = ar.withEndedOn(endTime).withType(Integer.valueOf(1)).withAlarmsCostTime(alarmsCostTime);
            this.tempAlarmsRecordsMerge.add(alarmsRecord);
            endList.add(alarmsRecord);
        }
    }

    private void insertCoreAlarm() {
        String cache = (String)GlobalCacheConfig.getCache((String)"robotsStatus");
        List pending = this.coreAlarmsRecordMapper.findAllByTypeIs(0);
        if (StringUtils.isEmpty((CharSequence)cache) || Objects.equals(cache, "null")) {
            this.updateEndCoreAlarms(pending);
        } else {
            JSONObject obj = JSONObject.parseObject((String)cache);
            JSONObject alarms = obj.getJSONObject("alarms");
            ArrayList cacheRecordsMerge = new ArrayList(Collections.emptyList());
            for (VehicleAlarmsEnum vehicleAlarmsEnum : VehicleAlarmsEnum.values()) {
                JSONArray level = alarms.getJSONArray(vehicleAlarmsEnum.getLevel());
                for (int j = 0; j < level.size(); ++j) {
                    JSONObject error = level.getJSONObject(j);
                    String code = error.getString("code");
                    String desc = error.getString("desc");
                    CoreAlarmsRecord newOneRecordMerge = CoreAlarmsRecord.builder().alarmsCode(code).alarmsDesc(desc).startedOn(new Date()).alarmLevel(vehicleAlarmsEnum.getLevel()).type(Integer.valueOf(0)).build();
                    cacheRecordsMerge.add(newOneRecordMerge);
                }
            }
            List newRecordsMerge = cacheRecordsMerge.stream().filter(item -> !pending.stream().map(e -> e.getAlarmLevel() + "&" + e.getAlarmsCode()).collect(Collectors.toList()).contains(item.getAlarmLevel() + "&" + item.getAlarmsCode())).collect(Collectors.toList());
            List oldRecords = pending.stream().filter(item -> !cacheRecordsMerge.stream().map(e -> e.getAlarmLevel() + "&" + e.getAlarmsCode()).collect(Collectors.toList()).contains(item.getAlarmLevel() + "&" + item.getAlarmsCode())).collect(Collectors.toList());
            if (CollectionUtils.isNotEmpty(newRecordsMerge)) {
                this.coreAlarmsRecordMapper.saveAll(newRecordsMerge);
                this.noticeScriptCore(12, newRecordsMerge);
            }
            if (CollectionUtils.isNotEmpty(oldRecords)) {
                this.updateEndCoreAlarms(oldRecords);
            }
        }
    }

    private void updateEndCoreAlarms(List<CoreAlarmsRecord> records) {
        if (CollectionUtils.isNotEmpty(records)) {
            Date endTime = new Date();
            for (CoreAlarmsRecord ar : records) {
                BigDecimal alarmsCostTime = BigDecimal.valueOf(endTime.getTime() - ar.getStartedOn().getTime());
                ar.setEndedOn(endTime);
                ar.setType(Integer.valueOf(1));
                ar.setAlarmsCostTime(alarmsCostTime);
            }
            this.coreAlarmsRecordMapper.saveAll(records);
            this.noticeScriptCore(11, records);
        }
    }

    private void noticeScriptCore(int type, List<CoreAlarmsRecord> records) {
        if (CollectionUtils.isNotEmpty(records)) {
            EventSource eventSource = (EventSource)SpringUtil.getBean(EventSource.class);
            for (CoreAlarmsRecord newRecord : records) {
                WindEvent event = new WindEvent();
                event.setType(Integer.valueOf(type));
                event.setData((Object)RobotAlarm.builder().alarmsCode(newRecord.getAlarmsCode()).alarmsDesc(newRecord.getAlarmsDesc()).startedOn(newRecord.getStartedOn()).level(newRecord.getAlarmLevel()).build());
                eventSource.notify(event);
            }
        }
    }
}

