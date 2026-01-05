/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.alibaba.fastjson.JSONObject
 *  com.seer.rds.model.wind.BaseRecord
 *  com.seer.rds.service.agv.WindService
 *  com.seer.rds.service.factory.RecordUpdaterFactory
 *  com.seer.rds.service.wind.AbstractBp
 *  com.seer.rds.service.wind.AbstratRootBp
 *  com.seer.rds.service.wind.commonBp.SetTaskVariableBp
 *  com.seer.rds.vo.wind.ParamPreField
 *  com.seer.rds.vo.wind.SetTaskVariableBpField
 *  org.slf4j.Logger
 *  org.slf4j.LoggerFactory
 *  org.springframework.beans.factory.annotation.Autowired
 *  org.springframework.context.annotation.Scope
 *  org.springframework.stereotype.Component
 */
package com.seer.rds.service.wind.commonBp;

import com.alibaba.fastjson.JSONObject;
import com.seer.rds.model.wind.BaseRecord;
import com.seer.rds.service.agv.WindService;
import com.seer.rds.service.factory.RecordUpdaterFactory;
import com.seer.rds.service.wind.AbstractBp;
import com.seer.rds.service.wind.AbstratRootBp;
import com.seer.rds.vo.wind.ParamPreField;
import com.seer.rds.vo.wind.SetTaskVariableBpField;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Scope;
import org.springframework.stereotype.Component;

@Component(value="SetTaskVariableBp")
@Scope(value="prototype")
public class SetTaskVariableBp
extends AbstractBp {
    private static final Logger log = LoggerFactory.getLogger(SetTaskVariableBp.class);
    @Autowired
    private WindService windService;
    private Object varName;
    private Object varValue;
    private Map outPutParams;

    protected void getInputParamsAndExecute(AbstratRootBp rootBp) throws Exception {
        this.varName = rootBp.getInputParamValue(this.taskId, this.inputParams, SetTaskVariableBpField.varName);
        this.varValue = rootBp.getInputParamValue(this.taskId, this.inputParams, SetTaskVariableBpField.varValue);
        log.info("[SetTaskVariableBp]" + String.format("varName=%s,varValue=%s", this.varName.toString(), this.varValue.toString()));
        Map tvParamMap = (Map)((ConcurrentHashMap)AbstratRootBp.taskVariablesMap.get()).get(ParamPreField.task);
        Map paramMap = (Map)tvParamMap.get(ParamPreField.variables);
        paramMap.put(this.varName.toString(), this.varValue);
        tvParamMap.put(ParamPreField.variables, paramMap);
        ((ConcurrentHashMap)AbstratRootBp.taskVariablesMap.get()).put(ParamPreField.task, tvParamMap);
        this.taskRecord.setVariables(JSONObject.toJSONString((Object)paramMap));
        RecordUpdaterFactory.getUpdater((BaseRecord)this.taskRecord).updateRecord(this.taskRecord);
    }

    protected void setBlockInputParamsValue(AbstratRootBp rootBp) {
        SetTaskVariableBp bpData = new SetTaskVariableBp();
        bpData.setVarName(this.varName);
        bpData.setVarValue(this.varValue);
        bpData.setOutPutParams((Map)AbstratRootBp.taskVariablesMap.get());
        this.blockRecord.setBlockInputParamsValue(JSONObject.toJSONString((Object)bpData));
        this.windService.saveBlockRecord(this.blockRecord, this.blockVo.getBlockId(), this.blockVo.getBlockType(), this.taskRecord.getProjectId(), this.taskId, this.taskRecord.getId(), this.startOn);
    }

    public WindService getWindService() {
        return this.windService;
    }

    public Object getVarName() {
        return this.varName;
    }

    public Object getVarValue() {
        return this.varValue;
    }

    public Map getOutPutParams() {
        return this.outPutParams;
    }

    public void setWindService(WindService windService) {
        this.windService = windService;
    }

    public void setVarName(Object varName) {
        this.varName = varName;
    }

    public void setVarValue(Object varValue) {
        this.varValue = varValue;
    }

    public void setOutPutParams(Map outPutParams) {
        this.outPutParams = outPutParams;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof SetTaskVariableBp)) {
            return false;
        }
        SetTaskVariableBp other = (SetTaskVariableBp)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        WindService this$windService = this.getWindService();
        WindService other$windService = other.getWindService();
        if (this$windService == null ? other$windService != null : !this$windService.equals(other$windService)) {
            return false;
        }
        Object this$varName = this.getVarName();
        Object other$varName = other.getVarName();
        if (this$varName == null ? other$varName != null : !this$varName.equals(other$varName)) {
            return false;
        }
        Object this$varValue = this.getVarValue();
        Object other$varValue = other.getVarValue();
        if (this$varValue == null ? other$varValue != null : !this$varValue.equals(other$varValue)) {
            return false;
        }
        Map this$outPutParams = this.getOutPutParams();
        Map other$outPutParams = other.getOutPutParams();
        return !(this$outPutParams == null ? other$outPutParams != null : !((Object)this$outPutParams).equals(other$outPutParams));
    }

    protected boolean canEqual(Object other) {
        return other instanceof SetTaskVariableBp;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        WindService $windService = this.getWindService();
        result = result * 59 + ($windService == null ? 43 : $windService.hashCode());
        Object $varName = this.getVarName();
        result = result * 59 + ($varName == null ? 43 : $varName.hashCode());
        Object $varValue = this.getVarValue();
        result = result * 59 + ($varValue == null ? 43 : $varValue.hashCode());
        Map $outPutParams = this.getOutPutParams();
        result = result * 59 + ($outPutParams == null ? 43 : ((Object)$outPutParams).hashCode());
        return result;
    }

    public String toString() {
        return "SetTaskVariableBp(windService=" + this.getWindService() + ", varName=" + this.getVarName() + ", varValue=" + this.getVarValue() + ", outPutParams=" + this.getOutPutParams() + ")";
    }
}

