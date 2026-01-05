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
 *  com.seer.rds.service.wind.commonBp.IfElseIfBp
 *  com.seer.rds.vo.wind.IfElseIfBpField
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
import com.seer.rds.vo.wind.IfElseIfBpField;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Scope;
import org.springframework.stereotype.Component;

@Component(value="IfElseIfBp")
@Scope(value="prototype")
public class IfElseIfBp
extends AbstractBp {
    private static final Logger log = LoggerFactory.getLogger(IfElseIfBp.class);
    @Autowired
    private WindService windService;
    private Boolean conditionIf;
    private Boolean conditionElseIf;
    private JSONArray childIfTrue;
    private JSONArray childElseIfTrue;
    private JSONArray childElseTrue;

    protected void getInputParamsAndExecute(AbstratRootBp rootBp) {
        Object conditionIfObj = rootBp.getInputParamValue(this.taskId, this.inputParams, IfElseIfBpField.conditionIf);
        Object conditionElseIfObj = rootBp.getInputParamValue(this.taskId, this.inputParams, IfElseIfBpField.conditionElseIf);
        if (conditionIfObj != null) {
            this.conditionIf = Boolean.parseBoolean(conditionIfObj.toString());
        }
        if (conditionElseIfObj != null) {
            this.conditionElseIf = Boolean.parseBoolean(conditionElseIfObj.toString());
        }
        JSONObject child = (JSONObject)this.childDefaultArray;
        this.childIfTrue = child.getJSONArray(IfElseIfBpField.ifTrue);
        this.childElseIfTrue = child.getJSONArray(IfElseIfBpField.elseIfTrue);
        this.childElseTrue = child.getJSONArray(IfElseIfBpField.elseTrue);
        this.saveLogResult((Object)String.format("If@{wind.bp.condition}=%s, ElseIF@{wind.bp.condition}=%s", this.conditionIf, this.conditionElseIf));
    }

    protected void setBlockInputParamsValue(AbstratRootBp rootBp) {
        IfElseIfBp ifElseIfBp = new IfElseIfBp();
        ifElseIfBp.setConditionIf(this.conditionIf);
        ifElseIfBp.setConditionElseIf(this.conditionElseIf);
        this.blockRecord.setBlockInputParamsValue(JSONObject.toJSONString((Object)ifElseIfBp));
        this.windService.saveBlockRecord(this.blockRecord, this.blockVo.getBlockId(), this.blockVo.getBlockType(), this.taskRecord.getProjectId(), this.taskId, this.taskRecord.getId(), this.startOn);
    }

    protected void runChildBlock(AbstratRootBp rootBp) {
        if (!"End".equals(this.state) && ((Boolean)RootBp.taskStatus.get(this.taskId + this.taskRecord.getId())).booleanValue() && this.childDefaultArray != null) {
            if (this.conditionIf.booleanValue()) {
                rootBp.executeChild(rootBp, this.taskId, this.taskRecord, this.childIfTrue, Boolean.valueOf(true));
            } else if (this.conditionElseIf.booleanValue()) {
                rootBp.executeChild(rootBp, this.taskId, this.taskRecord, this.childElseIfTrue, Boolean.valueOf(true));
            } else {
                rootBp.executeChild(rootBp, this.taskId, this.taskRecord, this.childElseTrue, Boolean.valueOf(true));
            }
        }
    }

    public WindService getWindService() {
        return this.windService;
    }

    public Boolean getConditionIf() {
        return this.conditionIf;
    }

    public Boolean getConditionElseIf() {
        return this.conditionElseIf;
    }

    public JSONArray getChildIfTrue() {
        return this.childIfTrue;
    }

    public JSONArray getChildElseIfTrue() {
        return this.childElseIfTrue;
    }

    public JSONArray getChildElseTrue() {
        return this.childElseTrue;
    }

    public void setWindService(WindService windService) {
        this.windService = windService;
    }

    public void setConditionIf(Boolean conditionIf) {
        this.conditionIf = conditionIf;
    }

    public void setConditionElseIf(Boolean conditionElseIf) {
        this.conditionElseIf = conditionElseIf;
    }

    public void setChildIfTrue(JSONArray childIfTrue) {
        this.childIfTrue = childIfTrue;
    }

    public void setChildElseIfTrue(JSONArray childElseIfTrue) {
        this.childElseIfTrue = childElseIfTrue;
    }

    public void setChildElseTrue(JSONArray childElseTrue) {
        this.childElseTrue = childElseTrue;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof IfElseIfBp)) {
            return false;
        }
        IfElseIfBp other = (IfElseIfBp)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        Boolean this$conditionIf = this.getConditionIf();
        Boolean other$conditionIf = other.getConditionIf();
        if (this$conditionIf == null ? other$conditionIf != null : !((Object)this$conditionIf).equals(other$conditionIf)) {
            return false;
        }
        Boolean this$conditionElseIf = this.getConditionElseIf();
        Boolean other$conditionElseIf = other.getConditionElseIf();
        if (this$conditionElseIf == null ? other$conditionElseIf != null : !((Object)this$conditionElseIf).equals(other$conditionElseIf)) {
            return false;
        }
        WindService this$windService = this.getWindService();
        WindService other$windService = other.getWindService();
        if (this$windService == null ? other$windService != null : !this$windService.equals(other$windService)) {
            return false;
        }
        JSONArray this$childIfTrue = this.getChildIfTrue();
        JSONArray other$childIfTrue = other.getChildIfTrue();
        if (this$childIfTrue == null ? other$childIfTrue != null : !this$childIfTrue.equals(other$childIfTrue)) {
            return false;
        }
        JSONArray this$childElseIfTrue = this.getChildElseIfTrue();
        JSONArray other$childElseIfTrue = other.getChildElseIfTrue();
        if (this$childElseIfTrue == null ? other$childElseIfTrue != null : !this$childElseIfTrue.equals(other$childElseIfTrue)) {
            return false;
        }
        JSONArray this$childElseTrue = this.getChildElseTrue();
        JSONArray other$childElseTrue = other.getChildElseTrue();
        return !(this$childElseTrue == null ? other$childElseTrue != null : !this$childElseTrue.equals(other$childElseTrue));
    }

    protected boolean canEqual(Object other) {
        return other instanceof IfElseIfBp;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        Boolean $conditionIf = this.getConditionIf();
        result = result * 59 + ($conditionIf == null ? 43 : ((Object)$conditionIf).hashCode());
        Boolean $conditionElseIf = this.getConditionElseIf();
        result = result * 59 + ($conditionElseIf == null ? 43 : ((Object)$conditionElseIf).hashCode());
        WindService $windService = this.getWindService();
        result = result * 59 + ($windService == null ? 43 : $windService.hashCode());
        JSONArray $childIfTrue = this.getChildIfTrue();
        result = result * 59 + ($childIfTrue == null ? 43 : $childIfTrue.hashCode());
        JSONArray $childElseIfTrue = this.getChildElseIfTrue();
        result = result * 59 + ($childElseIfTrue == null ? 43 : $childElseIfTrue.hashCode());
        JSONArray $childElseTrue = this.getChildElseTrue();
        result = result * 59 + ($childElseTrue == null ? 43 : $childElseTrue.hashCode());
        return result;
    }

    public String toString() {
        return "IfElseIfBp(windService=" + this.getWindService() + ", conditionIf=" + this.getConditionIf() + ", conditionElseIf=" + this.getConditionElseIf() + ", childIfTrue=" + this.getChildIfTrue() + ", childElseIfTrue=" + this.getChildElseIfTrue() + ", childElseTrue=" + this.getChildElseTrue() + ")";
    }
}

