/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.alibaba.fastjson.JSONArray
 *  com.alibaba.fastjson.JSONObject
 *  com.seer.rds.service.agv.WindService
 *  com.seer.rds.service.wind.AbstractBp
 *  com.seer.rds.service.wind.AbstratRootBp
 *  com.seer.rds.service.wind.RootBp
 *  com.seer.rds.service.wind.commonBp.IfBp
 *  com.seer.rds.vo.wind.IfBpField
 *  org.slf4j.Logger
 *  org.slf4j.LoggerFactory
 *  org.springframework.beans.factory.annotation.Autowired
 *  org.springframework.context.annotation.Scope
 *  org.springframework.stereotype.Component
 */
package com.seer.rds.service.wind.commonBp;

import com.alibaba.fastjson.JSONArray;
import com.alibaba.fastjson.JSONObject;
import com.seer.rds.service.agv.WindService;
import com.seer.rds.service.wind.AbstractBp;
import com.seer.rds.service.wind.AbstratRootBp;
import com.seer.rds.service.wind.RootBp;
import com.seer.rds.vo.wind.IfBpField;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Scope;
import org.springframework.stereotype.Component;

@Component(value="IfBp")
@Scope(value="prototype")
public class IfBp
extends AbstractBp {
    private static final Logger log = LoggerFactory.getLogger(IfBp.class);
    @Autowired
    private WindService windService;
    private Boolean condition;

    protected void getInputParamsAndExecute(AbstratRootBp rootBp) {
        Object conditionObj = rootBp.getInputParamValue(this.taskId, this.inputParams, IfBpField.condition);
        this.condition = false;
        if (conditionObj != null) {
            this.condition = Boolean.parseBoolean(conditionObj.toString());
        }
        this.saveLogResult((Object)String.format("@{wind.bp.condition}=%s", this.condition));
    }

    protected void setBlockInputParamsValue(AbstratRootBp rootBp) {
        IfBp ifBp = new IfBp();
        ifBp.setCondition(this.condition);
        this.blockRecord.setBlockInputParamsValue(JSONObject.toJSONString((Object)ifBp));
        this.windService.saveBlockRecord(this.blockRecord, this.blockVo.getBlockId(), this.blockVo.getBlockType(), this.taskRecord.getProjectId(), this.taskId, this.taskRecord.getId(), this.startOn);
    }

    protected void runChildBlock(AbstratRootBp rootBp) {
        if (!"End".equals(this.state) && ((Boolean)RootBp.taskStatus.get(this.taskId + this.taskRecord.getId())).booleanValue() && this.condition.booleanValue() && this.childDefaultArray != null) {
            JSONArray childArray = (JSONArray)this.childDefaultArray;
            rootBp.executeChild(rootBp, this.taskId, this.taskRecord, childArray, Boolean.valueOf(true));
        }
    }

    public WindService getWindService() {
        return this.windService;
    }

    public Boolean getCondition() {
        return this.condition;
    }

    public void setWindService(WindService windService) {
        this.windService = windService;
    }

    public void setCondition(Boolean condition) {
        this.condition = condition;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof IfBp)) {
            return false;
        }
        IfBp other = (IfBp)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        Boolean this$condition = this.getCondition();
        Boolean other$condition = other.getCondition();
        if (this$condition == null ? other$condition != null : !((Object)this$condition).equals(other$condition)) {
            return false;
        }
        WindService this$windService = this.getWindService();
        WindService other$windService = other.getWindService();
        return !(this$windService == null ? other$windService != null : !this$windService.equals(other$windService));
    }

    protected boolean canEqual(Object other) {
        return other instanceof IfBp;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        Boolean $condition = this.getCondition();
        result = result * 59 + ($condition == null ? 43 : ((Object)$condition).hashCode());
        WindService $windService = this.getWindService();
        result = result * 59 + ($windService == null ? 43 : $windService.hashCode());
        return result;
    }

    public String toString() {
        return "IfBp(windService=" + this.getWindService() + ", condition=" + this.getCondition() + ")";
    }
}

