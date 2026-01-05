/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.alibaba.fastjson.JSONArray
 *  com.alibaba.fastjson.JSONObject
 *  com.seer.rds.config.GlobalCacheConfig
 *  com.seer.rds.constant.RobotStatusEnum
 *  com.seer.rds.dao.RobotItemMapper
 *  com.seer.rds.dao.RobotStatusMapper
 *  com.seer.rds.model.stat.RobotItem
 *  com.seer.rds.model.stat.RobotStatusRecord
 *  com.seer.rds.schedule.RobotStatusSchedule
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
import com.seer.rds.config.GlobalCacheConfig;
import com.seer.rds.constant.RobotStatusEnum;
import com.seer.rds.dao.RobotItemMapper;
import com.seer.rds.dao.RobotStatusMapper;
import com.seer.rds.model.stat.RobotItem;
import com.seer.rds.model.stat.RobotStatusRecord;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Date;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.Queue;
import java.util.concurrent.ConcurrentLinkedQueue;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import org.apache.commons.lang3.StringUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;

@Configuration
@EnableScheduling
public class RobotStatusSchedule {
    private static final Logger log = LoggerFactory.getLogger(RobotStatusSchedule.class);
    @Autowired
    private RobotStatusMapper robotStatusMapper;
    @Autowired
    private RobotItemMapper robotItemMapper;
    private final Queue<RobotStatusRecord> tempStatusRecords = new ConcurrentLinkedQueue();
    private final Queue<RobotItem> tempItemRecords = new ConcurrentLinkedQueue();

    /*
     * WARNING - Removed try catching itself - possible behaviour change.
     */
    @Scheduled(cron="0/5 * * * * ?")
    public void recordVehicleStatus() {
        try {
            String cache = (String)GlobalCacheConfig.getCache((String)"robotsStatus");
            List allVehicles = this.robotItemMapper.findUuidGroupByUuid();
            if (StringUtils.isEmpty((CharSequence)cache) || Objects.equals(cache, "null")) {
                if (!allVehicles.isEmpty()) {
                    ((Stream)allVehicles.stream().parallel()).forEach(arg_0 -> this.updateRecordByUuid(arg_0));
                }
                log.error("get core error, set vehicle status to disconnected.");
            } else {
                String vehicleName;
                ArrayList cacheRecords = new ArrayList(Collections.emptyList());
                JSONObject obj = JSONObject.parseObject((String)cache);
                JSONArray rbkReports = obj.getJSONArray("report");
                if (rbkReports == null || rbkReports.isEmpty()) {
                    log.error("stat error, rbk report null");
                    return;
                }
                ArrayList<String> currentVehiclesInCore = new ArrayList<String>();
                for (Object rbkReportObj : rbkReports) {
                    JSONObject rbkReport;
                    if (!(rbkReportObj instanceof JSONObject) || !StringUtils.isNotEmpty((CharSequence)(vehicleName = (rbkReport = (JSONObject)rbkReportObj).getString("uuid")))) continue;
                    currentVehiclesInCore.add(vehicleName);
                }
                allVehicles.forEach(v -> {
                    if (!currentVehiclesInCore.contains(v)) {
                        RobotItem item = this.robotItemMapper.findByUuid(v);
                        item.setDel(Integer.valueOf(1));
                        item.setUpdateOn(new Date());
                        this.tempItemRecords.add(item);
                    }
                });
                for (int i = 0; i < rbkReports.size(); ++i) {
                    int status;
                    JSONObject rbkReport = rbkReports.getJSONObject(i);
                    String uuid2 = rbkReport.getString("uuid");
                    if (!allVehicles.contains(uuid2)) {
                        RobotItem robotItem = this.robotItemMapper.findByUuid(uuid2);
                        if (robotItem != null) {
                            robotItem.setDel(Integer.valueOf(0));
                            robotItem.setUpdateOn(new Date());
                        } else {
                            robotItem = RobotItem.builder().uuid(uuid2).addedOn(new Date()).updateOn(new Date()).del(Integer.valueOf(0)).build();
                        }
                        this.tempItemRecords.add(robotItem);
                        allVehicles.add(uuid2);
                    }
                    vehicleName = rbkReport.getString("vehicle_id");
                    String order = rbkReport.getBooleanValue("procBusiness") && rbkReport.getJSONObject("current_order") != null && rbkReport.getJSONObject("current_order").size() > 0 ? rbkReport.getJSONObject("current_order").getString("id") : null;
                    BigDecimal todayOdo = rbkReport.getJSONObject("rbk_report") != null ? rbkReport.getJSONObject("rbk_report").getBigDecimal("today_odo") : null;
                    BigDecimal odo = rbkReport.getJSONObject("rbk_report") != null ? rbkReport.getJSONObject("rbk_report").getBigDecimal("odo") : null;
                    String externalId = null;
                    String location = null;
                    int n = rbkReport.getIntValue("connection_status") == RobotStatusEnum.DISCONNECTED.getStatus() ? RobotStatusEnum.DISCONNECTED.getStatus() : (this.isErrorStatus(rbkReport) ? RobotStatusEnum.ERROR.getStatus() : (rbkReport.getJSONObject("rbk_report") != null && rbkReport.getJSONObject("rbk_report").getBooleanValue("charging") ? RobotStatusEnum.CHARGING.getStatus() : (!rbkReport.getBooleanValue("dispatchable") || rbkReport.getJSONObject("undispatchable_reason") != null && rbkReport.getJSONObject("undispatchable_reason").getIntValue("unlock") != 0 ? RobotStatusEnum.UNAVAILABLE.getStatus() : (status = rbkReport.getBooleanValue("procBusiness") ? RobotStatusEnum.EXECUTING.getStatus() : RobotStatusEnum.IDLE.getStatus()))));
                    if (status == RobotStatusEnum.EXECUTING.getStatus()) {
                        externalId = StringUtils.isNotEmpty((CharSequence)order) ? rbkReport.getJSONObject("current_order").getString("externalId") : null;
                        String string = location = StringUtils.isNotEmpty((CharSequence)order) && !rbkReport.getJSONObject("current_order").getJSONArray("blocks").isEmpty() ? rbkReport.getJSONObject("current_order").getJSONArray("blocks").getJSONObject(rbkReport.getJSONObject("current_order").getJSONArray("blocks").size() - 1).getString("location") : null;
                        if (StringUtils.isEmpty(location)) {
                            log.warn("vehicle {} is running order = {}, but location does not exist!", (Object)vehicleName, (Object)order);
                        }
                    }
                    cacheRecords.add(RobotStatusRecord.builder().uuid(uuid2).vehicleName(vehicleName).newStatus(Integer.valueOf(status)).startedOn(new Date()).orderId(order).todayOdo(todayOdo).odo(odo).externalId(externalId).location(location).build());
                }
                allVehicles.parallelStream().forEach(uuid -> {
                    if (cacheRecords.stream().map(RobotStatusRecord::getUuid).collect(Collectors.toList()).contains(uuid)) {
                        RobotStatusRecord lastRecord = this.robotStatusMapper.findTopByUuidOrderByStartedOnDesc(uuid);
                        Optional<RobotStatusRecord> cacheRecordOptional = cacheRecords.stream().filter(r -> Objects.equals(r.getUuid(), uuid)).findFirst();
                        if (cacheRecordOptional.isPresent()) {
                            Date ended = cacheRecordOptional.get().getStartedOn();
                            if (Objects.nonNull(lastRecord)) {
                                long duration = ended.toInstant().toEpochMilli() - lastRecord.getStartedOn().toInstant().toEpochMilli();
                                this.trySplit(ended, duration, lastRecord, cacheRecordOptional.get());
                            } else {
                                this.tempStatusRecords.add(cacheRecordOptional.get());
                            }
                        } else {
                            log.error("cacheRecord get error {}", (Object)cacheRecords);
                        }
                    } else {
                        this.updateRecordByUuid(uuid);
                    }
                });
            }
            if (!this.tempStatusRecords.isEmpty()) {
                this.robotStatusMapper.saveAll((Iterable)this.tempStatusRecords);
                this.robotStatusMapper.flush();
            }
            if (!this.tempItemRecords.isEmpty()) {
                this.robotItemMapper.saveAll((Iterable)this.tempItemRecords);
                this.robotItemMapper.flush();
            }
        }
        catch (Exception e) {
            log.error("stat robot status error", (Throwable)e);
        }
        finally {
            this.tempStatusRecords.clear();
            this.tempItemRecords.clear();
        }
    }

    private void updateRecordByUuid(String uuid) {
        RobotStatusRecord lastRecord = this.robotStatusMapper.findTopByUuidOrderByStartedOnDesc(uuid);
        if (Objects.nonNull(lastRecord)) {
            Date ended = new Date();
            long duration = ended.toInstant().toEpochMilli() - lastRecord.getStartedOn().toInstant().toEpochMilli();
            RobotStatusRecord newRecord = RobotStatusRecord.builder().uuid(lastRecord.getUuid()).vehicleName(lastRecord.getVehicleName()).oldStatus(lastRecord.getNewStatus()).newStatus(Integer.valueOf(RobotStatusEnum.DISCONNECTED.getStatus())).startedOn(ended).build();
            this.trySplit(ended, duration, lastRecord, newRecord);
        }
    }

    private void split(Date newEndedOn, long duration, RobotStatusRecord lastRecord, RobotStatusRecord cacheRecord, boolean hasEndedOn) {
        Instant lastRecordHour;
        RobotStatusRecord tempRecord = null;
        Instant thisHour = newEndedOn.toInstant().truncatedTo(ChronoUnit.HOURS);
        Instant instant = lastRecordHour = hasEndedOn ? lastRecord.getEndedOn().toInstant().truncatedTo(ChronoUnit.HOURS) : lastRecord.getStartedOn().toInstant().truncatedTo(ChronoUnit.HOURS);
        if (Objects.equals(thisHour, lastRecordHour)) {
            RobotStatusRecord newOneRecord = lastRecord.withEndedOn(newEndedOn).withDuration(Long.valueOf(duration)).withTodayOdo(Objects.nonNull(cacheRecord) ? cacheRecord.getTodayOdo() : lastRecord.getTodayOdo()).withOdo(Objects.nonNull(cacheRecord) ? cacheRecord.getOdo() : lastRecord.getOdo());
            this.tempStatusRecords.add(newOneRecord);
            if (Objects.nonNull(cacheRecord) && !Objects.equals(lastRecord.getNewStatus(), cacheRecord.getNewStatus())) {
                RobotStatusRecord newOneRecord2 = cacheRecord.withOldStatus(lastRecord.getNewStatus());
                this.tempStatusRecords.add(newOneRecord2);
            }
        } else {
            Instant tempTime;
            Instant instant2 = tempTime = hasEndedOn ? lastRecord.getEndedOn().toInstant() : lastRecord.getStartedOn().toInstant();
            while (newEndedOn.toInstant().isAfter(tempTime)) {
                RobotStatusRecord newOneRecord;
                Instant tempHour = tempTime.truncatedTo(ChronoUnit.HOURS);
                if (Objects.equals(tempHour, thisHour)) {
                    if (tempRecord == null) {
                        newOneRecord = lastRecord.withEndedOn(newEndedOn).withDuration(Long.valueOf(newEndedOn.toInstant().toEpochMilli() - lastRecord.getStartedOn().toInstant().toEpochMilli()));
                        log.info("this should not happen, tempRecord = null, last record = {}", (Object)lastRecord);
                    } else {
                        newOneRecord = RobotStatusRecord.builder().vehicleName(tempRecord.getVehicleName()).uuid(tempRecord.getUuid()).oldStatus(tempRecord.getNewStatus()).newStatus(tempRecord.getNewStatus()).startedOn(tempRecord.getEndedOn()).endedOn(newEndedOn).duration(Long.valueOf(newEndedOn.toInstant().toEpochMilli() - tempRecord.getEndedOn().toInstant().toEpochMilli())).build();
                    }
                    this.tempStatusRecords.add(newOneRecord);
                    if (!Objects.nonNull(cacheRecord) || Objects.equals(lastRecord.getNewStatus(), cacheRecord.getNewStatus())) break;
                    RobotStatusRecord newOneRecord2 = cacheRecord.withOldStatus(lastRecord.getNewStatus());
                    this.tempStatusRecords.add(newOneRecord2);
                    break;
                }
                tempTime = tempRecord == null && tempTime == tempTime.truncatedTo(ChronoUnit.HOURS) ? tempTime : tempTime.plus(1L, ChronoUnit.HOURS).truncatedTo(ChronoUnit.HOURS);
                newOneRecord = tempRecord == null ? lastRecord.withEndedOn(Date.from(tempTime)).withDuration(Long.valueOf(tempTime.toEpochMilli() - lastRecord.getStartedOn().toInstant().toEpochMilli())) : RobotStatusRecord.builder().vehicleName(tempRecord.getVehicleName()).uuid(tempRecord.getUuid()).oldStatus(tempRecord.getNewStatus()).newStatus(tempRecord.getNewStatus()).startedOn(tempRecord.getEndedOn()).endedOn(Date.from(tempTime)).duration(Long.valueOf(tempTime.toEpochMilli() - tempRecord.getEndedOn().toInstant().toEpochMilli())).build();
                tempRecord = newOneRecord;
                this.tempStatusRecords.add(newOneRecord);
            }
        }
    }

    private void trySplit(Date newEndedOn, long duration, RobotStatusRecord lastRecord, RobotStatusRecord cacheRecord) {
        this.split(newEndedOn, duration, lastRecord, cacheRecord, Objects.nonNull(lastRecord.getEndedOn()));
    }

    private boolean isErrorStatus(JSONObject report) {
        JSONObject rbkReport = report.getJSONObject("rbk_report");
        JSONObject alarms = rbkReport.getJSONObject("alarms");
        JSONArray fatals = alarms.getJSONArray("fatals");
        JSONArray errors = alarms.getJSONArray("errors");
        return !fatals.isEmpty() || !errors.isEmpty();
    }
}

