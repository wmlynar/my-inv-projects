/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.alibaba.fastjson.JSON
 *  com.alibaba.fastjson.JSONArray
 *  com.alibaba.fastjson.JSONObject
 *  com.google.common.collect.Lists
 *  com.seer.rds.config.GlobalCacheConfig
 *  com.seer.rds.config.PropConfig
 *  com.seer.rds.config.configview.CommonConfig
 *  com.seer.rds.config.configview.operator.OperatorConfig
 *  com.seer.rds.config.configview.operator.OperatorWorkStation
 *  com.seer.rds.config.configview.operator.OperatorWorkType
 *  com.seer.rds.constant.RobotStatusEnum
 *  com.seer.rds.constant.StatLevelEnum
 *  com.seer.rds.constant.StatTypeEnum
 *  com.seer.rds.constant.TaskStatusEnum
 *  com.seer.rds.dao.AlarmsRecordMapper
 *  com.seer.rds.dao.AlarmsRecordMergeMapper
 *  com.seer.rds.dao.RobotItemMapper
 *  com.seer.rds.dao.RobotStatusMapper
 *  com.seer.rds.dao.StatAgvLoadedTimeMapper
 *  com.seer.rds.dao.StatRecordDuplicateMapper
 *  com.seer.rds.dao.StatRecordMapper
 *  com.seer.rds.dao.WindTaskDefMapper
 *  com.seer.rds.dao.WindTaskRecordMapper
 *  com.seer.rds.model.stat.AlarmsRecord
 *  com.seer.rds.model.stat.RobotStatusRecord
 *  com.seer.rds.model.stat.StatAgvLoadedTime
 *  com.seer.rds.model.stat.StatRecord
 *  com.seer.rds.model.stat.StatRecordDuplicate
 *  com.seer.rds.model.stat.TimePeriod
 *  com.seer.rds.model.wind.TaskRecord
 *  com.seer.rds.model.wind.WindTaskRecord
 *  com.seer.rds.schedule.StatSchedule
 *  com.seer.rds.service.system.ConfigService
 *  com.seer.rds.util.OkHttpUtil
 *  com.seer.rds.util.TimeUtils
 *  com.seer.rds.web.config.ConfigFileController
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

import com.alibaba.fastjson.JSON;
import com.alibaba.fastjson.JSONArray;
import com.alibaba.fastjson.JSONObject;
import com.google.common.collect.Lists;
import com.seer.rds.config.GlobalCacheConfig;
import com.seer.rds.config.PropConfig;
import com.seer.rds.config.configview.CommonConfig;
import com.seer.rds.config.configview.operator.OperatorConfig;
import com.seer.rds.config.configview.operator.OperatorWorkStation;
import com.seer.rds.config.configview.operator.OperatorWorkType;
import com.seer.rds.constant.RobotStatusEnum;
import com.seer.rds.constant.StatLevelEnum;
import com.seer.rds.constant.StatTypeEnum;
import com.seer.rds.constant.TaskStatusEnum;
import com.seer.rds.dao.AlarmsRecordMapper;
import com.seer.rds.dao.AlarmsRecordMergeMapper;
import com.seer.rds.dao.RobotItemMapper;
import com.seer.rds.dao.RobotStatusMapper;
import com.seer.rds.dao.StatAgvLoadedTimeMapper;
import com.seer.rds.dao.StatRecordDuplicateMapper;
import com.seer.rds.dao.StatRecordMapper;
import com.seer.rds.dao.WindTaskDefMapper;
import com.seer.rds.dao.WindTaskRecordMapper;
import com.seer.rds.model.stat.AlarmsRecord;
import com.seer.rds.model.stat.RobotStatusRecord;
import com.seer.rds.model.stat.StatAgvLoadedTime;
import com.seer.rds.model.stat.StatRecord;
import com.seer.rds.model.stat.StatRecordDuplicate;
import com.seer.rds.model.stat.TimePeriod;
import com.seer.rds.model.wind.TaskRecord;
import com.seer.rds.model.wind.WindTaskRecord;
import com.seer.rds.service.system.ConfigService;
import com.seer.rds.util.OkHttpUtil;
import com.seer.rds.util.TimeUtils;
import com.seer.rds.web.config.ConfigFileController;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collection;
import java.util.Date;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.OptionalDouble;
import java.util.function.Predicate;
import java.util.stream.Collectors;
import java.util.stream.Stream;
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
public class StatSchedule {
    private static final Logger log = LoggerFactory.getLogger(StatSchedule.class);
    private final RobotStatusMapper robotStatusMapper;
    private final RobotItemMapper robotItemMapper;
    private final WindTaskRecordMapper windTaskRecordMapper;
    private final StatRecordMapper statRecordMapper;
    private final StatRecordDuplicateMapper statRecordDuplicateMapper;
    private final WindTaskDefMapper defMapper;
    private final AlarmsRecordMapper alarmsRecordMapper;
    private final AlarmsRecordMergeMapper alarmsRecordMergeMapper;
    private final StatAgvLoadedTimeMapper statAgvLoadedTimeMapper;
    private final ConfigService configService;
    @Autowired
    private PropConfig propConfig;

    @Autowired
    public StatSchedule(RobotStatusMapper robotStatusMapper, WindTaskRecordMapper windTaskRecordMapper, StatRecordMapper statRecordMapper, StatRecordDuplicateMapper statRecordDuplicateMapper, WindTaskDefMapper defMapper, AlarmsRecordMapper alarmsRecordMapper, AlarmsRecordMergeMapper alarmsRecordMergeMapper, RobotItemMapper robotItemMapper, StatAgvLoadedTimeMapper statAgvLoadedTimeMapper, ConfigService configService) {
        this.robotStatusMapper = robotStatusMapper;
        this.windTaskRecordMapper = windTaskRecordMapper;
        this.statRecordMapper = statRecordMapper;
        this.statRecordDuplicateMapper = statRecordDuplicateMapper;
        this.defMapper = defMapper;
        this.alarmsRecordMapper = alarmsRecordMapper;
        this.alarmsRecordMergeMapper = alarmsRecordMergeMapper;
        this.robotItemMapper = robotItemMapper;
        this.statAgvLoadedTimeMapper = statAgvLoadedTimeMapper;
        this.configService = configService;
    }

    @Scheduled(cron="0 5/10 * * * ?")
    public void doFrequently() {
        try {
            List vehicles = this.robotItemMapper.findUuidGroupByUuid();
            ZonedDateTime thisHour = ZonedDateTime.now().truncatedTo(ChronoUnit.HOURS);
            this.doStatHour(thisHour, vehicles);
            ZonedDateTime lastHour = thisHour.minus(1L, ChronoUnit.HOURS).truncatedTo(ChronoUnit.HOURS);
            this.doStatHour(lastHour, vehicles);
        }
        catch (Exception e) {
            log.error("do frequently stat error", (Throwable)e);
        }
    }

    @Scheduled(cron="0 8/10 * * * ?")
    public void doDaily() {
        try {
            ZonedDateTime today = ZonedDateTime.now().truncatedTo(ChronoUnit.DAYS);
            this.updateStatByTopLevel(today, StatLevelEnum.Day);
            ZonedDateTime currentTime = ZonedDateTime.now();
            this.updateStatByDutyDay(currentTime, StatLevelEnum.DutyDay);
            ZonedDateTime dayOneOfMonth = ZonedDateTime.now().withDayOfMonth(1);
            this.updateStatByTopLevel(dayOneOfMonth, StatLevelEnum.Month);
            ZonedDateTime dayOneOfYear = ZonedDateTime.now().withDayOfYear(1);
            this.updateStatByTopLevel(dayOneOfYear, StatLevelEnum.Year);
        }
        catch (Exception e) {
            log.error("do daily stat error", (Throwable)e);
        }
    }

    @Scheduled(cron="0/5 * * * * ?")
    public void statAgvLoadedTime() {
        try {
            List vehicles = this.robotItemMapper.findUuidGroupByUuid();
            if (CollectionUtils.isEmpty((Collection)vehicles)) {
                log.warn("t_robotitem \u8868\u4e3a\u7a7a\uff01");
                return;
            }
            String cache = (String)GlobalCacheConfig.getCache((String)"robotsStatus");
            if (StringUtils.isEmpty((CharSequence)cache)) {
                return;
            }
            JSONObject robotStatus = JSON.parseObject((String)cache);
            JSONArray reportArray = robotStatus.getJSONArray("report");
            for (int i = 0; i < reportArray.size(); ++i) {
                JSONObject report = reportArray.getJSONObject(i);
                String uuid = report.getString("uuid");
                if (!vehicles.contains(uuid)) continue;
                Boolean isLoaded = report.getBoolean("isLoaded");
                if (null == isLoaded) {
                    return;
                }
                Date startDate = new Date();
                Date endDate = new Date();
                startDate.setHours(0);
                startDate.setMinutes(0);
                startDate.setSeconds(0);
                endDate.setHours(23);
                endDate.setMinutes(59);
                endDate.setSeconds(59);
                List records = this.statAgvLoadedTimeMapper.findByAgvIdAndUpdateTimeBetween(uuid, startDate, endDate);
                if (CollectionUtils.isEmpty((Collection)records)) {
                    if (!isLoaded.booleanValue()) continue;
                    StatAgvLoadedTime statAgvLoadedTime = new StatAgvLoadedTime(uuid, new BigDecimal(0), new Date());
                    this.statAgvLoadedTimeMapper.save((Object)statAgvLoadedTime);
                    continue;
                }
                Date now = new Date();
                StatAgvLoadedTime record = (StatAgvLoadedTime)records.get(0);
                if (isLoaded.booleanValue()) {
                    BigDecimal oldLoadedTime = record.getLoadedTime();
                    Date updateTime = record.getUpdateTime();
                    long duration = now.getTime() - updateTime.getTime();
                    BigDecimal newLoadedTime = oldLoadedTime.add(BigDecimal.valueOf(duration));
                    record.setLoadedTime(newLoadedTime);
                }
                record.setUpdateTime(now);
                this.statAgvLoadedTimeMapper.save((Object)record);
            }
        }
        catch (Exception e) {
            log.error("\u7edf\u8ba1\u673a\u5668\u4eba\u8f7d\u8d27\u65f6\u95f4\u5f02\u5e38\u3002", (Throwable)e);
        }
    }

    private void doStatHour(ZonedDateTime time, List<String> vehicles) {
        ArrayList tempVehicles = Lists.newArrayList(vehicles);
        this.doVehiclesHourStat(time, (List)tempVehicles);
        this.doCoreHourStat(time, (List)tempVehicles);
        this.doWindTaskHourStat(time);
        this.doAlarmsRecordStat(time, vehicles);
    }

    private void updateStatByTopLevel(ZonedDateTime startTime, StatLevelEnum levelEnum) {
        if (levelEnum == StatLevelEnum.Hour) {
            return;
        }
        String pattern = StatLevelEnum.getDatePatternByLevel((StatLevelEnum)levelEnum);
        String timeStr = startTime.format(DateTimeFormatter.ofPattern(pattern));
        StatLevelEnum nextLevel = StatLevelEnum.getNextLevel((StatLevelEnum)levelEnum);
        assert (nextLevel != null);
        List statRecords = this.statRecordMapper.findAllByTimeAndLevel(timeStr, levelEnum.name());
        List nextLevelRecords = this.statRecordMapper.findAllByLevelAndTimeLike(nextLevel.name(), timeStr + "%");
        ArrayList<StatRecord> newRecords = new ArrayList<StatRecord>();
        List statRecordsDuplicate = this.statRecordDuplicateMapper.findAllByTimeAndLevel(timeStr, levelEnum.name());
        List nextLevelRecordsDuplicate = this.statRecordDuplicateMapper.findAllByLevelAndTimeLike(nextLevel.name(), timeStr + "%");
        ArrayList<StatRecordDuplicate> newRecordsDuplicate = new ArrayList<StatRecordDuplicate>();
        CommonConfig commonConfig = ConfigFileController.commonConfig;
        List vehicles = this.robotItemMapper.findUuidGroupByUuid();
        vehicles.add(null);
        List taskLabels = this.defMapper.findAllLabel();
        List agvTypeEnums = this.getStatConfigEnum(Arrays.asList(StatTypeEnum.values()), "AGV_STASTIC");
        List taskTypeEnums = this.getStatConfigEnum(Arrays.asList(StatTypeEnum.values()), "TASK_STATIC");
        List orderTypeEnums = this.getStatConfigEnum(Arrays.asList(StatTypeEnum.values()), "ORDER_STATIC");
        ArrayList combinedList = new ArrayList();
        HashSet set = new HashSet();
        if (!agvTypeEnums.isEmpty()) {
            set.addAll(agvTypeEnums);
        }
        if (!taskTypeEnums.isEmpty()) {
            set.addAll(taskTypeEnums);
        }
        if (!orderTypeEnums.isEmpty()) {
            set.addAll(orderTypeEnums);
        }
        combinedList.addAll(set);
        for (StatTypeEnum statTypeEnum : combinedList) {
            StatRecordDuplicate newOneRecord;
            BigDecimal sum;
            Optional<BigDecimal> optionalSum;
            StatRecordDuplicate statRecordDuplicate;
            OperatorConfig operator;
            StatRecord newOneRecord2;
            BigDecimal sum2;
            Optional<BigDecimal> optionalSum2;
            Object statRecord;
            if (statTypeEnum.name().startsWith("WindTask")) {
                for (String label : taskLabels) {
                    statRecord = statRecords.stream().filter(r -> r.getType().equals(statTypeEnum.name()) && Objects.equals(r.getThirdId(), label)).findFirst().orElse(null);
                    optionalSum2 = nextLevelRecords.stream().filter(r -> r.getType().equals(statTypeEnum.name()) && Objects.equals(r.getThirdId(), label)).map(StatRecord::getValue).reduce(BigDecimal::add);
                    sum2 = optionalSum2.orElse(BigDecimal.ZERO);
                    newOneRecord2 = statRecord != null ? statRecord.withRecordedOn(new Date()).withValue(sum2) : StatRecord.builder().type(statTypeEnum.name()).level(levelEnum.name()).recordedOn(new Date()).thirdId(label).time(timeStr).value(sum2).build();
                    newRecords.add(newOneRecord2);
                }
                continue;
            }
            if (statTypeEnum.name().startsWith("WorkTypeTask")) {
                if (commonConfig == null || (operator = commonConfig.getOperator()) == null) continue;
                ArrayList workTypes = Lists.newArrayList((Iterable)operator.getWorkTypes());
                for (OperatorWorkType operatorWorkType : workTypes) {
                    statRecordDuplicate = statRecordsDuplicate.stream().filter(r -> r.getType().equals(statTypeEnum.name()) && Objects.equals(r.getThirdId(), operatorWorkType.getId())).findFirst().orElse(null);
                    optionalSum = nextLevelRecordsDuplicate.stream().filter(r -> r.getType().equals(statTypeEnum.name()) && Objects.equals(r.getThirdId(), operatorWorkType.getId())).map(StatRecordDuplicate::getValue).reduce(BigDecimal::add);
                    sum = optionalSum.orElse(BigDecimal.ZERO);
                    newOneRecord = statRecordDuplicate != null ? statRecordDuplicate.withRecordedOn(new Date()).withValue(sum) : StatRecordDuplicate.builder().type(statTypeEnum.name()).level(levelEnum.name()).recordedOn(new Date()).thirdId(operatorWorkType.getId()).time(timeStr).value(sum).build();
                    newRecordsDuplicate.add(newOneRecord);
                }
                continue;
            }
            if (statTypeEnum.name().startsWith("WorkStationTask")) {
                if (commonConfig == null || (operator = commonConfig.getOperator()) == null) continue;
                ArrayList workStations = Lists.newArrayList((Iterable)operator.getWorkStations());
                for (OperatorWorkStation operatorWorkStation : workStations) {
                    statRecordDuplicate = statRecordsDuplicate.stream().filter(r -> r.getType().equals(statTypeEnum.name()) && Objects.equals(r.getThirdId(), operatorWorkStation.getId())).findFirst().orElse(null);
                    optionalSum = nextLevelRecordsDuplicate.stream().filter(r -> r.getType().equals(statTypeEnum.name()) && Objects.equals(r.getThirdId(), operatorWorkStation.getId())).map(StatRecordDuplicate::getValue).reduce(BigDecimal::add);
                    sum = optionalSum.orElse(BigDecimal.ZERO);
                    newOneRecord = statRecordDuplicate != null ? statRecordDuplicate.withRecordedOn(new Date()).withValue(sum) : StatRecordDuplicate.builder().type(statTypeEnum.name()).level(levelEnum.name()).recordedOn(new Date()).thirdId(operatorWorkStation.getId()).time(timeStr).value(sum).build();
                    newRecordsDuplicate.add(newOneRecord);
                }
                continue;
            }
            for (String vehicle : vehicles) {
                if (statTypeEnum == StatTypeEnum.OrderCreatedNum && vehicle != null || statTypeEnum != StatTypeEnum.OrderCreatedNum && statTypeEnum != StatTypeEnum.OrderStoppedNum && vehicle == null) continue;
                statRecord = statRecords.stream().filter(r -> r.getType().equals(statTypeEnum.name()) && Objects.equals(r.getThirdId(), vehicle)).findFirst().orElse(null);
                optionalSum2 = nextLevelRecords.stream().filter(r -> r.getType().equals(statTypeEnum.name()) && Objects.equals(r.getThirdId(), vehicle)).map(StatRecord::getValue).reduce(BigDecimal::add);
                sum2 = optionalSum2.orElse(BigDecimal.ZERO);
                newOneRecord2 = statRecord != null ? statRecord.withRecordedOn(new Date()).withValue(sum2) : StatRecord.builder().type(statTypeEnum.name()).level(levelEnum.name()).recordedOn(new Date()).thirdId(vehicle).time(timeStr).value(sum2).build();
                newRecords.add(newOneRecord2);
            }
        }
        this.statRecordMapper.saveAll(newRecords);
        this.statRecordDuplicateMapper.saveAll(newRecordsDuplicate);
        newRecords.clear();
    }

    private void updateStatByDutyDay(ZonedDateTime startTime, StatLevelEnum levelEnum) {
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("HH:mm:ss");
        String formattedTime = startTime.format(formatter);
        String onWorkTime = this.propConfig.getStatOnWorkTime();
        String offWorkTime = this.propConfig.getStatOffWorkTime();
        if (onWorkTime == null) {
            onWorkTime = "08:00:00";
        }
        if (offWorkTime == null) {
            offWorkTime = "20:00:00";
        }
        if (formattedTime.compareTo(onWorkTime) < 0 || formattedTime.compareTo(offWorkTime) > 0) {
            return;
        }
        if (levelEnum == StatLevelEnum.Hour) {
            return;
        }
        String pattern = StatLevelEnum.getDatePatternByLevel((StatLevelEnum)levelEnum);
        String timeStr = startTime.format(DateTimeFormatter.ofPattern(pattern));
        StatLevelEnum nextLevel = StatLevelEnum.getNextLevel((StatLevelEnum)levelEnum);
        assert (nextLevel != null);
        ArrayList<StatRecord> newRecords = new ArrayList<StatRecord>();
        List vehicles = this.robotItemMapper.findUuidGroupByUuid();
        List vehicleStatusEnum = StatTypeEnum.getVehicleStatusEnum();
        List vehicleStatusList = vehicleStatusEnum.stream().map(Enum::toString).collect(Collectors.toList());
        List statRecords = this.statRecordMapper.findAllByTimeAndLevel(timeStr, levelEnum.name());
        String onWorkSuf = timeStr + " " + onWorkTime.substring(0, 2);
        String offWorkSuf = timeStr + " " + offWorkTime.substring(0, 2);
        List nextLevelRecords = this.statRecordMapper.findByLevelAndTypeAndTimeRange(nextLevel.name(), vehicleStatusList, onWorkSuf, offWorkSuf);
        for (StatTypeEnum statTypeEnum : vehicleStatusEnum) {
            for (String vehicle : vehicles) {
                StatRecord statRecord = statRecords.stream().filter(r -> r.getType().equals(statTypeEnum.name()) && Objects.equals(r.getThirdId(), vehicle)).findFirst().orElse(null);
                Optional<BigDecimal> optionalSum = nextLevelRecords.stream().filter(r -> r.getType().equals(statTypeEnum.name()) && Objects.equals(r.getThirdId(), vehicle)).map(StatRecord::getValue).reduce(BigDecimal::add);
                BigDecimal sum = optionalSum.orElse(BigDecimal.ZERO);
                StatRecord newOneRecord = statRecord != null ? statRecord.withRecordedOn(new Date()).withValue(sum) : StatRecord.builder().type(statTypeEnum.name()).level(levelEnum.name()).recordedOn(new Date()).thirdId(vehicle).time(timeStr).value(sum).build();
                newRecords.add(newOneRecord);
            }
        }
        this.statRecordMapper.saveAll(newRecords);
        newRecords.clear();
    }

    private void doVehiclesHourStat(ZonedDateTime startHour, List<String> vehicles) {
        ZonedDateTime endHour = startHour.plus(1L, ChronoUnit.HOURS);
        this.updateVehiclesRecordByTimeAndVehicles(startHour, endHour, StatLevelEnum.Hour, vehicles);
    }

    private void updateVehiclesRecordByTimeAndVehicles(ZonedDateTime startTime, ZonedDateTime endTime, StatLevelEnum levelEnum, List<String> vehicles) {
        List filterTypeEnums = Arrays.stream(StatTypeEnum.values()).filter(type -> type.name().matches("Vehicle(.*)Time")).collect(Collectors.toList());
        List statTypeEnums = this.getStatConfigEnum(filterTypeEnums, "AGV_STASTIC");
        String pattern = StatLevelEnum.getDatePatternByLevel((StatLevelEnum)levelEnum);
        String timeStr = startTime.format(DateTimeFormatter.ofPattern(pattern));
        List statusRecords = this.robotStatusMapper.findAllByStartedOnGreaterThanEqualAndStartedOnLessThan(Date.from(startTime.toInstant()), Date.from(endTime.toInstant()));
        List statRecords = this.statRecordMapper.findAllByTimeAndLevel(timeStr, levelEnum.name());
        ArrayList<StatRecord> newRecords = new ArrayList<StatRecord>();
        for (StatTypeEnum statTypeEnum : statTypeEnums) {
            for (String vehicle : vehicles) {
                StatRecord statRecord = statRecords.stream().filter(sr -> sr.getType().equals(statTypeEnum.name()) && Objects.equals(sr.getThirdId(), vehicle)).findFirst().orElse(null);
                String type2 = statTypeEnum.name();
                int status = RobotStatusEnum.getRobotStatusByName((String)statTypeEnum.getStatusName());
                long duration = 0L;
                if (statusRecords != null && vehicle != null) {
                    duration = statusRecords.stream().filter(r -> vehicle.equals(r.getUuid()) && status == r.getNewStatus()).map(RobotStatusRecord::getDuration).filter(Objects::nonNull).reduce(Long::sum).orElse(0L);
                }
                if (statRecord != null) {
                    newRecords.add(statRecord.withRecordedOn(new Date()).withValue(BigDecimal.valueOf(duration)));
                    continue;
                }
                newRecords.add(StatRecord.builder().recordedOn(new Date()).level(levelEnum.name()).type(type2).value(BigDecimal.valueOf(duration)).time(timeStr).thirdId(vehicle).build());
            }
        }
        this.statRecordMapper.saveAll(newRecords);
        newRecords.clear();
    }

    private void doCoreHourStat(ZonedDateTime startHour, List<String> vehicles) {
        ZonedDateTime endHour = startHour.plus(1L, ChronoUnit.HOURS);
        this.updateCoreRecordByTimeAndVehicles(startHour, endHour, StatLevelEnum.Hour, vehicles);
    }

    private void updateCoreRecordByTimeAndVehicles(ZonedDateTime startTime, ZonedDateTime endTime, StatLevelEnum levelEnum, List<String> vehicles) {
        List agvTypeEnums = this.getStatConfigEnum(Arrays.asList(StatTypeEnum.values()), "AGV_STASTIC");
        List orderTypeEnums = this.getStatConfigEnum(Arrays.asList(StatTypeEnum.values()), "ORDER_STATIC");
        ArrayList combinedList = new ArrayList();
        HashSet set = new HashSet();
        if (!agvTypeEnums.isEmpty()) {
            set.addAll(agvTypeEnums);
        }
        if (!orderTypeEnums.isEmpty()) {
            set.addAll(orderTypeEnums);
        }
        combinedList.addAll(set);
        List statTypeEnums = combinedList.stream().filter(it -> it.name().matches("Order(.*)")).collect(Collectors.toList());
        String pattern = StatLevelEnum.getDatePatternByLevel((StatLevelEnum)levelEnum);
        String timeStr = startTime.format(DateTimeFormatter.ofPattern(pattern));
        List statRecords = this.statRecordMapper.findAllByTimeAndLevel(timeStr, levelEnum.name());
        ArrayList<StatRecord> newRecords = new ArrayList<StatRecord>();
        for (StatTypeEnum statTypeEnum : statTypeEnums) {
            Object orderss;
            if (statTypeEnum == StatTypeEnum.OrderCreatedNum) {
                Object total;
                do {
                    try {
                        Thread.sleep(500L);
                    }
                    catch (Exception e) {
                        log.info("sleep error");
                        Thread.currentThread().interrupt();
                    }
                } while ((total = this.getCoreOrders(startTime.toInstant(), endTime.toInstant(), statTypeEnum)) == "");
                if (total == null) {
                    log.error("skip core stat: type=" + statTypeEnum + " time=" + startTime + " ~ " + endTime);
                    return;
                }
                StatRecord statRecord = statRecords.stream().filter(sr -> sr.getType().equals(statTypeEnum.name())).findFirst().orElse(null);
                String type = statTypeEnum.name();
                if (statRecord != null) {
                    newRecords.add(statRecord.withRecordedOn(new Date()).withValue(BigDecimal.valueOf((Long)total)));
                    continue;
                }
                newRecords.add(StatRecord.builder().recordedOn(new Date()).level(levelEnum.name()).type(type).value(BigDecimal.valueOf((Long)total)).time(timeStr).build());
                continue;
            }
            do {
                orderss = this.getCoreOrders(startTime.toInstant(), endTime.toInstant(), statTypeEnum);
                try {
                    Thread.sleep(500L);
                }
                catch (InterruptedException e) {
                    log.error("Stat Schedule InterruptedException", (Throwable)e);
                }
            } while (orderss == "");
            List orders = (List)orderss;
            if (orders == null) {
                log.error("skip core stat: type=" + statTypeEnum.name() + " time=" + startTime + " ~ " + endTime);
                return;
            }
            if (!vehicles.contains(null)) {
                vehicles.add(null);
            }
            for (String vehicle : vehicles) {
                BigDecimal num;
                if (vehicle == null && statTypeEnum != StatTypeEnum.OrderStoppedNum) continue;
                StatRecord statRecord = statRecords.stream().filter(sr -> sr.getType().equals(statTypeEnum.name()) && Objects.equals(sr.getThirdId(), vehicle)).findFirst().orElse(null);
                String type = statTypeEnum.name();
                String state = statTypeEnum.getStatusName();
                Predicate<JSONObject> orderPredicate = statTypeEnum == StatTypeEnum.OrderTakingNum ? order -> Objects.equals(order.getString("vehicle"), vehicle == null ? "" : vehicle) : order -> Objects.equals(order.getString("state"), state) && Objects.equals(order.getString("vehicle"), vehicle == null ? "" : vehicle);
                Stream<JSONObject> orderStream = orders.stream().filter(orderPredicate);
                BigDecimal bigDecimal = num = statTypeEnum != StatTypeEnum.OrderBusinessOdo ? BigDecimal.valueOf(orderStream.count()) : orderStream.map(o -> o.getBigDecimal("orderOdo")).reduce(BigDecimal::add).orElse(BigDecimal.ZERO);
                if (statRecord != null) {
                    newRecords.add(statRecord.withRecordedOn(new Date()).withValue(num));
                    continue;
                }
                newRecords.add(StatRecord.builder().recordedOn(new Date()).level(levelEnum.name()).type(type).value(num).time(timeStr).thirdId(vehicle).build());
            }
        }
        this.statRecordMapper.saveAll(newRecords);
        newRecords.clear();
    }

    private Object getCoreOrders(Instant startTime, Instant endTime, StatTypeEnum type) {
        String start = String.valueOf(startTime.toEpochMilli() / 1000L);
        String end = String.valueOf(endTime.toEpochMilli() / 1000L);
        String targetTime = Objects.equals(type, StatTypeEnum.OrderCreatedNum) || Objects.equals(type, StatTypeEnum.OrderTakingNum) ? "receiveTime" : "terminateTime";
        ArrayList predicates = Lists.newArrayList((Object[])new List[]{List.of(targetTime, "GT", start), List.of(targetTime, "LT", end), List.of("type", "EQ", "0")});
        Map<String, ArrayList> whereMap = Map.of("relation", "AND", "predicates", predicates);
        int pageSize = 10000;
        long curPageNo = 1L;
        String url = PropConfig.getRdsCoreBaseUrl() + "orders";
        try {
            Map res = OkHttpUtil.getWithHttpCode((String)(url + "?page=" + curPageNo + "&size=" + pageSize + "&where=" + JSONObject.toJSONString(whereMap)));
            String ordersStr = (String)res.get("body");
            if (StringUtils.isEmpty((CharSequence)ordersStr)) {
                log.error("stat core request failed1");
                return null;
            }
            JSONObject curPageContent = JSONObject.parseObject((String)ordersStr);
            if (StringUtils.isNotEmpty((CharSequence)curPageContent.getString("msg"))) {
                if (curPageContent.getString("msg").contains("too fast")) {
                    log.error("core orders {}", (Object)ordersStr);
                    return "";
                }
                log.error("Stat Core Error: " + curPageContent.toJSONString());
                return null;
            }
            long total = curPageContent.getLongValue("total");
            if (type == StatTypeEnum.OrderCreatedNum) {
                return total;
            }
            List totalOrderList = curPageContent.getJSONArray("list").stream().map(o -> (JSONObject)o).collect(Collectors.toList());
            if (total > 0L) {
                long totalPage = BigDecimal.valueOf(total).divide(BigDecimal.valueOf(pageSize), 0, RoundingMode.CEILING).intValue();
                while (totalPage >= curPageNo && ++curPageNo <= totalPage) {
                    try {
                        Thread.sleep(500L);
                    }
                    catch (InterruptedException e) {
                        log.error("sleep error {}", (Object)e.getMessage());
                        Thread.currentThread().interrupt();
                    }
                    res = OkHttpUtil.getWithHttpCode((String)(url + "?page=" + curPageNo + "&size=" + pageSize + "&where=" + JSONObject.toJSONString(whereMap)));
                    ordersStr = (String)res.get("body");
                    if (StringUtils.isEmpty((CharSequence)ordersStr)) {
                        log.error("stat core request failed2");
                        return null;
                    }
                    curPageContent = JSONObject.parseObject((String)ordersStr);
                    if (StringUtils.isNotEmpty((CharSequence)curPageContent.getString("msg"))) {
                        if (curPageContent.getString("msg").contains("too fast")) {
                            log.error("core orders {}", (Object)ordersStr);
                            return "";
                        }
                        log.error("Stat Core Error: " + curPageContent.toJSONString());
                        return null;
                    }
                    totalOrderList.addAll(curPageContent.getJSONArray("list").stream().map(o -> (JSONObject)o).collect(Collectors.toList()));
                }
            }
            return totalOrderList;
        }
        catch (Exception e) {
            log.error("stat core request failed {}", (Object)e.getMessage());
            return null;
        }
    }

    public void doWindTaskHourStat(ZonedDateTime startHour) {
        ZonedDateTime endHour = startHour.plus(1L, ChronoUnit.HOURS);
        this.updateTaskRecordByTime(startHour, endHour, StatLevelEnum.Hour);
        this.queryTaskRecordByTime(startHour, endHour, StatLevelEnum.Hour);
    }

    public void doWindTaskDayStat(ZonedDateTime startDay) {
        ZonedDateTime endDay = startDay.plus(1L, ChronoUnit.DAYS);
        this.updateTaskRecordByTime(startDay, endDay, StatLevelEnum.Day);
    }

    public void doWindTaskMonthStat(ZonedDateTime startMonth) {
        ZonedDateTime endMonth = startMonth.plus(1L, ChronoUnit.MONTHS);
        this.updateTaskRecordByTime(startMonth, endMonth, StatLevelEnum.Month);
    }

    public void doWindTaskYearStat(ZonedDateTime startYear) {
        ZonedDateTime endYear = startYear.plus(1L, ChronoUnit.YEARS);
        this.updateTaskRecordByTime(startYear, endYear, StatLevelEnum.Year);
    }

    private void updateTaskRecordByTime(ZonedDateTime startTime, ZonedDateTime endTime, StatLevelEnum levelEnum) {
        Instant endHour = endTime.toInstant();
        List filterTypeEnums = Arrays.stream(StatTypeEnum.values()).filter(type -> type.name().matches("WindTask(.*)")).collect(Collectors.toList());
        List statTypeEnums = this.getStatConfigEnum(filterTypeEnums, "TASK_STATIC");
        String pattern = StatLevelEnum.getDatePatternByLevel((StatLevelEnum)levelEnum);
        String timeStr = startTime.format(DateTimeFormatter.ofPattern(pattern));
        List windTaskRecords = this.windTaskRecordMapper.getWindTaskRecordByCreateTime(Date.from(startTime.toInstant()), Date.from(endHour));
        List windTaskEndRecords = this.windTaskRecordMapper.getWindTaskRecordByEndTime(Date.from(startTime.toInstant()), Date.from(endHour));
        List avgCostRecords = this.windTaskRecordMapper.findByEndedOnBetweenAndStatusFinished(Date.from(startTime.toInstant()), Date.from(endTime.toInstant()));
        List statRecords = this.statRecordMapper.findAllByTimeAndLevel(timeStr, levelEnum.name());
        ArrayList<StatRecord> newRecords = new ArrayList<StatRecord>();
        for (StatTypeEnum statTypeEnum : statTypeEnums) {
            String type2 = statTypeEnum.name();
            ArrayList taskLabels = Lists.newArrayList((Iterable)this.defMapper.findAllLabel());
            for (String label : taskLabels) {
                Long num = null;
                if (statTypeEnum.name().equals("WindTaskAvgCostTime")) {
                    OptionalDouble optionalDouble = avgCostRecords.stream().filter(r -> r.getDefLabel().equals(label) && Objects.nonNull(r.getExecutorTime())).mapToInt(TaskRecord::getExecutorTime).average();
                    if (optionalDouble.isPresent()) {
                        num = (long)optionalDouble.getAsDouble() * 1000L;
                    }
                } else if (statTypeEnum.name().equals("WindTaskExceptionNum")) {
                    num = windTaskEndRecords.stream().filter(r -> r.getDefLabel().equals(label)).filter(r -> r.getStatus().equals(TaskStatusEnum.end_error.getStatus())).count();
                } else if (statTypeEnum.getStatusName() != null) {
                    int status = TaskStatusEnum.getTaskStatusByName((String)statTypeEnum.getStatusName());
                    num = windTaskEndRecords.stream().filter(r -> r.getDefLabel().equals(label)).filter(r -> r.getStatus().equals(status)).count();
                } else {
                    num = windTaskRecords.stream().filter(r -> r.getDefLabel().equals(label)).count();
                }
                StatRecord statRecord = statRecords.stream().filter(r -> Objects.equals(r.getType(), type2) && Objects.equals(r.getThirdId(), label)).findFirst().orElse(null);
                BigDecimal finalValue = BigDecimal.valueOf(num == null ? 0L : num);
                if (statRecord == null) {
                    newRecords.add(StatRecord.builder().recordedOn(new Date()).level(levelEnum.name()).type(type2).value(finalValue).time(timeStr).thirdId(label).build());
                    continue;
                }
                newRecords.add(statRecord.withRecordedOn(new Date()).withValue(finalValue));
            }
        }
        this.statRecordMapper.saveAll(newRecords);
        newRecords.clear();
    }

    private void queryTaskRecordByTime(ZonedDateTime startTime, ZonedDateTime endTime, StatLevelEnum levelEnum) {
        Instant endHour = endTime.toInstant();
        String pattern = StatLevelEnum.getDatePatternByLevel((StatLevelEnum)levelEnum);
        String timeStr = startTime.format(DateTimeFormatter.ofPattern(pattern));
        List windTaskRecords = this.windTaskRecordMapper.getWindTaskRecordByCreateTime(Date.from(startTime.toInstant()), Date.from(endHour));
        List windTaskEndRecords = this.windTaskRecordMapper.getWindTaskRecordByEndTime(Date.from(startTime.toInstant()), Date.from(endHour));
        List statRecords = this.statRecordDuplicateMapper.findAllByTimeAndLevel(timeStr, levelEnum.name());
        this.updateTaskRecordByWorkTypeAndTime(timeStr, windTaskRecords, windTaskEndRecords, statRecords, levelEnum);
        this.updateTaskRecordByWorkStationAndTime(timeStr, windTaskRecords, windTaskEndRecords, statRecords, levelEnum);
    }

    private void updateTaskRecordByWorkTypeAndTime(String timeStr, List<WindTaskRecord> windTaskRecords, List<WindTaskRecord> windTaskEndRecords, List<StatRecordDuplicate> statRecords, StatLevelEnum levelEnum) {
        List filterTypeEnums = Arrays.stream(StatTypeEnum.values()).filter(type -> type.name().matches("WorkTypeTask(.*)")).collect(Collectors.toList());
        List statTypeEnums = this.getStatConfigEnum(filterTypeEnums, "TASK_STATIC");
        ArrayList<StatRecordDuplicate> newRecords = new ArrayList<StatRecordDuplicate>();
        CommonConfig commonConfig = ConfigFileController.commonConfig;
        if (commonConfig == null) {
            return;
        }
        OperatorConfig operator = commonConfig.getOperator();
        if (operator == null) {
            return;
        }
        ArrayList workTypes = Lists.newArrayList((Iterable)operator.getWorkTypes());
        for (StatTypeEnum statTypeEnum : statTypeEnums) {
            String type2 = statTypeEnum.name();
            for (OperatorWorkType operatorWorkType : workTypes) {
                Long num = null;
                if (statTypeEnum.getStatusName() != null) {
                    int status = TaskStatusEnum.getTaskStatusByName((String)statTypeEnum.getStatusName());
                    num = windTaskEndRecords != null ? windTaskEndRecords.stream().filter(r -> {
                        String callWorkType = r.getCallWorkType();
                        return callWorkType != null && callWorkType.equals(operatorWorkType.getId()) && r.getStatus().equals(status);
                    }).count() : 0L;
                } else {
                    num = windTaskRecords != null ? windTaskRecords.stream().filter(r -> {
                        String callWorkType = r.getCallWorkType();
                        return callWorkType != null && callWorkType.equals(operatorWorkType.getId());
                    }).count() : 0L;
                }
                StatRecordDuplicate statRecord = statRecords.stream().filter(r -> Objects.equals(r.getType(), type2) && Objects.equals(r.getThirdId(), operatorWorkType.getId())).findFirst().orElse(null);
                BigDecimal finalValue = BigDecimal.valueOf(num == null ? 0L : num);
                if (statRecord == null) {
                    newRecords.add(StatRecordDuplicate.builder().recordedOn(new Date()).level(levelEnum.name()).type(type2).value(finalValue).time(timeStr).thirdId(operatorWorkType.getId()).build());
                    continue;
                }
                newRecords.add(statRecord.withRecordedOn(new Date()).withValue(finalValue));
            }
        }
        this.statRecordDuplicateMapper.saveAll(newRecords);
        newRecords.clear();
    }

    private void updateTaskRecordByWorkStationAndTime(String timeStr, List<WindTaskRecord> windTaskRecords, List<WindTaskRecord> windTaskEndRecords, List<StatRecordDuplicate> statRecords, StatLevelEnum levelEnum) {
        ArrayList<StatRecordDuplicate> newRecords = new ArrayList<StatRecordDuplicate>();
        List filterTypeEnums = Arrays.stream(StatTypeEnum.values()).filter(type -> type.name().matches("WorkStationTask(.*)")).collect(Collectors.toList());
        List statTypeEnums = this.getStatConfigEnum(filterTypeEnums, "TASK_STATIC");
        CommonConfig commonConfig = ConfigFileController.commonConfig;
        if (commonConfig == null) {
            return;
        }
        OperatorConfig operator = commonConfig.getOperator();
        if (operator == null) {
            return;
        }
        ArrayList workStations = Lists.newArrayList((Iterable)operator.getWorkStations());
        for (StatTypeEnum statTypeEnum : statTypeEnums) {
            String type2 = statTypeEnum.name();
            for (OperatorWorkStation operatorWorkStation : workStations) {
                Long num = null;
                if (statTypeEnum.getStatusName() != null) {
                    int status = TaskStatusEnum.getTaskStatusByName((String)statTypeEnum.getStatusName());
                    num = windTaskEndRecords != null ? windTaskEndRecords.stream().filter(r -> {
                        String callWorkType = r.getCallWorkStation();
                        return callWorkType != null && callWorkType.equals(operatorWorkStation.getId()) && r.getStatus().equals(status);
                    }).count() : 0L;
                } else {
                    num = windTaskRecords != null ? windTaskRecords.stream().filter(r -> {
                        String callWorkType = r.getCallWorkStation();
                        return callWorkType != null && callWorkType.equals(operatorWorkStation.getId());
                    }).count() : 0L;
                }
                StatRecordDuplicate statRecord = statRecords.stream().filter(r -> Objects.equals(r.getType(), type2) && Objects.equals(r.getThirdId(), operatorWorkStation.getId())).findFirst().orElse(null);
                BigDecimal finalValue = BigDecimal.valueOf(num == null ? 0L : num);
                if (statRecord == null) {
                    newRecords.add(StatRecordDuplicate.builder().recordedOn(new Date()).level(levelEnum.name()).type(type2).value(finalValue).time(timeStr).thirdId(operatorWorkStation.getId()).build());
                    continue;
                }
                newRecords.add(statRecord.withRecordedOn(new Date()).withValue(finalValue));
            }
        }
        this.statRecordDuplicateMapper.saveAll(newRecords);
        newRecords.clear();
    }

    private void doAlarmsRecordStat(ZonedDateTime startHour, List<String> vehicles) {
        ZonedDateTime endHour = startHour.plus(1L, ChronoUnit.HOURS);
        this.updateAlarmsTimeByTime(startHour, endHour, StatLevelEnum.Hour, vehicles);
        this.updateAlarmsNumByTime(startHour, endHour, StatLevelEnum.Hour, vehicles);
    }

    private void updateAlarmsTimeByTime(ZonedDateTime startTime, ZonedDateTime endTime, StatLevelEnum levelEnum, List<String> vehicles) {
        List filterTypeEnums = Arrays.stream(StatTypeEnum.values()).filter(type -> type.name().matches("Alarms(.*)Time")).collect(Collectors.toList());
        List statTypeEnums = this.getStatConfigEnum(filterTypeEnums, "AGV_STASTIC");
        String pattern = StatLevelEnum.getDatePatternByLevel((StatLevelEnum)levelEnum);
        String timeStr = startTime.format(DateTimeFormatter.ofPattern(pattern));
        List alarmsRecords = this.alarmsRecordMapper.findAllByStartedOnGreaterThanEqualAndStartedOnLessThan(Date.from(startTime.toInstant()), Date.from(endTime.toInstant()));
        List statRecords = this.statRecordMapper.findAllByTimeAndLevel(timeStr, levelEnum.name());
        ArrayList<StatRecord> newRecords = new ArrayList<StatRecord>();
        for (StatTypeEnum statTypeEnum : statTypeEnums) {
            for (String vehicle : vehicles) {
                StatRecord statRecord = statRecords.stream().filter(sr -> sr.getType().equals(statTypeEnum.name()) && Objects.equals(sr.getThirdId(), vehicle)).findFirst().orElse(null);
                String type2 = statTypeEnum.name();
                List records = alarmsRecords.stream().filter(ar -> ar.getVehicleId().equals(vehicle) && ar.getLevel().equals(statTypeEnum.getStatusName())).collect(Collectors.toList());
                ArrayList<TimePeriod> list = new ArrayList<TimePeriod>();
                for (AlarmsRecord alarmsRecord : records) {
                    if (alarmsRecord.getType().equals(0)) {
                        list.add(new TimePeriod(alarmsRecord.getStartedOn(), new Date()));
                        continue;
                    }
                    list.add(new TimePeriod(alarmsRecord.getStartedOn(), alarmsRecord.getEndedOn()));
                }
                Map dateMap1 = TimeUtils.getTimePeriodsUnion((Boolean)false, list);
                BigDecimal duration = BigDecimal.ZERO;
                for (Map.Entry entry : dateMap1.entrySet()) {
                    duration = duration.add(BigDecimal.valueOf(((Date)entry.getValue()).getTime() - ((Date)entry.getKey()).getTime()));
                }
                if (statRecord != null) {
                    newRecords.add(statRecord.withRecordedOn(new Date()).withValue(duration));
                    continue;
                }
                newRecords.add(StatRecord.builder().recordedOn(new Date()).level(levelEnum.name()).type(type2).value(duration).time(timeStr).thirdId(vehicle).build());
            }
        }
        this.statRecordMapper.saveAll(newRecords);
        newRecords.clear();
    }

    private void updateAlarmsNumByTime(ZonedDateTime startTime, ZonedDateTime endTime, StatLevelEnum levelEnum, List<String> vehicles) {
        List filterTypeEnums = Arrays.stream(StatTypeEnum.values()).filter(type -> type.name().matches("Alarms(.*)Num")).collect(Collectors.toList());
        List statTypeEnums = this.getStatConfigEnum(filterTypeEnums, "AGV_STASTIC");
        String pattern = StatLevelEnum.getDatePatternByLevel((StatLevelEnum)levelEnum);
        String timeStr = startTime.format(DateTimeFormatter.ofPattern(pattern));
        List alarmsRecords = this.alarmsRecordMergeMapper.findAllByStartedOnGreaterThanEqualAndStartedOnLessThan(Date.from(startTime.toInstant()), Date.from(endTime.toInstant()));
        List statRecords = this.statRecordMapper.findAllByTimeAndLevel(timeStr, levelEnum.name());
        ArrayList<StatRecord> newRecords = new ArrayList<StatRecord>();
        for (StatTypeEnum statTypeEnum : statTypeEnums) {
            for (String vehicle : vehicles) {
                StatRecord statRecord = statRecords.stream().filter(sr -> sr.getType().equals(statTypeEnum.name()) && Objects.equals(sr.getThirdId(), vehicle)).findFirst().orElse(null);
                String type2 = statTypeEnum.name();
                long count = alarmsRecords.stream().filter(ar -> ar.getVehicleId().equals(vehicle) && ar.getLevel().equals(statTypeEnum.getStatusName())).count();
                if (statRecord != null) {
                    newRecords.add(statRecord.withRecordedOn(new Date()).withValue(BigDecimal.valueOf(count)));
                    continue;
                }
                newRecords.add(StatRecord.builder().recordedOn(new Date()).level(levelEnum.name()).type(type2).value(BigDecimal.valueOf(count)).time(timeStr).thirdId(vehicle).build());
            }
        }
        this.statRecordMapper.saveAll(newRecords);
        newRecords.clear();
    }

    public List<StatTypeEnum> getStatConfigEnum(List<StatTypeEnum> statTypeEnums, String statKey) {
        HashSet typesSet = new HashSet();
        List mapsConfigByUserKey = this.configService.getMapsConfigByUserKey(statKey);
        if (CollectionUtils.isEmpty((Collection)mapsConfigByUserKey)) {
            return new ArrayList<StatTypeEnum>();
        }
        mapsConfigByUserKey.forEach(record -> {
            String statValue = record.getUserValue();
            if (statValue != null) {
                JSONArray statArray = JSONArray.parseArray((String)statValue);
                for (int i = 0; i < statArray.size(); ++i) {
                    String[] typesArray;
                    JSONObject reqObject;
                    JSONObject jsonObject = statArray.getJSONObject(i);
                    if (!jsonObject.containsKey((Object)"req") || !(reqObject = jsonObject.getJSONObject("req")).containsKey((Object)"types")) continue;
                    String types = reqObject.getString("types");
                    for (String type : typesArray = types.split(",")) {
                        typesSet.add(type);
                    }
                }
            }
        });
        List<StatTypeEnum> filteredStatTypeEnums = statTypeEnums.stream().filter(statTypeEnum -> typesSet.contains(statTypeEnum.name())).collect(Collectors.toList());
        return filteredStatTypeEnums;
    }

    public static void main(String[] args) {
        ArrayList<RobotStatusRecord> statusRecords = new ArrayList<RobotStatusRecord>();
        statusRecords.add(RobotStatusRecord.builder().id("22222").duration(Long.valueOf(1111L)).build());
        System.out.println(11);
    }
}

