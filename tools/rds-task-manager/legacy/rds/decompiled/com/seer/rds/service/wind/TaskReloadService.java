/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.alibaba.fastjson.JSON
 *  com.alibaba.fastjson.JSONArray
 *  com.alibaba.fastjson.JSONObject
 *  com.seer.rds.config.GlobalCacheConfig
 *  com.seer.rds.dao.WindBlockRecordMapper
 *  com.seer.rds.dao.WindTaskDefMapper
 *  com.seer.rds.model.wind.WindBlockRecord
 *  com.seer.rds.model.wind.WindTaskDef
 *  com.seer.rds.model.wind.WindTaskRecord
 *  com.seer.rds.service.admin.SysAlarmService
 *  com.seer.rds.service.threadPool.LinkedBqThreadPool
 *  com.seer.rds.service.wind.RootBp
 *  com.seer.rds.service.wind.TaskReloadService
 *  com.seer.rds.util.SpringUtil
 *  com.seer.rds.vo.req.SetOrderReq
 *  com.seer.rds.vo.wind.ParamPreField
 *  org.slf4j.Logger
 *  org.slf4j.LoggerFactory
 *  org.springframework.beans.factory.annotation.Autowired
 *  org.springframework.stereotype.Component
 */
package com.seer.rds.service.wind;

import com.alibaba.fastjson.JSON;
import com.alibaba.fastjson.JSONArray;
import com.alibaba.fastjson.JSONObject;
import com.seer.rds.config.GlobalCacheConfig;
import com.seer.rds.dao.WindBlockRecordMapper;
import com.seer.rds.dao.WindTaskDefMapper;
import com.seer.rds.model.wind.WindBlockRecord;
import com.seer.rds.model.wind.WindTaskDef;
import com.seer.rds.model.wind.WindTaskRecord;
import com.seer.rds.service.admin.SysAlarmService;
import com.seer.rds.service.threadPool.LinkedBqThreadPool;
import com.seer.rds.service.wind.RootBp;
import com.seer.rds.util.SpringUtil;
import com.seer.rds.vo.req.SetOrderReq;
import com.seer.rds.vo.wind.ParamPreField;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

@Component
public class TaskReloadService {
    private static final Logger log = LoggerFactory.getLogger(TaskReloadService.class);
    private final Object $lock = new Object[0];
    @Autowired
    private SysAlarmService sysAlarmService;

    /*
     * WARNING - Removed try catching itself - possible behaviour change.
     */
    public void reloadAndRunTaskDef(WindTaskRecord taskRecord) {
        Object object = this.$lock;
        synchronized (object) {
            WindBlockRecordMapper blockRecordMapper = (WindBlockRecordMapper)SpringUtil.getBean(WindBlockRecordMapper.class);
            WindTaskDefMapper windTaskDefMapper = (WindTaskDefMapper)SpringUtil.getBean(WindTaskDefMapper.class);
            log.info("taskRecordId: " + taskRecord.getId());
            LinkedBqThreadPool executorService = LinkedBqThreadPool.getInstance();
            ConcurrentHashMap<Object, Object> newCacheTaskHashMap = new ConcurrentHashMap<Object, Object>();
            newCacheTaskHashMap.put("restart", "restart");
            if (taskRecord.getVariables() != null) {
                ConcurrentHashMap paramVariable = (ConcurrentHashMap)JSONObject.parseObject((String)taskRecord.getVariables(), ConcurrentHashMap.class);
                ConcurrentHashMap<String, ConcurrentHashMap> tvparamVariable = new ConcurrentHashMap<String, ConcurrentHashMap>();
                if (paramVariable != null) {
                    tvparamVariable.put(ParamPreField.variables, paramVariable);
                    newCacheTaskHashMap.put("paramVariable", tvparamVariable);
                }
            }
            LinkedHashSet<String> linkedHashSet = new LinkedHashSet<String>();
            boolean ifWhile = false;
            List blockRecords = blockRecordMapper.findByTaskIdAndTaskRecordId(taskRecord.getDefId(), taskRecord.getId());
            for (WindBlockRecord blockRecord : blockRecords) {
                Map paramMap;
                String blockId;
                String orderId;
                String blockName = blockRecord.getBlockName();
                Integer status = blockRecord.getStatus();
                if (("IterateListBp".equals(blockName) || "WhileBp".equals(blockName)) && status == 1000) {
                    ifWhile = true;
                }
                Object[] obj = null;
                if (!linkedHashSet.isEmpty() && (obj = linkedHashSet.toArray())[0].equals(blockRecord.getBlockConfigId())) {
                    for (Object o : obj) {
                        newCacheTaskHashMap.put((String)o, "Start");
                    }
                }
                log.info("blockName: " + blockName + ",status: " + status + ",BlockConfigId: " + blockRecord.getBlockConfigId());
                if (status == 1001 || status == 1003 || status == 1006) {
                    newCacheTaskHashMap.put(blockRecord.getBlockConfigId(), "End");
                } else if (status == 1005) {
                    newCacheTaskHashMap.put(blockRecord.getBlockConfigId(), "Start");
                } else {
                    newCacheTaskHashMap.put(blockRecord.getBlockConfigId(), "Running");
                }
                if (ifWhile && !"RootBp".equals(blockName) && !"IterateListBp".equals(blockName)) {
                    linkedHashSet.add(blockRecord.getBlockConfigId());
                }
                if (status != 1005 && ("DistributeBp".equals(blockRecord.getBlockName()) || "CSelectAgvBp".equals(blockRecord.getBlockName()) || "CombinedOrderBp".equals(blockRecord.getBlockName())) && (orderId = blockRecord.getOrderId()) != null && orderId != "") {
                    newCacheTaskHashMap.put("orderId" + blockRecord.getBlockConfigId(), orderId);
                }
                if (status != 1005 && "CAgvOperationBp".equals(blockRecord.getBlockName()) && (blockId = blockRecord.getBlockId()) != null && blockId != "") {
                    newCacheTaskHashMap.put("blockOrderId" + blockRecord.getBlockConfigId(), blockId);
                }
                if (blockRecord.getOutputParams() == null || JSONObject.parseObject((String)blockRecord.getOutputParams()).get((Object)"blocks") == null || JSONObject.parseObject((String)JSONObject.parseObject((String)blockRecord.getOutputParams()).get((Object)"blocks").toString()).size() == 0 || (paramMap = (Map)((ConcurrentHashMap)JSONObject.parseObject((String)blockRecord.getOutputParams(), ConcurrentHashMap.class)).get(ParamPreField.blocks)) == null) continue;
                newCacheTaskHashMap.put("outputParams", paramMap);
            }
            GlobalCacheConfig.cacheBlockIfResetMap((String)taskRecord.getId(), newCacheTaskHashMap);
            JSONArray jsonArray = JSONArray.parseArray((String)taskRecord.getInputParams());
            HashMap<String, Object> InputParamsMap = new HashMap<String, Object>();
            if (jsonArray != null) {
                int size = jsonArray.size();
                for (int i = 0; i < size; ++i) {
                    JSONObject jsonObject = jsonArray.getJSONObject(i);
                    String key = jsonObject.getString("name");
                    Object value = jsonObject.get((Object)"defaultValue");
                    InputParamsMap.put(key, value);
                }
            }
            String JsonStringInputParamsMap = JSON.toJSONString(InputParamsMap);
            SetOrderReq root = new SetOrderReq();
            root.setInputParams(JsonStringInputParamsMap);
            WindTaskDef taskDef = windTaskDefMapper.findById((Object)taskRecord.getDefId()).orElse(null);
            if (taskDef == null) {
                throw new RuntimeException("TaskDef is null");
            }
            root.setWindTaskDef(taskDef);
            root.setTaskId(taskRecord.getDefId());
            root.setTaskRecordId(taskRecord.getId());
            root.setTaskLabel(taskRecord.getDefLabel());
            root.setCallWorkType(taskRecord.getCallWorkType());
            root.setCallWorkStation(taskRecord.getCallWorkStation());
            RootBp rootBpExecutor = (RootBp)SpringUtil.getBean(RootBp.class);
            if (taskRecord.getPriority() != null && taskRecord.getPriority() > 0) {
                RootBp.taskPriority.put(taskRecord.getId(), taskRecord.getPriority());
            }
            log.info("rootBp root={}", (Object)root);
            executorService.execute(() -> rootBpExecutor.execute(root));
        }
    }

    public void reloadAndRunTaskDefSeri(WindTaskRecord taskRecord) {
        WindBlockRecordMapper blockRecordMapper = (WindBlockRecordMapper)SpringUtil.getBean(WindBlockRecordMapper.class);
        WindTaskDefMapper windTaskDefMapper = (WindTaskDefMapper)SpringUtil.getBean(WindTaskDefMapper.class);
        log.info("taskRecordId: " + taskRecord.getId());
        LinkedBqThreadPool executorService = LinkedBqThreadPool.getInstance();
        ConcurrentHashMap<Object, Object> newCacheTaskHashMap = new ConcurrentHashMap<Object, Object>();
        newCacheTaskHashMap.put("restart", "revert");
        if (taskRecord.getVariables() != null) {
            ConcurrentHashMap paramVariable = (ConcurrentHashMap)JSONObject.parseObject((String)taskRecord.getVariables(), ConcurrentHashMap.class);
            ConcurrentHashMap<String, ConcurrentHashMap> tvparamVariable = new ConcurrentHashMap<String, ConcurrentHashMap>();
            if (paramVariable != null) {
                tvparamVariable.put(ParamPreField.variables, paramVariable);
                newCacheTaskHashMap.put("paramVariable", tvparamVariable);
            }
        }
        LinkedHashSet<String> linkedHashSet = new LinkedHashSet<String>();
        boolean ifWhile = false;
        List blockRecords = blockRecordMapper.findByTaskIdAndTaskRecordId(taskRecord.getDefId(), taskRecord.getId());
        for (WindBlockRecord blockRecord : blockRecords) {
            Map paramMap;
            String blockId;
            String orderId;
            String blockName = blockRecord.getBlockName();
            Integer status = blockRecord.getStatus();
            if (("IterateListBp".equals(blockName) || "WhileBp".equals(blockName)) && status == 1000) {
                ifWhile = true;
            }
            Object[] obj = null;
            if (!linkedHashSet.isEmpty() && (obj = linkedHashSet.toArray())[0].equals(blockRecord.getBlockConfigId())) {
                for (Object o : obj) {
                    newCacheTaskHashMap.put((String)o, "Start");
                }
            }
            log.info("blockName: " + blockName + ",status: " + status + ",BlockConfigId: " + blockRecord.getBlockConfigId());
            if (status == 1001 || status == 1003 || status == 1006) {
                newCacheTaskHashMap.put(blockRecord.getBlockConfigId(), "End");
            } else if (status == 1005) {
                newCacheTaskHashMap.put(blockRecord.getBlockConfigId(), "Start");
            } else {
                newCacheTaskHashMap.put(blockRecord.getBlockConfigId(), "Running");
            }
            if (ifWhile && !"RootBp".equals(blockName) && !"IterateListBp".equals(blockName)) {
                linkedHashSet.add(blockRecord.getBlockConfigId());
            }
            if (status != 1005 && ("DistributeBp".equals(blockRecord.getBlockName()) || "CSelectAgvBp".equals(blockRecord.getBlockName()) || "CombinedOrderBp".equals(blockRecord.getBlockName())) && (orderId = blockRecord.getOrderId()) != null && orderId != "") {
                newCacheTaskHashMap.put("orderId" + blockRecord.getBlockConfigId(), orderId);
            }
            if (status != 1005 && "CAgvOperationBp".equals(blockRecord.getBlockName()) && (blockId = blockRecord.getBlockId()) != null && blockId != "") {
                newCacheTaskHashMap.put("blockOrderId" + blockRecord.getBlockConfigId(), blockId);
            }
            if (blockRecord.getOutputParams() == null || JSONObject.parseObject((String)blockRecord.getOutputParams()).get((Object)"blocks") == null || JSONObject.parseObject((String)JSONObject.parseObject((String)blockRecord.getOutputParams()).get((Object)"blocks").toString()).size() == 0 || (paramMap = (Map)((ConcurrentHashMap)JSONObject.parseObject((String)blockRecord.getOutputParams(), ConcurrentHashMap.class)).get(ParamPreField.blocks)) == null) continue;
            newCacheTaskHashMap.put("outputParams", paramMap);
        }
        GlobalCacheConfig.cacheBlockIfResetMap((String)taskRecord.getId(), newCacheTaskHashMap);
        JSONArray jsonArray = JSONArray.parseArray((String)taskRecord.getInputParams());
        HashMap<String, Object> InputParamsMap = new HashMap<String, Object>();
        if (jsonArray != null) {
            int size = jsonArray.size();
            for (int i = 0; i < size; ++i) {
                JSONObject jsonObject = jsonArray.getJSONObject(i);
                String key = jsonObject.getString("name");
                Object value = jsonObject.get((Object)"defaultValue");
                InputParamsMap.put(key, value);
            }
        }
        String JsonStringInputParamsMap = JSON.toJSONString(InputParamsMap);
        SetOrderReq root = new SetOrderReq();
        root.setInputParams(JsonStringInputParamsMap);
        WindTaskDef taskDef = windTaskDefMapper.findById((Object)taskRecord.getDefId()).orElse(null);
        if (taskDef == null) {
            throw new RuntimeException("TaskDef is null");
        }
        root.setWindTaskDef(taskDef);
        root.setTaskId(taskRecord.getDefId());
        root.setTaskRecordId(taskRecord.getId());
        root.setTaskLabel(taskRecord.getDefLabel());
        root.setCallWorkType(taskRecord.getCallWorkType());
        root.setCallWorkStation(taskRecord.getCallWorkStation());
        RootBp rootBpExecutor = (RootBp)SpringUtil.getBean(RootBp.class);
        if (taskRecord.getPriority() != null && taskRecord.getPriority() > 0) {
            RootBp.taskPriority.put(taskRecord.getId(), taskRecord.getPriority());
        }
        log.info("rootBp root={}", (Object)root);
        rootBpExecutor.execute(root);
    }
}

