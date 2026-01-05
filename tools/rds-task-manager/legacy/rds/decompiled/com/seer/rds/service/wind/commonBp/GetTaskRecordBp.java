/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.alibaba.fastjson.JSON
 *  com.alibaba.fastjson.JSONObject
 *  com.google.common.collect.Maps
 *  com.seer.rds.model.wind.WindTaskRecord
 *  com.seer.rds.service.agv.WindService
 *  com.seer.rds.service.agv.WindTaskService
 *  com.seer.rds.service.wind.AbstractBp
 *  com.seer.rds.service.wind.AbstratRootBp
 *  com.seer.rds.service.wind.commonBp.GetTaskRecordBp
 *  com.seer.rds.vo.wind.GetTaskRecordBpField
 *  com.seer.rds.vo.wind.ParamPreField
 *  org.slf4j.Logger
 *  org.slf4j.LoggerFactory
 *  org.springframework.beans.factory.annotation.Autowired
 *  org.springframework.context.annotation.Scope
 *  org.springframework.stereotype.Component
 */
package com.seer.rds.service.wind.commonBp;

import com.alibaba.fastjson.JSON;
import com.alibaba.fastjson.JSONObject;
import com.google.common.collect.Maps;
import com.seer.rds.model.wind.WindTaskRecord;
import com.seer.rds.service.agv.WindService;
import com.seer.rds.service.agv.WindTaskService;
import com.seer.rds.service.wind.AbstractBp;
import com.seer.rds.service.wind.AbstratRootBp;
import com.seer.rds.vo.wind.GetTaskRecordBpField;
import com.seer.rds.vo.wind.ParamPreField;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Scope;
import org.springframework.stereotype.Component;

@Component(value="GetTaskRecordBp")
@Scope(value="prototype")
public class GetTaskRecordBp
extends AbstractBp {
    private static final Logger log = LoggerFactory.getLogger(GetTaskRecordBp.class);
    @Autowired
    private WindService windService;
    @Autowired
    private WindTaskService windTaskService;
    private String taskRecordId;

    protected void getInputParamsAndExecute(AbstratRootBp rootBp) throws Exception {
        this.taskRecordId = (String)rootBp.getInputParamValue(this.taskId, this.inputParams, GetTaskRecordBpField.taskRecordId);
        WindTaskRecord taskRecord = this.windTaskService.getTaskRecordById(this.taskRecordId);
        Map paramMap = (Map)((ConcurrentHashMap)AbstratRootBp.outputParamsMap.get()).get(ParamPreField.blocks);
        ConcurrentMap childParamMap = Maps.newConcurrentMap();
        childParamMap.put(GetTaskRecordBpField.taskRecord, null == taskRecord ? "" : taskRecord);
        paramMap.put(this.blockVo.getBlockName(), childParamMap);
        ((ConcurrentHashMap)AbstratRootBp.outputParamsMap.get()).put(ParamPreField.blocks, paramMap);
        this.saveLogResult((Object)(taskRecord == null ? "" : JSONObject.toJSONString((Object)taskRecord)));
    }

    protected void setBlockInputParamsValue(AbstratRootBp rootBp) throws Exception {
        HashMap<String, String> map = new HashMap<String, String>();
        map.put(GetTaskRecordBpField.taskRecordId, this.taskRecordId);
        this.blockRecord.setBlockInputParamsValue(JSON.toJSONString(map));
        this.windService.saveBlockRecord(this.blockRecord, this.blockVo.getBlockId(), this.blockVo.getBlockType(), this.taskRecord.getProjectId(), this.taskId, this.taskRecord.getId(), this.startOn);
    }

    public WindService getWindService() {
        return this.windService;
    }

    public WindTaskService getWindTaskService() {
        return this.windTaskService;
    }

    public String getTaskRecordId() {
        return this.taskRecordId;
    }

    public void setWindService(WindService windService) {
        this.windService = windService;
    }

    public void setWindTaskService(WindTaskService windTaskService) {
        this.windTaskService = windTaskService;
    }

    public void setTaskRecordId(String taskRecordId) {
        this.taskRecordId = taskRecordId;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof GetTaskRecordBp)) {
            return false;
        }
        GetTaskRecordBp other = (GetTaskRecordBp)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        WindService this$windService = this.getWindService();
        WindService other$windService = other.getWindService();
        if (this$windService == null ? other$windService != null : !this$windService.equals(other$windService)) {
            return false;
        }
        WindTaskService this$windTaskService = this.getWindTaskService();
        WindTaskService other$windTaskService = other.getWindTaskService();
        if (this$windTaskService == null ? other$windTaskService != null : !this$windTaskService.equals(other$windTaskService)) {
            return false;
        }
        String this$taskRecordId = this.getTaskRecordId();
        String other$taskRecordId = other.getTaskRecordId();
        return !(this$taskRecordId == null ? other$taskRecordId != null : !this$taskRecordId.equals(other$taskRecordId));
    }

    protected boolean canEqual(Object other) {
        return other instanceof GetTaskRecordBp;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        WindService $windService = this.getWindService();
        result = result * 59 + ($windService == null ? 43 : $windService.hashCode());
        WindTaskService $windTaskService = this.getWindTaskService();
        result = result * 59 + ($windTaskService == null ? 43 : $windTaskService.hashCode());
        String $taskRecordId = this.getTaskRecordId();
        result = result * 59 + ($taskRecordId == null ? 43 : $taskRecordId.hashCode());
        return result;
    }

    public String toString() {
        return "GetTaskRecordBp(windService=" + this.getWindService() + ", windTaskService=" + this.getWindTaskService() + ", taskRecordId=" + this.getTaskRecordId() + ")";
    }
}

