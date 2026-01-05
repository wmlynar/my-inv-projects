/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.alibaba.fastjson.JSONObject
 *  com.google.common.collect.Maps
 *  com.seer.rds.model.wind.BaseRecord
 *  com.seer.rds.script.ScriptService
 *  com.seer.rds.service.agv.WindService
 *  com.seer.rds.service.factory.RecordUpdaterFactory
 *  com.seer.rds.service.wind.AbstractBp
 *  com.seer.rds.service.wind.AbstratRootBp
 *  com.seer.rds.service.wind.WindTaskStatus
 *  com.seer.rds.service.wind.commonBp.ScriptBp
 *  com.seer.rds.vo.wind.ParamPreField
 *  com.seer.rds.vo.wind.ScriptBpField
 *  org.slf4j.Logger
 *  org.slf4j.LoggerFactory
 *  org.springframework.beans.factory.annotation.Autowired
 *  org.springframework.context.annotation.Scope
 *  org.springframework.stereotype.Component
 */
package com.seer.rds.service.wind.commonBp;

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
import com.seer.rds.vo.wind.ScriptBpField;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Scope;
import org.springframework.stereotype.Component;

@Component(value="ScriptBp")
@Scope(value="prototype")
public class ScriptBp
extends AbstractBp {
    private static final Logger log = LoggerFactory.getLogger(ScriptBp.class);
    @Autowired
    private WindService windService;
    @Autowired
    private ScriptService scriptService;
    private Object functionName;
    private Object functionArgs;
    private Map outPutParams;

    protected void getInputParamsAndExecute(AbstratRootBp rootBp) throws Exception {
        this.functionName = rootBp.getInputParamValue(this.taskId, this.inputParams, ScriptBpField.functionName);
        this.functionArgs = rootBp.getInputParamValue(this.taskId, this.inputParams, ScriptBpField.functionArgs);
        log.info(String.format("functionName=%s,functionArgs=%s", this.functionName, this.functionArgs));
        HashMap param = Maps.newHashMap();
        param.put("eventData", this.functionArgs);
        param.put("taskId", this.taskId);
        param.put("taskRecord", this.taskRecord);
        param.put("blockVo", this.blockVo);
        String result = this.scriptService.execute(rootBp, this.taskRecord.getId(), this.functionName.toString(), (Object)JSONObject.toJSONString((Object)param));
        if (result != null) {
            JSONObject resultJson = JSONObject.parseObject((String)result);
            for (Map.Entry next : resultJson.entrySet()) {
                String key = (String)next.getKey();
                Object value = next.getValue();
                Map tvParamMap = (Map)((ConcurrentHashMap)AbstratRootBp.taskVariablesMap.get()).get(ParamPreField.task);
                Map paramMap = (Map)tvParamMap.get(ParamPreField.variables);
                paramMap.put(key, value);
                tvParamMap.put(ParamPreField.variables, paramMap);
                ((ConcurrentHashMap)AbstratRootBp.taskVariablesMap.get()).put(ParamPreField.task, tvParamMap);
                this.taskRecord.setVariables(JSONObject.toJSONString((Object)paramMap));
            }
            WindTaskStatus.monitorTaskEndErrorAndTaskStop((AbstractBp)this);
            RecordUpdaterFactory.getUpdater((BaseRecord)this.taskRecord).updateRecord(this.taskRecord);
        }
    }

    protected void setBlockInputParamsValue(AbstratRootBp rootBp) throws Exception {
        ScriptBp bpData = new ScriptBp();
        bpData.setFunctionName(this.functionName);
        bpData.setFunctionArgs(this.functionArgs);
        bpData.setOutPutParams((Map)AbstratRootBp.taskVariablesMap.get());
        this.blockRecord.setBlockInputParamsValue(JSONObject.toJSONString((Object)bpData));
        this.windService.saveBlockRecord(this.blockRecord, this.blockVo.getBlockId(), this.blockVo.getBlockType(), this.taskRecord.getProjectId(), this.taskId, this.taskRecord.getId(), this.startOn);
    }

    public WindService getWindService() {
        return this.windService;
    }

    public ScriptService getScriptService() {
        return this.scriptService;
    }

    public Object getFunctionName() {
        return this.functionName;
    }

    public Object getFunctionArgs() {
        return this.functionArgs;
    }

    public Map getOutPutParams() {
        return this.outPutParams;
    }

    public void setWindService(WindService windService) {
        this.windService = windService;
    }

    public void setScriptService(ScriptService scriptService) {
        this.scriptService = scriptService;
    }

    public void setFunctionName(Object functionName) {
        this.functionName = functionName;
    }

    public void setFunctionArgs(Object functionArgs) {
        this.functionArgs = functionArgs;
    }

    public void setOutPutParams(Map outPutParams) {
        this.outPutParams = outPutParams;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof ScriptBp)) {
            return false;
        }
        ScriptBp other = (ScriptBp)o;
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
        Object this$functionName = this.getFunctionName();
        Object other$functionName = other.getFunctionName();
        if (this$functionName == null ? other$functionName != null : !this$functionName.equals(other$functionName)) {
            return false;
        }
        Object this$functionArgs = this.getFunctionArgs();
        Object other$functionArgs = other.getFunctionArgs();
        if (this$functionArgs == null ? other$functionArgs != null : !this$functionArgs.equals(other$functionArgs)) {
            return false;
        }
        Map this$outPutParams = this.getOutPutParams();
        Map other$outPutParams = other.getOutPutParams();
        return !(this$outPutParams == null ? other$outPutParams != null : !((Object)this$outPutParams).equals(other$outPutParams));
    }

    protected boolean canEqual(Object other) {
        return other instanceof ScriptBp;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        WindService $windService = this.getWindService();
        result = result * 59 + ($windService == null ? 43 : $windService.hashCode());
        ScriptService $scriptService = this.getScriptService();
        result = result * 59 + ($scriptService == null ? 43 : $scriptService.hashCode());
        Object $functionName = this.getFunctionName();
        result = result * 59 + ($functionName == null ? 43 : $functionName.hashCode());
        Object $functionArgs = this.getFunctionArgs();
        result = result * 59 + ($functionArgs == null ? 43 : $functionArgs.hashCode());
        Map $outPutParams = this.getOutPutParams();
        result = result * 59 + ($outPutParams == null ? 43 : ((Object)$outPutParams).hashCode());
        return result;
    }

    public String toString() {
        return "ScriptBp(windService=" + this.getWindService() + ", scriptService=" + this.getScriptService() + ", functionName=" + this.getFunctionName() + ", functionArgs=" + this.getFunctionArgs() + ", outPutParams=" + this.getOutPutParams() + ")";
    }
}

