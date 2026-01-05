/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.alibaba.fastjson.JSONObject
 *  com.seer.rds.service.agv.WindService
 *  com.seer.rds.service.wind.AbstractBp
 *  com.seer.rds.service.wind.AbstratRootBp
 *  com.seer.rds.service.wind.commonBp.PrintBp
 *  com.seer.rds.vo.wind.PrintBpField
 *  org.slf4j.Logger
 *  org.slf4j.LoggerFactory
 *  org.springframework.beans.factory.annotation.Autowired
 *  org.springframework.context.annotation.Scope
 *  org.springframework.stereotype.Component
 */
package com.seer.rds.service.wind.commonBp;

import com.alibaba.fastjson.JSONObject;
import com.seer.rds.service.agv.WindService;
import com.seer.rds.service.wind.AbstractBp;
import com.seer.rds.service.wind.AbstratRootBp;
import com.seer.rds.vo.wind.PrintBpField;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Scope;
import org.springframework.stereotype.Component;

@Component(value="PrintBp")
@Scope(value="prototype")
public class PrintBp
extends AbstractBp {
    private static final Logger log = LoggerFactory.getLogger(PrintBp.class);
    @Autowired
    private WindService windService;
    private Object param;
    private Object conditionObj;

    protected void getInputParamsAndExecute(AbstratRootBp rootBp) throws Exception {
        this.conditionObj = rootBp.getInputParamValue(this.taskId, this.inputParams, PrintBpField.message);
        this.saveLogResult((Object)(this.conditionObj == null ? "" : JSONObject.toJSONString((Object)this.conditionObj)));
        log.info("PrintBp message = {}", this.conditionObj);
    }

    protected void setBlockInputParamsValue(AbstratRootBp rootBp) throws Exception {
        PrintBp bpData = new PrintBp();
        bpData.setParam(this.conditionObj);
        this.blockRecord.setBlockInputParamsValue(JSONObject.toJSONString((Object)bpData));
        this.windService.saveBlockRecord(this.blockRecord, this.blockVo.getBlockId(), this.blockVo.getBlockType(), this.taskRecord.getProjectId(), this.taskId, this.taskRecord.getId(), this.startOn);
    }

    public WindService getWindService() {
        return this.windService;
    }

    public Object getParam() {
        return this.param;
    }

    public Object getConditionObj() {
        return this.conditionObj;
    }

    public void setWindService(WindService windService) {
        this.windService = windService;
    }

    public void setParam(Object param) {
        this.param = param;
    }

    public void setConditionObj(Object conditionObj) {
        this.conditionObj = conditionObj;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof PrintBp)) {
            return false;
        }
        PrintBp other = (PrintBp)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        WindService this$windService = this.getWindService();
        WindService other$windService = other.getWindService();
        if (this$windService == null ? other$windService != null : !this$windService.equals(other$windService)) {
            return false;
        }
        Object this$param = this.getParam();
        Object other$param = other.getParam();
        if (this$param == null ? other$param != null : !this$param.equals(other$param)) {
            return false;
        }
        Object this$conditionObj = this.getConditionObj();
        Object other$conditionObj = other.getConditionObj();
        return !(this$conditionObj == null ? other$conditionObj != null : !this$conditionObj.equals(other$conditionObj));
    }

    protected boolean canEqual(Object other) {
        return other instanceof PrintBp;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        WindService $windService = this.getWindService();
        result = result * 59 + ($windService == null ? 43 : $windService.hashCode());
        Object $param = this.getParam();
        result = result * 59 + ($param == null ? 43 : $param.hashCode());
        Object $conditionObj = this.getConditionObj();
        result = result * 59 + ($conditionObj == null ? 43 : $conditionObj.hashCode());
        return result;
    }

    public String toString() {
        return "PrintBp(windService=" + this.getWindService() + ", param=" + this.getParam() + ", conditionObj=" + this.getConditionObj() + ")";
    }
}

