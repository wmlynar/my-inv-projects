/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.alibaba.fastjson.JSONArray
 *  com.alibaba.fastjson.JSONObject
 *  com.google.common.collect.Maps
 *  com.seer.rds.config.PropConfig
 *  com.seer.rds.constant.ApiEnum
 *  com.seer.rds.model.wind.TaskRecord
 *  com.seer.rds.service.agv.WindService
 *  com.seer.rds.service.wind.AbstratRootBp
 *  com.seer.rds.service.wind.RootBp
 *  com.seer.rds.service.wind.WindTaskAGV
 *  com.seer.rds.service.wind.taskBp.CAgvOperationBp$Blocks
 *  com.seer.rds.util.OkHttpUtil
 *  com.seer.rds.util.ResourceUtil
 *  com.seer.rds.util.SpringUtil
 *  com.seer.rds.vo.AgvPath
 *  com.seer.rds.vo.wind.CAgvOperationBpField
 *  com.seer.rds.vo.wind.GlobalField
 *  com.seer.rds.vo.wind.GlobalFieldInputParams
 *  org.apache.commons.collections.CollectionUtils
 *  org.apache.commons.lang3.StringUtils
 *  org.slf4j.Logger
 *  org.slf4j.LoggerFactory
 */
package com.seer.rds.service.wind;

import com.alibaba.fastjson.JSONArray;
import com.alibaba.fastjson.JSONObject;
import com.google.common.collect.Maps;
import com.seer.rds.config.PropConfig;
import com.seer.rds.constant.ApiEnum;
import com.seer.rds.model.wind.TaskRecord;
import com.seer.rds.service.agv.WindService;
import com.seer.rds.service.wind.AbstratRootBp;
import com.seer.rds.service.wind.RootBp;
import com.seer.rds.service.wind.taskBp.CAgvOperationBp;
import com.seer.rds.util.OkHttpUtil;
import com.seer.rds.util.ResourceUtil;
import com.seer.rds.util.SpringUtil;
import com.seer.rds.vo.AgvPath;
import com.seer.rds.vo.wind.CAgvOperationBpField;
import com.seer.rds.vo.wind.GlobalField;
import com.seer.rds.vo.wind.GlobalFieldInputParams;
import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.concurrent.ConcurrentHashMap;
import org.apache.commons.collections.CollectionUtils;
import org.apache.commons.lang3.StringUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/*
 * Exception performing whole class analysis ignored.
 */
public class WindTaskAGV {
    private static final Logger log = LoggerFactory.getLogger(WindTaskAGV.class);

    public static void getAGVScript(String taskId, String scriptName, AbstratRootBp rootBp, JSONObject inputParams, CAgvOperationBp.Blocks block) {
        ConcurrentHashMap<String, Object> customCommandMap = new ConcurrentHashMap<String, Object>();
        if (StringUtils.equals((CharSequence)scriptName, (CharSequence)"CustomCommand")) {
            Object commandArgs;
            String commandType = (String)rootBp.getInputParamValue(taskId, inputParams, "custom_" + CAgvOperationBpField.customCommandType);
            customCommandMap.put(CAgvOperationBpField.customCommandType, commandType);
            if (Objects.equals(commandType, "Script")) {
                commandArgs = rootBp.getInputParamValue(taskId, inputParams, "custom_scriptArgs");
                customCommandMap.put(CAgvOperationBpField.customCommandName, rootBp.getInputParamValue(taskId, inputParams, "custom_scriptName"));
            } else {
                commandArgs = rootBp.getInputParamValue(taskId, inputParams, "custom_operationArgs");
                customCommandMap.put(CAgvOperationBpField.customCommandName, rootBp.getInputParamValue(taskId, inputParams, "custom_operationName"));
            }
            if (Objects.nonNull(commandArgs)) {
                customCommandMap.put(CAgvOperationBpField.customCommandArgs, commandArgs);
            }
        }
        HashMap scriptArgs = Maps.newHashMap();
        if (StringUtils.isNotEmpty((CharSequence)scriptName)) {
            PropConfig propConfig = (PropConfig)SpringUtil.getBean(PropConfig.class);
            List allScriptFileStr = ResourceUtil.readFileToString((String)(propConfig.getConfigDir() + "rbk-scripts.json"), (String)"json");
            if (CollectionUtils.isEmpty((Collection)allScriptFileStr)) {
                log.error("rbk-scripts.json file is not exist");
                throw new RuntimeException("failed to run\uff1arbk-scripts.json file is not exist");
            }
            log.info("allScriptFileStr={}", (Object)allScriptFileStr.size());
            JSONObject allScriptFileJson = JSONObject.parseObject((String)((String)allScriptFileStr.get(0)));
            JSONObject scriptFileJson = allScriptFileJson.getJSONObject(scriptName);
            if (scriptFileJson == null) {
                throw new RuntimeException("Unknown script name or operation, check rbk-script.json.");
            }
            JSONArray fileInputParamsArray = scriptFileJson.getJSONArray(GlobalField.inputParams);
            for (int i = 0; i < fileInputParamsArray.size(); ++i) {
                String name = fileInputParamsArray.getJSONObject(i).getString(GlobalFieldInputParams.name);
                String type = fileInputParamsArray.getJSONObject(i).getString(GlobalFieldInputParams.type);
                String varName = "var_" + name;
                Object inputParamValue = rootBp.getInputParamValue(taskId, inputParams, varName);
                if (inputParamValue == null) continue;
                if (inputParamValue instanceof String) {
                    String value = (String)inputParamValue;
                    if (value.isBlank()) continue;
                    Object convertValue = RootBp.convertCoreTransportOrderValueType((String)type, (String)value);
                    scriptArgs.put(name, convertValue);
                    continue;
                }
                scriptArgs.put(name, inputParamValue);
            }
        }
        if (StringUtils.isNotEmpty((CharSequence)scriptName)) {
            if (scriptName.endsWith(".py")) {
                block.setOperation("script");
                block.setScriptArgs((Map)scriptArgs);
                block.setScriptName(scriptName);
            } else if (scriptName.equals("binTask")) {
                block.setBinTask(scriptArgs.getOrDefault("param", "NO_DEFINE").toString());
            } else if (scriptName.equals("preBinTask")) {
                block.setPreBinTask(scriptArgs.getOrDefault("param", "NO_DEFINE").toString());
            } else if (scriptName.equals("CustomCommand")) {
                if (customCommandMap.get(CAgvOperationBpField.customCommandType).equals("Script")) {
                    block.setOperation("script");
                    block.setScriptName((String)customCommandMap.get(CAgvOperationBpField.customCommandName));
                    if (Objects.nonNull(customCommandMap.get(CAgvOperationBpField.customCommandArgs))) {
                        block.setScriptArgs((Map)customCommandMap.get(CAgvOperationBpField.customCommandArgs));
                    }
                } else {
                    block.setOperation((String)customCommandMap.get(CAgvOperationBpField.customCommandName));
                    if (Objects.nonNull(customCommandMap.get(CAgvOperationBpField.customCommandArgs))) {
                        block.setOperationArgs((Map)customCommandMap.get(CAgvOperationBpField.customCommandArgs));
                    }
                }
            } else {
                block.setOperation(scriptName);
                block.setOperationArgs((Map)scriptArgs);
            }
        }
    }

    /*
     * WARNING - Removed try catching itself - possible behaviour change.
     */
    public static void setAgvPath(String startTime, String endTime, String agvId, String operator, String loc, TaskRecord taskRecord) {
        TaskRecord taskRecord2 = taskRecord;
        synchronized (taskRecord2) {
            String path = taskRecord.getPath();
            List<AgvPath> agvPaths = new ArrayList();
            JSONObject jsonObject = new JSONObject();
            if (StringUtils.isNotEmpty((CharSequence)path)) {
                jsonObject = JSONObject.parseObject((String)path);
                JSONArray jsonArray = jsonObject.getJSONArray(agvId);
                if (CollectionUtils.isNotEmpty((Collection)jsonArray)) {
                    agvPaths = JSONArray.parseArray((String)JSONObject.toJSONString((Object)jsonArray), AgvPath.class);
                    if (WindTaskAGV.isPathDuplicate(agvPaths, (String)startTime, (String)endTime, (String)operator, (String)loc)) {
                        return;
                    }
                    WindTaskAGV.removeLastIfRedundant(agvPaths, (String)startTime, (String)endTime, (String)operator, (String)loc);
                } else {
                    WindTaskAGV.addInitialAgvPath(agvPaths, (String)agvId, (String)startTime);
                }
            } else {
                WindTaskAGV.addInitialAgvPath(agvPaths, (String)agvId, (String)startTime);
            }
            AgvPath agvPath = new AgvPath();
            agvPath.setEndTime(endTime);
            agvPath.setStartTime(startTime);
            agvPath.setLocation(loc);
            agvPath.setLoad(operator);
            agvPaths.add(agvPath);
            jsonObject.put(agvId, agvPaths);
            taskRecord.setPath(JSONObject.toJSONString((Object)jsonObject));
            WindService windService = (WindService)SpringUtil.getBean(WindService.class);
            windService.updateTaskRecordPath(taskRecord, agvId, agvPaths);
        }
    }

    private static boolean isPathDuplicate(List<AgvPath> agvPaths, String startTime, String endTime, String operator, String loc) {
        for (AgvPath agvPath : agvPaths) {
            if (!StringUtils.equals((CharSequence)startTime, (CharSequence)agvPath.getStartTime()) || !StringUtils.equals((CharSequence)endTime, (CharSequence)agvPath.getEndTime()) || !StringUtils.equals((CharSequence)operator, (CharSequence)agvPath.getLoad()) || !StringUtils.equals((CharSequence)loc, (CharSequence)agvPath.getLocation())) continue;
            return true;
        }
        return false;
    }

    private static void removeLastIfRedundant(List<AgvPath> agvPaths, String startTime, String endTime, String operator, String loc) {
        AgvPath lastPath = agvPaths.get(agvPaths.size() - 1);
        if (StringUtils.equals((CharSequence)loc, (CharSequence)lastPath.getLocation()) && StringUtils.equals((CharSequence)startTime, (CharSequence)lastPath.getStartTime()) && !StringUtils.equals((CharSequence)endTime, (CharSequence)lastPath.getEndTime()) && StringUtils.equals((CharSequence)operator, (CharSequence)lastPath.getLoad())) {
            agvPaths.remove(agvPaths.size() - 1);
        }
    }

    private static void addInitialAgvPath(List<AgvPath> agvPaths, String agvId, String startTime) {
        String agvLocation = WindTaskAGV.getAgvLocation((String)agvId);
        AgvPath agvPathStart = new AgvPath();
        agvPathStart.setEndTime(startTime);
        agvPathStart.setStartTime(startTime);
        agvPathStart.setLocation(agvLocation);
        agvPathStart.setLoad("start");
        agvPaths.add(agvPathStart);
    }

    /*
     * WARNING - Removed try catching itself - possible behaviour change.
     */
    public static void setAgvPathEnd(String endTime, String agvId, TaskRecord taskRecord, boolean ifChangAgv) {
        TaskRecord taskRecord2 = taskRecord;
        synchronized (taskRecord2) {
            JSONArray jsonArray;
            String path = taskRecord.getPath();
            List<AgvPath> agvPaths = new ArrayList();
            JSONObject jsonObject = new JSONObject();
            if (StringUtils.isNotEmpty((CharSequence)path) && CollectionUtils.isNotEmpty((Collection)(jsonArray = (jsonObject = JSONObject.parseObject((String)path)).getJSONArray(agvId)))) {
                agvPaths = JSONArray.parseArray((String)JSONObject.toJSONString((Object)jsonArray), AgvPath.class);
                AgvPath remove = (AgvPath)agvPaths.remove(agvPaths.size() - 1);
                AgvPath agvPath = new AgvPath();
                if (ifChangAgv) {
                    agvPath.setChangeAGVTime(endTime);
                } else {
                    agvPath.setEndTime(endTime);
                }
                agvPath.setStartTime(remove.getStartTime());
                agvPath.setLocation(remove.getLocation());
                agvPath.setLoad(remove.getLoad());
                agvPaths.add(agvPath);
                jsonObject.put(agvId, agvPaths);
                taskRecord.setPath(JSONObject.toJSONString((Object)jsonObject));
                WindService windService = (WindService)SpringUtil.getBean(WindService.class);
                windService.updateTaskRecordPath(taskRecord, agvId, agvPaths);
            }
        }
    }

    public static String getAgvLocation(String agvId) {
        String params = "?vehicles=" + agvId + "&paths=report.rbk_report.current_station,report.rbk_report.last_station";
        HashMap resultMap = new HashMap();
        String location = "";
        String last_station = "";
        while (true) {
            try {
                resultMap.clear();
                resultMap.putAll(OkHttpUtil.getWithHttpCode((String)(RootBp.getUrl((String)ApiEnum.robotsStatus.getUri()) + params)));
                JSONArray jsonArray = JSONObject.parseObject((String)((String)resultMap.get("body"))).getJSONArray("report");
                if (jsonArray != null) {
                    location = jsonArray.getJSONObject(0).getJSONObject("rbk_report").getString("current_station");
                    last_station = jsonArray.getJSONObject(0).getJSONObject("rbk_report").getString("last_station");
                    log.info("currentStation = {}, lastStation = {}", (Object)location, (Object)last_station);
                    if (location.isEmpty()) {
                        return last_station;
                    }
                    return location;
                }
            }
            catch (Exception e) {
                log.error("VehicleStation error {}", (Throwable)e);
            }
            try {
                Thread.sleep(2000L);
            }
            catch (InterruptedException e) {
                throw new RuntimeException(e);
            }
        }
    }

    public static String operationLog(CAgvOperationBp.Blocks block) {
        String str = "@{wind.bp.cAgvnoneOperation}";
        if (StringUtils.isNotEmpty((CharSequence)block.getOperation()) && StringUtils.isEmpty((CharSequence)block.getScriptName())) {
            str = String.format("@{wind.bp.cAgvOperation}=%s,@{wind.bp.cAgvparams}=%s", block.getOperation(), block.getOperationArgs() == null ? "" : JSONObject.toJSONString((Object)block.getOperationArgs()));
        } else if (StringUtils.isNotEmpty((CharSequence)block.getScriptName())) {
            str = String.format("@{wind.bp.cAgvScript}=%s,@{wind.bp.cAgvparams}=%s", block.getScriptName(), block.getScriptArgs() == null ? "" : JSONObject.toJSONString((Object)block.getScriptArgs()));
        } else if (StringUtils.isNotEmpty((CharSequence)block.getPreBinTask())) {
            str = String.format("preBinTask=%s", block.getPreBinTask() == null ? "" : block.getPreBinTask());
        } else if (StringUtils.isNotEmpty((CharSequence)block.getBinTask())) {
            str = String.format("binTask=%s", block.getBinTask() == null ? "" : block.getBinTask());
        }
        return str;
    }
}

