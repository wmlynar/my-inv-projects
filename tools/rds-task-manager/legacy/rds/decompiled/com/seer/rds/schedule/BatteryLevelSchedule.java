/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.alibaba.fastjson.JSONArray
 *  com.alibaba.fastjson.JSONObject
 *  com.seer.rds.config.GlobalCacheConfig
 *  com.seer.rds.dao.BatteryLevelRecordMapper
 *  com.seer.rds.model.stat.BatteryLevelRecord
 *  com.seer.rds.schedule.BatteryLevelSchedule
 *  com.seer.rds.service.system.ConfigService
 *  com.seer.rds.util.TimeUtils
 *  org.apache.commons.collections.CollectionUtils
 *  org.apache.commons.lang3.StringUtils
 *  org.apache.commons.lang3.time.DateFormatUtils
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
import com.seer.rds.dao.BatteryLevelRecordMapper;
import com.seer.rds.model.stat.BatteryLevelRecord;
import com.seer.rds.service.system.ConfigService;
import com.seer.rds.util.TimeUtils;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Collections;
import java.util.Date;
import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;
import org.apache.commons.collections.CollectionUtils;
import org.apache.commons.lang3.StringUtils;
import org.apache.commons.lang3.time.DateFormatUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;

@Configuration
@EnableScheduling
public class BatteryLevelSchedule {
    private static final Logger log = LoggerFactory.getLogger(BatteryLevelSchedule.class);
    private BatteryLevelRecordMapper batteryLevelRecordMapper;
    private final ConfigService configService;

    @Autowired
    public BatteryLevelSchedule(BatteryLevelRecordMapper batteryLevelRecordMapper, ConfigService configService) {
        this.batteryLevelRecordMapper = batteryLevelRecordMapper;
        this.configService = configService;
    }

    @Scheduled(cron="0 0/1 * * * ?")
    public void batteryLevelRecord() {
        if (!this.isStatBattery()) {
            return;
        }
        String cache = (String)GlobalCacheConfig.getCache((String)"robotsStatus");
        String format = "yyyy-MM-dd HH:mm:ss";
        if (StringUtils.isEmpty((CharSequence)cache) || Objects.equals(cache, "null")) {
            log.error("get core error, set vehicle status to disconnected.");
        } else {
            ArrayList cacheRecords = new ArrayList(Collections.emptyList());
            Date now = new Date();
            long next = TimeUtils.getNextMillisEndWithMinute0or5((Date)now);
            String nextTime = DateFormatUtils.format((long)next, (String)"yyyy-MM-dd HH:mm:ss");
            JSONObject obj = JSONObject.parseObject((String)cache);
            JSONArray reports = obj.getJSONArray("report");
            if (reports == null || reports.isEmpty()) {
                log.error("BatteryLeveStat error, rbk report null");
                return;
            }
            List all = this.batteryLevelRecordMapper.findAllByTime(nextTime);
            if (!all.isEmpty()) {
                for (int i = 0; i < reports.size(); ++i) {
                    JSONObject report = reports.getJSONObject(i);
                    String vehicleId = report.getString("uuid");
                    JSONObject rbkReport = report.getJSONObject("rbk_report");
                    BigDecimal batteryLevel = rbkReport != null ? rbkReport.getBigDecimal("battery_level") : null;
                    all.stream().filter(a -> a.getVehicleId().equals(vehicleId)).forEach(a -> {
                        BatteryLevelRecord newOneRecord = a.withBatteryLevel(batteryLevel);
                        cacheRecords.add(newOneRecord);
                    });
                }
            } else {
                for (int i = 0; i < reports.size(); ++i) {
                    JSONObject report = reports.getJSONObject(i);
                    String vehicleId = report.getString("uuid");
                    JSONObject rbkReport = report.getJSONObject("rbk_report");
                    BigDecimal batteryLevel = rbkReport != null ? rbkReport.getBigDecimal("battery_level") : null;
                    BatteryLevelRecord newOneRecord = BatteryLevelRecord.builder().time(nextTime).batteryLevel(batteryLevel).vehicleId(vehicleId).build();
                    cacheRecords.add(newOneRecord);
                }
            }
            if (!cacheRecords.isEmpty()) {
                this.batteryLevelRecordMapper.saveAll(cacheRecords);
                this.batteryLevelRecordMapper.flush();
            }
            cacheRecords.clear();
        }
    }

    public boolean isStatBattery() {
        List agvStastics = this.configService.getMapsConfigByUserKey("AGV_STASTIC");
        if (CollectionUtils.isEmpty((Collection)agvStastics)) {
            return false;
        }
        List collect = agvStastics.stream().filter(record -> {
            String statValue = record.getUserValue();
            if (statValue != null) {
                JSONArray statArray = JSONArray.parseArray((String)statValue);
                for (int i = 0; i < statArray.size(); ++i) {
                    JSONObject jsonObject = statArray.getJSONObject(i);
                    String batteryName = jsonObject.getString("name");
                    if (!batteryName.equals("agvBattery") && !batteryName.equals("agvNowBatteryTrend")) continue;
                    return true;
                }
            }
            return false;
        }).collect(Collectors.toList());
        return !CollectionUtils.isEmpty(collect);
    }
}

