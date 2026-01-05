/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.alibaba.fastjson.JSONArray
 *  com.alibaba.fastjson.JSONObject
 *  com.google.common.collect.Maps
 *  com.seer.rds.model.wind.WindTaskRecord
 *  com.seer.rds.service.agv.WindTaskService
 *  com.seer.rds.service.wind.AbstractBp
 *  com.seer.rds.service.wind.AbstratRootBp
 *  com.seer.rds.service.wind.commonBp.GetTaskInputParamsByTaskRecordAndKeyBp
 *  com.seer.rds.vo.wind.GetTaskInputParamsByTaskRecordAndKeyField
 *  com.seer.rds.vo.wind.ParamPreField
 *  org.slf4j.Logger
 *  org.slf4j.LoggerFactory
 *  org.springframework.beans.factory.annotation.Autowired
 *  org.springframework.context.annotation.Scope
 *  org.springframework.stereotype.Component
 */
package com.seer.rds.service.wind.commonBp;

import com.alibaba.fastjson.JSONArray;
import com.alibaba.fastjson.JSONObject;
import com.google.common.collect.Maps;
import com.seer.rds.model.wind.WindTaskRecord;
import com.seer.rds.service.agv.WindTaskService;
import com.seer.rds.service.wind.AbstractBp;
import com.seer.rds.service.wind.AbstratRootBp;
import com.seer.rds.vo.wind.GetTaskInputParamsByTaskRecordAndKeyField;
import com.seer.rds.vo.wind.ParamPreField;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Scope;
import org.springframework.stereotype.Component;

@Component(value="GetTaskInputParamsByTaskRecordAndKeyBp")
@Scope(value="prototype")
public class GetTaskInputParamsByTaskRecordAndKeyBp
extends AbstractBp {
    private static final Logger log = LoggerFactory.getLogger(GetTaskInputParamsByTaskRecordAndKeyBp.class);
    private String taskRecordId;
    private String inputParamsKey;
    @Autowired
    private WindTaskService windTaskService;

    protected void getInputParamsAndExecute(AbstratRootBp rootBp) throws Exception {
        this.inputParamsKey = (String)this.blockInputParamsValue.get(GetTaskInputParamsByTaskRecordAndKeyField.inputParamsKey);
        this.taskRecordId = (String)this.blockInputParamsValue.get(GetTaskInputParamsByTaskRecordAndKeyField.taskRecordId);
        WindTaskRecord taskRecordById = this.windTaskService.getTaskRecordById(this.taskRecordId);
        String inputParams = taskRecordById.getInputParams();
        JSONArray inputParamsObject = JSONObject.parseArray((String)inputParams);
        inputParamsObject.forEach(e -> {
            JSONObject inputParamObject = JSONObject.parseObject((String)e.toString());
            if (this.inputParamsKey.equals(inputParamObject.get((Object)"name"))) {
                Object inputParamValue = inputParamObject.get((Object)"defaultValue");
                Map paramMap = (Map)((ConcurrentHashMap)AbstratRootBp.outputParamsMap.get()).get(ParamPreField.blocks);
                ConcurrentMap childParamMap = Maps.newConcurrentMap();
                childParamMap.put(GetTaskInputParamsByTaskRecordAndKeyField.inputParamValue, null == inputParamValue ? "" : inputParamValue);
                paramMap.put(this.blockVo.getBlockName(), childParamMap);
                ((ConcurrentHashMap)AbstratRootBp.outputParamsMap.get()).put(ParamPreField.blocks, paramMap);
                this.saveLogResult(inputParamValue);
            }
        });
    }

    protected void setBlockInputParamsValue(AbstratRootBp rootBp) throws Exception {
    }
}

