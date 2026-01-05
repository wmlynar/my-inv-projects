/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.alibaba.fastjson.JSON
 *  com.alibaba.fastjson.JSONArray
 *  com.alibaba.fastjson.JSONObject
 *  com.alibaba.fastjson.parser.Feature
 *  com.google.common.collect.Maps
 *  com.seer.rds.config.GlobalCacheConfig
 *  com.seer.rds.config.PropConfig
 *  com.seer.rds.constant.TaskLogLevelEnum
 *  com.seer.rds.constant.TaskStatusEnum
 *  com.seer.rds.dao.EventDefMapper
 *  com.seer.rds.dao.InterfaceHandleMapper
 *  com.seer.rds.dao.WindTaskDefMapper
 *  com.seer.rds.exception.RevertJumpException
 *  com.seer.rds.exception.StopBranchException
 *  com.seer.rds.model.wind.BaseRecord
 *  com.seer.rds.model.wind.EventDef
 *  com.seer.rds.model.wind.EventRecord
 *  com.seer.rds.model.wind.InterfaceHandleRecord
 *  com.seer.rds.model.wind.InterfacePreHandle
 *  com.seer.rds.model.wind.WindBlockRecord
 *  com.seer.rds.model.wind.WindTaskDef
 *  com.seer.rds.model.wind.WindTaskRecord
 *  com.seer.rds.service.agv.WindService
 *  com.seer.rds.service.agv.WindTaskService
 *  com.seer.rds.service.threadPool.LinkedBqThreadPool
 *  com.seer.rds.service.wind.AbstratRootBp
 *  com.seer.rds.service.wind.BlockExecutor
 *  com.seer.rds.service.wind.commonBp.IfElseBp
 *  com.seer.rds.service.wind.commonBp.IfElseIfBp
 *  com.seer.rds.service.wind.commonBp.SubTaskBp
 *  com.seer.rds.service.wind.taskBp.TryCatchBp
 *  com.seer.rds.util.DateUtil
 *  com.seer.rds.util.SpringUtil
 *  com.seer.rds.vo.TaskDetailVo
 *  com.seer.rds.vo.WindBlockVo
 *  com.seer.rds.vo.req.SetOrderReq
 *  com.seer.rds.vo.wind.BlockField
 *  com.seer.rds.vo.wind.CoreValueTypeField
 *  com.seer.rds.vo.wind.FieldTypeField
 *  com.seer.rds.vo.wind.FieldTypeValueField
 *  com.seer.rds.vo.wind.GlobalField
 *  com.seer.rds.vo.wind.GlobalFieldInputParams
 *  com.seer.rds.vo.wind.ParamPreField
 *  com.seer.rds.vo.wind.TaskField
 *  com.seer.rds.vo.wind.TryCatchBpField
 *  org.apache.commons.compress.utils.Lists
 *  org.apache.commons.lang3.StringUtils
 *  org.graalvm.polyglot.Context
 *  org.mvel2.MVEL
 *  org.slf4j.Logger
 *  org.slf4j.LoggerFactory
 *  org.springframework.beans.factory.annotation.Autowired
 *  org.springframework.stereotype.Component
 */
package com.seer.rds.service.wind;

import com.alibaba.fastjson.JSON;
import com.alibaba.fastjson.JSONArray;
import com.alibaba.fastjson.JSONObject;
import com.alibaba.fastjson.parser.Feature;
import com.google.common.collect.Maps;
import com.seer.rds.config.GlobalCacheConfig;
import com.seer.rds.config.PropConfig;
import com.seer.rds.constant.TaskLogLevelEnum;
import com.seer.rds.constant.TaskStatusEnum;
import com.seer.rds.dao.EventDefMapper;
import com.seer.rds.dao.InterfaceHandleMapper;
import com.seer.rds.dao.WindTaskDefMapper;
import com.seer.rds.exception.RevertJumpException;
import com.seer.rds.exception.StopBranchException;
import com.seer.rds.model.wind.BaseRecord;
import com.seer.rds.model.wind.EventDef;
import com.seer.rds.model.wind.EventRecord;
import com.seer.rds.model.wind.InterfaceHandleRecord;
import com.seer.rds.model.wind.InterfacePreHandle;
import com.seer.rds.model.wind.WindBlockRecord;
import com.seer.rds.model.wind.WindTaskDef;
import com.seer.rds.model.wind.WindTaskRecord;
import com.seer.rds.service.agv.WindService;
import com.seer.rds.service.agv.WindTaskService;
import com.seer.rds.service.threadPool.LinkedBqThreadPool;
import com.seer.rds.service.wind.BlockExecutor;
import com.seer.rds.service.wind.commonBp.IfElseBp;
import com.seer.rds.service.wind.commonBp.IfElseIfBp;
import com.seer.rds.service.wind.commonBp.SubTaskBp;
import com.seer.rds.service.wind.taskBp.TryCatchBp;
import com.seer.rds.util.DateUtil;
import com.seer.rds.util.SpringUtil;
import com.seer.rds.vo.TaskDetailVo;
import com.seer.rds.vo.WindBlockVo;
import com.seer.rds.vo.req.SetOrderReq;
import com.seer.rds.vo.wind.BlockField;
import com.seer.rds.vo.wind.CoreValueTypeField;
import com.seer.rds.vo.wind.FieldTypeField;
import com.seer.rds.vo.wind.FieldTypeValueField;
import com.seer.rds.vo.wind.GlobalField;
import com.seer.rds.vo.wind.GlobalFieldInputParams;
import com.seer.rds.vo.wind.ParamPreField;
import com.seer.rds.vo.wind.TaskField;
import com.seer.rds.vo.wind.TryCatchBpField;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Date;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.Callable;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import java.util.concurrent.Future;
import java.util.concurrent.locks.LockSupport;
import java.util.function.Function;
import java.util.function.Predicate;
import org.apache.commons.compress.utils.Lists;
import org.apache.commons.lang3.StringUtils;
import org.graalvm.polyglot.Context;
import org.mvel2.MVEL;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

/*
 * Exception performing whole class analysis ignored.
 */
@Component
public abstract class AbstratRootBp<T extends BaseRecord> {
    private static final Logger log = LoggerFactory.getLogger(AbstratRootBp.class);
    public static InheritableThreadLocal<ConcurrentHashMap<String, Object>> inputParamsMap = new InheritableThreadLocal();
    public static ConcurrentHashMap<String, Object> extInputParamsMap = new ConcurrentHashMap();
    public static ConcurrentHashMap<String, BaseRecord> windTaskRecordMap = new ConcurrentHashMap();
    public static InheritableThreadLocal<ConcurrentHashMap<String, Object>> outputParamsMap = new InheritableThreadLocal();
    public static ConcurrentHashMap<String, Boolean> taskStatus = new ConcurrentHashMap();
    public static ConcurrentHashMap<String, Thread> taskThreadMap = new ConcurrentHashMap();
    public static ConcurrentHashMap<String, Boolean> taskRunning = new ConcurrentHashMap();
    public static InheritableThreadLocal<ConcurrentHashMap<String, Object>> taskVariablesMap = new InheritableThreadLocal();
    public static ConcurrentHashMap<String, Integer> taskPriority = new ConcurrentHashMap();
    public static ConcurrentHashMap<String, InheritableThreadLocal<String>> distributeOrderCache = new ConcurrentHashMap();
    public static ConcurrentHashMap<String, Integer> pathCache = new ConcurrentHashMap();
    public static ConcurrentHashMap<String, Map<String, Set<String>>> childrenMap = new ConcurrentHashMap();
    public String taskRecordID;
    public static ConcurrentHashMap<String, List<Context>> contextMap = new ConcurrentHashMap();
    public T taskRecord;
    public String taskId;
    @Autowired
    private WindTaskDefMapper windTaskDefMapper;
    @Autowired
    private WindService windService;
    @Autowired
    private InterfaceHandleMapper interfaceHandleMapper;
    @Autowired
    private EventDefMapper eventDefMapper;
    @Autowired
    private WindTaskService windTaskService;
    public boolean ifReset = false;
    public WindBlockRecord blockRecord = new WindBlockRecord();
    public String remark;
    public String projectId;
    public ConcurrentHashMap<String, Object> cacheBlockIfResetMap;
    public JSONArray childrenDefault;
    public String taskLabel;
    public String detail;

    /*
     * WARNING - Removed try catching itself - possible behaviour change.
     */
    public Object execute(SetOrderReq req) {
        try {
            Object taskfinished;
            JSONArray taskInputParams = this.buildRecord(req);
            JSONObject jsonObject = JSON.parseObject((String)this.detail);
            JSONObject rootBlock = jsonObject.getJSONObject("rootBlock");
            HashMap resultMap = new HashMap();
            this.parseBlock(rootBlock, resultMap);
            childrenMap.put(this.taskRecordID, resultMap);
            this.setParam(taskInputParams);
            this.saveTaskLogAndComponent(taskInputParams);
            this.executeChildren(this.childrenDefault, this.taskId, this.taskRecord, this.blockRecord, req, this.taskRecord.getCreatedOn());
            Object object = taskfinished = this.taskfinished(req);
            return object;
        }
        catch (Exception e) {
            Object object = this.exceptionHandle(e);
            return object;
        }
        finally {
            if (this.taskRecord != null && this.taskRecord.getId() != null) {
                childrenMap.remove(this.taskRecord.getId());
                contextMap.remove(this.taskRecord.getId());
                GlobalCacheConfig.clearTaskErrorCacheByContainsPrefix((String)this.taskRecord.getId());
            }
            this.clearCache();
        }
    }

    public void parseBlock(JSONObject block, Map<String, Set<String>> resultMap) {
        String name = block.getString("name");
        JSONObject children = block.getJSONObject("children");
        if (children != null && !children.isEmpty()) {
            for (String key : children.keySet()) {
                JSONArray jsonArray = children.getJSONArray(key);
                Set childSet = resultMap.getOrDefault(name, new HashSet());
                for (int i = 0; i < jsonArray.size(); ++i) {
                    JSONObject childBlock = jsonArray.getJSONObject(i);
                    String childName = childBlock.getString("name");
                    childSet.add(childName);
                    this.parseBlock(childBlock, resultMap);
                    childSet.addAll(resultMap.getOrDefault(childName, new HashSet()));
                }
                resultMap.put(name, childSet);
            }
        }
    }

    public void executeChild(AbstratRootBp rootBp, String taskId, BaseRecord taskRecord, JSONArray childrenDefault, Boolean isSerial) {
        if (GlobalCacheConfig.getCacheInterrupt((String)taskRecord.getId()) != null && GlobalCacheConfig.getCacheInterrupt((String)taskRecord.getId()).equals("SuspendKey")) {
            WindTaskRecord taskRecordById = this.windTaskService.getTaskRecordById(taskRecord.getId());
            taskRecordById.getStatus();
            if (taskRecordById.getStatus().intValue() != TaskStatusEnum.stop.getStatus()) {
                taskRecord.setEndedReason("[RootBp]\u5757\u6682\u505c");
                taskRecord.setEndedOn(new Date());
                taskRecord.setStatus(Integer.valueOf(TaskStatusEnum.interrupt.getStatus()));
                this.windService.saveTaskRecord((WindTaskRecord)taskRecord);
                LockSupport.park(Thread.currentThread());
                GlobalCacheConfig.clearCacheInterrupt((String)taskRecord.getId());
                taskRecord.setEndedOn(new Date());
                taskRecord.setEndedReason("[RootBp]\u5757\u6682\u505c\u6062\u590d");
                taskRecord.setStatus(Integer.valueOf(TaskStatusEnum.running.getStatus()));
                this.windService.saveTaskRecord((WindTaskRecord)taskRecord);
            }
        }
        if (isSerial.booleanValue()) {
            childrenDefault.forEach(bp -> {
                try {
                    JSONObject bpJson = JSONObject.parseObject((String)bp.toString());
                    String blockType = bpJson.getString(BlockField.blockType);
                    Integer blockId = bpJson.getInteger(BlockField.id);
                    String blockName = bpJson.getString(BlockField.name);
                    JSONObject inputParamss = bpJson.getJSONObject(BlockField.inputParams);
                    String remark = bpJson.getString(BlockField.remark);
                    String errorMsg = bpJson.getString(BlockField.errorMsg);
                    Long maxTimeOut = bpJson.getLong(BlockField.maxTimeOut);
                    errorMsg = errorMsg == null ? "" : errorMsg;
                    remark = remark == null ? "" : remark;
                    JSONObject childrenDefaultt = null;
                    if (blockType.equals(TryCatchBp.class.getSimpleName()) || blockType.equals(IfElseIfBp.class.getSimpleName()) || blockType.equals(IfElseBp.class.getSimpleName())) {
                        childrenDefaultt = bpJson.getJSONObject(BlockField.children);
                    } else {
                        JSONObject children = bpJson.getJSONObject(BlockField.children);
                        if (children != null) {
                            childrenDefaultt = children.getJSONArray(BlockField.childrenDefault);
                        }
                    }
                    if (blockType.startsWith("SubTask")) {
                        SubTaskBp subTaskBp = (SubTaskBp)SpringUtil.getBean(SubTaskBp.class);
                        WindBlockVo blockVo = WindBlockVo.builder().blockId(blockId).blockName(blockName).blockType(blockType).remark(remark).maxTimeOut(maxTimeOut).errorMsg(errorMsg).build();
                        subTaskBp.execute(rootBp, taskId, taskRecord, blockVo, inputParamss, null);
                    } else {
                        BlockExecutor bean = (BlockExecutor)SpringUtil.getBean((String)blockType);
                        WindBlockVo blockVo = WindBlockVo.builder().blockId(blockId).blockName(blockName).blockType(blockType).remark(remark).maxTimeOut(maxTimeOut).errorMsg(errorMsg).build();
                        bean.execute(rootBp, taskId, taskRecord, blockVo, inputParamss, (Object)childrenDefaultt);
                    }
                    if (GlobalCacheConfig.getCacheInterrupt((String)taskRecord.getId()) != null && GlobalCacheConfig.getCacheInterrupt((String)taskRecord.getId()).equals("SuspendKey")) {
                        WindTaskRecord taskRecordById = this.windTaskService.getTaskRecordById(taskRecord.getId());
                        taskRecordById.getStatus();
                        if (taskRecordById.getStatus().intValue() != TaskStatusEnum.stop.getStatus()) {
                            taskRecord.setEndedReason("[RootBp]\u5757\u6682\u505c");
                            taskRecord.setEndedOn(new Date());
                            taskRecord.setStatus(Integer.valueOf(TaskStatusEnum.interrupt.getStatus()));
                            this.windService.saveTaskRecord((WindTaskRecord)taskRecord);
                            LockSupport.park(Thread.currentThread());
                            GlobalCacheConfig.clearCacheInterrupt((String)taskRecord.getId());
                            taskRecord.setEndedOn(new Date());
                            taskRecord.setEndedReason("[RootBp]\u5757\u6682\u505c\u6062\u590d");
                            taskRecord.setStatus(Integer.valueOf(TaskStatusEnum.running.getStatus()));
                            this.windService.saveTaskRecord((WindTaskRecord)taskRecord);
                        }
                    }
                }
                catch (StopBranchException e) {
                    log.error("throw StopBranchException");
                    throw e;
                }
            });
        } else {
            LinkedBqThreadPool taskPool = LinkedBqThreadPool.getInstance();
            ArrayList futureList = Lists.newArrayList();
            childrenDefault.forEach(bp -> {
                Future result = taskPool.submit((Callable)new /* Unavailable Anonymous Inner Class!! */);
                futureList.add(result);
            });
            for (Future future : futureList) {
                try {
                    Boolean bl = (Boolean)future.get();
                }
                catch (Exception e) {
                    if (e.getMessage().contains(StopBranchException.class.getName()) || e.getMessage().contains(RevertJumpException.class.getName())) {
                        log.error("executeChild error", (Throwable)e);
                        if ("StopBranchKey".equals(GlobalCacheConfig.getCacheInterrupt((String)taskRecord.getId()))) {
                            // empty if block
                        }
                        if (!"RevertJumpKey".equals(GlobalCacheConfig.getCacheInterrupt((String)taskRecord.getId()))) continue;
                        throw new RevertJumpException("revert jump");
                    }
                    throw e;
                }
            }
            log.info("wait branch finish");
        }
    }

    public static List<TaskDetailVo> convert(List<TaskDetailVo> list, int pid, JSONObject children, boolean isTryCatch) {
        if (isTryCatch) {
            JSONArray tryChild = children.getJSONArray(TryCatchBpField.tryChild);
            for (int i = 0; i < tryChild.size(); ++i) {
                TaskDetailVo detailVo = new TaskDetailVo();
                JSONObject child = tryChild.getJSONObject(i);
                String blockType = child.getString(BlockField.blockType);
                Integer blockId = child.getInteger(BlockField.id);
                detailVo.setPid(Integer.valueOf(pid));
                detailVo.setBlockId(blockId);
                detailVo.setBlockType(blockType);
                list.add(detailVo);
                if (blockType.equals(TryCatchBp.class.getSimpleName())) {
                    JSONObject childJSONObject = child.getJSONObject(BlockField.children);
                    detailVo.setChildBlock((Object)childJSONObject);
                    detailVo.setChildBlockIsTryCatch(true);
                    AbstratRootBp.convert(list, (int)blockId, (JSONObject)childJSONObject, (boolean)true);
                    continue;
                }
                JSONArray childJSONArray = child.getJSONObject(BlockField.children).getJSONArray(BlockField.childrenDefault);
                if (childJSONArray == null || childJSONArray.size() <= 0) continue;
                detailVo.setChildBlock((Object)childJSONArray);
                detailVo.setChildBlockIsTryCatch(false);
                AbstratRootBp.convert(list, (int)blockId, (JSONObject)child.getJSONObject(BlockField.children), (boolean)false);
            }
        } else {
            JSONArray childrenDefault = children.getJSONArray(BlockField.childrenDefault);
            for (int i = 0; i < childrenDefault.size(); ++i) {
                TaskDetailVo detailVo = new TaskDetailVo();
                JSONObject child = childrenDefault.getJSONObject(i);
                String blockType = child.getString(BlockField.blockType);
                Integer blockId = child.getInteger(BlockField.id);
                detailVo.setPid(Integer.valueOf(pid));
                detailVo.setBlockId(blockId);
                detailVo.setBlockType(blockType);
                list.add(detailVo);
                if (blockType.equals(TryCatchBp.class.getSimpleName())) {
                    JSONObject childJSONObject = child.getJSONObject(BlockField.children);
                    detailVo.setChildBlock((Object)childJSONObject);
                    detailVo.setChildBlockIsTryCatch(true);
                    AbstratRootBp.convert(list, (int)blockId, (JSONObject)childJSONObject, (boolean)true);
                    continue;
                }
                JSONArray childJSONArray = child.getJSONObject(BlockField.children).getJSONArray(BlockField.childrenDefault);
                if (childJSONArray == null || childJSONArray.size() <= 0) continue;
                detailVo.setChildBlock((Object)childJSONArray);
                detailVo.setChildBlockIsTryCatch(false);
                AbstratRootBp.convert(list, (int)blockId, (JSONObject)child.getJSONObject(BlockField.children), (boolean)false);
            }
        }
        return list;
    }

    public static <T> Predicate<T> distinctByKey(Function<? super T, ?> keyExtractor) {
        ConcurrentHashMap.KeySetView seen = ConcurrentHashMap.newKeySet();
        return t -> seen.add(keyExtractor.apply(t));
    }

    public static TaskDetailVo getParent(List<TaskDetailVo> all, TaskDetailVo find) {
        return null;
    }

    public Object getInputParamValue(String taskId, JSONObject inputParams, String key) {
        JSONObject fieldJson = inputParams.getJSONObject(key);
        if (fieldJson == null) {
            return null;
        }
        String type = (String)fieldJson.get((Object)FieldTypeField.type);
        String value = fieldJson.getString(FieldTypeField.value);
        if (StringUtils.isEmpty((CharSequence)(value = StringUtils.trim((String)value)))) {
            return null;
        }
        if (type.equals(FieldTypeValueField.Simple)) {
            return value;
        }
        if (type.equals(FieldTypeValueField.Expression)) {
            HashMap vars = new HashMap();
            this.assemblingDynamicVariables(vars, value);
            Object ret = MVEL.eval((String)value, vars);
            return ret;
        }
        if (type.equals(FieldTypeValueField.JsonPair)) {
            JSONArray scriptArgsArray;
            HashMap commandArgs = Maps.newHashMap();
            if (value.contains("=")) {
                ArrayList res = new ArrayList();
                JSONArray objects = (JSONArray)JSONArray.parseObject((String)value, JSONArray.class, (Feature[])new Feature[]{Feature.OrderedField});
                for (int i = 0; i < objects.size(); ++i) {
                    JSONObject jsonObject = objects.getJSONObject(i);
                    LinkedHashMap<Object, Object> tmp = new LinkedHashMap<Object, Object>();
                    for (String s : jsonObject.keySet()) {
                        tmp.put(this.removeEqualsAndQuotes(s), this.removeEqualsAndQuotes(jsonObject.get((Object)s).toString()));
                    }
                    res.add(tmp);
                }
                scriptArgsArray = (JSONArray)JSONArray.parseObject((String)JSONArray.toJSONString(res), JSONArray.class, (Feature[])new Feature[]{Feature.OrderedField});
            } else {
                scriptArgsArray = (JSONArray)JSONArray.parseObject((String)value, JSONArray.class, (Feature[])new Feature[]{Feature.OrderedField});
            }
            for (int i = 0; i < scriptArgsArray.size(); ++i) {
                JSONObject so = scriptArgsArray.getJSONObject(i);
                Object[] values = so.values().toArray();
                if (values[2].equals("object")) {
                    commandArgs.put(values[0], JSONObject.parseObject((String)((String)values[1])));
                    continue;
                }
                commandArgs.put(values[0], values[1]);
            }
            return commandArgs;
        }
        return null;
    }

    private void assemblingDynamicVariables(Map vars, String value) {
        if (value.contains(ParamPreField.taskInputs) && ((ConcurrentHashMap)inputParamsMap.get()).size() > 0) {
            vars.putAll((Map)inputParamsMap.get());
        }
        if (value.contains(ParamPreField.blocks) && ((ConcurrentHashMap)outputParamsMap.get()).size() > 0) {
            vars.putAll((Map)outputParamsMap.get());
        }
        if (value.contains(ParamPreField.task)) {
            EventDef eventDef;
            HashMap taskParamsMap = Maps.newHashMap();
            HashMap paramsMap = Maps.newHashMap();
            if (this.taskRecord instanceof WindTaskRecord) {
                WindTaskDef task = this.windTaskDefMapper.findById((Object)this.taskId).orElse(null);
                if (task != null) {
                    paramsMap.put(TaskField.id, task.getId());
                    paramsMap.put(TaskField.defLabel, task.getLabel());
                }
            } else if (this.taskRecord instanceof InterfaceHandleRecord) {
                InterfacePreHandle interfacePreHandle = this.interfaceHandleMapper.findById((Object)this.taskId).orElse(null);
                if (interfacePreHandle != null) {
                    paramsMap.put(TaskField.id, interfacePreHandle.getId());
                    paramsMap.put(TaskField.defLabel, interfacePreHandle.getTaskDefLabel());
                }
            } else if (this.taskRecord instanceof EventRecord && (eventDef = (EventDef)this.eventDefMapper.findById((Object)this.taskId).orElse(null)) != null) {
                paramsMap.put(TaskField.id, eventDef.getId());
                paramsMap.put(TaskField.defLabel, eventDef.getLabel());
            }
            String dateTime = null;
            if (windTaskRecordMap.get(this.taskRecordID) != null && ((BaseRecord)windTaskRecordMap.get(this.taskRecordID)).getCreatedOn() != null) {
                dateTime = DateUtil.fmtDate2String((Date)((BaseRecord)windTaskRecordMap.get(this.taskRecordID)).getCreatedOn(), (String)JSON.DEFFAULT_DATE_FORMAT);
            }
            paramsMap.put(TaskField.createdOn, dateTime);
            paramsMap.put(TaskField.status, windTaskRecordMap.get(this.taskRecordID) == null ? null : ((BaseRecord)windTaskRecordMap.get(this.taskRecordID)).getStatus());
            paramsMap.put(TaskField.taskRecordId, this.taskRecordID);
            paramsMap.put(TaskField.priority, taskPriority.get(this.taskRecordID) != null ? (Integer)taskPriority.get(this.taskRecordID) : 1);
            taskParamsMap.put(ParamPreField.task, paramsMap);
            vars.putAll(taskParamsMap);
        }
        if (value.contains(ParamPreField.task) && value.contains(ParamPreField.variables)) {
            ConcurrentHashMap concurrentVariablesMap = (ConcurrentHashMap)taskVariablesMap.get();
            if (vars.containsKey(ParamPreField.task)) {
                Map stringObjectMap = (Map)vars.get(ParamPreField.task);
                stringObjectMap.putAll((Map)concurrentVariablesMap.get(ParamPreField.task));
            } else if (concurrentVariablesMap != null && concurrentVariablesMap.size() > 0) {
                vars.putAll((Map)taskVariablesMap.get());
            }
        }
        vars.put("StringUtils", new StringUtils());
    }

    private Object removeEqualsAndQuotes(String jsonString) {
        if (jsonString.indexOf("=") == 0) {
            String substring = jsonString.substring(1, jsonString.length());
            HashMap vars = new HashMap();
            this.assemblingDynamicVariables(vars, substring);
            return MVEL.eval((String)substring, vars);
        }
        return jsonString;
    }

    private void updateStatus(String taskId, WindTaskRecord taskRecord, WindBlockRecord blockRecord) {
    }

    private static <T> Map.Entry<String, T> convertParamValue(Map.Entry<String, T> entry) {
        if (entry != null) {
            if (entry.getValue() instanceof BigDecimal) {
                BigDecimal value = (BigDecimal)entry.getValue();
                entry.setValue(value);
            } else if (entry.getValue() instanceof Long) {
                Long value = (Long)entry.getValue();
                entry.setValue(value);
            } else if (entry.getValue() instanceof Double) {
                Double value = (Double)entry.getValue();
                entry.setValue(value);
            } else if (entry.getValue() instanceof Float) {
                Float value = (Float)entry.getValue();
                entry.setValue(value);
            } else if (entry.getValue() instanceof String) {
                String value = String.valueOf(entry.getValue());
                entry.setValue(value);
            } else if (entry.getValue() instanceof Integer) {
                Integer value = (Integer)entry.getValue();
                entry.setValue(value);
            }
        }
        return entry;
    }

    public static Object convertCoreTransportOrderValueType(String paramType, String defaultValue) {
        if (defaultValue != null) {
            if (CoreValueTypeField.Boolean.equals(paramType)) {
                return Boolean.parseBoolean(defaultValue);
            }
            if (CoreValueTypeField.JSONObject.equals(paramType)) {
                return JSONObject.parseObject((String)defaultValue);
            }
            if (CoreValueTypeField.Any.equals(paramType)) {
                return defaultValue;
            }
            if (CoreValueTypeField.String.equals(paramType)) {
                return defaultValue;
            }
            if (CoreValueTypeField.JSONArray.equals(paramType)) {
                return JSONObject.parseArray((String)defaultValue);
            }
            if (CoreValueTypeField.Double.equals(paramType)) {
                return Double.parseDouble(defaultValue);
            }
            if (CoreValueTypeField.Long.equals(paramType)) {
                return Long.parseLong(defaultValue);
            }
        }
        return null;
    }

    public static String getUrl(String uri) {
        return PropConfig.getRdsCoreBaseUrl() + uri;
    }

    public Object getInputParams(String key) {
        return ((ConcurrentHashMap)inputParamsMap.get()).get(key);
    }

    public static String getPrimaryId() {
        return UUID.randomUUID().toString();
    }

    public static String updatePathByAgvId(String path, String agvId, List agvPath) {
        JSONObject pathObject;
        if (StringUtils.isNotEmpty((CharSequence)path)) {
            pathObject = JSONObject.parseObject((String)path);
            pathObject.put(agvId, (Object)agvPath);
        } else {
            pathObject = new JSONObject();
            pathObject.put(agvId, (Object)agvPath);
        }
        return JSON.toJSONString((Object)pathObject);
    }

    public JSONArray getTaskInputParams(String inputParams, JSONObject root) {
        JSONArray taskInputParams = null;
        if (StringUtils.isEmpty((CharSequence)inputParams)) {
            taskInputParams = root.getJSONArray(GlobalField.inputParams);
        } else {
            taskInputParams = root.getJSONArray(GlobalField.inputParams);
            JSONObject reqInputParams = JSONObject.parseObject((String)inputParams);
            for (Map.Entry next : reqInputParams.entrySet()) {
                String reqName = (String)next.getKey();
                Object value = next.getValue();
                for (int i = 0; i < taskInputParams.size(); ++i) {
                    JSONObject param = taskInputParams.getJSONObject(i);
                    String name = param.getString(GlobalFieldInputParams.name);
                    if (!reqName.equals(name)) continue;
                    param.put(GlobalFieldInputParams.defaultValue, value);
                }
            }
        }
        return taskInputParams;
    }

    public void setParam(JSONArray taskInputParams) {
        ConcurrentMap paramMap = Maps.newConcurrentMap();
        for (int i = 0; i < taskInputParams.size(); ++i) {
            JSONObject paramObj = taskInputParams.getJSONObject(i);
            String name = paramObj.getString(GlobalFieldInputParams.name);
            try {
                String type;
                switch (type = paramObj.getString(GlobalFieldInputParams.type)) {
                    case "String": {
                        paramMap.put(name, paramObj.getString(GlobalFieldInputParams.defaultValue));
                        break;
                    }
                    case "Boolean": {
                        paramMap.put(name, paramObj.getBooleanValue(GlobalFieldInputParams.defaultValue));
                        break;
                    }
                    case "JSONObject": {
                        paramMap.put(name, paramObj.getJSONObject(GlobalFieldInputParams.defaultValue));
                        break;
                    }
                    case "JSONArray": {
                        paramMap.put(name, paramObj.getJSONArray(GlobalFieldInputParams.defaultValue));
                        break;
                    }
                    case "Double": {
                        paramMap.put(name, paramObj.getDoubleValue(GlobalFieldInputParams.defaultValue));
                        break;
                    }
                    case "Long": {
                        paramMap.put(name, paramObj.getLongValue(GlobalFieldInputParams.defaultValue));
                        break;
                    }
                    default: {
                        paramMap.put(name, paramObj.get((Object)GlobalFieldInputParams.defaultValue) == null ? "" : paramObj.getString(GlobalFieldInputParams.defaultValue));
                        break;
                    }
                }
                continue;
            }
            catch (Exception e) {
                log.info("RootBp InputParams Error {}", (Object)e.getMessage());
                paramMap.put(name, paramObj.get((Object)GlobalFieldInputParams.defaultValue) == null ? "" : paramObj.getString(GlobalFieldInputParams.defaultValue));
            }
        }
        ConcurrentHashMap<String, ConcurrentMap> iptMap = new ConcurrentHashMap<String, ConcurrentMap>();
        iptMap.put(ParamPreField.taskInputs, paramMap);
        inputParamsMap.set(iptMap);
        ConcurrentHashMap<String, ConcurrentMap> optMap = new ConcurrentHashMap<String, ConcurrentMap>();
        optMap.put(ParamPreField.blocks, Maps.newConcurrentMap());
        outputParamsMap.set(optMap);
        ConcurrentHashMap<String, Object> tvMap = new ConcurrentHashMap<String, Object>();
        ConcurrentMap tvParamMap = Maps.newConcurrentMap();
        tvParamMap.put(ParamPreField.variables, Maps.newConcurrentMap());
        tvMap.put(ParamPreField.task, tvParamMap);
        if (this.taskId != null) {
            tvMap.put(TaskField.id, this.taskId);
        }
        tvMap.put(TaskField.taskRecordId, this.taskRecordID);
        taskVariablesMap.set(tvMap);
    }

    public void saveTaskLogAndComponent(JSONArray taskInputParams) {
        taskStatus.put(this.taskId + this.taskRecord.getId(), true);
        GlobalCacheConfig.cache((String)(this.taskId + this.taskRecord.getId()), (Object)TaskStatusEnum.running.getStatus());
        if (this.taskRecord instanceof WindTaskRecord) {
            taskThreadMap.put(this.taskId + this.taskRecord.getId(), Thread.currentThread());
        }
        this.windService.saveLog(TaskLogLevelEnum.info.getLevel(), String.format("[%s]@{wind.bp.start}:recordId=%s", this.getClass().getSimpleName(), this.taskRecord.getId()), this.projectId, this.taskId, this.taskRecord.getId(), Integer.valueOf(-1));
        this.blockRecord.setOutputParams(JSONObject.toJSONString(outputParamsMap.get()));
        this.blockRecord.setInputParams(JSONObject.toJSONString(inputParamsMap.get()));
        this.blockRecord.setInternalVariables(JSONObject.toJSONString(taskVariablesMap.get()));
        this.blockRecord.setBlockInputParamsValue(taskInputParams.toJSONString());
        this.blockRecord.setRemark(this.remark == null ? "" : this.remark);
        this.windService.saveBlockRecord(this.blockRecord, Integer.valueOf(-1), "RootBp", this.projectId, this.taskId, this.taskRecord.getId(), this.taskRecord.getCreatedOn());
    }

    private void executeChildren(JSONArray childrenDefault, String taskId, T taskRecord, WindBlockRecord blockRecord, SetOrderReq req, Date startOn) {
        for (int i = 0; i < childrenDefault.size(); ++i) {
            String cacheInterrupt;
            WindBlockVo blockVo;
            JSONObject bpJson = childrenDefault.getJSONObject(i);
            String blockType = bpJson.getString(BlockField.blockType);
            JSONObject blockinputParamss = bpJson.getJSONObject(BlockField.inputParams);
            Object childrenDefaultt = null;
            childrenDefaultt = blockType.equals(TryCatchBp.class.getSimpleName()) || blockType.equals(IfElseIfBp.class.getSimpleName()) || blockType.equals(IfElseBp.class.getSimpleName()) ? bpJson.getJSONObject(BlockField.children) : bpJson.getJSONObject(BlockField.children).getJSONArray(BlockField.childrenDefault);
            String blockName = bpJson.getString(BlockField.name);
            Integer blockId = bpJson.getInteger(BlockField.id);
            String remark = bpJson.getString(BlockField.remark);
            remark = remark == null ? "" : remark;
            String errorMsg = bpJson.getString(BlockField.errorMsg);
            Long maxTimeOut = bpJson.getLong(BlockField.maxTimeOut);
            String string = errorMsg = errorMsg == null ? "" : errorMsg;
            if (blockType.startsWith("SubTask")) {
                SubTaskBp subTaskBp = (SubTaskBp)SpringUtil.getBean(SubTaskBp.class);
                blockVo = WindBlockVo.builder().blockId(blockId).blockName(blockName).blockType(blockType).remark(remark).maxTimeOut(maxTimeOut).errorMsg(errorMsg).build();
                subTaskBp.execute(this, taskId, taskRecord, blockVo, blockinputParamss, null);
            } else {
                BlockExecutor bean = (BlockExecutor)SpringUtil.getBean((String)blockType);
                blockVo = WindBlockVo.builder().blockId(blockId).blockName(blockName).blockType(blockType).remark(remark).maxTimeOut(maxTimeOut).errorMsg(errorMsg).build();
                bean.execute(this, taskId, taskRecord, blockVo, blockinputParamss, childrenDefaultt);
            }
            if (!(taskRecord instanceof WindTaskRecord) || (cacheInterrupt = GlobalCacheConfig.getCacheInterrupt((String)taskRecord.getId())) == null || !"SuspendKey".equals(cacheInterrupt)) continue;
            WindTaskRecord taskRecordById = this.windTaskService.getTaskRecordById(taskRecord.getId());
            taskRecordById.getStatus();
            if (taskRecordById.getStatus().intValue() == TaskStatusEnum.stop.getStatus()) continue;
            taskRecord.setEndedReason("[RootBp]\u5757\u6682\u505c");
            taskRecord.setEndedOn(new Date());
            taskRecord.setStatus(Integer.valueOf(TaskStatusEnum.interrupt.getStatus()));
            this.windService.saveTaskRecord((WindTaskRecord)taskRecord);
            LockSupport.park(Thread.currentThread());
            GlobalCacheConfig.clearCacheInterrupt((String)taskRecord.getId());
            taskRecord.setEndedOn(new Date());
            taskRecord.setEndedReason("[RootBp]\u5757\u6682\u505c\u6062\u590d");
            taskRecord.setStatus(Integer.valueOf(TaskStatusEnum.running.getStatus()));
            this.windService.saveTaskRecord((WindTaskRecord)taskRecord);
        }
    }

    public abstract Object exceptionHandle(Exception var1);

    public abstract void clearCache();

    public abstract Object taskfinished(SetOrderReq var1);

    public abstract JSONArray buildRecord(SetOrderReq var1);
}

