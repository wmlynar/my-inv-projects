/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  cn.afterturn.easypoi.excel.entity.ExportParams
 *  cn.afterturn.easypoi.excel.entity.enmus.ExcelType
 *  com.seer.rds.config.PropConfig
 *  com.seer.rds.constant.CommonCodeEnum
 *  com.seer.rds.constant.RobotStatusEnum
 *  com.seer.rds.constant.StatLevelEnum
 *  com.seer.rds.constant.StatTypeEnum
 *  com.seer.rds.model.admin.UserConfigRecord
 *  com.seer.rds.model.stat.AlarmsRecordMerge
 *  com.seer.rds.service.agv.AgvApiService
 *  com.seer.rds.service.agv.StatDuplicateService
 *  com.seer.rds.service.agv.StatService
 *  com.seer.rds.service.agv.UserConfigRecordService
 *  com.seer.rds.service.agv.WindTaskService
 *  com.seer.rds.util.ExcelHeaderLangUtils
 *  com.seer.rds.util.ExcelUtil
 *  com.seer.rds.util.LocaleMessageUtil
 *  com.seer.rds.vo.ResultVo
 *  com.seer.rds.vo.req.AlarmsRecordsReq
 *  com.seer.rds.vo.req.OutOrderRecordsReq
 *  com.seer.rds.vo.req.PaginationReq
 *  com.seer.rds.vo.req.RetentionReq
 *  com.seer.rds.vo.req.RobotStatusRecordsReq
 *  com.seer.rds.vo.req.StatRecordReq
 *  com.seer.rds.vo.req.UserConfigRecordReq
 *  com.seer.rds.vo.response.AgvStatusCurrentVo
 *  com.seer.rds.vo.response.AlarmsRecordRes
 *  com.seer.rds.vo.response.AlarmsRecordsExVo
 *  com.seer.rds.vo.response.BatteryLevelVo
 *  com.seer.rds.vo.response.OutOrderRecordsVo
 *  com.seer.rds.vo.response.PaginationResponseVo
 *  com.seer.rds.vo.response.RobotStatusRecordsExVo
 *  com.seer.rds.vo.response.RobotStatusRecordsVo
 *  com.seer.rds.vo.response.StatCompareResponseVo
 *  com.seer.rds.vo.response.StatProportionResponseVo
 *  com.seer.rds.vo.response.StatRecordCompareVo
 *  com.seer.rds.vo.response.StatRecordDuplicateVo
 *  com.seer.rds.vo.response.StatRecordExVo
 *  com.seer.rds.vo.response.StatRecordVo
 *  com.seer.rds.vo.response.StatResponseDuplicateVo
 *  com.seer.rds.vo.response.StatResponseVo
 *  com.seer.rds.vo.response.TimeValueVo
 *  com.seer.rds.vo.response.TypeValueVo
 *  com.seer.rds.web.agv.StatController
 *  io.swagger.annotations.Api
 *  io.swagger.annotations.ApiOperation
 *  javax.servlet.http.HttpServletResponse
 *  org.apache.commons.lang3.StringUtils
 *  org.apache.commons.lang3.time.DateUtils
 *  org.slf4j.Logger
 *  org.slf4j.LoggerFactory
 *  org.springframework.beans.factory.annotation.Autowired
 *  org.springframework.context.i18n.LocaleContextHolder
 *  org.springframework.data.domain.Page
 *  org.springframework.data.domain.Sort
 *  org.springframework.data.domain.Sort$Direction
 *  org.springframework.stereotype.Controller
 *  org.springframework.web.bind.annotation.GetMapping
 *  org.springframework.web.bind.annotation.PostMapping
 *  org.springframework.web.bind.annotation.RequestBody
 *  org.springframework.web.bind.annotation.RequestMapping
 *  org.springframework.web.bind.annotation.RequestParam
 *  org.springframework.web.bind.annotation.ResponseBody
 *  springfox.documentation.annotations.ApiIgnore
 */
package com.seer.rds.web.agv;

import cn.afterturn.easypoi.excel.entity.ExportParams;
import cn.afterturn.easypoi.excel.entity.enmus.ExcelType;
import com.seer.rds.config.PropConfig;
import com.seer.rds.constant.CommonCodeEnum;
import com.seer.rds.constant.RobotStatusEnum;
import com.seer.rds.constant.StatLevelEnum;
import com.seer.rds.constant.StatTypeEnum;
import com.seer.rds.model.admin.UserConfigRecord;
import com.seer.rds.model.stat.AlarmsRecordMerge;
import com.seer.rds.service.agv.AgvApiService;
import com.seer.rds.service.agv.StatDuplicateService;
import com.seer.rds.service.agv.StatService;
import com.seer.rds.service.agv.UserConfigRecordService;
import com.seer.rds.service.agv.WindTaskService;
import com.seer.rds.util.ExcelHeaderLangUtils;
import com.seer.rds.util.ExcelUtil;
import com.seer.rds.util.LocaleMessageUtil;
import com.seer.rds.vo.ResultVo;
import com.seer.rds.vo.req.AlarmsRecordsReq;
import com.seer.rds.vo.req.OutOrderRecordsReq;
import com.seer.rds.vo.req.PaginationReq;
import com.seer.rds.vo.req.RetentionReq;
import com.seer.rds.vo.req.RobotStatusRecordsReq;
import com.seer.rds.vo.req.StatRecordReq;
import com.seer.rds.vo.req.UserConfigRecordReq;
import com.seer.rds.vo.response.AgvStatusCurrentVo;
import com.seer.rds.vo.response.AlarmsRecordRes;
import com.seer.rds.vo.response.AlarmsRecordsExVo;
import com.seer.rds.vo.response.BatteryLevelVo;
import com.seer.rds.vo.response.OutOrderRecordsVo;
import com.seer.rds.vo.response.PaginationResponseVo;
import com.seer.rds.vo.response.RobotStatusRecordsExVo;
import com.seer.rds.vo.response.RobotStatusRecordsVo;
import com.seer.rds.vo.response.StatCompareResponseVo;
import com.seer.rds.vo.response.StatProportionResponseVo;
import com.seer.rds.vo.response.StatRecordCompareVo;
import com.seer.rds.vo.response.StatRecordDuplicateVo;
import com.seer.rds.vo.response.StatRecordExVo;
import com.seer.rds.vo.response.StatRecordVo;
import com.seer.rds.vo.response.StatResponseDuplicateVo;
import com.seer.rds.vo.response.StatResponseVo;
import com.seer.rds.vo.response.TimeValueVo;
import com.seer.rds.vo.response.TypeValueVo;
import io.swagger.annotations.Api;
import io.swagger.annotations.ApiOperation;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.text.ParseException;
import java.text.SimpleDateFormat;
import java.time.Duration;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.stream.Collectors;
import javax.servlet.http.HttpServletResponse;
import org.apache.commons.lang3.StringUtils;
import org.apache.commons.lang3.time.DateUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.i18n.LocaleContextHolder;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseBody;
import springfox.documentation.annotations.ApiIgnore;

@Controller
@RequestMapping(value={"api"})
@Api(tags={"\u7edf\u8ba1"})
public class StatController {
    private static final Logger log = LoggerFactory.getLogger(StatController.class);
    private final StatService statService;
    private final StatDuplicateService statDuplicateService;
    @Autowired
    private WindTaskService windTaskService;
    @Autowired
    private AgvApiService agvApiService;
    @Autowired
    private LocaleMessageUtil localeMessageUtil;
    @Autowired
    private UserConfigRecordService userConfigRecordService;
    @Autowired
    private PropConfig propConfig;

    @Autowired
    private StatController(StatService statService, StatDuplicateService statDuplicateService) {
        this.statService = statService;
        this.statDuplicateService = statDuplicateService;
    }

    @ApiOperation(value="\u673a\u5668\u4eba\u72b6\u6001")
    @PostMapping(value={"/stat/agvStatus"})
    @ResponseBody
    public ResultVo<Object> robotsStatus(@RequestBody StatRecordReq statRecordReq) {
        if (StringUtils.isEmpty((CharSequence)statRecordReq.getLevel())) {
            return ResultVo.error((CommonCodeEnum)CommonCodeEnum.STAT_LEVEL_REQUIRED, (Object)"Missing `level` field");
        }
        if (StringUtils.isEmpty((CharSequence)statRecordReq.getStart())) {
            return ResultVo.error((CommonCodeEnum)CommonCodeEnum.STAT_TIME_REQUIRED, (Object)"Missing `start` field");
        }
        if (StringUtils.isEmpty((CharSequence)statRecordReq.getEnd())) {
            return ResultVo.error((CommonCodeEnum)CommonCodeEnum.STAT_TIME_REQUIRED, (Object)"Missing `end` field");
        }
        if (StringUtils.isEmpty((CharSequence)statRecordReq.getLevel())) {
            return ResultVo.error((CommonCodeEnum)CommonCodeEnum.STAT_TYPE_REQUIRED, (Object)"Missing `types` field");
        }
        StatRecordReq statRecordModel = statRecordReq.withLevel(statRecordReq.getLevel().trim()).withTimeUnit(StringUtils.isEmpty((CharSequence)statRecordReq.getTimeUnit()) ? "" : statRecordReq.getTimeUnit().trim()).withVehicle(StringUtils.isEmpty((CharSequence)statRecordReq.getVehicle()) ? "" : statRecordReq.getVehicle().trim());
        List<String> typeList = List.of(statRecordModel.getTypes().replaceAll("\\s", "").split(","));
        if (this.isTypeInvalid(typeList, StatTypeEnum.getVehicleStatusEnum())) {
            return ResultVo.error((CommonCodeEnum)CommonCodeEnum.STAT_TYPE_REQUIRED, Map.of("valid types", StatTypeEnum.getVehicleStatusEnum().stream().map(Enum::name).collect(Collectors.toList())));
        }
        return this.getObjectResultVo(statRecordModel, typeList);
    }

    @ApiOperation(value="\u673a\u5668\u4eba\u5f53\u524d\u72b6\u6001\u663e\u793a")
    @PostMapping(value={"/stat/agvStatusCurrent"})
    @ResponseBody
    public ResultVo<Object> agvStatusCurrent() {
        List agvStatusCurrent = this.statService.findAgvStatusCurrent();
        return ResultVo.response((Object)AgvStatusCurrentVo.toAgvStatusCurrentVoList((List)agvStatusCurrent));
    }

    @ApiOperation(value="core \u8fd0\u5355")
    @PostMapping(value={"/stat/agvOrders"})
    @ResponseBody
    public ResultVo<Object> coreOrder(@RequestBody StatRecordReq statRecordReq) {
        if (StringUtils.isEmpty((CharSequence)statRecordReq.getLevel())) {
            return ResultVo.error((CommonCodeEnum)CommonCodeEnum.STAT_LEVEL_REQUIRED, (Object)"Missing `level` field");
        }
        if (StringUtils.isEmpty((CharSequence)statRecordReq.getStart())) {
            return ResultVo.error((CommonCodeEnum)CommonCodeEnum.STAT_TIME_REQUIRED, (Object)"Missing `start` field");
        }
        if (StringUtils.isEmpty((CharSequence)statRecordReq.getEnd())) {
            return ResultVo.error((CommonCodeEnum)CommonCodeEnum.STAT_TIME_REQUIRED, (Object)"Missing `end` field");
        }
        if (StringUtils.isEmpty((CharSequence)statRecordReq.getTypes())) {
            return ResultVo.error((CommonCodeEnum)CommonCodeEnum.STAT_TYPE_REQUIRED, (Object)"Missing `types` field");
        }
        StatRecordReq statRecordModel = statRecordReq.withLevel(statRecordReq.getLevel().trim()).withVehicle(statRecordReq.getVehicle().trim());
        List<String> typeList = List.of(statRecordModel.getTypes().replaceAll("\\s", "").split(","));
        if (this.isTypeInvalid(typeList, StatTypeEnum.getCoreOrderEnum())) {
            return ResultVo.error((CommonCodeEnum)CommonCodeEnum.STAT_TYPE_REQUIRED, Map.of("valid types", StatTypeEnum.getCoreOrderEnum().stream().map(Enum::name).collect(Collectors.toList())));
        }
        return this.getObjectResultVo(statRecordModel, typeList);
    }

    private ResultVo<Object> getObjectResultVo(StatRecordReq statRecordModel, List<String> typeList) {
        Date endDate;
        Date startDate;
        if (this.isLevelInvalid(statRecordModel, StatLevelEnum.values())) {
            return ResultVo.error((CommonCodeEnum)CommonCodeEnum.STAT_LEVEL_REQUIRED, Map.of("valid levels", Arrays.stream(StatLevelEnum.values()).map(Enum::name).collect(Collectors.toList())));
        }
        if (this.isTimeInvalid(statRecordModel)) {
            return ResultVo.error((CommonCodeEnum)CommonCodeEnum.STAT_TIME_REQUIRED, Map.of("required time", "start, end"));
        }
        String pattern = StatLevelEnum.getDatePatternByLevelName((String)statRecordModel.getLevel());
        SimpleDateFormat dateFormat = new SimpleDateFormat(pattern);
        try {
            startDate = dateFormat.parse(statRecordModel.getStart());
            endDate = dateFormat.parse(statRecordModel.getEnd());
        }
        catch (Exception e) {
            return ResultVo.error((CommonCodeEnum)CommonCodeEnum.STAT_TIME_FORMAT_ERROR, Map.of("valid format", pattern));
        }
        String finalStart = dateFormat.format(startDate);
        String finalEnd = dateFormat.format(endDate);
        String sortBy = statRecordModel.getSortBy();
        String sort = statRecordModel.getSort();
        if (sortBy == null || sortBy.isEmpty()) {
            sortBy = "time";
        }
        if (sort == null || sort.isEmpty()) {
            sort = "asc";
        }
        Sort orderBy = Sort.by((Sort.Direction)Sort.Direction.fromString((String)sort), (String[])new String[]{sortBy});
        List statRecordVos = this.statService.findStatRecordListByLevelAndTimeAndTypesAndThirdId(statRecordModel.getLevel(), typeList, statRecordModel.getVehicle(), finalStart, finalEnd, statRecordModel.getTimeUnit(), orderBy);
        return ResultVo.response((Object)statRecordVos);
    }

    @ApiOperation(value="\u67e5\u8be2 \u521b\u5efa/\u5b8c\u6210/\u7ec8\u6b62 \u7684\u4efb\u52a1\u6570\u91cf")
    @PostMapping(value={"/stat/taskList"})
    @ResponseBody
    public ResultVo<Object> taskList(@RequestBody StatRecordReq statRecordReq) {
        Date endDate;
        Date startDate;
        StatRecordReq statRecordModel = statRecordReq.withLevel(statRecordReq.getLevel().trim());
        List<String> typeList = List.of(statRecordModel.getTypes().trim().split(","));
        for (String type : typeList) {
            if (!Arrays.stream(StatTypeEnum.values()).filter(l -> l.name().matches("WindTask(.*)Num")).noneMatch(l -> l.name().equals(type))) continue;
            return ResultVo.error((CommonCodeEnum)CommonCodeEnum.STAT_TYPE_REQUIRED, Map.of("valid types", Arrays.stream(StatTypeEnum.values()).filter(l -> l.name().matches("WindTask(.*)Num")).map(Enum::name).collect(Collectors.toList())));
        }
        if (Arrays.stream(StatLevelEnum.values()).noneMatch(l -> l.name().equals(statRecordModel.getLevel()))) {
            return ResultVo.error((CommonCodeEnum)CommonCodeEnum.STAT_LEVEL_REQUIRED, Map.of("valid levels", Arrays.stream(StatLevelEnum.values()).map(Enum::name).collect(Collectors.toList())));
        }
        if (statRecordModel.getStart() == null || statRecordModel.getEnd() == null) {
            return ResultVo.error((CommonCodeEnum)CommonCodeEnum.STAT_TIME_REQUIRED, Map.of("required time", "start, end"));
        }
        String pattern = StatLevelEnum.getDatePatternByLevelName((String)statRecordModel.getLevel());
        SimpleDateFormat dateFormat = new SimpleDateFormat(pattern);
        try {
            startDate = dateFormat.parse(statRecordModel.getStart());
            endDate = dateFormat.parse(statRecordModel.getEnd());
        }
        catch (Exception e) {
            return ResultVo.error((CommonCodeEnum)CommonCodeEnum.STAT_TIME_FORMAT_ERROR, Map.of("valid format", pattern));
        }
        String finalStart = dateFormat.format(startDate);
        String finalEnd = dateFormat.format(endDate);
        String sortBy = statRecordModel.getSortBy();
        String sort = statRecordModel.getSort();
        if (sortBy == null || sortBy.isEmpty()) {
            sortBy = "time";
        }
        if (sort == null || sort.isEmpty()) {
            sort = "asc";
        }
        Sort orderBy = Sort.by((Sort.Direction)Sort.Direction.fromString((String)sort), (String[])new String[]{sortBy});
        List statRecordVos = this.statService.findStatRecordListByLevelAndTimeAndTypes(statRecordModel.getLevel(), typeList, finalStart, finalEnd, orderBy);
        return ResultVo.response((Object)statRecordVos);
    }

    @ApiOperation(value="\u673a\u5668\u4eba\u6545\u969c")
    @PostMapping(value={"/stat/agvAlarm"})
    @ResponseBody
    public ResultVo<Object> agvAlarm(@RequestBody StatRecordReq statRecordReq) {
        if (StringUtils.isEmpty((CharSequence)statRecordReq.getLevel())) {
            return ResultVo.error((CommonCodeEnum)CommonCodeEnum.STAT_LEVEL_REQUIRED, (Object)"Missing `level` field");
        }
        if (StringUtils.isEmpty((CharSequence)statRecordReq.getStart())) {
            return ResultVo.error((CommonCodeEnum)CommonCodeEnum.STAT_TIME_REQUIRED, (Object)"Missing `start` field");
        }
        if (StringUtils.isEmpty((CharSequence)statRecordReq.getEnd())) {
            return ResultVo.error((CommonCodeEnum)CommonCodeEnum.STAT_TIME_REQUIRED, (Object)"Missing `end` field");
        }
        if (StringUtils.isEmpty((CharSequence)statRecordReq.getLevel())) {
            return ResultVo.error((CommonCodeEnum)CommonCodeEnum.STAT_TYPE_REQUIRED, (Object)"Missing `types` field");
        }
        StatRecordReq statRecordModel = statRecordReq.withLevel(statRecordReq.getLevel().trim()).withTimeUnit(StringUtils.isEmpty((CharSequence)statRecordReq.getTimeUnit()) ? "" : statRecordReq.getTimeUnit().trim()).withVehicle(StringUtils.isEmpty((CharSequence)statRecordReq.getVehicle()) ? "" : statRecordReq.getVehicle().trim());
        List<String> typeList = List.of(statRecordModel.getTypes().replaceAll("\\s", "").split(","));
        if (this.isTypeInvalid(typeList, StatTypeEnum.getAlarmsEnum())) {
            return ResultVo.error((CommonCodeEnum)CommonCodeEnum.STAT_TYPE_REQUIRED, Map.of("valid types", StatTypeEnum.getAlarmsEnum().stream().map(Enum::name).collect(Collectors.toList())));
        }
        return this.getObjectResultVo(statRecordModel, typeList);
    }

    @ApiOperation(value="\u67e5\u8be2\u5929\u98ce\u4efb\u52a1\u5e73\u5747\u8017\u65f6")
    @PostMapping(value={"/stat/windTaskAvgCosts"})
    @ResponseBody
    public ResultVo<Object> windTaskAvgCosts(@RequestBody StatRecordReq statRecordReq) {
        Date endDate;
        Date startDate;
        if (StringUtils.isEmpty((CharSequence)statRecordReq.getLevel())) {
            return ResultVo.error((CommonCodeEnum)CommonCodeEnum.STAT_LEVEL_REQUIRED, (Object)"Missing `level` field");
        }
        if (StringUtils.isEmpty((CharSequence)statRecordReq.getStart())) {
            return ResultVo.error((CommonCodeEnum)CommonCodeEnum.STAT_TIME_REQUIRED, (Object)"Missing `start` field");
        }
        if (StringUtils.isEmpty((CharSequence)statRecordReq.getEnd())) {
            return ResultVo.error((CommonCodeEnum)CommonCodeEnum.STAT_TIME_REQUIRED, (Object)"Missing `end` field");
        }
        StatRecordReq statRecordModel = statRecordReq.withTimeUnit(StringUtils.isEmpty((CharSequence)statRecordReq.getTimeUnit()) ? "" : statRecordReq.getTimeUnit().trim()).withTypes("WindTaskAvgCostTime").withTaskLabel(StringUtils.isEmpty((CharSequence)statRecordReq.getTaskLabel()) ? "" : statRecordReq.getTaskLabel().trim()).withLevel(statRecordReq.getLevel().trim());
        String type = statRecordModel.getTypes().trim();
        if (!Objects.equals(StatTypeEnum.WindTaskAvgCostTime.name(), type)) {
            return ResultVo.error((CommonCodeEnum)CommonCodeEnum.STAT_TYPE_REQUIRED, (Object)"type `WindTaskAvgCostTime` required");
        }
        if (Arrays.stream(StatLevelEnum.values()).noneMatch(l -> l.name().equals(statRecordModel.getLevel()))) {
            return ResultVo.error((CommonCodeEnum)CommonCodeEnum.STAT_LEVEL_REQUIRED, Map.of("valid levels", Arrays.stream(StatLevelEnum.values()).map(Enum::name).collect(Collectors.toList())));
        }
        if (statRecordModel.getStart() == null || statRecordModel.getEnd() == null) {
            return ResultVo.error((CommonCodeEnum)CommonCodeEnum.STAT_TIME_REQUIRED, Map.of("required time", "start, end"));
        }
        String pattern = StatLevelEnum.getDatePatternByLevelName((String)statRecordModel.getLevel());
        SimpleDateFormat dateFormat = new SimpleDateFormat(pattern);
        try {
            startDate = dateFormat.parse(statRecordModel.getStart());
            endDate = dateFormat.parse(statRecordModel.getEnd());
        }
        catch (Exception e) {
            return ResultVo.error((CommonCodeEnum)CommonCodeEnum.STAT_TIME_FORMAT_ERROR, Map.of("valid format", pattern));
        }
        String finalStart = dateFormat.format(startDate);
        String finalEnd = dateFormat.format(endDate);
        String sortBy = statRecordModel.getSortBy();
        String sort = statRecordModel.getSort();
        if (sortBy == null || sortBy.isEmpty()) {
            sortBy = "time";
        }
        if (sort == null || sort.isEmpty()) {
            sort = "asc";
        }
        Sort orderBy = Sort.by((Sort.Direction)Sort.Direction.fromString((String)sort), (String[])new String[]{sortBy});
        List statRecordVos = this.statService.findStatRecordListByLevelAndTimeAndTypesAndThirdId(statRecordModel.getLevel(), List.of("WindTaskAvgCostTime"), statRecordModel.getTaskLabel(), finalStart, finalEnd, statRecordModel.getTimeUnit(), orderBy);
        return ResultVo.response((Object)statRecordVos);
    }

    @ApiOperation(value="\u67e5\u8be2\u673a\u5668\u4eba\u4efb\u52a1\u6210\u529f\u5b8c\u6210\u5217\u8868")
    @PostMapping(value={"/stat/agvTaskSuccessList"})
    @ResponseBody
    public ResultVo<Object> agvTaskSuccessList(@RequestBody StatRecordReq statRecordReq) {
        String startDate = statRecordReq.getStart();
        String endDate = statRecordReq.getEnd();
        if (startDate == null || endDate == null) {
            return ResultVo.error((CommonCodeEnum)CommonCodeEnum.STAT_TIME_REQUIRED, Map.of("required time", "start, end"));
        }
        String startTime = startDate + " 00:00:00";
        String endTime = endDate + " 23:59:59";
        List agvSuccessTaskCountVos = this.windTaskService.findAgvSuccessTaskCount(startTime, endTime);
        return ResultVo.response((Object)agvSuccessTaskCountVos);
    }

    @ApiOperation(value="\u4efb\u52a1\u6ede\u7559\u5217\u8868")
    @PostMapping(value={"/stat/taskRetentionList"})
    @ResponseBody
    public ResultVo<Object> taskRetentionList(@RequestBody PaginationReq<RetentionReq> req) {
        int currPage = req.getCurrentPage();
        int pageSize = req.getPageSize();
        Integer retentionHours = ((RetentionReq)req.getQueryParam()).getRetentionHours();
        PaginationResponseVo paginationResponseVo = this.windTaskService.findTaskRetentionList(currPage, pageSize, retentionHours);
        return ResultVo.response((Object)paginationResponseVo);
    }

    @ApiOperation(value="\u8fd0\u5355\u6ede\u7559\u5217\u8868")
    @PostMapping(value={"/stat/orderRetentionList"})
    @ResponseBody
    public ResultVo<Object> orderRetentionList(@RequestBody PaginationReq<RetentionReq> req) {
        int currPage = req.getCurrentPage();
        int pageSize = req.getPageSize();
        Integer retentionHours = ((RetentionReq)req.getQueryParam()).getRetentionHours();
        PaginationResponseVo paginationResponseVo = this.windTaskService.findOrderRetentionList(currPage, pageSize, retentionHours);
        return ResultVo.response((Object)paginationResponseVo);
    }

    private boolean isTimeInvalid(StatRecordReq statRecordModel) {
        return statRecordModel.getStart() == null || statRecordModel.getEnd() == null;
    }

    private boolean isLevelInvalid(StatRecordReq statRecordModel, StatLevelEnum[] statLevelEnums) {
        return Arrays.stream(statLevelEnums).noneMatch(l -> l.name().equals(statRecordModel.getLevel()));
    }

    private boolean isTypeInvalid(List<String> typeList, List<StatTypeEnum> statTypeEnums) {
        for (String type : typeList) {
            if (!statTypeEnums.stream().noneMatch(t -> t.name().equals(type))) continue;
            return true;
        }
        return false;
    }

    @ApiOperation(value="\u67e5\u8be2\u5f53\u524d\u7528\u6237\u5b58\u50a8\u7684\u7edf\u8ba1\u5386\u53f2\u8bb0\u5f55")
    @PostMapping(value={"/stat/getUserValueByUserIdAndUserKey"})
    @ResponseBody
    public ResultVo<Object> getUserValue(@RequestBody UserConfigRecordReq userConfigRecordReq) {
        if (userConfigRecordReq != null && userConfigRecordReq.getUserId() != null && userConfigRecordReq.getUserKey() != null) {
            UserConfigRecord userconfig = this.userConfigRecordService.findUserConfigRecordByuserIdAnduserKey(userConfigRecordReq.getUserId(), userConfigRecordReq.getUserKey());
            return ResultVo.response((Object)userconfig);
        }
        return ResultVo.error();
    }

    @ApiOperation(value="\u63d2\u5165\u5f53\u524d\u7528\u6237\u5b58\u50a8\u7684\u7edf\u8ba1\u5386\u53f2\u8bb0\u5f55")
    @PostMapping(value={"/stat/inOrUpUserConfigRecordReq"})
    @ResponseBody
    public ResultVo<Object> inOrUpUserConfigRecordReq(@RequestBody UserConfigRecordReq userConfigRecordReq) {
        if (userConfigRecordReq != null && userConfigRecordReq.getUserId() != null && userConfigRecordReq.getUserKey() != null && userConfigRecordReq.getUserValue() != null) {
            UserConfigRecord userconfig = this.userConfigRecordService.findUserConfigRecordByuserIdAnduserKey(userConfigRecordReq.getUserId(), userConfigRecordReq.getUserKey());
            if (userconfig != null) {
                userconfig.setUserValue(userConfigRecordReq.getUserValue());
                this.userConfigRecordService.saveUserConfig(userconfig);
                return ResultVo.success();
            }
            UserConfigRecord userConfigRecord = UserConfigRecord.builder().userId(userConfigRecordReq.getUserId()).userKey(userConfigRecordReq.getUserKey()).userValue(userConfigRecordReq.getUserValue()).build();
            this.userConfigRecordService.saveUserConfig(userConfigRecord);
            return ResultVo.success();
        }
        return ResultVo.error();
    }

    @ApiOperation(value="\u673a\u5668\u4eba\u8fd0\u884c\u8bb0\u5f55")
    @PostMapping(value={"/stat/robotStatusRecords"})
    @ResponseBody
    public ResultVo<Object> robotStatusRecords(@RequestBody PaginationReq<RobotStatusRecordsReq> req) {
        int currPage = req.getCurrentPage();
        int pageSize = req.getPageSize();
        RobotStatusRecordsReq robotStatusRecordsReq = (RobotStatusRecordsReq)req.getQueryParam();
        String agvId = robotStatusRecordsReq.getAgvId();
        String startCreateTime = Optional.ofNullable(robotStatusRecordsReq.getStartCreateTime()).orElse("");
        String endCreateTime = Optional.ofNullable(robotStatusRecordsReq.getEndCreateTime()).orElse("");
        Integer status = robotStatusRecordsReq.getStatus();
        String outOrderNo = robotStatusRecordsReq.getOutOrderNo();
        Long totalCount = this.statService.findRobotStatusRecordsCountByCondition(agvId, startCreateTime, endCreateTime, status, outOrderNo);
        List resultList = this.statService.findRobotStatusRecordsByCondition(agvId, startCreateTime, endCreateTime, status, outOrderNo, currPage, pageSize);
        long totalPage = totalCount / (long)pageSize + (long)(totalCount % (long)pageSize == 0L ? 0 : 1);
        PaginationResponseVo paginationResponseVo = new PaginationResponseVo();
        paginationResponseVo.setTotalCount(totalCount);
        paginationResponseVo.setCurrentPage(Integer.valueOf(currPage));
        paginationResponseVo.setPageSize(Integer.valueOf(pageSize));
        paginationResponseVo.setTotalPage(Integer.valueOf((int)totalPage));
        paginationResponseVo.setPageList(resultList);
        return ResultVo.response((Object)paginationResponseVo);
    }

    @ApiOperation(value="\u673a\u5668\u4eba\u8fd0\u884c\u8bb0\u5f55-\u5bfc\u51fa")
    @PostMapping(value={"/stat/exportRobotStatusRecords"})
    @ResponseBody
    public void exportRobotStatusRecords(@RequestBody RobotStatusRecordsReq req, @ApiIgnore HttpServletResponse response) throws Exception {
        String outOrderNo;
        Integer status;
        String endCreateTime;
        String startCreateTime;
        String agvId = req.getAgvId();
        Long totalCount = this.statService.findRobotStatusRecordsCountByCondition(agvId, startCreateTime = Optional.ofNullable(req.getStartCreateTime()).orElse(""), endCreateTime = Optional.ofNullable(req.getEndCreateTime()).orElse(""), status = req.getStatus(), outOrderNo = req.getOutOrderNo());
        if (totalCount > 60000L) {
            throw new RuntimeException(this.localeMessageUtil.getMessageMatch("@{response.code.ExportLimit60000Error}", LocaleContextHolder.getLocale()));
        }
        List originList = this.statService.exportRobotStatusRecords(agvId, startCreateTime, endCreateTime, status, outOrderNo);
        Locale locale = LocaleContextHolder.getLocale();
        ExcelHeaderLangUtils.chooseLang(RobotStatusRecordsExVo.class, (Locale)locale);
        ArrayList<RobotStatusRecordsExVo> resultList = new ArrayList<RobotStatusRecordsExVo>(originList.size());
        for (RobotStatusRecordsVo vo : originList) {
            RobotStatusRecordsExVo builder = RobotStatusRecordsExVo.builder().agvId(vo.getAgvId()).status(this.localeMessageUtil.getMessage(RobotStatusEnum.getInternationalDescEnum((int)vo.getStatus()), locale)).createTime(vo.getCreateTime()).endTime(vo.getEndTime()).duration(vo.getDuration()).outOrderNo(vo.getOutOrderNo()).taskRecordId(vo.getTaskRecordId()).orderId(vo.getOrderId()).destination(vo.getDestination()).build();
            resultList.add(builder);
        }
        String fileName = this.localeMessageUtil.getMessage("agvRecord.export.fileName", locale);
        String sheet = this.localeMessageUtil.getMessage("agvRecord.export.sheetName", locale);
        String title = this.localeMessageUtil.getMessage("agvRecord.export.title", locale);
        ExcelUtil.exportBigExcel(resultList, (String)title, (String)sheet, RobotStatusRecordsExVo.class, (String)(fileName + ".xlsx"), (HttpServletResponse)response);
    }

    @ApiOperation(value="\u5916\u90e8\u8ba2\u5355\u53f7\u7ba1\u7406")
    @PostMapping(value={"/stat/outOrderRecords"})
    @ResponseBody
    public ResultVo<Object> outOrderRecords(@RequestBody PaginationReq<OutOrderRecordsReq> req) {
        int currPage = req.getCurrentPage();
        int pageSize = req.getPageSize();
        OutOrderRecordsReq outOrderRecordsReq = (OutOrderRecordsReq)req.getQueryParam();
        String agvId = outOrderRecordsReq.getAgvId();
        String startCreateTime = outOrderRecordsReq.getStartCreateTime() == null ? "" : outOrderRecordsReq.getStartCreateTime() + " 00:00:00";
        String endCreateTime = outOrderRecordsReq.getEndCreateTime() == null ? "" : outOrderRecordsReq.getEndCreateTime() + " 23:59:59";
        String outOrderNo = outOrderRecordsReq.getOutOrderNo();
        Long totalCount = this.statService.findOutOrderRecordsCountByCondition(agvId, startCreateTime, endCreateTime, outOrderNo);
        List resultList = this.statService.findOutOrderRecordsByCondition(agvId, startCreateTime, endCreateTime, outOrderNo, currPage, pageSize);
        long totalPage = totalCount / (long)pageSize + (long)(totalCount % (long)pageSize == 0L ? 0 : 1);
        PaginationResponseVo paginationResponseVo = new PaginationResponseVo();
        paginationResponseVo.setTotalCount(totalCount);
        paginationResponseVo.setCurrentPage(Integer.valueOf(currPage));
        paginationResponseVo.setPageSize(Integer.valueOf(pageSize));
        paginationResponseVo.setTotalPage(Integer.valueOf((int)totalPage));
        paginationResponseVo.setPageList(resultList);
        return ResultVo.response((Object)paginationResponseVo);
    }

    @ApiOperation(value="\u5916\u90e8\u8ba2\u5355\u53f7-\u5bfc\u51fa")
    @PostMapping(value={"/stat/exportOutOrderRecords"})
    @ResponseBody
    public void exportOutOrderRecords(@RequestBody OutOrderRecordsReq req, @ApiIgnore HttpServletResponse response) throws Exception {
        String outOrderNo;
        String endCreateTime;
        String startCreateTime;
        String agvId = req.getAgvId();
        Long totalCount = this.statService.findOutOrderRecordsCountByCondition(agvId, startCreateTime = req.getStartCreateTime() == null ? "" : req.getStartCreateTime() + " 00:00:00", endCreateTime = req.getEndCreateTime() == null ? "" : req.getEndCreateTime() + " 23:59:59", outOrderNo = req.getOutOrderNo());
        if (totalCount > 10000L) {
            throw new RuntimeException(this.localeMessageUtil.getMessageMatch("@{response.code.ExportLimit10000Error}", LocaleContextHolder.getLocale()));
        }
        List resultList = this.statService.findOutOrderRecordsByCondition(agvId, startCreateTime, endCreateTime, outOrderNo, -1, -1);
        Locale locale = LocaleContextHolder.getLocale();
        ExcelHeaderLangUtils.chooseLang(OutOrderRecordsVo.class, (Locale)locale);
        String fileName = this.localeMessageUtil.getMessage("outOrder.export.fileName", locale);
        String sheet = this.localeMessageUtil.getMessage("outOrder.export.sheetName", locale);
        String title = this.localeMessageUtil.getMessage("outOrder.export.title", locale);
        ExcelUtil.exportBigExcel((List)resultList, (String)title, (String)sheet, OutOrderRecordsVo.class, (String)(fileName + ".xlsx"), (HttpServletResponse)response);
    }

    @ApiOperation(value="\u673a\u5668\u4eba\u544a\u8b66\u8bb0\u5f55")
    @PostMapping(value={"/stat/alarmsRecords"})
    @ResponseBody
    public ResultVo<Object> alarmsRecords(@RequestBody PaginationReq<AlarmsRecordsReq> req) {
        int currPage = req.getCurrentPage();
        int pageSize = req.getPageSize();
        AlarmsRecordsReq alarmsRecord = (AlarmsRecordsReq)req.getQueryParam();
        String vehicleId = alarmsRecord.getVehicleId();
        String startCreateTime = Optional.ofNullable(alarmsRecord.getStartCreateTime()).orElse("");
        String endCreateTime = Optional.ofNullable(alarmsRecord.getEndCreateTime()).orElse("");
        String startEndTime = Optional.ofNullable(alarmsRecord.getStartEndTime()).orElse("");
        String endEndTime = Optional.ofNullable(alarmsRecord.getEndEndTime()).orElse("");
        String level = alarmsRecord.getLevel();
        String alarmsCode = alarmsRecord.getAlarmsCode();
        String alarmsDesc = alarmsRecord.getAlarmsDesc();
        Page resultList = this.statService.findAlarmsRecordsByConditionPaging(vehicleId, startCreateTime, endCreateTime, startEndTime, endEndTime, level, alarmsCode, alarmsDesc, currPage, pageSize);
        List alarmsRecordList = resultList.getContent();
        List alarmsRecordResList = AlarmsRecordRes.toAlarmsRecordResList((List)alarmsRecordList);
        PaginationResponseVo paginationResponseVo = new PaginationResponseVo();
        paginationResponseVo.setTotalCount(Long.valueOf(resultList.getTotalElements()));
        paginationResponseVo.setCurrentPage(Integer.valueOf(currPage));
        paginationResponseVo.setPageSize(Integer.valueOf(pageSize));
        paginationResponseVo.setTotalPage(Integer.valueOf(resultList.getTotalPages()));
        paginationResponseVo.setPageList(alarmsRecordResList);
        return ResultVo.response((Object)paginationResponseVo);
    }

    @ApiOperation(value="\u673a\u5668\u4eba\u544a\u8b66\u8bb0\u5f55-\u5bfc\u51fa")
    @PostMapping(value={"/stat/exportRobotAlarmsRecords"})
    @ResponseBody
    public void exportRobotAlarmsRecords(@RequestBody AlarmsRecordsReq req, @ApiIgnore HttpServletResponse response) throws Exception {
        String level;
        String endCreateTime;
        String startCreateTime;
        String vehicleId = req.getVehicleId();
        Long totalCount = this.statService.findAlarmsRecordsCountByCondition(vehicleId, startCreateTime = Optional.ofNullable(req.getStartCreateTime()).orElse(""), endCreateTime = Optional.ofNullable(req.getEndCreateTime()).orElse(""), level = req.getLevel());
        if (totalCount > 10000L) {
            throw new RuntimeException(this.localeMessageUtil.getMessageMatch("@{response.code.ExportLimit10000Error}", LocaleContextHolder.getLocale()));
        }
        List alarmsList = this.statService.findAlarmsRecordsByCondition(vehicleId, startCreateTime, endCreateTime, level);
        for (AlarmsRecordMerge alarmsRecord1 : alarmsList) {
            if (!alarmsRecord1.getType().equals(1)) continue;
            alarmsRecord1.setAlarmsCostTime(alarmsRecord1.getAlarmsCostTime().divide(BigDecimal.valueOf(60000L), 2, RoundingMode.CEILING));
        }
        Locale locale = LocaleContextHolder.getLocale();
        ExcelHeaderLangUtils.chooseLang(AlarmsRecordsExVo.class, (Locale)locale);
        ArrayList<AlarmsRecordsExVo> resultList = new ArrayList<AlarmsRecordsExVo>(alarmsList.size());
        for (AlarmsRecordMerge vo : alarmsList) {
            AlarmsRecordsExVo builder = AlarmsRecordsExVo.builder().alarmsCode(vo.getAlarmsCode()).vehicleId(vo.getVehicleId()).level(vo.getLevel()).start(vo.getStartedOn()).end(vo.getEndedOn()).alarmsCostTime(vo.getAlarmsCostTime()).alarmsDesc(vo.getAlarmsDesc()).build();
            resultList.add(builder);
        }
        String fileName = this.localeMessageUtil.getMessage("alarmsRecord.export.fileName", locale);
        String sheet = this.localeMessageUtil.getMessage("alarmsRecord.export.sheetName", locale);
        String title = this.localeMessageUtil.getMessage("alarmsRecord.export.title", locale);
        ExcelUtil.exportBigExcel(resultList, (String)title, (String)sheet, AlarmsRecordsExVo.class, (String)(fileName + ".xlsx"), (HttpServletResponse)response);
    }

    @ApiOperation(value="\u673a\u5668\u4eba\u6545\u969c\u65f6\u95f4")
    @PostMapping(value={"/stat/robotsAlarmsTime"})
    @ResponseBody
    public ResultVo<Object> robotsAlarmsTime(@RequestBody StatRecordReq statRecordReq) {
        if (StringUtils.isEmpty((CharSequence)statRecordReq.getLevel())) {
            return ResultVo.error((CommonCodeEnum)CommonCodeEnum.STAT_LEVEL_REQUIRED, (Object)"Missing `level` field");
        }
        if (StringUtils.isEmpty((CharSequence)statRecordReq.getStart())) {
            return ResultVo.error((CommonCodeEnum)CommonCodeEnum.STAT_TIME_REQUIRED, (Object)"Missing `start` field");
        }
        if (StringUtils.isEmpty((CharSequence)statRecordReq.getLevel())) {
            return ResultVo.error((CommonCodeEnum)CommonCodeEnum.STAT_TYPE_REQUIRED, (Object)"Missing `types` field");
        }
        StatRecordReq statRecordModel = statRecordReq.withLevel(statRecordReq.getLevel().trim()).withTimeUnit(StringUtils.isEmpty((CharSequence)statRecordReq.getTimeUnit()) ? "" : statRecordReq.getTimeUnit().trim()).withVehicle(StringUtils.isEmpty((CharSequence)statRecordReq.getVehicle()) ? "" : statRecordReq.getVehicle().trim());
        List<String> typeList = List.of(statRecordModel.getTypes().replaceAll("\\s", "").split(","));
        if (this.isTypeInvalid(typeList, StatTypeEnum.getAlarmsTimeEnum())) {
            return ResultVo.error((CommonCodeEnum)CommonCodeEnum.STAT_TYPE_REQUIRED, Map.of("valid types", StatTypeEnum.getAlarmsTimeEnum().stream().map(Enum::name).collect(Collectors.toList())));
        }
        return this.getStatResultVo(statRecordModel, typeList);
    }

    @ApiOperation(value="\u673a\u5668\u4eba\u6545\u969c\u65f6\u95f4\u8d8b\u52bf")
    @PostMapping(value={"/stat/robotsAlarmsTimeTrend"})
    @ResponseBody
    public ResultVo<Object> robotsAlarmsTimeTrend(@RequestBody StatRecordReq statRecordReq) {
        if (StringUtils.isEmpty((CharSequence)statRecordReq.getLevel())) {
            return ResultVo.error((CommonCodeEnum)CommonCodeEnum.STAT_LEVEL_REQUIRED, (Object)"Missing `level` field");
        }
        if (StringUtils.isEmpty((CharSequence)statRecordReq.getStart())) {
            return ResultVo.error((CommonCodeEnum)CommonCodeEnum.STAT_TIME_REQUIRED, (Object)"Missing `start` field");
        }
        if (StringUtils.isEmpty((CharSequence)statRecordReq.getEnd())) {
            return ResultVo.error((CommonCodeEnum)CommonCodeEnum.STAT_TIME_REQUIRED, (Object)"Missing `end` field");
        }
        if (StringUtils.isEmpty((CharSequence)statRecordReq.getLevel())) {
            return ResultVo.error((CommonCodeEnum)CommonCodeEnum.STAT_TYPE_REQUIRED, (Object)"Missing `types` field");
        }
        StatRecordReq statRecordModel = statRecordReq.withLevel(statRecordReq.getLevel().trim()).withTimeUnit(StringUtils.isEmpty((CharSequence)statRecordReq.getTimeUnit()) ? "" : statRecordReq.getTimeUnit().trim()).withVehicle(StringUtils.isEmpty((CharSequence)statRecordReq.getVehicle()) ? "" : statRecordReq.getVehicle().trim());
        List<String> typeList = List.of(statRecordModel.getTypes().replaceAll("\\s", "").split(","));
        if (this.isTypeInvalid(typeList, StatTypeEnum.getAlarmsTimeEnum())) {
            return ResultVo.error((CommonCodeEnum)CommonCodeEnum.STAT_TYPE_REQUIRED, Map.of("valid types", StatTypeEnum.getAlarmsTimeEnum().stream().map(Enum::name).collect(Collectors.toList())));
        }
        return this.getStatTrendResultVo(statRecordModel, typeList);
    }

    @ApiOperation(value="\u673a\u5668\u4eba\u6545\u969c\u6b21\u6570")
    @PostMapping(value={"/stat/robotsAlarmsNum"})
    @ResponseBody
    public ResultVo<Object> robotsAlarmsNum(@RequestBody StatRecordReq statRecordReq) {
        if (StringUtils.isEmpty((CharSequence)statRecordReq.getLevel())) {
            return ResultVo.error((CommonCodeEnum)CommonCodeEnum.STAT_LEVEL_REQUIRED, (Object)"Missing `level` field");
        }
        if (StringUtils.isEmpty((CharSequence)statRecordReq.getStart())) {
            return ResultVo.error((CommonCodeEnum)CommonCodeEnum.STAT_TIME_REQUIRED, (Object)"Missing `start` field");
        }
        if (StringUtils.isEmpty((CharSequence)statRecordReq.getLevel())) {
            return ResultVo.error((CommonCodeEnum)CommonCodeEnum.STAT_TYPE_REQUIRED, (Object)"Missing `types` field");
        }
        StatRecordReq statRecordModel = statRecordReq.withLevel(statRecordReq.getLevel().trim()).withTimeUnit(StringUtils.isEmpty((CharSequence)statRecordReq.getTimeUnit()) ? "" : statRecordReq.getTimeUnit().trim()).withVehicle(StringUtils.isEmpty((CharSequence)statRecordReq.getVehicle()) ? "" : statRecordReq.getVehicle().trim());
        List<String> typeList = List.of(statRecordModel.getTypes().replaceAll("\\s", "").split(","));
        if (this.isTypeInvalid(typeList, StatTypeEnum.getAlarmsNumEnum())) {
            return ResultVo.error((CommonCodeEnum)CommonCodeEnum.STAT_TYPE_REQUIRED, Map.of("valid types", StatTypeEnum.getAlarmsNumEnum().stream().map(Enum::name).collect(Collectors.toList())));
        }
        return this.getStatResultVo(statRecordModel, typeList);
    }

    @ApiOperation(value="\u673a\u5668\u4eba\u6545\u969c\u6b21\u6570\u8d8b\u52bf")
    @PostMapping(value={"/stat/robotsAlarmsNumTrend"})
    @ResponseBody
    public ResultVo<Object> robotsAlarmsNumTrend(@RequestBody StatRecordReq statRecordReq) {
        if (StringUtils.isEmpty((CharSequence)statRecordReq.getLevel())) {
            return ResultVo.error((CommonCodeEnum)CommonCodeEnum.STAT_LEVEL_REQUIRED, (Object)"Missing `level` field");
        }
        if (StringUtils.isEmpty((CharSequence)statRecordReq.getStart())) {
            return ResultVo.error((CommonCodeEnum)CommonCodeEnum.STAT_TIME_REQUIRED, (Object)"Missing `start` field");
        }
        if (StringUtils.isEmpty((CharSequence)statRecordReq.getEnd())) {
            return ResultVo.error((CommonCodeEnum)CommonCodeEnum.STAT_TIME_REQUIRED, (Object)"Missing `end` field");
        }
        if (StringUtils.isEmpty((CharSequence)statRecordReq.getLevel())) {
            return ResultVo.error((CommonCodeEnum)CommonCodeEnum.STAT_TYPE_REQUIRED, (Object)"Missing `types` field");
        }
        StatRecordReq statRecordModel = statRecordReq.withLevel(statRecordReq.getLevel().trim()).withTimeUnit(StringUtils.isEmpty((CharSequence)statRecordReq.getTimeUnit()) ? "" : statRecordReq.getTimeUnit().trim()).withVehicle(StringUtils.isEmpty((CharSequence)statRecordReq.getVehicle()) ? "" : statRecordReq.getVehicle().trim());
        List<String> typeList = List.of(statRecordModel.getTypes().replaceAll("\\s", "").split(","));
        if (this.isTypeInvalid(typeList, StatTypeEnum.getAlarmsNumEnum())) {
            return ResultVo.error((CommonCodeEnum)CommonCodeEnum.STAT_TYPE_REQUIRED, Map.of("valid types", StatTypeEnum.getAlarmsNumEnum().stream().map(Enum::name).collect(Collectors.toList())));
        }
        return this.getStatTrendResultVo(statRecordModel, typeList);
    }

    @ApiOperation(value="\u673a\u5668\u4eba\u72b6\u6001\u65f6\u95f4")
    @PostMapping(value={"/stat/robotsStatusTime"})
    @ResponseBody
    public ResultVo<Object> robotsStatusTime(@RequestBody StatRecordReq statRecordReq) {
        if (StringUtils.isEmpty((CharSequence)statRecordReq.getLevel())) {
            return ResultVo.error((CommonCodeEnum)CommonCodeEnum.STAT_LEVEL_REQUIRED, (Object)"Missing `level` field");
        }
        if (StringUtils.isEmpty((CharSequence)statRecordReq.getStart())) {
            return ResultVo.error((CommonCodeEnum)CommonCodeEnum.STAT_TIME_REQUIRED, (Object)"Missing `start` field");
        }
        if (StringUtils.isEmpty((CharSequence)statRecordReq.getLevel())) {
            return ResultVo.error((CommonCodeEnum)CommonCodeEnum.STAT_TYPE_REQUIRED, (Object)"Missing `types` field");
        }
        StatRecordReq statRecordModel = statRecordReq.withLevel(statRecordReq.getLevel().trim()).withTimeUnit(StringUtils.isEmpty((CharSequence)statRecordReq.getTimeUnit()) ? "" : statRecordReq.getTimeUnit().trim()).withVehicle(StringUtils.isEmpty((CharSequence)statRecordReq.getVehicle()) ? "" : statRecordReq.getVehicle().trim());
        List<String> typeList = List.of(statRecordModel.getTypes().replaceAll("\\s", "").split(","));
        if (this.isTypeInvalid(typeList, StatTypeEnum.getVehicleStatusEnum())) {
            return ResultVo.error((CommonCodeEnum)CommonCodeEnum.STAT_TYPE_REQUIRED, Map.of("valid types", StatTypeEnum.getVehicleStatusEnum().stream().map(Enum::name).collect(Collectors.toList())));
        }
        return this.getStatResultVo(statRecordModel, typeList);
    }

    @ApiOperation(value="\u673a\u5668\u4eba\u72b6\u6001\u65f6\u95f4\u8d8b\u52bf")
    @PostMapping(value={"/stat/robotsStatusTimeTrend"})
    @ResponseBody
    public ResultVo<Object> robotsStatusTimeTrend(@RequestBody StatRecordReq statRecordReq) {
        if (StringUtils.isEmpty((CharSequence)statRecordReq.getLevel())) {
            return ResultVo.error((CommonCodeEnum)CommonCodeEnum.STAT_LEVEL_REQUIRED, (Object)"Missing `level` field");
        }
        if (StringUtils.isEmpty((CharSequence)statRecordReq.getStart())) {
            return ResultVo.error((CommonCodeEnum)CommonCodeEnum.STAT_TIME_REQUIRED, (Object)"Missing `start` field");
        }
        if (StringUtils.isEmpty((CharSequence)statRecordReq.getEnd())) {
            return ResultVo.error((CommonCodeEnum)CommonCodeEnum.STAT_TIME_REQUIRED, (Object)"Missing `end` field");
        }
        if (StringUtils.isEmpty((CharSequence)statRecordReq.getLevel())) {
            return ResultVo.error((CommonCodeEnum)CommonCodeEnum.STAT_TYPE_REQUIRED, (Object)"Missing `types` field");
        }
        StatRecordReq statRecordModel = statRecordReq.withLevel(statRecordReq.getLevel().trim()).withTimeUnit(StringUtils.isEmpty((CharSequence)statRecordReq.getTimeUnit()) ? "" : statRecordReq.getTimeUnit().trim()).withVehicle(StringUtils.isEmpty((CharSequence)statRecordReq.getVehicle()) ? "" : statRecordReq.getVehicle().trim());
        List<String> typeList = List.of(statRecordModel.getTypes().replaceAll("\\s", "").split(","));
        if (this.isTypeInvalid(typeList, StatTypeEnum.getVehicleStatusEnum())) {
            return ResultVo.error((CommonCodeEnum)CommonCodeEnum.STAT_TYPE_REQUIRED, Map.of("valid types", StatTypeEnum.getVehicleStatusEnum().stream().map(Enum::name).collect(Collectors.toList())));
        }
        return this.getStatTrendResultVo(statRecordModel, typeList);
    }

    @ApiOperation(value="agv core \u8fd0\u5355")
    @PostMapping(value={"/stat/agvCoreOrders"})
    @ResponseBody
    public ResultVo<Object> agvCoreOrders(@RequestBody StatRecordReq statRecordReq) {
        if (StringUtils.isEmpty((CharSequence)statRecordReq.getLevel())) {
            return ResultVo.error((CommonCodeEnum)CommonCodeEnum.STAT_LEVEL_REQUIRED, (Object)"Missing `level` field");
        }
        if (StringUtils.isEmpty((CharSequence)statRecordReq.getStart())) {
            return ResultVo.error((CommonCodeEnum)CommonCodeEnum.STAT_TIME_REQUIRED, (Object)"Missing `start` field");
        }
        if (StringUtils.isEmpty((CharSequence)statRecordReq.getLevel())) {
            return ResultVo.error((CommonCodeEnum)CommonCodeEnum.STAT_TYPE_REQUIRED, (Object)"Missing `types` field");
        }
        StatRecordReq statRecordModel = statRecordReq.withLevel(statRecordReq.getLevel().trim()).withTimeUnit(StringUtils.isEmpty((CharSequence)statRecordReq.getTimeUnit()) ? "" : statRecordReq.getTimeUnit().trim()).withVehicle(StringUtils.isEmpty((CharSequence)statRecordReq.getVehicle()) ? "" : statRecordReq.getVehicle().trim());
        List<String> typeList = List.of(statRecordModel.getTypes().replaceAll("\\s", "").split(","));
        if (this.isTypeInvalid(typeList, StatTypeEnum.getCoreOrderEnum())) {
            return ResultVo.error((CommonCodeEnum)CommonCodeEnum.STAT_TYPE_REQUIRED, Map.of("valid types", StatTypeEnum.getCoreOrderEnum().stream().map(Enum::name).collect(Collectors.toList())));
        }
        return this.getStatResultVo(statRecordModel, typeList);
    }

    @ApiOperation(value="agv  core \u8fd0\u5355\u8d8b\u52bf")
    @PostMapping(value={"/stat/agvCoreOrdersTrend"})
    @ResponseBody
    public ResultVo<Object> agvCoreOrdersTrend(@RequestBody StatRecordReq statRecordReq) {
        if (StringUtils.isEmpty((CharSequence)statRecordReq.getLevel())) {
            return ResultVo.error((CommonCodeEnum)CommonCodeEnum.STAT_LEVEL_REQUIRED, (Object)"Missing `level` field");
        }
        if (StringUtils.isEmpty((CharSequence)statRecordReq.getStart())) {
            return ResultVo.error((CommonCodeEnum)CommonCodeEnum.STAT_TIME_REQUIRED, (Object)"Missing `start` field");
        }
        if (StringUtils.isEmpty((CharSequence)statRecordReq.getEnd())) {
            return ResultVo.error((CommonCodeEnum)CommonCodeEnum.STAT_TIME_REQUIRED, (Object)"Missing `end` field");
        }
        if (StringUtils.isEmpty((CharSequence)statRecordReq.getLevel())) {
            return ResultVo.error((CommonCodeEnum)CommonCodeEnum.STAT_TYPE_REQUIRED, (Object)"Missing `types` field");
        }
        StatRecordReq statRecordModel = statRecordReq.withLevel(statRecordReq.getLevel().trim()).withTimeUnit(StringUtils.isEmpty((CharSequence)statRecordReq.getTimeUnit()) ? "" : statRecordReq.getTimeUnit().trim()).withVehicle(StringUtils.isEmpty((CharSequence)statRecordReq.getVehicle()) ? "" : statRecordReq.getVehicle().trim());
        List<String> typeList = List.of(statRecordModel.getTypes().replaceAll("\\s", "").split(","));
        if (this.isTypeInvalid(typeList, StatTypeEnum.getCoreOrderEnum())) {
            return ResultVo.error((CommonCodeEnum)CommonCodeEnum.STAT_TYPE_REQUIRED, Map.of("valid types", StatTypeEnum.getCoreOrderEnum().stream().map(Enum::name).collect(Collectors.toList())));
        }
        return this.getStatTrendResultVo(statRecordModel, typeList);
    }

    @ApiOperation(value="\u67e5\u8be2 \u521b\u5efa/\u5b8c\u6210/\u7ec8\u6b62 \u7684\u4efb\u52a1\u6570\u91cf")
    @PostMapping(value={"/stat/taskListNum"})
    @ResponseBody
    public ResultVo<Object> taskListNum(@RequestBody StatRecordReq statRecordReq) {
        if (StringUtils.isEmpty((CharSequence)statRecordReq.getLevel())) {
            return ResultVo.error((CommonCodeEnum)CommonCodeEnum.STAT_LEVEL_REQUIRED, (Object)"Missing `level` field");
        }
        if (StringUtils.isEmpty((CharSequence)statRecordReq.getStart())) {
            return ResultVo.error((CommonCodeEnum)CommonCodeEnum.STAT_TIME_REQUIRED, (Object)"Missing `start` field");
        }
        if (StringUtils.isEmpty((CharSequence)statRecordReq.getLevel())) {
            return ResultVo.error((CommonCodeEnum)CommonCodeEnum.STAT_TYPE_REQUIRED, (Object)"Missing `types` field");
        }
        String startTime = statRecordReq.getStart() + " 00:00:00";
        String endTime = statRecordReq.getStart() + " 23:59:59";
        StatRecordReq statRecordModel = statRecordReq.withStart(startTime).withEnd(endTime).withLevel(statRecordReq.getLevel().trim()).withTimeUnit(StringUtils.isEmpty((CharSequence)statRecordReq.getTimeUnit()) ? "" : statRecordReq.getTimeUnit().trim()).withVehicle(StringUtils.isEmpty((CharSequence)statRecordReq.getTaskLabel()) ? "" : statRecordReq.getTaskLabel().trim());
        List<String> typeList = List.of(statRecordModel.getTypes().replaceAll("\\s", "").split(","));
        if (this.isTypeInvalid(typeList, StatTypeEnum.getWindTaskEnum())) {
            return ResultVo.error((CommonCodeEnum)CommonCodeEnum.STAT_TYPE_REQUIRED, Map.of("valid types", StatTypeEnum.getWindTaskEnum().stream().map(Enum::name).collect(Collectors.toList())));
        }
        return this.getStatTrendResultVo(statRecordModel, typeList);
    }

    @ApiOperation(value="\u67e5\u8be2 \u521b\u5efa/\u5b8c\u6210/\u7ec8\u6b62 \u7684\u4efb\u52a1\u6570\u91cf\u8d8b\u52bf")
    @PostMapping(value={"/stat/taskListNumTrend"})
    @ResponseBody
    public ResultVo<Object> taskListNumTrend(@RequestBody StatRecordReq statRecordReq) {
        if (StringUtils.isEmpty((CharSequence)statRecordReq.getLevel())) {
            return ResultVo.error((CommonCodeEnum)CommonCodeEnum.STAT_LEVEL_REQUIRED, (Object)"Missing `level` field");
        }
        if (StringUtils.isEmpty((CharSequence)statRecordReq.getStart())) {
            return ResultVo.error((CommonCodeEnum)CommonCodeEnum.STAT_TIME_REQUIRED, (Object)"Missing `start` field");
        }
        if (StringUtils.isEmpty((CharSequence)statRecordReq.getEnd())) {
            return ResultVo.error((CommonCodeEnum)CommonCodeEnum.STAT_TIME_REQUIRED, (Object)"Missing `end` field");
        }
        if (StringUtils.isEmpty((CharSequence)statRecordReq.getLevel())) {
            return ResultVo.error((CommonCodeEnum)CommonCodeEnum.STAT_TYPE_REQUIRED, (Object)"Missing `types` field");
        }
        StatRecordReq statRecordModel = statRecordReq.withLevel(statRecordReq.getLevel().trim()).withTimeUnit(StringUtils.isEmpty((CharSequence)statRecordReq.getTimeUnit()) ? "" : statRecordReq.getTimeUnit().trim()).withVehicle(StringUtils.isEmpty((CharSequence)statRecordReq.getVehicle()) ? "" : statRecordReq.getVehicle().trim());
        List<String> typeList = List.of(statRecordModel.getTypes().replaceAll("\\s", "").split(","));
        if (this.isTypeInvalid(typeList, StatTypeEnum.getWindTaskEnum())) {
            return ResultVo.error((CommonCodeEnum)CommonCodeEnum.STAT_TYPE_REQUIRED, Map.of("valid types", StatTypeEnum.getWindTaskEnum().stream().map(Enum::name).collect(Collectors.toList())));
        }
        return this.getStatTrendResultVo(statRecordModel, typeList);
    }

    @ApiOperation(value="\u67e5\u8be2 \u5de5\u4f4d\u5c97\u4f4d \u521b\u5efa/\u5b8c\u6210/\u7ec8\u6b62 \u7684\u4efb\u52a1\u6570\u91cf")
    @PostMapping(value={"/stat/workTypeOrStationTaskListNum"})
    @ResponseBody
    public ResultVo<Object> workTypeOrStationTaskListNum(@RequestBody StatRecordReq statRecordReq) {
        if (StringUtils.isEmpty((CharSequence)statRecordReq.getLevel())) {
            return ResultVo.error((CommonCodeEnum)CommonCodeEnum.STAT_LEVEL_REQUIRED, (Object)"Missing `level` field");
        }
        if (StringUtils.isEmpty((CharSequence)statRecordReq.getStart())) {
            return ResultVo.error((CommonCodeEnum)CommonCodeEnum.STAT_TIME_REQUIRED, (Object)"Missing `start` field");
        }
        if (StringUtils.isEmpty((CharSequence)statRecordReq.getLevel())) {
            return ResultVo.error((CommonCodeEnum)CommonCodeEnum.STAT_TYPE_REQUIRED, (Object)"Missing `types` field");
        }
        String startTime = statRecordReq.getStart() + " 00:00:00";
        String endTime = statRecordReq.getStart() + " 23:59:59";
        StatRecordReq statRecordModel = statRecordReq.withStart(startTime).withEnd(endTime).withLevel(statRecordReq.getLevel().trim()).withTimeUnit(StringUtils.isEmpty((CharSequence)statRecordReq.getTimeUnit()) ? "" : statRecordReq.getTimeUnit().trim()).withWorkTypeId(StringUtils.isEmpty((CharSequence)statRecordReq.getWorkTypeId()) ? "" : statRecordReq.getWorkTypeId().trim()).withWorkStationId(StringUtils.isEmpty((CharSequence)statRecordReq.getWorkStationId()) ? "" : statRecordReq.getWorkStationId().trim());
        List<String> typeList = List.of(statRecordModel.getTypes().replaceAll("\\s", "").split(","));
        if (this.isTypeInvalid(typeList, StatTypeEnum.getWindTaskTypeOrStationEnum())) {
            return ResultVo.error((CommonCodeEnum)CommonCodeEnum.STAT_TYPE_REQUIRED, Map.of("valid types", StatTypeEnum.getWindTaskTypeOrStationEnum().stream().map(Enum::name).collect(Collectors.toList())));
        }
        return this.getStatDuplicateResultVo(statRecordModel, typeList);
    }

    @ApiOperation(value="\u67e5\u8be2 \u5de5\u4f4d\u5c97\u4f4d \u521b\u5efa/\u5b8c\u6210/\u7ec8\u6b62 \u7684\u4efb\u52a1\u6570\u91cf\u8d8b\u52bf")
    @PostMapping(value={"/stat/workTypeOrStationTaskListNumTrend"})
    @ResponseBody
    public ResultVo<Object> workTypeOrStationTaskListNumTrend(@RequestBody StatRecordReq statRecordReq) {
        if (StringUtils.isEmpty((CharSequence)statRecordReq.getLevel())) {
            return ResultVo.error((CommonCodeEnum)CommonCodeEnum.STAT_LEVEL_REQUIRED, (Object)"Missing `level` field");
        }
        if (StringUtils.isEmpty((CharSequence)statRecordReq.getStart())) {
            return ResultVo.error((CommonCodeEnum)CommonCodeEnum.STAT_TIME_REQUIRED, (Object)"Missing `start` field");
        }
        if (StringUtils.isEmpty((CharSequence)statRecordReq.getEnd())) {
            return ResultVo.error((CommonCodeEnum)CommonCodeEnum.STAT_TIME_REQUIRED, (Object)"Missing `end` field");
        }
        if (StringUtils.isEmpty((CharSequence)statRecordReq.getLevel())) {
            return ResultVo.error((CommonCodeEnum)CommonCodeEnum.STAT_TYPE_REQUIRED, (Object)"Missing `types` field");
        }
        StatRecordReq statRecordModel = statRecordReq.withLevel(statRecordReq.getLevel().trim()).withTimeUnit(StringUtils.isEmpty((CharSequence)statRecordReq.getTimeUnit()) ? "" : statRecordReq.getTimeUnit().trim()).withWorkTypeId(StringUtils.isEmpty((CharSequence)statRecordReq.getWorkTypeId()) ? "" : statRecordReq.getWorkTypeId().trim()).withWorkStationId(StringUtils.isEmpty((CharSequence)statRecordReq.getWorkStationId()) ? "" : statRecordReq.getWorkStationId().trim());
        List<String> typeList = List.of(statRecordModel.getTypes().replaceAll("\\s", "").split(","));
        if (this.isTypeInvalid(typeList, StatTypeEnum.getWindTaskTypeOrStationEnum())) {
            return ResultVo.error((CommonCodeEnum)CommonCodeEnum.STAT_TYPE_REQUIRED, Map.of("valid types", StatTypeEnum.getWindTaskTypeOrStationEnum().stream().map(Enum::name).collect(Collectors.toList())));
        }
        return this.getStatDuplicateTrendResultVo(statRecordModel, typeList);
    }

    @ApiOperation(value="\u67e5\u8be2\u5bf9\u6bd4\u60c5\u51b5")
    @PostMapping(value={"/stat/typeCompare"})
    @ResponseBody
    public ResultVo<Object> typeCompare(@RequestBody StatRecordReq statRecordReq) {
        Date endDate;
        Date startDate;
        if (StringUtils.isEmpty((CharSequence)statRecordReq.getLevel())) {
            return ResultVo.error((CommonCodeEnum)CommonCodeEnum.STAT_LEVEL_REQUIRED, (Object)"Missing `level` field");
        }
        if (StringUtils.isEmpty((CharSequence)statRecordReq.getStart())) {
            return ResultVo.error((CommonCodeEnum)CommonCodeEnum.STAT_TIME_REQUIRED, (Object)"Missing `start` field");
        }
        if (StringUtils.isEmpty((CharSequence)statRecordReq.getEnd())) {
            return ResultVo.error((CommonCodeEnum)CommonCodeEnum.STAT_TIME_REQUIRED, (Object)"Missing `end` field");
        }
        if (StringUtils.isEmpty((CharSequence)statRecordReq.getLevel())) {
            return ResultVo.error((CommonCodeEnum)CommonCodeEnum.STAT_TYPE_REQUIRED, (Object)"Missing `types` field");
        }
        StatRecordReq statRecordModel = statRecordReq.withLevel(statRecordReq.getLevel().trim()).withTimeUnit(StringUtils.isEmpty((CharSequence)statRecordReq.getTimeUnit()) ? "" : statRecordReq.getTimeUnit().trim()).withVehicle(StringUtils.isEmpty((CharSequence)statRecordReq.getVehicle()) ? "" : statRecordReq.getVehicle().trim());
        List<String> typeList = List.of(statRecordReq.getTypes().replaceAll("\\s", "").split(","));
        String pattern = StatLevelEnum.getDatePatternByLevelName((String)statRecordReq.getLevel());
        SimpleDateFormat dateFormat = new SimpleDateFormat(pattern);
        try {
            startDate = dateFormat.parse(statRecordModel.getStart());
            endDate = dateFormat.parse(statRecordModel.getEnd());
        }
        catch (Exception e) {
            return ResultVo.error((CommonCodeEnum)CommonCodeEnum.STAT_TIME_FORMAT_ERROR, Map.of("valid format", pattern));
        }
        String finalStart = dateFormat.format(startDate);
        String finalEnd = dateFormat.format(endDate);
        String thirdId = !StringUtils.isEmpty((CharSequence)statRecordModel.getVehicle()) ? statRecordModel.getVehicle() : (!StringUtils.isEmpty((CharSequence)statRecordModel.getWorkTypeId()) ? statRecordModel.getWorkTypeId() : (!StringUtils.isEmpty((CharSequence)statRecordModel.getWorkStationId()) ? statRecordModel.getWorkStationId() : statRecordModel.getTaskLabel()));
        String sortBy = statRecordModel.getSortBy();
        String sort = statRecordModel.getSort();
        if (sortBy == null || sortBy.isEmpty()) {
            sortBy = "time";
        }
        if (sort == null || sort.isEmpty()) {
            sort = "asc";
        }
        Sort orderBy = Sort.by((Sort.Direction)Sort.Direction.fromString((String)sort), (String[])new String[]{sortBy});
        List statRecordVos = this.statService.findStatRecordListByLevelAndTimeRangeAndTypesAndThirdId(statRecordModel.getLevel(), typeList, thirdId, finalStart, finalEnd, statRecordModel.getTimeUnit(), orderBy);
        ArrayList<StatRecordCompareVo> statRecordCompareVos = new ArrayList<StatRecordCompareVo>();
        List timeList = statRecordVos.stream().map(StatRecordVo::getTime).distinct().collect(Collectors.toList());
        for (String time : timeList) {
            List typeValueVoList = statRecordVos.stream().filter(s -> s.getTime().equals(time)).map(s -> new TypeValueVo(s.getType(), s.getValue())).collect(Collectors.toList());
            StatRecordCompareVo statRecordCompareVo = StatRecordCompareVo.builder().level(statRecordModel.getLevel()).time(time).typeValueVos(typeValueVoList).build();
            statRecordCompareVos.add(statRecordCompareVo);
        }
        if (sortBy.equals("value")) {
            Comparator<StatRecordCompareVo> comparator = null;
            comparator = sort.equals("desc") ? Comparator.comparing(StatRecordCompareVo::getTotalValue).reversed() : Comparator.comparing(StatRecordCompareVo::getTotalValue);
            statRecordCompareVos.sort(comparator);
        }
        return ResultVo.response((Object)StatCompareResponseVo.builder().date(finalStart + "~" + finalEnd).statRecordVos(statRecordCompareVos).build());
    }

    @ApiOperation(value="\u67e5\u8be2\u7c7b\u578b\u5360\u6bd4\u60c5\u51b5")
    @PostMapping(value={"/stat/typeProportion"})
    @ResponseBody
    public ResultVo<Object> typeProportion(@RequestBody StatRecordReq statRecordReq) {
        Date endDate;
        Date startDate;
        if (StringUtils.isEmpty((CharSequence)statRecordReq.getLevel())) {
            return ResultVo.error((CommonCodeEnum)CommonCodeEnum.STAT_LEVEL_REQUIRED, (Object)"Missing `level` field");
        }
        if (StringUtils.isEmpty((CharSequence)statRecordReq.getStart())) {
            return ResultVo.error((CommonCodeEnum)CommonCodeEnum.STAT_TIME_REQUIRED, (Object)"Missing `start` field");
        }
        if (StringUtils.isEmpty((CharSequence)statRecordReq.getEnd())) {
            return ResultVo.error((CommonCodeEnum)CommonCodeEnum.STAT_TIME_REQUIRED, (Object)"Missing `end` field");
        }
        if (StringUtils.isEmpty((CharSequence)statRecordReq.getLevel())) {
            return ResultVo.error((CommonCodeEnum)CommonCodeEnum.STAT_TYPE_REQUIRED, (Object)"Missing `types` field");
        }
        StatRecordReq statRecordModel = statRecordReq.withLevel(statRecordReq.getLevel().trim()).withTimeUnit(StringUtils.isEmpty((CharSequence)statRecordReq.getTimeUnit()) ? "" : statRecordReq.getTimeUnit().trim()).withVehicle(StringUtils.isEmpty((CharSequence)statRecordReq.getVehicle()) ? "" : statRecordReq.getVehicle().trim());
        List<String> typeList = List.of(statRecordReq.getTypes().replaceAll("\\s", "").split(","));
        if (typeList.size() != 2) {
            return ResultVo.error((CommonCodeEnum)CommonCodeEnum.STAT_PROPORTION_TYPE_SIZE_ERROR);
        }
        String pattern = StatLevelEnum.getDatePatternByLevelName((String)statRecordReq.getLevel());
        SimpleDateFormat dateFormat = new SimpleDateFormat(pattern);
        try {
            startDate = dateFormat.parse(statRecordModel.getStart());
            endDate = dateFormat.parse(statRecordModel.getEnd());
        }
        catch (Exception e) {
            return ResultVo.error((CommonCodeEnum)CommonCodeEnum.STAT_TIME_FORMAT_ERROR, Map.of("valid format", pattern));
        }
        String finalStart = dateFormat.format(startDate);
        String finalEnd = dateFormat.format(endDate);
        String thirdId = !StringUtils.isEmpty((CharSequence)statRecordModel.getVehicle()) ? statRecordModel.getVehicle() : (!StringUtils.isEmpty((CharSequence)statRecordModel.getWorkTypeId()) ? statRecordModel.getWorkTypeId() : (!StringUtils.isEmpty((CharSequence)statRecordModel.getWorkStationId()) ? statRecordModel.getWorkStationId() : statRecordModel.getTaskLabel()));
        String sortBy = statRecordModel.getSortBy();
        String sort = statRecordModel.getSort();
        if (sortBy == null || sortBy.isEmpty()) {
            sortBy = "time";
        }
        if (sort == null || sort.isEmpty()) {
            sort = "asc";
        }
        Sort orderBy = Sort.by((Sort.Direction)Sort.Direction.fromString((String)sort), (String[])new String[]{sortBy});
        List statRecordVos = this.statService.findStatRecordListByLevelAndTimeRangeAndTypesAndThirdId(statRecordModel.getLevel(), typeList, thirdId, finalStart, finalEnd, statRecordModel.getTimeUnit(), orderBy);
        if (statRecordVos.isEmpty()) {
            return ResultVo.response((Object)StatProportionResponseVo.builder().date(finalStart + "~" + finalEnd).average(BigDecimal.ZERO).timeValueVos(new ArrayList()).build());
        }
        ArrayList<TimeValueVo> timeValueVos = new ArrayList<TimeValueVo>();
        BigDecimal total = BigDecimal.ZERO;
        List timeList = statRecordVos.stream().map(StatRecordVo::getTime).distinct().collect(Collectors.toList());
        for (String time : timeList) {
            BigDecimal proportionValueFirst = BigDecimal.ZERO;
            BigDecimal proportionValueSecond = BigDecimal.ZERO;
            BigDecimal proportionValue = BigDecimal.ZERO;
            String typeFirst = typeList.get(0);
            String typeSecond = typeList.get(1);
            proportionValueFirst = statRecordVos.stream().filter(s -> s.getTime().equals(time) && s.getType().equals(typeFirst)).map(StatRecordVo::getValue).reduce(BigDecimal::add).orElse(BigDecimal.ZERO);
            proportionValueSecond = statRecordVos.stream().filter(s -> s.getTime().equals(time) && s.getType().equals(typeSecond)).map(StatRecordVo::getValue).reduce(BigDecimal::add).orElse(BigDecimal.ZERO);
            proportionValue = proportionValueSecond.compareTo(BigDecimal.ZERO) == 0 ? BigDecimal.ZERO : proportionValueFirst.divide(proportionValueSecond, 2, RoundingMode.CEILING);
            total = total.add(proportionValue);
            timeValueVos.add(TimeValueVo.builder().time(time).value(proportionValue).build());
        }
        BigDecimal average = total.divide(BigDecimal.valueOf(timeValueVos.size()), 2, RoundingMode.CEILING);
        if (sortBy.equals("value")) {
            Comparator<TimeValueVo> comparator = null;
            comparator = sort.equals("desc") ? Comparator.comparing(TimeValueVo::getValue).reversed() : Comparator.comparing(TimeValueVo::getValue);
            timeValueVos.sort(comparator);
        }
        return ResultVo.response((Object)StatProportionResponseVo.builder().date(finalStart + "~" + finalEnd).type(statRecordReq.getTypes()).average(average).timeValueVos(timeValueVos).build());
    }

    private ResultVo<Object> getStatResultVo(StatRecordReq statRecordModel, List<String> typeList) {
        Date startDate;
        if (this.isLevelInvalid(statRecordModel, StatLevelEnum.values())) {
            return ResultVo.error((CommonCodeEnum)CommonCodeEnum.STAT_LEVEL_REQUIRED, Map.of("valid levels", Arrays.stream(StatLevelEnum.values()).map(Enum::name).collect(Collectors.toList())));
        }
        if (statRecordModel.getStart() == null) {
            return ResultVo.error((CommonCodeEnum)CommonCodeEnum.STAT_TIME_REQUIRED, Map.of("required time", "start"));
        }
        String pattern = StatLevelEnum.getDatePatternByLevelName((String)statRecordModel.getLevel());
        SimpleDateFormat dateFormat = new SimpleDateFormat(pattern);
        try {
            startDate = dateFormat.parse(statRecordModel.getStart());
        }
        catch (Exception e) {
            return ResultVo.error((CommonCodeEnum)CommonCodeEnum.STAT_TIME_FORMAT_ERROR, Map.of("valid format", pattern));
        }
        String finalStart = dateFormat.format(startDate);
        String curDate = dateFormat.format(new Date());
        String sortBy = statRecordModel.getSortBy();
        String sort = statRecordModel.getSort();
        if (sortBy == null || sortBy.isEmpty()) {
            sortBy = "time";
        }
        if (sort == null || sort.isEmpty()) {
            sort = "asc";
        }
        Sort orderBy = Sort.by((Sort.Direction)Sort.Direction.fromString((String)sort), (String[])new String[]{sortBy});
        List statRecordVos = this.statService.findStatRecordByLevelAndTimeAndTypes(statRecordModel.getLevel(), typeList, finalStart, statRecordModel.getTimeUnit(), orderBy);
        ArrayList<StatResponseVo> statResponseVoList = new ArrayList<StatResponseVo>();
        if (statRecordVos.size() == 0) {
            for (String type : typeList) {
                StatResponseVo statResponseVo = StatResponseVo.builder().type(type).date(finalStart).total(BigDecimal.ZERO).average(BigDecimal.ZERO).statRecordVos(statRecordVos).build();
                statResponseVoList.add(statResponseVo);
            }
        } else {
            if (Boolean.TRUE.equals(statRecordModel.getIsVehicleEfficiency())) {
                String statOnWorkTime = this.propConfig.getStatOnWorkTime();
                String statOffWorkTime = this.propConfig.getStatOffWorkTime();
                if (statOnWorkTime == null) {
                    statOnWorkTime = "08:00:00";
                }
                if (statOffWorkTime == null) {
                    statOffWorkTime = "20:00:00";
                }
                LocalTime onWorkTime = LocalTime.parse(statOnWorkTime);
                LocalTime offWorkTime = LocalTime.parse(statOffWorkTime);
                LocalTime currentTime = LocalTime.now();
                Duration duration = null;
                BigDecimal hoursDifference = BigDecimal.ONE;
                if (finalStart.compareTo(curDate) < 0) {
                    duration = Duration.between(onWorkTime, offWorkTime);
                } else if (currentTime.isBefore(offWorkTime) && currentTime.isAfter(onWorkTime)) {
                    duration = Duration.between(onWorkTime, currentTime);
                } else if (currentTime.isAfter(offWorkTime)) {
                    duration = Duration.between(onWorkTime, offWorkTime);
                } else if (currentTime.isBefore(offWorkTime)) {
                    duration = Duration.ZERO;
                }
                hoursDifference = BigDecimal.valueOf(duration.toHours()).add(BigDecimal.valueOf(duration.toMinutesPart()).divide(BigDecimal.valueOf(60L), 2, RoundingMode.CEILING));
                for (StatRecordVo statRecordVo : statRecordVos) {
                    if (duration.equals(Duration.ZERO)) {
                        statRecordVo.setValue(BigDecimal.valueOf(0L));
                        continue;
                    }
                    statRecordVo.setValue(statRecordVo.getValue().divide(hoursDifference, 2, RoundingMode.CEILING));
                }
            }
            for (String type : typeList) {
                List collect = statRecordVos.stream().filter(s -> s.getType().equals(type)).collect(Collectors.toList());
                StatResponseVo statResponseVo = new StatResponseVo();
                if (collect.size() == 0) {
                    statResponseVo = StatResponseVo.builder().type(type).date(finalStart).total(BigDecimal.ZERO).average(BigDecimal.ZERO).statRecordVos(statRecordVos).build();
                } else {
                    BigDecimal total = collect.stream().filter(s -> s.getType().equals(type)).map(StatRecordVo::getValue).reduce(BigDecimal::add).get();
                    BigDecimal average = total.divide(BigDecimal.valueOf(collect.size()), 2, RoundingMode.CEILING);
                    statResponseVo = StatResponseVo.builder().type(type).date(finalStart).total(total).average(average).statRecordVos(collect).build();
                }
                statResponseVoList.add(statResponseVo);
            }
        }
        return ResultVo.response(statResponseVoList);
    }

    private ResultVo<Object> getStatTrendResultVo(StatRecordReq statRecordModel, List<String> typeList) {
        Date endDate;
        Date startDate;
        if (this.isLevelInvalid(statRecordModel, StatLevelEnum.values())) {
            return ResultVo.error((CommonCodeEnum)CommonCodeEnum.STAT_LEVEL_REQUIRED, Map.of("valid levels", Arrays.stream(StatLevelEnum.values()).map(Enum::name).collect(Collectors.toList())));
        }
        if (this.isTimeInvalid(statRecordModel)) {
            return ResultVo.error((CommonCodeEnum)CommonCodeEnum.STAT_TIME_REQUIRED, Map.of("required time", "start, end"));
        }
        String pattern = StatLevelEnum.getDatePatternByLevelName((String)statRecordModel.getLevel());
        SimpleDateFormat dateFormat = new SimpleDateFormat(pattern);
        try {
            startDate = dateFormat.parse(statRecordModel.getStart());
            endDate = dateFormat.parse(statRecordModel.getEnd());
        }
        catch (Exception e) {
            return ResultVo.error((CommonCodeEnum)CommonCodeEnum.STAT_TIME_FORMAT_ERROR, Map.of("valid format", pattern));
        }
        String finalStart = dateFormat.format(startDate);
        String curDate = dateFormat.format(new Date());
        String finalEnd = dateFormat.format(endDate);
        String thirdId = !StringUtils.isEmpty((CharSequence)statRecordModel.getVehicle()) ? statRecordModel.getVehicle() : (!StringUtils.isEmpty((CharSequence)statRecordModel.getWorkTypeId()) ? statRecordModel.getWorkTypeId() : (!StringUtils.isEmpty((CharSequence)statRecordModel.getWorkStationId()) ? statRecordModel.getWorkStationId() : statRecordModel.getTaskLabel()));
        String sortBy = statRecordModel.getSortBy();
        String sort = statRecordModel.getSort();
        if (sortBy == null || sortBy.isEmpty()) {
            sortBy = "time";
        }
        if (sort == null || sort.isEmpty()) {
            sort = "asc";
        }
        Sort orderBy = Sort.by((Sort.Direction)Sort.Direction.fromString((String)sort), (String[])new String[]{sortBy});
        List statRecordVos = this.statService.findStatRecordListByLevelAndTimeRangeAndTypesAndThirdId(statRecordModel.getLevel(), typeList, thirdId, finalStart, finalEnd, statRecordModel.getTimeUnit(), orderBy);
        ArrayList<StatResponseVo> statResponseVoList = new ArrayList<StatResponseVo>();
        if (statRecordVos.size() == 0) {
            for (String type : typeList) {
                StatResponseVo statResponseVo = StatResponseVo.builder().type(type).date(finalStart + "~" + finalEnd).total(BigDecimal.ZERO).average(BigDecimal.ZERO).statRecordVos(statRecordVos).build();
                statResponseVoList.add(statResponseVo);
            }
        } else {
            if (Boolean.TRUE.equals(statRecordModel.getIsVehicleEfficiency())) {
                String statOnWorkTime = this.propConfig.getStatOnWorkTime();
                String statOffWorkTime = this.propConfig.getStatOffWorkTime();
                if (statOnWorkTime == null) {
                    statOnWorkTime = "08:00:00";
                }
                if (statOffWorkTime == null) {
                    statOffWorkTime = "20:00:00";
                }
                LocalTime onWorkTime = LocalTime.parse(statOnWorkTime);
                LocalTime offWorkTime = LocalTime.parse(statOffWorkTime);
                Duration duration = null;
                LocalTime currentTime = LocalTime.now();
                BigDecimal hoursDifference = BigDecimal.ONE;
                if (finalStart.compareTo(curDate) < 0) {
                    duration = Duration.between(onWorkTime, offWorkTime);
                } else if (currentTime.isBefore(offWorkTime) && currentTime.isAfter(onWorkTime)) {
                    duration = Duration.between(onWorkTime, currentTime);
                } else if (currentTime.isAfter(offWorkTime)) {
                    duration = Duration.between(onWorkTime, offWorkTime);
                } else if (currentTime.isBefore(offWorkTime)) {
                    duration = Duration.ZERO;
                }
                hoursDifference = BigDecimal.valueOf(duration.toHours()).add(BigDecimal.valueOf(duration.toMinutesPart()).divide(BigDecimal.valueOf(60L), 2, RoundingMode.CEILING));
                for (StatRecordVo statRecordVo : statRecordVos) {
                    if (duration.equals(Duration.ZERO)) {
                        statRecordVo.setValue(BigDecimal.valueOf(0L));
                        continue;
                    }
                    statRecordVo.setValue(statRecordVo.getValue().divide(hoursDifference, 2, RoundingMode.CEILING));
                }
            }
            for (String type : typeList) {
                List collect = statRecordVos.stream().filter(s -> s.getType().equals(type)).collect(Collectors.toList());
                StatResponseVo statResponseVo = new StatResponseVo();
                if (collect.size() == 0) {
                    statResponseVo = StatResponseVo.builder().type(type).date(finalStart + "~" + finalEnd).total(BigDecimal.ZERO).average(BigDecimal.ZERO).statRecordVos(statRecordVos).build();
                } else {
                    BigDecimal total = collect.stream().filter(s -> s.getType().equals(type)).map(StatRecordVo::getValue).reduce(BigDecimal::add).get();
                    BigDecimal average = total.divide(BigDecimal.valueOf(collect.size()), 2, RoundingMode.CEILING);
                    statResponseVo = StatResponseVo.builder().type(type).date(finalStart + "~" + finalEnd).total(total).average(average).statRecordVos(collect).build();
                }
                statResponseVoList.add(statResponseVo);
            }
        }
        return ResultVo.response(statResponseVoList);
    }

    private ResultVo<Object> getStatDuplicateResultVo(StatRecordReq statRecordModel, List<String> typeList) {
        Date startDate;
        if (this.isLevelInvalid(statRecordModel, StatLevelEnum.values())) {
            return ResultVo.error((CommonCodeEnum)CommonCodeEnum.STAT_LEVEL_REQUIRED, Map.of("valid levels", Arrays.stream(StatLevelEnum.values()).map(Enum::name).collect(Collectors.toList())));
        }
        if (statRecordModel.getStart() == null) {
            return ResultVo.error((CommonCodeEnum)CommonCodeEnum.STAT_TIME_REQUIRED, Map.of("required time", "start"));
        }
        String pattern = StatLevelEnum.getDatePatternByLevelName((String)statRecordModel.getLevel());
        SimpleDateFormat dateFormat = new SimpleDateFormat(pattern);
        try {
            startDate = dateFormat.parse(statRecordModel.getStart());
        }
        catch (Exception e) {
            return ResultVo.error((CommonCodeEnum)CommonCodeEnum.STAT_TIME_FORMAT_ERROR, Map.of("valid format", pattern));
        }
        String finalStart = dateFormat.format(startDate);
        String sortBy = statRecordModel.getSortBy();
        String sort = statRecordModel.getSort();
        if (sortBy == null || sortBy.isEmpty()) {
            sortBy = "time";
        }
        if (sort == null || sort.isEmpty()) {
            sort = "asc";
        }
        Sort orderBy = Sort.by((Sort.Direction)Sort.Direction.fromString((String)sort), (String[])new String[]{sortBy});
        List statRecordVos = this.statDuplicateService.findStatRecordByLevelAndTimeAndTypes(statRecordModel.getLevel(), typeList, finalStart, statRecordModel.getTimeUnit(), orderBy);
        ArrayList<StatResponseDuplicateVo> statResponseVoList = new ArrayList<StatResponseDuplicateVo>();
        if (statRecordVos.size() == 0) {
            for (String type : typeList) {
                StatResponseDuplicateVo statResponseVo = StatResponseDuplicateVo.builder().type(type).date(finalStart).total(BigDecimal.ZERO).average(BigDecimal.ZERO).statRecordVos(statRecordVos).build();
                statResponseVoList.add(statResponseVo);
            }
        } else {
            for (String type : typeList) {
                List collect = statRecordVos.stream().filter(s -> s.getType().equals(type)).collect(Collectors.toList());
                StatResponseDuplicateVo statResponseVo = new StatResponseDuplicateVo();
                if (collect.size() == 0) {
                    statResponseVo = StatResponseDuplicateVo.builder().type(type).date(finalStart).total(BigDecimal.ZERO).average(BigDecimal.ZERO).statRecordVos(statRecordVos).build();
                } else {
                    BigDecimal total = collect.stream().filter(s -> s.getType().equals(type)).map(StatRecordDuplicateVo::getValue).reduce(BigDecimal::add).get();
                    BigDecimal average = total.divide(BigDecimal.valueOf(collect.size()), 2, RoundingMode.CEILING);
                    statResponseVo = StatResponseDuplicateVo.builder().type(type).date(finalStart).total(total).average(average).statRecordVos(collect).build();
                }
                statResponseVoList.add(statResponseVo);
            }
        }
        return ResultVo.response(statResponseVoList);
    }

    private ResultVo<Object> getStatDuplicateTrendResultVo(StatRecordReq statRecordModel, List<String> typeList) {
        Date endDate;
        Date startDate;
        if (this.isLevelInvalid(statRecordModel, StatLevelEnum.values())) {
            return ResultVo.error((CommonCodeEnum)CommonCodeEnum.STAT_LEVEL_REQUIRED, Map.of("valid levels", Arrays.stream(StatLevelEnum.values()).map(Enum::name).collect(Collectors.toList())));
        }
        if (this.isTimeInvalid(statRecordModel)) {
            return ResultVo.error((CommonCodeEnum)CommonCodeEnum.STAT_TIME_REQUIRED, Map.of("required time", "start, end"));
        }
        String pattern = StatLevelEnum.getDatePatternByLevelName((String)statRecordModel.getLevel());
        SimpleDateFormat dateFormat = new SimpleDateFormat(pattern);
        try {
            startDate = dateFormat.parse(statRecordModel.getStart());
            endDate = dateFormat.parse(statRecordModel.getEnd());
        }
        catch (Exception e) {
            return ResultVo.error((CommonCodeEnum)CommonCodeEnum.STAT_TIME_FORMAT_ERROR, Map.of("valid format", pattern));
        }
        String finalStart = dateFormat.format(startDate);
        String finalEnd = dateFormat.format(endDate);
        String thirdId = !StringUtils.isEmpty((CharSequence)statRecordModel.getVehicle()) ? statRecordModel.getVehicle() : (!StringUtils.isEmpty((CharSequence)statRecordModel.getWorkTypeId()) ? statRecordModel.getWorkTypeId() : (!StringUtils.isEmpty((CharSequence)statRecordModel.getWorkStationId()) ? statRecordModel.getWorkStationId() : statRecordModel.getTaskLabel()));
        String sortBy = statRecordModel.getSortBy();
        String sort = statRecordModel.getSort();
        if (sortBy == null || sortBy.isEmpty()) {
            sortBy = "time";
        }
        if (sort == null || sort.isEmpty()) {
            sort = "asc";
        }
        Sort orderBy = Sort.by((Sort.Direction)Sort.Direction.fromString((String)sort), (String[])new String[]{sortBy});
        List statRecordVos = this.statDuplicateService.findStatRecordListByLevelAndTimeRangeAndTypesAndThirdId(statRecordModel.getLevel(), typeList, thirdId, finalStart, finalEnd, statRecordModel.getTimeUnit(), orderBy);
        ArrayList<StatResponseDuplicateVo> statResponseVoList = new ArrayList<StatResponseDuplicateVo>();
        if (statRecordVos.size() == 0) {
            for (String type : typeList) {
                StatResponseDuplicateVo statResponseVo = StatResponseDuplicateVo.builder().type(type).date(finalStart + "~" + finalEnd).total(BigDecimal.ZERO).average(BigDecimal.ZERO).statRecordVos(statRecordVos).build();
                statResponseVoList.add(statResponseVo);
            }
        } else {
            for (String type : typeList) {
                List collect = statRecordVos.stream().filter(s -> s.getType().equals(type)).collect(Collectors.toList());
                StatResponseDuplicateVo statResponseVo = new StatResponseDuplicateVo();
                if (collect.size() == 0) {
                    statResponseVo = StatResponseDuplicateVo.builder().type(type).date(finalStart + "~" + finalEnd).total(BigDecimal.ZERO).average(BigDecimal.ZERO).statRecordVos(statRecordVos).build();
                } else {
                    BigDecimal total = collect.stream().filter(s -> s.getType().equals(type)).map(StatRecordDuplicateVo::getValue).reduce(BigDecimal::add).get();
                    BigDecimal average = total.divide(BigDecimal.valueOf(collect.size()), 2, RoundingMode.CEILING);
                    statResponseVo = StatResponseDuplicateVo.builder().type(type).date(finalStart + "~" + finalEnd).total(total).average(average).statRecordVos(collect).build();
                }
                statResponseVoList.add(statResponseVo);
            }
        }
        return ResultVo.response(statResponseVoList);
    }

    @ApiOperation(value="\u67e5\u8be2 \u5f53\u65e5\u7528\u7535")
    @PostMapping(value={"/stat/vehicleBatteryLevel"})
    @ResponseBody
    public ResultVo<Object> vehicleBatteryLevel(@RequestBody StatRecordReq statRecordReq) {
        List voList;
        String sortBy = statRecordReq.getSortBy();
        String sort = statRecordReq.getSort();
        List list = this.statService.findBatteryLevelRecordsByTime();
        List sortedList = voList = list.stream().map(item -> {
            BatteryLevelVo vo = BatteryLevelVo.builder().batteryLevel(item.getBatteryLevel()).vehicleId(item.getVehicleId()).time(item.getTime()).build();
            return vo;
        }).collect(Collectors.toList());
        if (sortBy == null || sortBy.isEmpty()) {
            sortBy = "time";
        }
        if (sort == null || sort.isEmpty()) {
            sort = "asc";
        }
        if ("thirdId".equals(sortBy)) {
            sortedList = "asc".equals(sort) ? voList.stream().sorted(Comparator.comparing(BatteryLevelVo::getVehicleId)).collect(Collectors.toList()) : voList.stream().sorted(Comparator.comparing(BatteryLevelVo::getVehicleId).reversed()).collect(Collectors.toList());
        } else if ("value".equals(sortBy)) {
            sortedList = "asc".equals(sort) ? voList.stream().sorted(Comparator.comparing(BatteryLevelVo::getBatteryLevel)).collect(Collectors.toList()) : voList.stream().sorted(Comparator.comparing(BatteryLevelVo::getBatteryLevel).reversed()).collect(Collectors.toList());
        }
        return ResultVo.response(sortedList);
    }

    @ApiOperation(value="\u67e5\u8be2 \u5f53\u65e5\u7528\u7535\u8d8b\u52bf")
    @PostMapping(value={"/stat/vehicleBatteryLevelTrend"})
    @ResponseBody
    public ResultVo<Object> vehicleBatteryLevelTrend(@RequestBody StatRecordReq statRecordReq) {
        String startedOn = statRecordReq.getStart() + " 00:00:00";
        String endedOn = statRecordReq.getStart() + " 23:59:59";
        String vehicleId = statRecordReq.getVehicle();
        List list = this.statService.findBatteryLevelRecordByVehicleIdAndTimeRange(vehicleId, startedOn, endedOn);
        List voList = list.stream().map(item -> {
            BatteryLevelVo vo = BatteryLevelVo.builder().batteryLevel(item.getBatteryLevel()).vehicleId(item.getVehicleId()).time(item.getTime()).build();
            return vo;
        }).collect(Collectors.toList());
        return ResultVo.response(voList);
    }

    @ApiOperation(value="\u7edf\u8ba1\u8868-\u5bfc\u51fa")
    @PostMapping(value={"/stat/exportStatRecords"})
    @ResponseBody
    public void exportStatRecords(@RequestBody StatRecordReq statRecordReq, @ApiIgnore HttpServletResponse response) throws Exception {
        StatRecordReq statRecordModel = statRecordReq.withLevel(statRecordReq.getLevel().trim()).withTimeUnit(StringUtils.trimToEmpty((String)statRecordReq.getTimeUnit())).withVehicle(StringUtils.trimToEmpty((String)statRecordReq.getVehicle()));
        List<String> typeList = Arrays.asList(StringUtils.split((String)StringUtils.deleteWhitespace((String)statRecordModel.getTypes()), (String)","));
        List statTypeEnumList = StatTypeEnum.getWindTaskTypeOrStationEnum();
        List stringList = statTypeEnumList.stream().map(Enum::name).collect(Collectors.toList());
        List filterList = typeList.stream().filter(item -> !stringList.contains(item)).collect(Collectors.toList());
        List filterDuplicateList = typeList.stream().filter(item -> stringList.contains(item)).collect(Collectors.toList());
        Long totalCount = this.getStatResultTotal(statRecordModel, filterList);
        Long totalCountDuplicate = this.getStatResultDuplicateTotal(statRecordModel, filterDuplicateList);
        if (totalCount + totalCountDuplicate > 10000L) {
            throw new RuntimeException(this.localeMessageUtil.getMessageMatch("@{response.code.ExportLimit10000Error}", LocaleContextHolder.getLocale()));
        }
        if (totalCount + totalCountDuplicate == 0L) {
            throw new RuntimeException("The exported instance data is 0. Please select another time period to export.");
        }
        Locale locale = LocaleContextHolder.getLocale();
        String fileName = this.localeMessageUtil.getMessage("statRecord.export.fileName", locale);
        ArrayList sheets = new ArrayList();
        if (totalCount != 0L) {
            ResultVo statTrendResultVo = this.getStatTrendResultVo(statRecordModel, filterList);
            List statResponseVoList = (List)statTrendResultVo.getData();
            this.getStatRecordSheets(sheets, statResponseVoList, locale);
        }
        if (totalCountDuplicate != 0L) {
            ResultVo statTrendResultDuplicateVo = this.getStatDuplicateTrendResultVo(statRecordModel, filterDuplicateList);
            List statResponseDuplicateVoList = (List)statTrendResultDuplicateVo.getData();
            this.getStatRecordDuplicateSheets(sheets, statResponseDuplicateVoList, locale);
        }
        ExcelUtil.exportMultipleSheets(sheets, (ExcelType)ExcelType.HSSF, (String)(fileName + ".xlsx"), (HttpServletResponse)response);
    }

    public List<Map<String, Object>> getStatRecordSheets(List<Map<String, Object>> sheets, List<StatResponseVo> statResponseVoList, Locale locale) throws Exception {
        for (StatResponseVo statResponseVo : statResponseVoList) {
            ExcelHeaderLangUtils.chooseLang(StatRecordExVo.class, (Locale)locale);
            ArrayList<StatRecordExVo> resultList = new ArrayList<StatRecordExVo>(statResponseVo.getStatRecordVos().size());
            for (StatRecordVo vo : statResponseVo.getStatRecordVos()) {
                StatRecordExVo builder = StatRecordExVo.builder().thirdId((String)StringUtils.defaultIfEmpty((CharSequence)vo.getId(), (CharSequence)"all")).time(vo.getTime()).level(vo.getLevel()).value(vo.getValue()).build();
                resultList.add(builder);
            }
            ExportParams params = new ExportParams();
            String sheet = this.localeMessageUtil.getMessage("statRecord.export." + statResponseVo.getType(), locale);
            params.setSheetName(sheet);
            HashMap<String, Object> map = new HashMap<String, Object>();
            map.put("title", params);
            map.put("entity", StatRecordExVo.class);
            map.put("data", resultList);
            sheets.add(map);
        }
        return sheets;
    }

    public List<Map<String, Object>> getStatRecordDuplicateSheets(List<Map<String, Object>> sheets, List<StatResponseDuplicateVo> statResponseDuplicateVoList, Locale locale) throws Exception {
        for (StatResponseDuplicateVo statResponseDuplicateVo : statResponseDuplicateVoList) {
            ExcelHeaderLangUtils.chooseLang(StatRecordExVo.class, (Locale)locale);
            ArrayList<StatRecordExVo> resultList = new ArrayList<StatRecordExVo>(statResponseDuplicateVo.getStatRecordVos().size());
            for (StatRecordDuplicateVo vo : statResponseDuplicateVo.getStatRecordVos()) {
                StatRecordExVo builder = StatRecordExVo.builder().thirdId((String)StringUtils.defaultIfEmpty((CharSequence)vo.getId(), (CharSequence)"all")).time(vo.getTime()).level(vo.getLevel()).value(vo.getValue()).build();
                resultList.add(builder);
            }
            ExportParams params = new ExportParams();
            String sheet = this.localeMessageUtil.getMessage("statRecord.export." + statResponseDuplicateVo.getType(), locale);
            params.setSheetName(sheet);
            HashMap<String, Object> map = new HashMap<String, Object>();
            map.put("title", params);
            map.put("entity", StatRecordExVo.class);
            map.put("data", resultList);
            sheets.add(map);
        }
        return sheets;
    }

    private Long getStatResultTotal(StatRecordReq statRecordModel, List<String> typeList) {
        Date endDate;
        Date startDate;
        String pattern = StatLevelEnum.getDatePatternByLevelName((String)statRecordModel.getLevel());
        SimpleDateFormat dateFormat = new SimpleDateFormat(pattern);
        try {
            startDate = dateFormat.parse(statRecordModel.getStart());
            endDate = dateFormat.parse(statRecordModel.getEnd());
        }
        catch (Exception e) {
            throw new Exception(String.valueOf(CommonCodeEnum.STAT_TIME_FORMAT_ERROR));
        }
        String finalStart = dateFormat.format(startDate);
        String finalEnd = dateFormat.format(endDate);
        Long count = this.statService.findTotalByLevelAndTypeAndTimeRange(statRecordModel.getLevel(), typeList, finalStart, finalEnd);
        return count;
    }

    private Long getStatResultDuplicateTotal(StatRecordReq statRecordModel, List<String> typeList) {
        Date endDate;
        Date startDate;
        String pattern = StatLevelEnum.getDatePatternByLevelName((String)statRecordModel.getLevel());
        SimpleDateFormat dateFormat = new SimpleDateFormat(pattern);
        try {
            startDate = dateFormat.parse(statRecordModel.getStart());
            endDate = dateFormat.parse(statRecordModel.getEnd());
        }
        catch (Exception e) {
            throw new Exception(String.valueOf(CommonCodeEnum.STAT_TIME_FORMAT_ERROR));
        }
        String finalStart = dateFormat.format(startDate);
        String finalEnd = dateFormat.format(endDate);
        Long count = this.statDuplicateService.findTotalByLevelAndTypeAndTimeRange(statRecordModel.getLevel(), typeList, finalStart, finalEnd);
        return count;
    }

    @ApiOperation(value="\u5220\u9664RobotItem\u53caRobotStatusRecord\u4e2d\u673a\u5668\u4eba\u8bb0\u5f55")
    @PostMapping(value={"/stat/deleteRobotByUuidIsIn"})
    @ResponseBody
    public ResultVo<Object> deleteRobotByUuidIsIn(@RequestBody List<String> uuids) {
        return ResultVo.response((Object)this.statService.deleteRobotByUuidIsIn(uuids));
    }

    @ApiOperation(value="\u67e5\u8be2\u673a\u5668\u4eba\u8f7d\u8d27\u65f6\u95f4")
    @GetMapping(value={"/stat/agvLoadedTime"})
    @ResponseBody
    public ResultVo<Object> agvLoadedTime(@RequestParam(required=false) String agvId, @RequestParam String start, @RequestParam String end) {
        try {
            Date startDate = DateUtils.parseDate((String)(start + " 00:00:00"), (String[])new String[]{"yyyy-MM-dd HH:mm:ss"});
            Date endDate = DateUtils.parseDate((String)(end + " 23:59:59"), (String[])new String[]{"yyyy-MM-dd HH:mm:ss"});
            return ResultVo.response((Object)this.statService.getAgvLoadedTime(agvId, startDate, endDate));
        }
        catch (ParseException e) {
            return ResultVo.error((CommonCodeEnum)CommonCodeEnum.STAT_TIME_FORMAT_ERROR);
        }
    }

    @ApiOperation(value="\u67e5\u8be2\u673a\u5668\u4eba\u8f7d\u8d27\u65f6\u95f4")
    @GetMapping(value={"/stat/findUUid"})
    @ResponseBody
    public ResultVo<Object> findUUid() {
        return ResultVo.response((Object)this.statService.findRobotItemUuid());
    }
}

