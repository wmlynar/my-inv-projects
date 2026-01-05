/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.alibaba.fastjson.JSONObject
 *  com.google.common.collect.Maps
 *  com.seer.rds.config.configview.CommonConfig
 *  com.seer.rds.config.configview.operator.DemandTaskFunc
 *  com.seer.rds.config.configview.operator.EasyOrder
 *  com.seer.rds.config.configview.operator.ExpandColContent
 *  com.seer.rds.config.configview.operator.OperatorConfig
 *  com.seer.rds.config.configview.operator.OperatorShowSql
 *  com.seer.rds.config.configview.operator.OperatorTableExpandCols
 *  com.seer.rds.config.configview.operator.Visibility
 *  com.seer.rds.constant.CommonCodeEnum
 *  com.seer.rds.constant.DistributeEnum
 *  com.seer.rds.constant.TaskStatusEnum
 *  com.seer.rds.dao.DistributePointRecordMapper
 *  com.seer.rds.dao.DistributeRecordMapper
 *  com.seer.rds.dao.WindTaskRecordMapper
 *  com.seer.rds.model.distribute.DistributePointRecord
 *  com.seer.rds.model.distribute.DistributeRecord
 *  com.seer.rds.model.wind.WindDemandAttr
 *  com.seer.rds.model.wind.WindDemandTask
 *  com.seer.rds.model.wind.WindTaskRecord
 *  com.seer.rds.runnable.EasyOrderRunnable
 *  com.seer.rds.script.ScriptService
 *  com.seer.rds.service.agv.AgvApiService
 *  com.seer.rds.service.operator.OperatorService
 *  com.seer.rds.util.LocaleMessageUtil
 *  com.seer.rds.util.SpringUtil
 *  com.seer.rds.util.server.DateUtils
 *  com.seer.rds.vo.ResultVo
 *  com.seer.rds.vo.StopAllTaskReq$StopTask
 *  com.seer.rds.vo.req.AttrFieldsDeleteReq
 *  com.seer.rds.vo.req.BatchStopTaskReq
 *  com.seer.rds.vo.req.DemandSaveParam
 *  com.seer.rds.vo.req.DemandTypeReq
 *  com.seer.rds.vo.req.DemandUpdateParam
 *  com.seer.rds.vo.req.DemandWorkTypes
 *  com.seer.rds.vo.req.DistributeReq
 *  com.seer.rds.vo.req.EasyOrderReq
 *  com.seer.rds.vo.req.EasyOrdersReq
 *  com.seer.rds.vo.req.LockDemandParam
 *  com.seer.rds.vo.req.OperatorTableExpandReq
 *  com.seer.rds.vo.req.PaginationReq
 *  com.seer.rds.vo.req.QueryDemandContentParam
 *  com.seer.rds.vo.req.SetOrderReq
 *  com.seer.rds.vo.req.ShowTableReq
 *  com.seer.rds.vo.response.DemandContentVo
 *  com.seer.rds.vo.response.DemandListTypeVo
 *  com.seer.rds.vo.response.DemandListVo
 *  com.seer.rds.vo.response.PaginationResponseVo
 *  com.seer.rds.vo.response.UnFinishedDemandVo
 *  com.seer.rds.web.agv.AgvWindController
 *  com.seer.rds.web.config.ConfigFileController
 *  com.seer.rds.web.config.OperatorController
 *  com.seer.rds.web.config.OperatorController$1DistributeRecordTmp
 *  io.swagger.annotations.Api
 *  io.swagger.annotations.ApiOperation
 *  javax.annotation.PostConstruct
 *  javax.servlet.http.HttpServletRequest
 *  javax.servlet.http.HttpServletResponse
 *  org.apache.commons.collections.CollectionUtils
 *  org.apache.commons.lang3.StringUtils
 *  org.slf4j.Logger
 *  org.slf4j.LoggerFactory
 *  org.springframework.beans.factory.annotation.Autowired
 *  org.springframework.data.domain.Sort
 *  org.springframework.data.domain.Sort$Direction
 *  org.springframework.data.domain.Sort$Order
 *  org.springframework.http.HttpStatus
 *  org.springframework.stereotype.Controller
 *  org.springframework.web.bind.annotation.GetMapping
 *  org.springframework.web.bind.annotation.PathVariable
 *  org.springframework.web.bind.annotation.PostMapping
 *  org.springframework.web.bind.annotation.RequestBody
 *  org.springframework.web.bind.annotation.RequestMapping
 *  org.springframework.web.bind.annotation.RequestParam
 *  org.springframework.web.bind.annotation.ResponseBody
 *  springfox.documentation.annotations.ApiIgnore
 */
package com.seer.rds.web.config;

import com.alibaba.fastjson.JSONObject;
import com.google.common.collect.Maps;
import com.seer.rds.config.configview.CommonConfig;
import com.seer.rds.config.configview.operator.DemandTaskFunc;
import com.seer.rds.config.configview.operator.EasyOrder;
import com.seer.rds.config.configview.operator.ExpandColContent;
import com.seer.rds.config.configview.operator.OperatorConfig;
import com.seer.rds.config.configview.operator.OperatorShowSql;
import com.seer.rds.config.configview.operator.OperatorTableExpandCols;
import com.seer.rds.config.configview.operator.Visibility;
import com.seer.rds.constant.CommonCodeEnum;
import com.seer.rds.constant.DistributeEnum;
import com.seer.rds.constant.TaskStatusEnum;
import com.seer.rds.dao.DistributePointRecordMapper;
import com.seer.rds.dao.DistributeRecordMapper;
import com.seer.rds.dao.WindTaskRecordMapper;
import com.seer.rds.model.distribute.DistributePointRecord;
import com.seer.rds.model.distribute.DistributeRecord;
import com.seer.rds.model.wind.WindDemandAttr;
import com.seer.rds.model.wind.WindDemandTask;
import com.seer.rds.model.wind.WindTaskRecord;
import com.seer.rds.runnable.EasyOrderRunnable;
import com.seer.rds.script.ScriptService;
import com.seer.rds.service.agv.AgvApiService;
import com.seer.rds.service.operator.OperatorService;
import com.seer.rds.util.LocaleMessageUtil;
import com.seer.rds.util.SpringUtil;
import com.seer.rds.util.server.DateUtils;
import com.seer.rds.vo.ResultVo;
import com.seer.rds.vo.StopAllTaskReq;
import com.seer.rds.vo.req.AttrFieldsDeleteReq;
import com.seer.rds.vo.req.BatchStopTaskReq;
import com.seer.rds.vo.req.DemandSaveParam;
import com.seer.rds.vo.req.DemandTypeReq;
import com.seer.rds.vo.req.DemandUpdateParam;
import com.seer.rds.vo.req.DemandWorkTypes;
import com.seer.rds.vo.req.DistributeReq;
import com.seer.rds.vo.req.EasyOrderReq;
import com.seer.rds.vo.req.EasyOrdersReq;
import com.seer.rds.vo.req.LockDemandParam;
import com.seer.rds.vo.req.OperatorTableExpandReq;
import com.seer.rds.vo.req.PaginationReq;
import com.seer.rds.vo.req.QueryDemandContentParam;
import com.seer.rds.vo.req.SetOrderReq;
import com.seer.rds.vo.req.ShowTableReq;
import com.seer.rds.vo.response.DemandContentVo;
import com.seer.rds.vo.response.DemandListTypeVo;
import com.seer.rds.vo.response.DemandListVo;
import com.seer.rds.vo.response.PaginationResponseVo;
import com.seer.rds.vo.response.UnFinishedDemandVo;
import com.seer.rds.web.agv.AgvWindController;
import com.seer.rds.web.config.ConfigFileController;
import com.seer.rds.web.config.OperatorController;
import io.swagger.annotations.Api;
import io.swagger.annotations.ApiOperation;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Comparator;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.stream.Collectors;
import javax.annotation.PostConstruct;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import org.apache.commons.collections.CollectionUtils;
import org.apache.commons.lang3.StringUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseBody;
import springfox.documentation.annotations.ApiIgnore;

@Controller
@RequestMapping(value={"/api/l2-operator", "/api/operator"})
@Api(tags={"\u624b\u6301\u7aef"})
public class OperatorController {
    private static final Logger log = LoggerFactory.getLogger(OperatorController.class);
    @Autowired
    private OperatorService operatorService;
    @Autowired
    private AgvApiService agvApiService;
    @Autowired
    private LocaleMessageUtil localeMessageUtil;
    @Autowired
    private ScriptService scriptService;
    @Autowired
    private ConfigFileController configFileController;
    @Autowired
    private DistributeRecordMapper distributeRecordMapper;
    @Autowired
    private DistributePointRecordMapper distributePointRecordMapper;
    @Autowired
    private WindTaskRecordMapper windTaskRecordMapper;

    @PostConstruct
    private void initDemandExtensionFields() {
        try {
            List processFuncList;
            if (this.checkDemand().booleanValue() && ((DemandTaskFunc)(processFuncList = ConfigFileController.commonConfig.getOperator().getDemandTask().getProcessFuncList()).get(0)).getExtensionFields() != null) {
                ArrayList<WindDemandAttr> list = new ArrayList<WindDemandAttr>();
                for (DemandTaskFunc demandTaskFunc : processFuncList) {
                    String defLabel = demandTaskFunc.getDefLabel();
                    List extensionFields = demandTaskFunc.getExtensionFields();
                    for (WindDemandAttr extensionField : extensionFields) {
                        WindDemandAttr windDemandAttr = new WindDemandAttr();
                        windDemandAttr.setId(extensionField.getId());
                        windDemandAttr.setDefLabel(defLabel);
                        windDemandAttr.setId(extensionField.getId());
                        windDemandAttr.setAttributeName(extensionField.getAttributeName());
                        list.add(windDemandAttr);
                    }
                }
                List allDemandExtFields = this.operatorService.findAllDemandExtFields();
                if (CollectionUtils.isEmpty((Collection)allDemandExtFields)) {
                    this.operatorService.saveOrUpdateDemandExtFields(list);
                } else {
                    list.removeAll(allDemandExtFields);
                    if (CollectionUtils.isNotEmpty(list)) {
                        this.operatorService.saveOrUpdateDemandExtFields(list);
                    }
                }
            }
        }
        catch (Exception e) {
            log.error("Demand extension field initialization failed, please check the configuration file." + e.getMessage());
        }
    }

    @ApiOperation(value="\u8bfb\u53d6\u624b\u6301\u7aef\u914d\u7f6e")
    @GetMapping(value={"/config"})
    @ResponseBody
    public ResultVo<OperatorConfig> config() {
        ResultVo resp = new ResultVo();
        OperatorConfig operatorConfig = ConfigFileController.commonConfig.getOperator();
        resp.setData((Object)operatorConfig);
        return resp;
    }

    @ApiOperation(value="\u8bfb\u53d6\u9700\u6c42\u5355\u5217\u8868")
    @PostMapping(value={"/demandList"})
    @ResponseBody
    public ResultVo<DemandListVo> demandList(@RequestBody DemandWorkTypes demandWorkTypes) throws Exception {
        if (StringUtils.isEmpty((CharSequence)demandWorkTypes.getUserName())) {
            throw new Exception("\u7528\u6237\u540d\u53c2\u6570\u7f3a\u5931");
        }
        ResultVo resp = new ResultVo();
        DemandListVo demandList = this.operatorService.getDemandList(demandWorkTypes);
        resp.setData((Object)demandList);
        return resp;
    }

    @ApiOperation(value="\u9501\u5b9a\u9700\u6c42\u5355")
    @PostMapping(value={"/lockDemand"})
    @ResponseBody
    public ResultVo<Object> lockDemand(@RequestBody LockDemandParam lockDemandParam) throws Exception {
        if (StringUtils.isEmpty((CharSequence)lockDemandParam.getDemandId())) {
            throw new Exception("id\u53c2\u6570\u7f3a\u5931");
        }
        if (StringUtils.isEmpty((CharSequence)lockDemandParam.getUserName())) {
            throw new Exception("\u7528\u6237\u540d\u53c2\u6570\u7f3a\u5931");
        }
        int lockDemandResult = this.operatorService.lockDemand(lockDemandParam.getDemandId(), lockDemandParam.getUserName(), lockDemandParam.getJobNumber());
        if (lockDemandResult == 1) {
            return ResultVo.success();
        }
        return ResultVo.error((CommonCodeEnum)CommonCodeEnum.DEMAND_TASK_DISPATCHED);
    }

    @ApiOperation(value="\u67e5\u8be2\u9700\u6c42\u8be6\u60c5")
    @PostMapping(value={"/getDetail"})
    @ResponseBody
    public ResultVo<DemandContentVo> getContent(@RequestBody QueryDemandContentParam queryDemandContentParam) throws Exception {
        ResultVo resp = new ResultVo();
        if (StringUtils.isEmpty((CharSequence)queryDemandContentParam.getDemandId())) {
            throw new Exception("id\u53c2\u6570\u7f3a\u5931");
        }
        DemandContentVo detail = this.operatorService.getDemandContent(queryDemandContentParam.getDemandId());
        resp.setData((Object)detail);
        return resp;
    }

    @ApiOperation(value="\u66f4\u65b0\u9700\u6c42\u5355\u72b6\u6001")
    @PostMapping(value={"/updateStatus"})
    @ResponseBody
    public ResultVo<Object> updateStatus(@RequestBody DemandUpdateParam demandUpdateParam) throws Exception {
        if (StringUtils.isEmpty((CharSequence)demandUpdateParam.getDemandId())) {
            throw new Exception("id\u53c2\u6570\u7f3a\u5931");
        }
        if (demandUpdateParam.getStatus() == null) {
            throw new Exception("status\u53c2\u6570\u7f3a\u5931");
        }
        int result = this.operatorService.updateStatus(demandUpdateParam.getDemandId(), demandUpdateParam.getStatus());
        if (result == 1) {
            return ResultVo.success();
        }
        return ResultVo.error((CommonCodeEnum)CommonCodeEnum.DEMAND_TASK_UPDATE_ERROR);
    }

    @ApiOperation(value="\u4fdd\u5b58\u8865\u5145\u9700\u6c42")
    @PostMapping(value={"/saveSupplementDetail"})
    @ResponseBody
    public ResultVo<Object> saveSupplementDetail(@RequestBody(required=false) DemandSaveParam demandSaveParam) throws Exception {
        ResultVo result = new ResultVo();
        try {
            this.operatorService.saveSupplementDetail(demandSaveParam.getDemandId(), demandSaveParam.getSupplementContent());
        }
        catch (Exception e) {
            if (e.getMessage().contains("ScritpExcetion") || e.getMessage().contains("ScriptException")) {
                result.setCode(Integer.valueOf(HttpStatus.BAD_REQUEST.value()));
                String msg = e.getMessage().replace("ScritpExcetion: ", "");
                msg = msg.replace("ScriptException: ", "");
                result.setMsg(msg);
            }
            throw e;
        }
        return result;
    }

    @ApiOperation(value="\u83b7\u53d6\u624b\u6301\u7aef\u672a\u5b8c\u6210\u9700\u6c42\u5355\u5217\u8868")
    @PostMapping(value={"/getUnFinishedDemandList"})
    @ResponseBody
    public ResultVo<Object> getUnFinishedDemandList() {
        List windDemandTasks = this.operatorService.getAllUnFinishedDemands();
        ArrayList<UnFinishedDemandVo> demandVoList = new ArrayList<UnFinishedDemandVo>();
        SimpleDateFormat simpleDateFormat = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss");
        for (WindDemandTask windDemandTask : windDemandTasks) {
            UnFinishedDemandVo publicDemandVo = new UnFinishedDemandVo();
            publicDemandVo.setDefLabel(windDemandTask.getDefLabel());
            publicDemandVo.setDescription(windDemandTask.getDescription());
            publicDemandVo.setCreatedOn(simpleDateFormat.format(windDemandTask.getCreatedOn()));
            publicDemandVo.setId(windDemandTask.getId());
            demandVoList.add(publicDemandVo);
        }
        return ResultVo.response(demandVoList);
    }

    /*
     * Exception decompiling
     */
    @ApiOperation(value="\u624b\u6301\u7aef\u6267\u884csql\u67e5\u8be2")
    @PostMapping(value={"/showTable"})
    @ResponseBody
    public ResultVo<Object> showTable(@RequestBody PaginationReq<ShowTableReq> showTableReq) throws Exception {
        /*
         * This method has failed to decompile.  When submitting a bug report, please provide this stack trace, and (if you hold appropriate legal rights) the relevant class file.
         * 
         * org.benf.cfr.reader.util.ConfusedCFRException: Tried to end blocks [3[CATCHBLOCK]], but top level block is 2[TRYBLOCK]
         *     at org.benf.cfr.reader.bytecode.analysis.opgraph.Op04StructuredStatement.processEndingBlocks(Op04StructuredStatement.java:435)
         *     at org.benf.cfr.reader.bytecode.analysis.opgraph.Op04StructuredStatement.buildNestedBlocks(Op04StructuredStatement.java:484)
         *     at org.benf.cfr.reader.bytecode.analysis.opgraph.Op03SimpleStatement.createInitialStructuredBlock(Op03SimpleStatement.java:736)
         *     at org.benf.cfr.reader.bytecode.CodeAnalyser.getAnalysisInner(CodeAnalyser.java:850)
         *     at org.benf.cfr.reader.bytecode.CodeAnalyser.getAnalysisOrWrapFail(CodeAnalyser.java:278)
         *     at org.benf.cfr.reader.bytecode.CodeAnalyser.getAnalysis(CodeAnalyser.java:201)
         *     at org.benf.cfr.reader.entities.attributes.AttributeCode.analyse(AttributeCode.java:94)
         *     at org.benf.cfr.reader.entities.Method.analyse(Method.java:531)
         *     at org.benf.cfr.reader.entities.ClassFile.analyseMid(ClassFile.java:1055)
         *     at org.benf.cfr.reader.entities.ClassFile.analyseTop(ClassFile.java:942)
         *     at org.benf.cfr.reader.Driver.doJarVersionTypes(Driver.java:257)
         *     at org.benf.cfr.reader.Driver.doJar(Driver.java:139)
         *     at org.benf.cfr.reader.CfrDriverImpl.analyse(CfrDriverImpl.java:76)
         *     at org.benf.cfr.reader.Main.main(Main.java:54)
         */
        throw new IllegalStateException("Decompilation failed");
    }

    @Deprecated
    @PostMapping(value={"/easyOrderCallBack"})
    @ResponseBody
    public ResultVo<Object> easyOrderCallBack(@RequestBody EasyOrdersReq easyOrdersReq) throws Exception {
        log.info("easyOrdersReq requestParmas {}", (Object)easyOrdersReq);
        ResultVo result = new ResultVo();
        try {
            if (easyOrdersReq.getTaskLabels().isEmpty()) {
                result.setCode(Integer.valueOf(HttpStatus.BAD_REQUEST.value()));
                result.setMsg("easyOrders request cannot is empty!");
                return result;
            }
            List easyOrderRes = this.operatorService.easyOrderCallBack(easyOrdersReq.getTaskLabels());
            return ResultVo.response((Object)easyOrderRes);
        }
        catch (Exception e) {
            log.error("easyOrdersReq Error!, {}", (Throwable)e);
            result.setCode(Integer.valueOf(HttpStatus.BAD_REQUEST.value()));
            result.setMsg("easyOrders Error!");
            return result;
        }
    }

    @Deprecated
    @GetMapping(value={"/easyOrder/{taskLabel}"})
    @ResponseBody
    public ResultVo<Object> easyOrder(@PathVariable String taskLabel) throws Exception {
        log.info("easyOrder requestParmas {}", (Object)taskLabel);
        ResultVo result = new ResultVo();
        try {
            if (StringUtils.isEmpty((CharSequence)taskLabel)) {
                result.setCode(Integer.valueOf(HttpStatus.BAD_REQUEST.value()));
                result.setMsg("easyOrder request cannot is empty!");
                return result;
            }
            SetOrderReq sor = new SetOrderReq();
            sor.setTaskLabel(taskLabel);
            ResultVo resultVo = this.agvApiService.asyncSetOrder(sor);
            return resultVo;
        }
        catch (Exception e) {
            log.error("easyOrdersReq Error!, {}", (Throwable)e);
            result.setCode(Integer.valueOf(-1));
            result.setMsg("easyOrders Error!");
            return result;
        }
    }

    @ApiOperation(value="\u624b\u6301\u7aef\u5feb\u6377\u4e0b\u5355\u7684\u4e0b\u5355")
    @PostMapping(value={"/easyOrder/menuId"})
    @ResponseBody
    public ResultVo<Object> easyOrderMenuId(@RequestBody EasyOrderReq easyOrderReq) {
        log.info("easyOrderMenuId requestParams {}", (Object)easyOrderReq);
        ResultVo result = new ResultVo();
        CommonConfig commonConfig = ConfigFileController.commonConfig;
        try {
            if (StringUtils.isEmpty((CharSequence)easyOrderReq.getMenuId())) {
                result.setCode(Integer.valueOf(HttpStatus.BAD_REQUEST.value()));
                result.setMsg("easyOrder menuId request cannot is empty!");
                return result;
            }
            if (commonConfig != null && commonConfig.getOperator() != null && commonConfig.getOperator().getEasyOrders() != null) {
                if (commonConfig.getOperator().getEasyOrders().getEnable().booleanValue()) {
                    List collect = commonConfig.getOperator().getEasyOrders().getEasyOrder().stream().filter(it -> it.getMenuId().equals(easyOrderReq.getMenuId())).collect(Collectors.toList());
                    if (collect.size() == 1) {
                        if (((EasyOrder)collect.get(0)).getOrderExecute() == null && StringUtils.isNotEmpty((CharSequence)((EasyOrder)collect.get(0)).getTaskLabel())) {
                            this.operatorService.easyOrderPutCache((EasyOrder)collect.get(0), "From easyOrderMenuId taskLabel");
                            if ((Integer)EasyOrderRunnable.easyOrderMap.get(((EasyOrder)collect.get(0)).getMenuId()) == 0) {
                                SetOrderReq sor = new SetOrderReq();
                                sor.setCallWorkStation(easyOrderReq.getCallWorkStation());
                                sor.setCallWorkType(easyOrderReq.getCallWorkType());
                                sor.setTaskLabel(((EasyOrder)collect.get(0)).getTaskLabel());
                                ResultVo resultVo = this.agvApiService.asyncSetOrder(sor);
                                if (resultVo.getCode() == -1) {
                                    resultVo.setCode(Integer.valueOf(HttpStatus.BAD_REQUEST.value()));
                                }
                                if (resultVo.getCode() != -1) {
                                    EasyOrderRunnable.easyOrderMap.put(easyOrderReq.getMenuId(), 1);
                                }
                                return resultVo;
                            }
                            result.setCode(Integer.valueOf(HttpStatus.BAD_REQUEST.value()));
                            result.setMsg((Integer)EasyOrderRunnable.easyOrderMap.get(easyOrderReq.getMenuId()) == 1 ? "Task Repeat" : "Config Or JS function Error");
                            return result;
                        }
                        ResultVo jsResult = this.operatorService.easyOrderSetOrderByMenuId((EasyOrder)collect.get(0), easyOrderReq.getParams() == null ? "" : JSONObject.toJSONString((Object)easyOrderReq.getParams()));
                        if (jsResult != null) {
                            if (jsResult.getCode().intValue() == CommonCodeEnum.SUCCESS.getCode().intValue()) {
                                EasyOrderRunnable.easyOrderMap.put(easyOrderReq.getMenuId(), 1);
                            }
                            return jsResult;
                        }
                        result.setCode(Integer.valueOf(HttpStatus.BAD_REQUEST.value()));
                        result.setMsg((Integer)EasyOrderRunnable.easyOrderMap.get(easyOrderReq.getMenuId()) == 1 ? "Task Repeat" : "Config Or JS function Error");
                        return result;
                    }
                    result.setCode(Integer.valueOf(HttpStatus.BAD_REQUEST.value()));
                    result.setMsg(easyOrderReq.getMenuId() + "Repeated or non-existent");
                } else {
                    result.setCode(Integer.valueOf(HttpStatus.BAD_REQUEST.value()));
                    result.setMsg("please open easyOrders");
                }
                return result;
            }
            result.setCode(Integer.valueOf(HttpStatus.BAD_REQUEST.value()));
            result.setMsg("no easyOrder config");
            return result;
        }
        catch (Exception e) {
            log.error("easyOrdersReq Error!, {}", (Throwable)e);
            result.setCode(Integer.valueOf(HttpStatus.BAD_REQUEST.value()));
            result.setMsg("easyOrders Error!");
            return result;
        }
    }

    @ApiOperation(value="\u624b\u6301\u7aef\u5feb\u6377\u4e0b\u5355\u7684\u56de\u8c03\u65b9\u6cd5")
    @PostMapping(value={"/easyOrder/batchCallBack"})
    @ResponseBody
    public ResultVo<Object> easyOrderBatchCallBack(@RequestBody List<EasyOrderReq> req) {
        log.info("easyOrdersReq easyOrderBatchCallBack {}", req);
        ResultVo result = new ResultVo();
        try {
            CommonConfig commonConfig = ConfigFileController.commonConfig;
            ArrayList<HashMap> dataList = new ArrayList<HashMap>();
            if (CollectionUtils.isEmpty(req)) {
                result.setCode(Integer.valueOf(HttpStatus.BAD_REQUEST.value()));
                result.setMsg("request params empty!");
                return result;
            }
            if (commonConfig != null && commonConfig.getOperator() != null && commonConfig.getOperator().getEasyOrders() != null) {
                if (commonConfig.getOperator().getEasyOrders().getEnable().booleanValue()) {
                    for (EasyOrderReq easyOrderReq : req) {
                        HashMap data = Maps.newHashMap();
                        List collect = commonConfig.getOperator().getEasyOrders().getEasyOrder().stream().filter(it -> it.getMenuId().equals(easyOrderReq.getMenuId())).collect(Collectors.toList());
                        if (collect.size() == 1) {
                            Integer cache = (Integer)EasyOrderRunnable.easyOrderMap.get(easyOrderReq.getMenuId());
                            if (cache == null) {
                                try {
                                    this.operatorService.easyOrderPutCache((EasyOrder)collect.get(0), "From easyOrderBatchCallBack");
                                }
                                catch (Exception e) {
                                    data.put(easyOrderReq.getMenuId(), 3);
                                    log.error("easyOrderBatchCallBack one menuId = {} Error = {}", (Object)easyOrderReq.getMenuId(), (Object)e);
                                }
                            }
                            data.put(easyOrderReq.getMenuId(), (Integer)EasyOrderRunnable.easyOrderMap.get(easyOrderReq.getMenuId()));
                        } else {
                            data.put(easyOrderReq.getMenuId(), 3);
                        }
                        dataList.add(data);
                    }
                    result.setData(dataList);
                } else {
                    result.setCode(Integer.valueOf(HttpStatus.BAD_REQUEST.value()));
                    result.setMsg("please open easyOrders");
                }
                return result;
            }
            result.setCode(Integer.valueOf(HttpStatus.BAD_REQUEST.value()));
            result.setMsg("no easyOrder config");
            return result;
        }
        catch (Exception e) {
            log.error("easyOrdersReq Error!, {}", (Throwable)e);
            result.setCode(Integer.valueOf(HttpStatus.BAD_REQUEST.value()));
            result.setMsg("easyOrders Error!");
            return result;
        }
    }

    @GetMapping(value={"/easyOrder/cachePrint"})
    @ResponseBody
    public ResultVo<Object> cachePrint() {
        log.info("CachePrint cachePrint {}", (Object)EasyOrderRunnable.easyOrderMap);
        ResultVo result = new ResultVo();
        try {
            result.setData((Object)EasyOrderRunnable.easyOrderMap);
            return result;
        }
        catch (Exception e) {
            result.setCode(Integer.valueOf(HttpStatus.BAD_REQUEST.value()));
            result.setMsg("error");
            return result;
        }
    }

    @ApiOperation(value="\u83b7\u53d6\u9700\u6c42\u5355\u7c7b\u578b(\u6587\u4ef6\u5939)")
    @PostMapping(value={"/getDemandType"})
    @ResponseBody
    public ResultVo<Object> getDemandType(@RequestBody DemandTypeReq demandTypeReq) {
        ArrayList list = new ArrayList();
        if (!this.checkDemand().booleanValue()) {
            return ResultVo.response(list);
        }
        List processFuncList = ConfigFileController.commonConfig.getOperator().getDemandTask().getProcessFuncList();
        processFuncList.stream().forEach(it -> {
            HashMap tmp = Maps.newHashMap();
            if (CollectionUtils.isNotEmpty((Collection)it.getWorkStations()) && CollectionUtils.isNotEmpty((Collection)it.getWorkTypes()) && it.getWorkStations().contains(demandTypeReq.getWorkStation()) && it.getWorkTypes().contains(demandTypeReq.getWorkType()) || CollectionUtils.isEmpty((Collection)it.getWorkStations()) && CollectionUtils.isNotEmpty((Collection)it.getWorkTypes()) && it.getWorkTypes().contains(demandTypeReq.getWorkType()) || CollectionUtils.isNotEmpty((Collection)it.getWorkStations()) && CollectionUtils.isEmpty((Collection)it.getWorkTypes()) && it.getWorkStations().contains(demandTypeReq.getWorkStation()) || CollectionUtils.isEmpty((Collection)it.getWorkStations()) && CollectionUtils.isEmpty((Collection)it.getWorkTypes())) {
                tmp.put("label", StringUtils.isEmpty((CharSequence)it.getTypeLabel()) ? it.getDefLabel() : it.getTypeLabel());
                tmp.put("value", StringUtils.isEmpty((CharSequence)it.getDefLabel()) ? "" : it.getDefLabel());
                if (!list.contains(tmp)) {
                    list.add(tmp);
                }
            }
        });
        return ResultVo.response(list);
    }

    @ApiOperation(value="\u5206\u9875\u67e5\u8be2\u9700\u6c42\u5355")
    @PostMapping(value={"/queryPageDemand"})
    @ResponseBody
    public ResultVo<Object> queryPageDemand(@RequestBody PaginationReq<DemandTypeReq> req) {
        ArrayList list = new ArrayList();
        PaginationResponseVo paginationResponseVo = new PaginationResponseVo();
        paginationResponseVo.setPageList(list);
        paginationResponseVo.setPageSize(Integer.valueOf(req.getPageSize()));
        paginationResponseVo.setCurrentPage(Integer.valueOf(0));
        paginationResponseVo.setTotalPage(Integer.valueOf(0));
        paginationResponseVo.setTotalCount(Long.valueOf(0L));
        if (!this.checkDemand().booleanValue()) {
            return ResultVo.response((Object)paginationResponseVo);
        }
        if (req.getCurrentPage() == 0 || req.getPageSize() <= 0) {
            log.info("error page size or currentpage params = {}", req);
            return ResultVo.error();
        }
        paginationResponseVo = this.operatorService.queryDemandByCondition(req);
        List demandList = paginationResponseVo.getPageList();
        List extFieldList = this.operatorService.findDemandExtFieldsByDefLabel(((DemandTypeReq)req.getQueryParam()).getDefLabel());
        List extFieldData = this.operatorService.findAllDemandExtFieldData();
        List basicResultList = this.operatorService.getBasicResultList(extFieldList, demandList);
        HashMap attrListMap = this.operatorService.getAttrListMap(extFieldList, extFieldData);
        HashMap completeAttrListMap = this.operatorService.getCompleteAttrListJson(attrListMap, extFieldList);
        List resultList = this.operatorService.replaceAttrListField(basicResultList, completeAttrListMap);
        paginationResponseVo.setPageList(resultList);
        return ResultVo.response((Object)paginationResponseVo);
    }

    @ApiOperation(value="\u5206\u7c7b\u8bfb\u53d6\u9700\u6c42\u5355\u5217\u8868")
    @PostMapping(value={"/demandListByType"})
    @ResponseBody
    public ResultVo<Object> demandListByType(@RequestBody DemandTypeReq demandTypeReq) throws Exception {
        if (StringUtils.isEmpty((CharSequence)demandTypeReq.getUserName())) {
            throw new Exception("\u7528\u6237\u540d\u53c2\u6570\u7f3a\u5931");
        }
        String defLabel = demandTypeReq.getDefLabel();
        ArrayList<Sort.Order> orders = new ArrayList<Sort.Order>();
        List processFuncList = ConfigFileController.commonConfig.getOperator().getDemandTask().getProcessFuncList();
        for (DemandTaskFunc demandTaskFunc : processFuncList) {
            int i;
            if (!CollectionUtils.isNotEmpty((Collection)demandTaskFunc.getOrderBy())) continue;
            List orderBy = demandTaskFunc.getOrderBy();
            List sort = new ArrayList();
            if (CollectionUtils.isNotEmpty((Collection)demandTaskFunc.getSort())) {
                sort = demandTaskFunc.getSort();
            }
            if (CollectionUtils.isNotEmpty((Collection)orderBy) && CollectionUtils.isNotEmpty(sort)) {
                if (orderBy.size() != sort.size()) {
                    throw new Exception("demandTask config error");
                }
                for (i = 0; i < orderBy.size(); ++i) {
                    Sort.Direction asc = "ASC".equals(((String)sort.get(i)).toUpperCase()) ? Sort.Direction.ASC : Sort.Direction.DESC;
                    orders.add(new Sort.Order(asc, (String)orderBy.get(i)));
                }
                continue;
            }
            for (i = 0; i < orderBy.size(); ++i) {
                orders.add(new Sort.Order(Sort.Direction.ASC, (String)orderBy.get(i)));
            }
        }
        DemandListTypeVo demandList = new DemandListTypeVo();
        if (StringUtils.isNotEmpty((CharSequence)defLabel)) {
            demandList = this.operatorService.demandListByType(defLabel, Sort.by(orders), demandTypeReq);
            List extFieldList = this.operatorService.findDemandExtFieldsByDefLabel(defLabel);
            List extFieldData = this.operatorService.findAllDemandExtFieldData();
            List basicResultList = this.operatorService.getBasicResultList1(extFieldList, demandList.getDemandTypeList());
            HashMap attrListMap = this.operatorService.getAttrListMap(extFieldList, extFieldData);
            HashMap completeAttrListMap = this.operatorService.getCompleteAttrListJson(attrListMap, extFieldList);
            List resultList = this.operatorService.replaceAttrListField1(basicResultList, completeAttrListMap);
            demandList.setDemandTypeList(resultList);
        }
        return ResultVo.response((Object)demandList);
    }

    private Boolean checkDemand() {
        if (ConfigFileController.commonConfig != null && ConfigFileController.commonConfig.getOperator() != null && ConfigFileController.commonConfig.getOperator().getDemandTask() != null && ConfigFileController.commonConfig.getOperator().getDemandTask().getEnable().booleanValue() && ConfigFileController.commonConfig.getOperator().getDemandTask().getProcessFuncList() != null) {
            return true;
        }
        log.info("checkDemand info find demand config error: {}", (Object)ConfigFileController.commonConfig);
        return false;
    }

    @PostMapping(value={"/operatorTable/colHandle"})
    @ResponseBody
    public ResultVo<Object> colHandle(@RequestBody OperatorTableExpandReq req) {
        String funName;
        List colContentCollect;
        List expandColsCollect;
        List showSql;
        log.info("colHandle params = {}", (Object)req);
        if (ConfigFileController.commonConfig != null && ConfigFileController.commonConfig.getOperator() != null && ConfigFileController.commonConfig.getOperator().getTableShow() != null && ConfigFileController.commonConfig.getOperator().getTableShow().getEnable().booleanValue() && ConfigFileController.commonConfig.getOperator().getTableShow().getShowSql() != null && !(showSql = ConfigFileController.commonConfig.getOperator().getTableShow().getShowSql().stream().filter(it -> it.getId().equals(req.getId())).collect(Collectors.toList())).isEmpty() && !(expandColsCollect = ((OperatorShowSql)showSql.get(0)).getExpandCols().stream().filter(it -> it.getColId().equals(req.getColId())).collect(Collectors.toList())).isEmpty() && !(colContentCollect = ((OperatorTableExpandCols)expandColsCollect.get(0)).getContents().stream().filter(it -> it.getContentId().equals(req.getContentId())).collect(Collectors.toList())).isEmpty() && StringUtils.isNotEmpty((CharSequence)(funName = ((ExpandColContent)colContentCollect.get(0)).getFuncName()))) {
            try {
                JSONObject value = this.scriptService.executeFunction(funName, new Object[]{JSONObject.toJSONString((Object)req.getParams()), JSONObject.toJSONString((Object)req.getFormData())});
                if (value.getString("body") == null || value.get((Object)"code") == null) {
                    log.info("data colHandle return params cannot empty");
                    return ResultVo.error((CommonCodeEnum)CommonCodeEnum.OPERATOR_EXECUTE_SCRIPTERROR);
                }
                HashMap hashMap = Maps.newHashMap();
                hashMap.put("body", value.getString("body"));
                hashMap.put("code", value.get((Object)"code"));
                return ResultVo.response((Object)JSONObject.toJSONString((Object)hashMap));
            }
            catch (Exception e) {
                log.error("data colHandle error = {}", (Throwable)e);
                return ResultVo.error((CommonCodeEnum)CommonCodeEnum.OPERATOR_EXECUTE_SCRIPTERROR);
            }
        }
        return ResultVo.error((CommonCodeEnum)CommonCodeEnum.OPERATOR_SHOWSQL_EXPANDCOLS);
    }

    @ApiOperation(value="\u6839\u636edefLabel\u83b7\u53d6\u6269\u5c55\u5b57\u6bb5")
    @GetMapping(value={"/demand/getExtFieldsByDefLabel/{defLabel}"})
    @ResponseBody
    public ResultVo<Object> getExtFieldsByDefLabel(@PathVariable String defLabel, @ApiIgnore HttpServletResponse response) {
        List extFieldList = this.operatorService.findDemandExtFieldsByDefLabel(defLabel);
        return ResultVo.response((Object)extFieldList);
    }

    @ApiOperation(value="\u5220\u9664\u9700\u6c42\u5355\u6269\u5c55\u5b57\u6bb5")
    @PostMapping(value={"/demands/deleteExtField"})
    @ResponseBody
    public ResultVo<Object> deleteExtField(@RequestBody AttrFieldsDeleteReq req) throws Exception {
        String attrName = req.getAttributeName();
        Long attrId = this.operatorService.findAttrIdByAttrName(attrName);
        this.operatorService.deleteExtField(attrId);
        return ResultVo.success();
    }

    @ApiOperation(value="\u8bfb\u53d6\u624b\u6301\u7aef\u5916\u90e8\u7f51\u9875\u914d\u7f6e")
    @PostMapping(value={"/webPageList"})
    @ResponseBody
    public ResultVo<Object> webPageList() {
        List webPageList = ConfigFileController.commonConfig.getWebPageList();
        return ResultVo.response((Object)webPageList);
    }

    @ApiOperation(value="\u624b\u6301\u7aef\u67e5\u8be2\u7684\u5206\u62e8\u5355")
    @PostMapping(value={"/findDistribute"})
    @ResponseBody
    public ResultVo<Object> findDistribute(@RequestBody(required=false) DistributeReq req) {
        if (ConfigFileController.commonConfig != null && ConfigFileController.commonConfig.getOperator() != null && ConfigFileController.commonConfig.getOperator().getDistribute() != null && !ConfigFileController.commonConfig.getOperator().getDistribute().getEnable().booleanValue()) {
            return ResultVo.error((CommonCodeEnum)CommonCodeEnum.OPERATOR_DISTRIBUTE_NOENABLE);
        }
        List tmp = this.distributeRecordMapper.findDistributeRecords(0);
        tmp = tmp.stream().filter(it -> {
            if (ConfigFileController.commonConfig != null && ConfigFileController.commonConfig.getOperator() != null && ConfigFileController.commonConfig.getOperator().getDistribute() != null && !ConfigFileController.commonConfig.getOperator().getDistribute().getVisibility().isEmpty()) {
                List visibility = ConfigFileController.commonConfig.getOperator().getDistribute().getVisibility();
                List c = visibility.stream().filter(e -> StringUtils.equals((CharSequence)e.getWindTask(), (CharSequence)it.getDefLabel())).collect(Collectors.toList());
                if (c.isEmpty()) {
                    return true;
                }
                if (!((Visibility)c.get(0)).getWorkTypes().isEmpty() && !((Visibility)c.get(0)).getWorkTypes().contains(req.getWorkType())) {
                    return false;
                }
                if (!((Visibility)c.get(0)).getWorkStations().isEmpty() && !((Visibility)c.get(0)).getWorkStations().contains(req.getWorkStation())) {
                    return false;
                }
            }
            return true;
        }).collect(Collectors.toList());
        List c = tmp.stream().map(DistributeRecord::getDistributeId).collect(Collectors.toList());
        List points = this.distributePointRecordMapper.findAllByDistributeIdIsIn(c);
        ArrayList<DistributeRecord> res = new ArrayList<DistributeRecord>();
        for (DistributeRecord distributeRecord : tmp) {
            try {
                List current = points.stream().filter(it -> StringUtils.equals((CharSequence)distributeRecord.getDistributeId(), (CharSequence)it.getDistributeId())).collect(Collectors.toList());
                List p3 = current.stream().filter(it -> it.getPointType() == 1).collect(Collectors.toList());
                distributeRecord.setFromLoc(p3.isEmpty() ? "" : ((DistributePointRecord)p3.get(0)).getLoc());
                List p4 = current.stream().filter(it -> it.getPointType() == 2).collect(Collectors.toList());
                distributeRecord.setToLoc(p4.isEmpty() ? "" : ((DistributePointRecord)p4.get(0)).getLoc());
                List p2 = current.stream().filter(it -> it.getMode().intValue() == DistributeEnum.RUN.getType() || it.getMode().intValue() == DistributeEnum.WAIT.getType()).collect(Collectors.toList());
                if (!p2.isEmpty()) {
                    distributeRecord.setLoc(((DistributePointRecord)p2.get(0)).getLoc());
                    distributeRecord.setMode(((DistributePointRecord)p2.get(0)).getMode());
                    distributeRecord.setDistributeFlag(((DistributePointRecord)p2.get(0)).getPointType() == 3);
                    res.add(distributeRecord);
                    continue;
                }
                List p1 = current.stream().filter(it -> it.getPointType() == 3).collect(Collectors.toList());
                List p6 = p1.stream().filter(it -> it.getMode().intValue() != DistributeEnum.FINISHED.getType() || it.getMode().intValue() != DistributeEnum.STOP.getType()).collect(Collectors.toList());
                String tmpLoc = p1.isEmpty() ? ((DistributePointRecord)p4.get(0)).getLoc() : ((DistributePointRecord)p1.get(0)).getLoc();
                distributeRecord.setLoc(p6.isEmpty() ? tmpLoc : ((DistributePointRecord)p6.get(0)).getLoc());
                distributeRecord.setMode(p6.isEmpty() ? (p1.isEmpty() ? ((DistributePointRecord)p4.get(0)).getMode() : ((DistributePointRecord)p1.get(0)).getMode()) : ((DistributePointRecord)p6.get(0)).getMode());
                int flag = p6.isEmpty() ? (p1.isEmpty() ? ((DistributePointRecord)p4.get(0)).getPointType() : ((DistributePointRecord)p1.get(0)).getPointType()) : ((DistributePointRecord)p6.get(0)).getPointType();
                distributeRecord.setDistributeFlag(flag == 3);
            }
            catch (Exception e) {
                continue;
            }
            res.add(distributeRecord);
        }
        ArrayList v = new ArrayList();
        res.stream().forEach(it -> {
            DistributeRecordTmp drt = new DistributeRecordTmp(this);
            drt.id = it.getId();
            drt.taskRecordId = it.getTaskRecordId();
            drt.distributeId = it.getDistributeId();
            drt.agvId = it.getAgvId();
            drt.createTime = DateUtils.parseDateToStr((String)DateUtils.YYYY_MM_DD_HH_MM_SS, (Date)it.getCreateTime());
            drt.isEnd = it.getIsEnd();
            drt.remark = it.getRemark();
            drt.defLabel = it.getDefLabel();
            drt.loc = it.getLoc();
            drt.mode = it.getMode();
            drt.distributeFlag = it.isDistributeFlag();
            drt.fromLoc = it.getFromLoc();
            drt.toLoc = it.getToLoc();
            v.add(drt);
        });
        return ResultVo.response(v);
    }

    @ApiOperation(value="\u5206\u62e8\u5355\u5206\u62e8\u70b9\u653e\u884c")
    @GetMapping(value={"/distributePass"})
    @ResponseBody
    public ResultVo<Object> distributePass(@RequestParam(name="distributeOrderId") String orderId) {
        DistributeRecord v = this.distributeRecordMapper.findDistributeRecordByDistributeId(orderId);
        log.info("distributePass params = {}", (Object)v);
        if (this.operatorService.distributePass(v.getAgvId())) {
            return ResultVo.success();
        }
        return ResultVo.error();
    }

    @ApiOperation(value="\u5206\u62e8\u5355\u5206\u62e8\u70b9\u6302\u8d77")
    @GetMapping(value={"/distributePending"})
    @ResponseBody
    public ResultVo<Object> distributePending(@RequestParam(name="distributeOrderId") String distributeOrderId, @RequestParam(name="loc") String loc) {
        log.info("distributePending distributeOrderId = {}, loc = {}", (Object)distributeOrderId, (Object)loc);
        DistributeRecord v = this.distributeRecordMapper.findDistributeRecordByDistributeId(distributeOrderId);
        if (this.operatorService.distributePendingAndContinued(v.getTaskRecordId(), loc, true)) {
            return ResultVo.success();
        }
        return ResultVo.error();
    }

    @ApiOperation(value="\u5206\u62e8\u5355\u5206\u62e8\u70b9\u7ee7\u7eed")
    @GetMapping(value={"/distributeContinued"})
    @ResponseBody
    public ResultVo<Object> distributeContinued(@RequestParam(name="distributeOrderId") String distributeOrderId, @RequestParam(name="loc") String loc) {
        log.info("distributeContinued distributeOrderId = {}, loc = {}", (Object)distributeOrderId, (Object)loc);
        DistributeRecord v = this.distributeRecordMapper.findDistributeRecordByDistributeId(distributeOrderId);
        if (this.operatorService.distributePendingAndContinued(v.getTaskRecordId(), loc, false)) {
            return ResultVo.success();
        }
        return ResultVo.error();
    }

    @ApiOperation(value="\u5206\u62e8\u5355\u5220\u9664")
    @GetMapping(value={"/distributeDel"})
    @ResponseBody
    public ResultVo<Object> distributeDel(@RequestParam(name="distributeOrderId") String distributeOrderId, @RequestParam(name="loc") String loc) {
        log.info("distributeDel distributeOrderId = {}, loc = {}", (Object)distributeOrderId, (Object)loc);
        DistributePointRecord vo = this.distributePointRecordMapper.findDistributePointRecordByDistributeIdAndLocAndAndPointType(distributeOrderId, loc, 3);
        if (vo != null && vo.getMode().intValue() == DistributeEnum.FINISHED.getType()) {
            return ResultVo.error((CommonCodeEnum)CommonCodeEnum.DISTRIBUTE_DEL_ERROR);
        }
        if (this.operatorService.distributeDel(distributeOrderId, loc)) {
            return ResultVo.success();
        }
        return ResultVo.error();
    }

    @ApiOperation(value="\u5206\u62e8\u5355\u6dfb\u52a0")
    @PostMapping(value={"/distributeAdd"})
    @ResponseBody
    public ResultVo<Object> distributeAdd(@RequestBody List<String> locs, @RequestParam(name="distributeOrderId") String distributeOrderId) {
        log.info("distributeAdd distributeOrderId = {}, locs = {}", (Object)distributeOrderId, locs);
        if (this.operatorService.distributeAdd(distributeOrderId, locs)) {
            return ResultVo.success();
        }
        return ResultVo.error();
    }

    @ApiOperation(value="\u5206\u62e8\u5355\u4efb\u52a1\u7ec8\u6b62")
    @GetMapping(value={"/distributeStop"})
    @ResponseBody
    public ResultVo<Object> distributeStop(@RequestParam(name="distributeOrderId") String distributeOrderId, @ApiIgnore HttpServletRequest request, @ApiIgnore HttpServletResponse response) {
        log.info("distributeStop distributeOrderId = {}", (Object)distributeOrderId);
        DistributeRecord v = this.distributeRecordMapper.findDistributeRecordByDistributeId(distributeOrderId);
        WindTaskRecord wtr = this.windTaskRecordMapper.findRecordById(v.getTaskRecordId());
        if (wtr.getStatus().intValue() == TaskStatusEnum.end_error.getStatus() || wtr.getStatus().intValue() == TaskStatusEnum.stop.getStatus()) {
            return ResultVo.success();
        }
        ArrayList<StopAllTaskReq.StopTask> stopTaskList = new ArrayList<StopAllTaskReq.StopTask>();
        StopAllTaskReq.StopTask tmp = new StopAllTaskReq.StopTask(wtr.getDefId(), wtr.getId());
        stopTaskList.add(tmp);
        BatchStopTaskReq req = new BatchStopTaskReq(1, stopTaskList);
        return ((AgvWindController)SpringUtil.getBean(AgvWindController.class)).stopAll(request, response, req);
    }

    @ApiOperation(value="\u67e5\u8be2\u5206\u62e8\u70b9\u72b6\u6001")
    @GetMapping(value={"/distributePoint"})
    @ResponseBody
    public ResultVo<Object> distributePoint(@RequestParam(name="distributeOrderId") String distributeOrderId) {
        List allByDistributeId = this.distributePointRecordMapper.findAllByDistributeId(distributeOrderId);
        return ResultVo.response(allByDistributeId.stream().filter(it -> it.getPointType() == 3).sorted(Comparator.comparing(DistributePointRecord::getLoc)).collect(Collectors.toList()));
    }

    @PostMapping(value={"/operatorTable/pageExtras"})
    @ResponseBody
    public ResultVo<Object> pageExtrasHandle(@RequestBody OperatorTableExpandReq req) {
        String funName;
        List expandColsCollect;
        List showSql;
        log.info("pageExtrasHandle params = {}", (Object)req);
        if (ConfigFileController.commonConfig != null && ConfigFileController.commonConfig.getOperator() != null && ConfigFileController.commonConfig.getOperator().getTableShow() != null && ConfigFileController.commonConfig.getOperator().getTableShow().getEnable().booleanValue() && ConfigFileController.commonConfig.getOperator().getTableShow().getShowSql() != null && !(showSql = ConfigFileController.commonConfig.getOperator().getTableShow().getShowSql().stream().filter(it -> it.getId().equals(req.getId())).collect(Collectors.toList())).isEmpty() && !(expandColsCollect = ((OperatorShowSql)showSql.get(0)).getPageExtras().stream().filter(it -> it.getContentId().equals(req.getContentId())).collect(Collectors.toList())).isEmpty() && StringUtils.isNotEmpty((CharSequence)(funName = ((ExpandColContent)expandColsCollect.get(0)).getFuncName()))) {
            try {
                JSONObject value = this.scriptService.executeFunction(funName, new Object[]{JSONObject.toJSONString((Object)req.getFormData())});
                if (value.getString("body") == null || value.get((Object)"code") == null) {
                    log.info("data pageExtrasHandle return params cannot empty");
                    return ResultVo.error((CommonCodeEnum)CommonCodeEnum.OPERATOR_EXECUTE_SCRIPTERROR);
                }
                HashMap hashMap = Maps.newHashMap();
                hashMap.put("body", value.getString("body"));
                hashMap.put("code", value.get((Object)"code"));
                return ResultVo.response((Object)JSONObject.toJSONString((Object)hashMap));
            }
            catch (Exception e) {
                log.error("data pageExtrasHandle error = {}", (Throwable)e);
                return ResultVo.error((CommonCodeEnum)CommonCodeEnum.OPERATOR_EXECUTE_SCRIPTERROR);
            }
        }
        return ResultVo.error((CommonCodeEnum)CommonCodeEnum.OPERATOR_SHOWSQL_EXPANDCOLS);
    }
}

