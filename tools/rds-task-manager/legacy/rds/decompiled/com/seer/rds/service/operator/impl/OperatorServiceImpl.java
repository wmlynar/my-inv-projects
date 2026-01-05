/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.alibaba.fastjson.JSON
 *  com.alibaba.fastjson.JSONArray
 *  com.alibaba.fastjson.JSONObject
 *  com.google.common.collect.Maps
 *  com.seer.rds.config.PropConfig
 *  com.seer.rds.config.configview.operator.DemandTask
 *  com.seer.rds.config.configview.operator.DemandTaskFunc
 *  com.seer.rds.config.configview.operator.EasyOrder
 *  com.seer.rds.config.configview.operator.OperatorConfig
 *  com.seer.rds.config.configview.operator.OperatorShowSql
 *  com.seer.rds.config.configview.operator.OperatorTableExpandCols
 *  com.seer.rds.constant.ApiEnum
 *  com.seer.rds.constant.DemandStatusEnum
 *  com.seer.rds.dao.WindDemandAttrDataMapper
 *  com.seer.rds.dao.WindDemandAttrMapper
 *  com.seer.rds.dao.WindDemandTaskMapper
 *  com.seer.rds.dao.WindTaskRecordMapper
 *  com.seer.rds.model.wind.WindDemandAttr
 *  com.seer.rds.model.wind.WindDemandAttrData
 *  com.seer.rds.model.wind.WindDemandTask
 *  com.seer.rds.model.wind.WindTaskRecord
 *  com.seer.rds.runnable.EasyOrderRunnable
 *  com.seer.rds.script.ScriptService
 *  com.seer.rds.service.operator.OperatorService
 *  com.seer.rds.service.operator.impl.OperatorServiceImpl
 *  com.seer.rds.util.LocaleMessageUtil
 *  com.seer.rds.util.OkHttpUtil
 *  com.seer.rds.util.SpringUtil
 *  com.seer.rds.vo.AttrVo
 *  com.seer.rds.vo.ResultVo
 *  com.seer.rds.vo.ScriptApi
 *  com.seer.rds.vo.req.DemandTypeReq
 *  com.seer.rds.vo.req.DemandWorkTypes
 *  com.seer.rds.vo.req.PaginationReq
 *  com.seer.rds.vo.req.ShowTableReq
 *  com.seer.rds.vo.response.DemandContentVo
 *  com.seer.rds.vo.response.DemandListTypeVo
 *  com.seer.rds.vo.response.DemandListVo
 *  com.seer.rds.vo.response.DemandTypeVo
 *  com.seer.rds.vo.response.DemandVo
 *  com.seer.rds.vo.response.EasyOrderRes
 *  com.seer.rds.vo.response.PaginationResponseVo
 *  com.seer.rds.web.config.ConfigFileController
 *  javax.transaction.Transactional
 *  org.apache.commons.collections.CollectionUtils
 *  org.apache.commons.lang3.StringUtils
 *  org.slf4j.Logger
 *  org.slf4j.LoggerFactory
 *  org.springframework.beans.factory.annotation.Autowired
 *  org.springframework.context.i18n.LocaleContextHolder
 *  org.springframework.dao.DataAccessException
 *  org.springframework.data.domain.Page
 *  org.springframework.data.domain.PageRequest
 *  org.springframework.data.domain.Pageable
 *  org.springframework.data.domain.Sort
 *  org.springframework.data.jpa.domain.Specification
 *  org.springframework.http.HttpMethod
 *  org.springframework.jdbc.core.JdbcTemplate
 *  org.springframework.stereotype.Service
 */
package com.seer.rds.service.operator.impl;

import com.alibaba.fastjson.JSON;
import com.alibaba.fastjson.JSONArray;
import com.alibaba.fastjson.JSONObject;
import com.google.common.collect.Maps;
import com.seer.rds.config.PropConfig;
import com.seer.rds.config.configview.operator.DemandTask;
import com.seer.rds.config.configview.operator.DemandTaskFunc;
import com.seer.rds.config.configview.operator.EasyOrder;
import com.seer.rds.config.configview.operator.OperatorConfig;
import com.seer.rds.config.configview.operator.OperatorShowSql;
import com.seer.rds.config.configview.operator.OperatorTableExpandCols;
import com.seer.rds.constant.ApiEnum;
import com.seer.rds.constant.DemandStatusEnum;
import com.seer.rds.dao.WindDemandAttrDataMapper;
import com.seer.rds.dao.WindDemandAttrMapper;
import com.seer.rds.dao.WindDemandTaskMapper;
import com.seer.rds.dao.WindTaskRecordMapper;
import com.seer.rds.model.wind.WindDemandAttr;
import com.seer.rds.model.wind.WindDemandAttrData;
import com.seer.rds.model.wind.WindDemandTask;
import com.seer.rds.model.wind.WindTaskRecord;
import com.seer.rds.runnable.EasyOrderRunnable;
import com.seer.rds.script.ScriptService;
import com.seer.rds.service.operator.OperatorService;
import com.seer.rds.util.LocaleMessageUtil;
import com.seer.rds.util.OkHttpUtil;
import com.seer.rds.util.SpringUtil;
import com.seer.rds.vo.AttrVo;
import com.seer.rds.vo.ResultVo;
import com.seer.rds.vo.ScriptApi;
import com.seer.rds.vo.req.DemandTypeReq;
import com.seer.rds.vo.req.DemandWorkTypes;
import com.seer.rds.vo.req.PaginationReq;
import com.seer.rds.vo.req.ShowTableReq;
import com.seer.rds.vo.response.DemandContentVo;
import com.seer.rds.vo.response.DemandListTypeVo;
import com.seer.rds.vo.response.DemandListVo;
import com.seer.rds.vo.response.DemandTypeVo;
import com.seer.rds.vo.response.DemandVo;
import com.seer.rds.vo.response.EasyOrderRes;
import com.seer.rds.vo.response.PaginationResponseVo;
import com.seer.rds.web.config.ConfigFileController;
import java.io.IOException;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;
import javax.transaction.Transactional;
import org.apache.commons.collections.CollectionUtils;
import org.apache.commons.lang3.StringUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.i18n.LocaleContextHolder;
import org.springframework.dao.DataAccessException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpMethod;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

/*
 * Exception performing whole class analysis ignored.
 */
@Service
public class OperatorServiceImpl
implements OperatorService {
    private static final Logger log = LoggerFactory.getLogger(OperatorServiceImpl.class);
    @Autowired
    private WindDemandTaskMapper windDemandTaskMapper;
    @Autowired
    private ScriptService scriptService;
    @Autowired
    private WindTaskRecordMapper windTaskRecordMapper;
    @Autowired
    private LocaleMessageUtil localeMessageUtil;
    @Autowired
    private WindDemandAttrMapper windDemandAttrMapper;
    @Autowired
    private WindDemandAttrDataMapper windDemandAttrDataMapper;

    public DemandListVo getDemandList(DemandWorkTypes demandWorkTypes) {
        List dispatchedDemandTasks;
        DemandListVo demandListVo = new DemandListVo();
        List DemandTasks = this.windDemandTaskMapper.findDemandList();
        ArrayList<DemandVo> demandVoList = new ArrayList<DemandVo>();
        SimpleDateFormat format = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss");
        if (CollectionUtils.isNotEmpty((Collection)DemandTasks)) {
            for (WindDemandTask windDemandTask : DemandTasks) {
                if (StringUtils.isEmpty((CharSequence)demandWorkTypes.getWorkTypes()) && StringUtils.isNotEmpty((CharSequence)windDemandTask.getWorkTypes()) || StringUtils.isEmpty((CharSequence)demandWorkTypes.getWorkStations()) && StringUtils.isNotEmpty((CharSequence)windDemandTask.getWorkStations()) || StringUtils.isNotEmpty((CharSequence)demandWorkTypes.getWorkTypes()) && StringUtils.isNotEmpty((CharSequence)windDemandTask.getWorkTypes()) && !windDemandTask.getWorkTypes().contains(demandWorkTypes.getWorkTypes()) || StringUtils.isNotEmpty((CharSequence)demandWorkTypes.getWorkStations()) && StringUtils.isNotEmpty((CharSequence)windDemandTask.getWorkStations()) && !windDemandTask.getWorkStations().contains(demandWorkTypes.getWorkStations())) continue;
                DemandVo demandVo = new DemandVo();
                demandVo.setDefLabel(windDemandTask.getDefLabel());
                demandVo.setDescription(windDemandTask.getDescription());
                demandVo.setId(windDemandTask.getId());
                demandVo.setCreatedOn(format.format(windDemandTask.getCreatedOn()));
                demandVo.setContent(windDemandTask.getContent());
                demandVoList.add(demandVo);
            }
        }
        if (CollectionUtils.isNotEmpty((Collection)(dispatchedDemandTasks = this.windDemandTaskMapper.findDemandListByHandler(demandWorkTypes.getUserName())))) {
            for (WindDemandTask windDemandTask : dispatchedDemandTasks) {
                DemandVo demandVo = new DemandVo();
                demandVo.setDefLabel(windDemandTask.getDefLabel());
                demandVo.setDescription(windDemandTask.getDescription());
                demandVo.setId(windDemandTask.getId());
                demandVo.setCreatedOn(format.format(windDemandTask.getCreatedOn()));
                demandVo.setContent(windDemandTask.getContent());
                demandVoList.add(demandVo);
            }
        }
        demandListVo.setDemandList(demandVoList);
        return demandListVo;
    }

    public int lockDemand(String demandId, String userName, String jobNumber) {
        WindDemandTask taskInfo = this.windDemandTaskMapper.findDemandTaskById(demandId);
        if (StringUtils.isNotEmpty((CharSequence)jobNumber)) {
            if (taskInfo.getStatus().equals(DemandStatusEnum.dispatched.getStatus()) && jobNumber.equals(taskInfo.getJobNumber())) {
                return 1;
            }
            int result = this.windDemandTaskMapper.updateDemandHandlerAndStatus(demandId, jobNumber, userName, DemandStatusEnum.dispatched.getStatus());
            return result;
        }
        if (taskInfo.getStatus().equals(DemandStatusEnum.dispatched.getStatus()) && userName.equals(taskInfo.getHandler())) {
            return 1;
        }
        int result = this.windDemandTaskMapper.updateDemandHandlerAndStatus(demandId, "", userName, DemandStatusEnum.dispatched.getStatus());
        return result;
    }

    public DemandContentVo getDemandContent(String demandId) {
        DemandContentVo demandContentVo = new DemandContentVo();
        JSONObject result = null;
        WindDemandTask task = this.windDemandTaskMapper.findDemandTaskById(demandId);
        if (StringUtils.isNotEmpty((CharSequence)task.getContent())) {
            result = JSONObject.parseObject((String)task.getContent());
        }
        demandContentVo.setContent(result);
        demandContentVo.setMenuId(task.getMenuId());
        return demandContentVo;
    }

    public int updateStatus(String demandId, Integer status) {
        WindDemandTask demandTask;
        int result = 0;
        if (status.equals(DemandStatusEnum.created.getStatus())) {
            demandTask = this.windDemandTaskMapper.findDemandTaskById(demandId);
            if (demandTask.getStatus() > DemandStatusEnum.dispatched.getStatus()) {
                return 1;
            }
            result = this.windDemandTaskMapper.clearDispathcStatus(demandId);
        }
        if (status.equals(DemandStatusEnum.finished.getStatus())) {
            demandTask = this.windDemandTaskMapper.findDemandTaskById(demandId);
            if (demandTask.getStatus() > DemandStatusEnum.finished.getStatus()) {
                return 1;
            }
            return result;
        }
        result = this.windDemandTaskMapper.updateStatusById(demandId, status);
        return result;
    }

    @Transactional
    public void saveSupplementDetail(String demandId, JSONObject supplementContent) throws Exception {
        WindDemandTask task = this.windDemandTaskMapper.findDemandTaskById(demandId);
        if (task.getStatus().equals(DemandStatusEnum.finished.getStatus())) {
            throw new Exception("\u9700\u6c42\u5355\u5df2\u5b8c\u6210\uff0c\u8bf7\u52ff\u91cd\u590d\u64cd\u4f5c");
        }
        try {
            List processFuncList;
            DemandTask demandTask;
            String def = task.getDefLabel();
            OperatorConfig operator = ConfigFileController.commonConfig.getOperator();
            if (operator != null && (demandTask = operator.getDemandTask()) != null && CollectionUtils.isNotEmpty((Collection)(processFuncList = demandTask.getProcessFuncList()))) {
                for (DemandTaskFunc func : processFuncList) {
                    if (!def.equals(func.getDefLabel())) continue;
                    String funcName = func.getFuncName();
                    JSONObject arg = new JSONObject();
                    arg.put("id", (Object)demandId);
                    arg.put("defLabel", (Object)task.getDefLabel());
                    arg.put("description", (Object)task.getDescription());
                    arg.put("content", JSON.parse((String)task.getContent()));
                    arg.put("suplementContent", (Object)supplementContent);
                    this.scriptService.execute(funcName, (Object)JSONObject.toJSONString((Object)arg));
                    break;
                }
            }
            String supplementDetail = "";
            if (supplementContent != null) {
                supplementDetail = JSONObject.toJSONString((Object)supplementContent);
            }
            this.windDemandTaskMapper.updateSupplementContentById(demandId, supplementDetail, new Date());
        }
        catch (Exception e) {
            log.error("\u9700\u6c42\u5355\u4e0b\u5355\u5931\u8d25:{}", (Object)e.getMessage());
            throw e;
        }
    }

    @Transactional
    public void addDemand(WindDemandTask task) {
        this.windDemandTaskMapper.save((Object)task);
        List attrList = task.getAttrList();
        if (CollectionUtils.isNotEmpty((Collection)attrList)) {
            String demandId = task.getId();
            List attrNameList = attrList.stream().map(AttrVo::getAttributeName).collect(Collectors.toList());
            List idNamePairs = this.windDemandAttrMapper.findByNameIn(attrNameList);
            Map nameIdPairsMap = this.transToMap(idNamePairs);
            List collect = attrList.stream().map(a -> WindDemandAttrData.builder().demandId(demandId).attributeId((Long)nameIdPairsMap.get(a.getAttributeName())).attributeValue(a.getAttributeValue()).build()).collect(Collectors.toList());
            this.windDemandAttrDataMapper.saveAll(collect);
        }
    }

    private Map<String, Long> transToMap(List<WindDemandAttr> idNamePairs) {
        HashMap<String, Long> map = new HashMap<String, Long>();
        for (WindDemandAttr idNamePair : idNamePairs) {
            map.put(idNamePair.getAttributeName(), idNamePair.getId());
        }
        return map;
    }

    public int updateDemandStatusById(String demandId, Integer status, String handler) {
        return this.windDemandTaskMapper.updateDemandStatusById(demandId, status, handler);
    }

    public int updateDemandFinishedById(String demandId, String supplementContent, String handler) {
        return this.windDemandTaskMapper.updateDemandFinishedById(demandId, supplementContent, handler, new Date());
    }

    public int updateDemandFinishedByCreateBy(String createBy, String supplementContent, String handler) {
        return this.windDemandTaskMapper.updateDemandFinishedByCreateBy(createBy, supplementContent, handler);
    }

    public PaginationResponseVo showTable(OperatorShowSql operatorShowSql, PaginationReq<ShowTableReq> showTableReq) throws IndexOutOfBoundsException, DataAccessException {
        List params = operatorShowSql.getParams();
        List paramsType = operatorShowSql.getParamsType();
        Object msg = operatorShowSql.getSql();
        for (int i = 0; i < params.size(); ++i) {
            int result;
            int haveResult;
            int whereResult;
            int andResult;
            int from;
            String regex = "{" + (String)params.get(i) + "}";
            if (((ShowTableReq)showTableReq.getQueryParam()).getParams() == null || ((ShowTableReq)showTableReq.getQueryParam()).getParams().isEmpty() || ((ShowTableReq)showTableReq.getQueryParam()).getParams().get(params.get(i)) == null) {
                while ((from = ((String)msg).indexOf(regex)) != -1) {
                    andResult = ((String)msg).lastIndexOf("AND", from);
                    whereResult = ((String)msg).lastIndexOf("WHERE", from);
                    haveResult = ((String)msg).lastIndexOf("HAVING", from);
                    int n = andResult < whereResult ? (whereResult < haveResult ? haveResult : whereResult) : (result = andResult < haveResult ? haveResult : andResult);
                    if (andResult != -1 && result == andResult) {
                        msg = from + regex.length() == ((String)msg).length() ? ((String)msg).substring(0, andResult) : ((String)msg).substring(0, andResult) + ((String)msg).substring(from + regex.length(), ((String)msg).length());
                        continue;
                    }
                    if (whereResult != -1 && result == whereResult) {
                        msg = from + regex.length() == ((String)msg).length() ? ((String)msg).substring(0, whereResult) + "where 1=1" : ((String)msg).substring(0, whereResult) + "where 1=1" + ((String)msg).substring(from + regex.length(), ((String)msg).length());
                        continue;
                    }
                    if (haveResult == -1 || haveResult != result) continue;
                    msg = from + regex.length() == ((String)msg).length() ? ((String)msg).substring(0, haveResult) + "having 1=1" : ((String)msg).substring(0, haveResult) + "having 1=1" + ((String)msg).substring(from + regex.length(), ((String)msg).length());
                }
                continue;
            }
            while ((from = ((String)msg).indexOf(regex)) != -1) {
                andResult = ((String)msg).lastIndexOf("AND", from);
                whereResult = ((String)msg).lastIndexOf("WHERE", from);
                haveResult = ((String)msg).lastIndexOf("HAVING", from);
                result = andResult < whereResult ? (whereResult < haveResult ? haveResult : whereResult) : (andResult < haveResult ? haveResult : andResult);
                int like = ((String)msg).substring(result, from).indexOf("LIKE");
                if (like != -1) {
                    msg = ((String)msg).replaceFirst("\\{" + (String)params.get(i) + "}", "\"%" + ((ShowTableReq)showTableReq.getQueryParam()).getParams().get(params.get(i)).toString() + "%\"");
                    continue;
                }
                if ("number".equals(((String)paramsType.get(i)).toLowerCase())) {
                    msg = ((String)msg).replaceFirst("\\{" + (String)params.get(i) + "}", ((ShowTableReq)showTableReq.getQueryParam()).getParams().get(params.get(i)).toString());
                    continue;
                }
                msg = ((String)msg).replaceFirst("\\{" + (String)params.get(i) + "}", "\"" + ((ShowTableReq)showTableReq.getQueryParam()).getParams().get(params.get(i)).toString() + "\"");
            }
        }
        JdbcTemplate jdbcTemplate = (JdbcTemplate)SpringUtil.getBean(JdbcTemplate.class);
        String pageSql = (String)msg + " LIMIT " + (showTableReq.getCurrentPage() - 1) * showTableReq.getPageSize() + ", " + showTableReq.getPageSize();
        log.info("Operator Replace Sql: {}", (Object)pageSql);
        List maps = jdbcTemplate.queryForList(pageSql);
        String countSql = "SELECT count(1) count FROM (" + (String)msg + ") XTABLE";
        Map countMap = jdbcTemplate.queryForMap(countSql);
        PaginationResponseVo paginationResponseVo = new PaginationResponseVo();
        paginationResponseVo.setTotalCount(Long.valueOf(Long.parseLong(countMap.get("count").toString())));
        paginationResponseVo.setCurrentPage(Integer.valueOf(showTableReq.getCurrentPage()));
        paginationResponseVo.setPageSize(Integer.valueOf(showTableReq.getPageSize()));
        paginationResponseVo.setTotalPage(null);
        paginationResponseVo.setPageList(maps);
        return paginationResponseVo;
    }

    @Deprecated
    public List<EasyOrderRes> easyOrderCallBack(List<String> req) {
        List byTaskLabel = this.windTaskRecordMapper.findByTaskLabel(req);
        ArrayList<EasyOrderRes> res = new ArrayList<EasyOrderRes>();
        for (String taskLabel : req) {
            EasyOrderRes eor = new EasyOrderRes();
            eor.setTaskLabel(taskLabel);
            List collect = byTaskLabel.stream().filter(it -> it.getDefLabel().equals(taskLabel)).collect(Collectors.toList());
            if (!collect.isEmpty()) {
                eor.setFlag(Boolean.valueOf(false));
            }
            res.add(eor);
        }
        return res;
    }

    public List<WindDemandTask> getAllUnFinishedDemands() {
        return this.windDemandTaskMapper.findDemandList();
    }

    public void easyOrderBatchCallBack(List<EasyOrderRes> taskLabels) {
        ArrayList labels = new ArrayList();
        taskLabels.stream().forEach(it -> labels.add(it.getTaskLabel()));
        List windTaskLabel = this.windTaskRecordMapper.findByTaskLabel(labels);
        for (WindTaskRecord windTaskRecord : windTaskLabel) {
            taskLabels.stream().filter(it -> it.getTaskLabel().equals(windTaskRecord.getDefLabel())).forEach(it -> it.setFlag(Boolean.valueOf(false)));
        }
    }

    public ResultVo easyOrderSetOrderByMenuId(EasyOrder easyOrder, String params) throws Exception {
        HashMap stringListHashMap;
        this.easyOrderPutCache(easyOrder, "From easyOrderSetOrderByMenuId");
        log.info("easyOrderSetOrderByMenuId condition = {}", EasyOrderRunnable.easyOrderMap.get(easyOrder.getMenuId()));
        if ((Integer)EasyOrderRunnable.easyOrderMap.get(easyOrder.getMenuId()) == 0 && easyOrder.getOrderExecute() != null && !(stringListHashMap = OperatorServiceImpl.matchRouteFunction((String)easyOrder.getOrderExecute().getRoute())).isEmpty()) {
            Optional first = stringListHashMap.keySet().stream().findFirst();
            JSONObject result = this.scriptService.executeFunctionGetJsonObject((String)first.get(), ((ScriptApi)((List)stringListHashMap.get(first.get())).get(0)).getFunctionName(), new Object[]{params});
            String body = result.getString("body");
            if (body == null) {
                return null;
            }
            JSONObject jsonObject = JSON.parseObject((String)body);
            return ResultVo.builder().code(Integer.valueOf(jsonObject.getIntValue("code"))).msg(jsonObject.getString("msg")).build();
        }
        return null;
    }

    public void easyOrderPutCache(EasyOrder easyOrder, String describe) throws Exception {
        if (StringUtils.isNotEmpty((CharSequence)easyOrder.getTaskLabel()) && easyOrder.getCallBackExecute() == null) {
            ArrayList<String> taskLabel = new ArrayList<String>();
            taskLabel.add(easyOrder.getTaskLabel());
            List byTaskLabel = this.windTaskRecordMapper.findByTaskLabel(taskLabel);
            if (byTaskLabel.isEmpty()) {
                EasyOrderRunnable.easyOrderMap.put(easyOrder.getMenuId(), 0);
            } else {
                EasyOrderRunnable.easyOrderMap.put(easyOrder.getMenuId(), 1);
            }
        } else {
            OperatorServiceImpl.easyOrderExecuteBack((EasyOrder)easyOrder, (String)describe);
        }
    }

    public static void easyOrderExecuteBack(EasyOrder easyOrder, String describe) throws Exception {
        if (easyOrder.getCallBackExecute() != null) {
            JSONObject resultJson;
            Boolean canSend;
            String route = easyOrder.getCallBackExecute().getRoute();
            if (StringUtils.isEmpty((CharSequence)route)) {
                EasyOrderRunnable.easyOrderMap.put(easyOrder.getMenuId(), 3);
                log.info("Describe = {} easyOrderExecuteBack menuId = {} CallBackExecute Have Not Route", (Object)describe, (Object)easyOrder.getMenuId());
                return;
            }
            HashMap stringListHashMap = OperatorServiceImpl.matchRouteFunction((String)route);
            if (stringListHashMap.isEmpty()) {
                EasyOrderRunnable.easyOrderMap.put(easyOrder.getMenuId(), 3);
                log.info("Describe = {} EasyOrderRunnable menuId = {} CallBackExecute Have Route No Register", (Object)describe, (Object)easyOrder.getMenuId());
                return;
            }
            HashMap map = Maps.newHashMap();
            map.put("menuId", easyOrder.getMenuId());
            map.put("route", route);
            map.put("params", easyOrder.getCallBackExecute().getParams());
            map.put("label", easyOrder.getLabel());
            ScriptService scriptService = (ScriptService)SpringUtil.getBean(ScriptService.class);
            Optional first = stringListHashMap.keySet().stream().findFirst();
            JSONObject result = scriptService.executeFunctionGetJsonObject((String)first.get(), ((ScriptApi)((List)stringListHashMap.get(first.get())).get(0)).getFunctionName(), new Object[]{JSON.toJSONString((Object)map)});
            String body = result.getString("body");
            if (body != null && (canSend = (resultJson = JSONObject.parseObject((String)body)).getBoolean("canSendTask")) != null) {
                EasyOrderRunnable.easyOrderMap.put(easyOrder.getMenuId(), canSend != false ? 0 : 1);
                return;
            }
            log.info("Describe = {} EasyOrderRunnable menuId = {} CallBackExecute bad result = {}", new Object[]{describe, easyOrder.getMenuId(), result});
            EasyOrderRunnable.easyOrderMap.put(easyOrder.getMenuId(), 3);
            return;
        }
        if (StringUtils.isEmpty((CharSequence)easyOrder.getTaskLabel()) && easyOrder.getCallBackExecute() == null) {
            EasyOrderRunnable.easyOrderMap.put(easyOrder.getMenuId(), 0);
            return;
        }
        EasyOrderRunnable.easyOrderMap.put(easyOrder.getMenuId(), 3);
    }

    private static HashMap<String, List<ScriptApi>> matchRouteFunction(String route) {
        String path = route.trim().startsWith("/") ? "/script-api" + route : "/script-api/" + route;
        Set keys = ScriptService.scriptApiListMap.keySet();
        List<Object> collect = new ArrayList();
        HashMap<String, List<ScriptApi>> hm = new HashMap<String, List<ScriptApi>>();
        for (String key : keys) {
            collect = ((List)ScriptService.scriptApiListMap.get(key)).stream().filter(scriptApi -> {
                if (scriptApi.getAuth().booleanValue()) {
                    return false;
                }
                return HttpMethod.POST.name().equals(scriptApi.getMethod().toUpperCase()) && path.equals(scriptApi.getPath());
            }).collect(Collectors.toList());
            if (collect.isEmpty()) continue;
            if (collect.isEmpty()) break;
            hm.put(key, collect);
            break;
        }
        return hm;
    }

    public DemandListTypeVo demandListByType(String defLabel, Sort sort, DemandTypeReq demandTypeReq) {
        DemandListTypeVo demandListTypeVo = new DemandListTypeVo();
        ArrayList<DemandTypeVo> demandTypeVoList = new ArrayList<DemandTypeVo>();
        List DemandTasks = new ArrayList();
        if (!sort.isEmpty() && StringUtils.isNotEmpty((CharSequence)defLabel)) {
            DemandTasks = this.windDemandTaskMapper.findDemandListByDefLabelOrderBy(defLabel, demandTypeReq.getUserName(), sort);
        }
        if (sort.isEmpty() && StringUtils.isNotEmpty((CharSequence)defLabel)) {
            DemandTasks = this.windDemandTaskMapper.findDemandListByDefLabel(defLabel, demandTypeReq.getUserName());
        }
        SimpleDateFormat format = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss");
        if (CollectionUtils.isNotEmpty(DemandTasks)) {
            for (WindDemandTask windDemandTask : DemandTasks) {
                if (StringUtils.isEmpty((CharSequence)demandTypeReq.getWorkType()) && StringUtils.isNotEmpty((CharSequence)windDemandTask.getWorkTypes()) || StringUtils.isEmpty((CharSequence)demandTypeReq.getWorkStation()) && StringUtils.isNotEmpty((CharSequence)windDemandTask.getWorkStations()) || StringUtils.isNotEmpty((CharSequence)demandTypeReq.getWorkType()) && StringUtils.isNotEmpty((CharSequence)windDemandTask.getWorkTypes()) && !windDemandTask.getWorkTypes().contains(demandTypeReq.getWorkType()) || StringUtils.isNotEmpty((CharSequence)demandTypeReq.getWorkStation()) && StringUtils.isNotEmpty((CharSequence)windDemandTask.getWorkStations()) && !windDemandTask.getWorkStations().contains(demandTypeReq.getWorkStation())) continue;
                DemandTypeVo demandVo = new DemandTypeVo();
                demandVo.setDefLabel(windDemandTask.getDefLabel());
                demandVo.setDescription(windDemandTask.getDescription());
                demandVo.setId(windDemandTask.getId());
                demandVo.setCreatedOn(format.format(windDemandTask.getCreatedOn()));
                demandVo.setContent(windDemandTask.getContent());
                demandTypeVoList.add(demandVo);
            }
        }
        demandListTypeVo.setDemandTypeList(demandTypeVoList);
        return demandListTypeVo;
    }

    public PaginationResponseVo queryDemandByCondition(PaginationReq<DemandTypeReq> req) {
        Locale locale = LocaleContextHolder.getLocale();
        PageRequest pageable = PageRequest.of((int)(req.getCurrentPage() - 1), (int)req.getPageSize());
        SimpleDateFormat ft = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss");
        Object spec = StringUtils.equals((CharSequence)"web", (CharSequence)((DemandTypeReq)req.getQueryParam()).getFrom()) ? new /* Unavailable Anonymous Inner Class!! */ : new /* Unavailable Anonymous Inner Class!! */;
        Page windDemandTasks = this.windDemandTaskMapper.findAll((Specification)spec, (Pageable)pageable);
        windDemandTasks.stream().forEach(it -> {
            List collect = ConfigFileController.commonConfig.getOperator().getDemandTask().getProcessFuncList().stream().filter(fun -> StringUtils.isNotEmpty((CharSequence)it.getDefLabel()) && StringUtils.equals((CharSequence)it.getDefLabel(), (CharSequence)fun.getDefLabel())).collect(Collectors.toList());
            if (!collect.isEmpty()) {
                it.setTypeLabel(StringUtils.isNotEmpty((CharSequence)((DemandTaskFunc)collect.get(0)).getTypeLabel()) ? ((DemandTaskFunc)collect.get(0)).getTypeLabel() : ((DemandTaskFunc)collect.get(0)).getDefLabel());
            }
        });
        PaginationResponseVo paginationResponseVo = new PaginationResponseVo();
        paginationResponseVo.setTotalCount(Long.valueOf(windDemandTasks.getTotalElements()));
        paginationResponseVo.setCurrentPage(Integer.valueOf(req.getCurrentPage()));
        paginationResponseVo.setPageSize(Integer.valueOf(req.getPageSize()));
        paginationResponseVo.setTotalPage(Integer.valueOf(windDemandTasks.getTotalPages()));
        paginationResponseVo.setPageList(windDemandTasks.getContent());
        windDemandTasks.getContent().stream().forEach(it -> {
            if (it.getStatus().intValue() == DemandStatusEnum.created.getStatus()) {
                it.setStateLabel(this.localeMessageUtil.getMessage(DemandStatusEnum.created.getDesc(), locale));
            }
            if (it.getStatus().intValue() == DemandStatusEnum.dispatched.getStatus()) {
                it.setStateLabel(this.localeMessageUtil.getMessage(DemandStatusEnum.dispatched.getDesc(), locale));
            }
            if (it.getStatus().intValue() == DemandStatusEnum.finished.getStatus()) {
                it.setStateLabel(this.localeMessageUtil.getMessage(DemandStatusEnum.finished.getDesc(), locale));
            }
            if (it.getStatus().intValue() == DemandStatusEnum.deleted.getStatus()) {
                it.setStateLabel(this.localeMessageUtil.getMessage(DemandStatusEnum.deleted.getDesc(), locale));
            }
            it.setCreateTime(it.getCreatedOn() == null ? "" : ft.format(it.getCreatedOn()));
            it.setHandlerTime(it.getHandlerOn() == null ? "" : ft.format(it.getHandlerOn()));
        });
        return paginationResponseVo;
    }

    public List<WindDemandAttr> findAllDemandExtFields() {
        return this.windDemandAttrMapper.findAll();
    }

    public List<WindDemandAttr> findDemandExtFieldsByDefLabel(String defLabel) {
        return this.windDemandAttrMapper.findAllByDefLabel(defLabel);
    }

    public List<WindDemandAttrData> findAllDemandExtFieldData() {
        return this.windDemandAttrDataMapper.findAll();
    }

    public Long findAttrIdByAttrName(String name) {
        return this.windDemandAttrMapper.findIdByName(name);
    }

    public void saveOrUpdateDemandExtFields(List<WindDemandAttr> demandAttrs) {
        this.windDemandAttrMapper.saveAll(demandAttrs);
    }

    @Transactional
    public void deleteExtField(Long attrId) {
        this.windDemandAttrMapper.deleteById((Object)attrId);
        this.windDemandAttrDataMapper.deleteByAttributeId(attrId);
    }

    public List<WindDemandTask> getBasicResultList(List<WindDemandAttr> extFieldList, List<WindDemandTask> demandList) {
        ArrayList<WindDemandTask> resultList = new ArrayList<WindDemandTask>();
        for (WindDemandTask demand : demandList) {
            ArrayList<AttrVo> attrList = new ArrayList<AttrVo>();
            for (WindDemandAttr attr : extFieldList) {
                AttrVo w = new AttrVo();
                w.setAttributeName(attr.getAttributeName());
                w.setAttributeValue("");
                attrList.add(w);
            }
            demand.setAttrList(attrList);
            resultList.add(demand);
        }
        return resultList;
    }

    public HashMap<String, List<AttrVo>> getAttrListMap(List<WindDemandAttr> extFieldList, List<WindDemandAttrData> extFieldData) {
        HashMap<String, List<AttrVo>> resMap = new HashMap<String, List<AttrVo>>();
        for (WindDemandAttrData attrData : extFieldData) {
            List<Object> arrayList = null;
            arrayList = resMap.containsKey(attrData.getDemandId()) ? resMap.get(attrData.getDemandId()) : new ArrayList();
            for (WindDemandAttr attr : extFieldList) {
                if (!attr.getId().equals(attrData.getAttributeId())) continue;
                AttrVo workSiteAttrVo = new AttrVo();
                workSiteAttrVo.setAttributeName(attr.getAttributeName());
                workSiteAttrVo.setAttributeValue(attrData.getAttributeValue());
                arrayList.add(workSiteAttrVo);
            }
            resMap.put(attrData.getDemandId(), arrayList);
        }
        return resMap;
    }

    public HashMap<String, List<AttrVo>> getCompleteAttrListJson(HashMap<String, List<AttrVo>> attrListMap, List<WindDemandAttr> extFieldList) {
        HashMap<String, List<AttrVo>> resMap = new HashMap<String, List<AttrVo>>();
        Set<String> demandIds = attrListMap.keySet();
        for (String demandId : demandIds) {
            List<AttrVo> arrayList = attrListMap.get(demandId);
            ArrayList<String> attrNameListFromAttrListJson = new ArrayList<String>();
            for (AttrVo vo : arrayList) {
                String attrName = vo.getAttributeName();
                attrNameListFromAttrListJson.add(attrName);
            }
            List attrNameListFromTable = extFieldList.stream().map(WindDemandAttr::getAttributeName).collect(Collectors.toList());
            attrNameListFromTable.removeAll(attrNameListFromAttrListJson);
            for (String attrName : attrNameListFromTable) {
                AttrVo w = new AttrVo();
                w.setAttributeName(attrName);
                w.setAttributeValue("");
                arrayList.add(w);
            }
            resMap.put(demandId, arrayList);
        }
        return resMap;
    }

    public List<WindDemandTask> replaceAttrListField(List<WindDemandTask> basicResultList, HashMap<String, List<AttrVo>> attrListMap) {
        for (int i = 0; i < basicResultList.size(); ++i) {
            WindDemandTask demandObj = basicResultList.get(i);
            String demandId = demandObj.getId();
            if (!attrListMap.containsKey(demandId)) continue;
            demandObj.setAttrList(attrListMap.get(demandId));
            basicResultList.set(i, demandObj);
        }
        return basicResultList;
    }

    public List<DemandTypeVo> getBasicResultList1(List<WindDemandAttr> extFieldList, List<DemandTypeVo> demandList) {
        ArrayList<DemandTypeVo> resultList = new ArrayList<DemandTypeVo>();
        for (DemandTypeVo demand : demandList) {
            ArrayList<AttrVo> attrList = new ArrayList<AttrVo>();
            for (WindDemandAttr attr : extFieldList) {
                AttrVo w = new AttrVo();
                w.setAttributeName(attr.getAttributeName());
                w.setAttributeValue("");
                attrList.add(w);
            }
            demand.setAttrList(attrList);
            resultList.add(demand);
        }
        return resultList;
    }

    public List<DemandTypeVo> replaceAttrListField1(List<DemandTypeVo> basicResultList, HashMap<String, List<AttrVo>> attrListMap) {
        for (int i = 0; i < basicResultList.size(); ++i) {
            DemandTypeVo demandObj = basicResultList.get(i);
            String demandId = demandObj.getId();
            if (!attrListMap.containsKey(demandId)) continue;
            demandObj.setAttrList(attrListMap.get(demandId));
            basicResultList.set(i, demandObj);
        }
        return basicResultList;
    }

    public void showTablePolish(String polishFunc, List<OperatorTableExpandCols> expandCols, PaginationResponseVo paginationResponseVo) {
        String as = this.scriptService.executeFunctionGetString(polishFunc, new Object[]{JSON.toJSONString((Object)paginationResponseVo.getPageList()), JSON.toJSONString(expandCols)});
        paginationResponseVo.setPageList((List)JSONArray.parseArray((String)as));
    }

    public boolean distributePass(String agvId) {
        try {
            Map result = OkHttpUtil.postJson((String)(PropConfig.getRdsCoreBaseUrl() + ApiEnum.distributeTaskDone.getUri() + "/" + agvId), (String)JSONObject.toJSONString((Object)Maps.newHashMap()));
            return "200".equals(result.get("code"));
        }
        catch (Exception e) {
            log.error("distributePass error", (Throwable)e);
            return false;
        }
    }

    public boolean distributePendingAndContinued(String taskRecordId, String loc, boolean b) {
        try {
            HashMap params = Maps.newHashMap();
            params.put("loc", loc);
            params.put("full", b);
            params.put("externalId", taskRecordId);
            Map result = OkHttpUtil.postJson((String)(PropConfig.getRdsCoreBaseUrl() + ApiEnum.setFull.getUri()), (String)JSONObject.toJSONString((Object)params));
            return "200".equals(result.get("code"));
        }
        catch (Exception e) {
            log.error("distributePendingAndContinued error", (Throwable)e);
            return false;
        }
    }

    public boolean distributeDel(String distributeOrderId, String loc) {
        try {
            ArrayList<String> distributeVos = new ArrayList<String>();
            distributeVos.add(loc);
            HashMap param = Maps.newHashMap();
            param.put("id", distributeOrderId);
            param.put("unwantedToLocList", distributeVos);
            Map map = OkHttpUtil.postJson((String)(PropConfig.getRdsCoreBaseUrl() + ApiEnum.removeFromToLocList.getUri()), (String)JSONObject.toJSONString((Object)param));
            String code = (String)map.get("code");
            int reponseCode = Integer.parseInt(code);
            if (reponseCode >= 200 && reponseCode < 300) {
                return true;
            }
        }
        catch (IOException e) {
            log.error("distributeDel error {}", (Object)e.getMessage());
        }
        return false;
    }

    public boolean distributeAdd(String orderId, List<String> locs) {
        try {
            HashMap param = Maps.newHashMap();
            param.put("id", orderId);
            param.put("additionalToLocList", locs);
            Map map = OkHttpUtil.postJson((String)(PropConfig.getRdsCoreBaseUrl() + ApiEnum.appendToLocList.getUri()), (String)JSONObject.toJSONString((Object)param));
            String code = (String)map.get("code");
            int reponseCode = Integer.parseInt(code);
            if (reponseCode >= 200 && reponseCode < 300) {
                return true;
            }
        }
        catch (Exception e) {
            log.error("distributeAdd error {}", (Object)e.getMessage());
        }
        return false;
    }
}

