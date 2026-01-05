/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.alibaba.fastjson.JSONArray
 *  com.alibaba.fastjson.JSONObject
 *  com.google.common.collect.Maps
 *  com.seer.rds.model.wind.BaseRecord
 *  com.seer.rds.script.ScriptService
 *  com.seer.rds.service.agv.WindService
 *  com.seer.rds.service.factory.RecordUpdaterFactory
 *  com.seer.rds.service.wind.AbstractBp
 *  com.seer.rds.service.wind.AbstratRootBp
 *  com.seer.rds.service.wind.WindTaskStatus
 *  com.seer.rds.service.wind.taskBp.TriggerTaskEventBp
 *  com.seer.rds.vo.wind.ParamPreField
 *  com.seer.rds.vo.wind.TriggerTaskEventBpField
 *  org.slf4j.Logger
 *  org.slf4j.LoggerFactory
 *  org.springframework.beans.factory.annotation.Autowired
 *  org.springframework.context.annotation.Scope
 *  org.springframework.stereotype.Component
 */
package com.seer.rds.service.wind.taskBp;

import com.alibaba.fastjson.JSONArray;
import com.alibaba.fastjson.JSONObject;
import com.google.common.collect.Maps;
import com.seer.rds.model.wind.BaseRecord;
import com.seer.rds.script.ScriptService;
import com.seer.rds.service.agv.WindService;
import com.seer.rds.service.factory.RecordUpdaterFactory;
import com.seer.rds.service.wind.AbstractBp;
import com.seer.rds.service.wind.AbstratRootBp;
import com.seer.rds.service.wind.WindTaskStatus;
import com.seer.rds.vo.wind.ParamPreField;
import com.seer.rds.vo.wind.TriggerTaskEventBpField;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Scope;
import org.springframework.stereotype.Component;

@Component(value="TriggerTaskEventBp")
@Scope(value="prototype")
public class TriggerTaskEventBp
extends AbstractBp {
    private static final Logger log = LoggerFactory.getLogger(TriggerTaskEventBp.class);
    @Autowired
    private WindService windService;
    @Autowired
    private ScriptService scriptService;
    private Object eventName;
    private Object eventData;

    protected void getInputParamsAndExecute(AbstratRootBp rootBp) throws Exception {
        this.eventName = rootBp.getInputParamValue(this.taskId, this.inputParams, TriggerTaskEventBpField.eventName);
        this.eventData = rootBp.getInputParamValue(this.taskId, this.inputParams, TriggerTaskEventBpField.eventData);
        log.info(String.format("eventName=%s,eventData=%s", this.eventName, this.eventData));
        HashMap param = Maps.newHashMap();
        param.put("eventData", this.eventData);
        param.put("taskId", this.taskId);
        param.put("taskRecord", this.taskRecord);
        param.put("blockVo", this.blockVo);
        String result = this.scriptService.execute(rootBp, this.taskRecord.getId(), this.eventName.toString(), (Object)JSONObject.toJSONString((Object)param));
        Map paramMap = null;
        HashMap resultMap = Maps.newHashMap();
        if (result != null) {
            JSONObject resultJson = JSONObject.parseObject((String)result);
            for (Map.Entry next : resultJson.entrySet()) {
                String key = (String)next.getKey();
                Object value = next.getValue();
                paramMap = (Map)((ConcurrentHashMap)AbstratRootBp.inputParamsMap.get()).get(ParamPreField.taskInputs);
                paramMap.put(key, value);
                resultMap.put(key, value);
                ((ConcurrentHashMap)AbstratRootBp.inputParamsMap.get()).put(ParamPreField.taskInputs, paramMap);
            }
        }
        JSONArray jsonArray = JSONArray.parseArray((String)this.taskRecord.getInputParams());
        int size = jsonArray.size();
        for (int i = 0; i < size; ++i) {
            JSONObject jsonObject = jsonArray.getJSONObject(i);
            String key = jsonObject.getString("name");
            Object Value2 = ((Map)((ConcurrentHashMap)AbstratRootBp.inputParamsMap.get()).get(ParamPreField.taskInputs)).get(key);
            jsonObject.put("defaultValue", Value2);
        }
        WindTaskStatus.monitorTaskEndErrorAndTaskStop((AbstractBp)this);
        this.taskRecord.setInputParams(jsonArray.toJSONString());
        RecordUpdaterFactory.getUpdater((BaseRecord)this.taskRecord).updateRecord(this.taskRecord);
        this.saveLogResult((Object)(paramMap == null ? "" : JSONObject.toJSONString((Object)resultMap)));
    }

    protected void setBlockInputParamsValue(AbstratRootBp rootBp) throws Exception {
    }

    public WindService getWindService() {
        return this.windService;
    }

    public ScriptService getScriptService() {
        return this.scriptService;
    }

    public Object getEventName() {
        return this.eventName;
    }

    public Object getEventData() {
        return this.eventData;
    }

    public void setWindService(WindService windService) {
        this.windService = windService;
    }

    public void setScriptService(ScriptService scriptService) {
        this.scriptService = scriptService;
    }

    public void setEventName(Object eventName) {
        this.eventName = eventName;
    }

    public void setEventData(Object eventData) {
        this.eventData = eventData;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof TriggerTaskEventBp)) {
            return false;
        }
        TriggerTaskEventBp other = (TriggerTaskEventBp)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        WindService this$windService = this.getWindService();
        WindService other$windService = other.getWindService();
        if (this$windService == null ? other$windService != null : !this$windService.equals(other$windService)) {
            return false;
        }
        ScriptService this$scriptService = this.getScriptService();
        ScriptService other$scriptService = other.getScriptService();
        if (this$scriptService == null ? other$scriptService != null : !this$scriptService.equals(other$scriptService)) {
            return false;
        }
        Object this$eventName = this.getEventName();
        Object other$eventName = other.getEventName();
        if (this$eventName == null ? other$eventName != null : !this$eventName.equals(other$eventName)) {
            return false;
        }
        Object this$eventData = this.getEventData();
        Object other$eventData = other.getEventData();
        return !(this$eventData == null ? other$eventData != null : !this$eventData.equals(other$eventData));
    }

    protected boolean canEqual(Object other) {
        return other instanceof TriggerTaskEventBp;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        WindService $windService = this.getWindService();
        result = result * 59 + ($windService == null ? 43 : $windService.hashCode());
        ScriptService $scriptService = this.getScriptService();
        result = result * 59 + ($scriptService == null ? 43 : $scriptService.hashCode());
        Object $eventName = this.getEventName();
        result = result * 59 + ($eventName == null ? 43 : $eventName.hashCode());
        Object $eventData = this.getEventData();
        result = result * 59 + ($eventData == null ? 43 : $eventData.hashCode());
        return result;
    }

    public String toString() {
        return "TriggerTaskEventBp(windService=" + this.getWindService() + ", scriptService=" + this.getScriptService() + ", eventName=" + this.getEventName() + ", eventData=" + this.getEventData() + ")";
    }
}

