/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.alibaba.fastjson.JSONArray
 *  com.alibaba.fastjson.JSONObject
 *  com.google.common.collect.Maps
 *  com.seer.rds.constant.TaskBlockStatusEnum
 *  com.seer.rds.service.agv.WindService
 *  com.seer.rds.service.wind.AbstractBp
 *  com.seer.rds.service.wind.AbstratRootBp
 *  com.seer.rds.service.wind.commonBp.RepeatNumBp
 *  com.seer.rds.vo.wind.ParamPreField
 *  com.seer.rds.vo.wind.RepeatNumBpField
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
import com.seer.rds.constant.TaskBlockStatusEnum;
import com.seer.rds.service.agv.WindService;
import com.seer.rds.service.wind.AbstractBp;
import com.seer.rds.service.wind.AbstratRootBp;
import com.seer.rds.vo.wind.ParamPreField;
import com.seer.rds.vo.wind.RepeatNumBpField;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Scope;
import org.springframework.stereotype.Component;

@Component(value="RepeatNumBp")
@Scope(value="prototype")
public class RepeatNumBp
extends AbstractBp {
    private static final Logger log = LoggerFactory.getLogger(RepeatNumBp.class);
    @Autowired
    private WindService windService;
    private Object param;
    private Map outPutParam;
    private Object numObj;

    protected void getInputParamsAndExecute(AbstratRootBp rootBp) throws Exception {
        this.numObj = rootBp.getInputParamValue(this.taskId, this.inputParams, RepeatNumBpField.num);
        log.info("RepeatNumBp num = {}", this.numObj);
        if (this.numObj == null) {
            throw new RuntimeException("@{wind.bp.repeatNum}");
        }
        long num = Long.parseLong(this.numObj.toString());
        if (num > 1000L) {
            throw new RuntimeException(String.format("@{wind.bp.repeatLarge}:%s", num));
        }
        this.blockRecord.setStartedOn(this.startOn);
        this.blockRecord.setStatus(Integer.valueOf(TaskBlockStatusEnum.running.getStatus()));
        RepeatNumBp bpData = new RepeatNumBp();
        bpData.setParam(this.numObj);
        this.blockRecord.setBlockInputParamsValue(JSONObject.toJSONString((Object)bpData));
        this.windService.saveBlockRecord(this.blockRecord, this.blockVo.getBlockId(), this.blockVo.getBlockType(), this.taskRecord.getProjectId(), this.taskId, this.taskRecord.getId(), this.startOn);
        int i = 1;
        while ((long)i <= num) {
            Map paramMap = (Map)((ConcurrentHashMap)AbstratRootBp.outputParamsMap.get()).get(ParamPreField.blocks);
            ConcurrentMap childParamMap = Maps.newConcurrentMap();
            childParamMap.put(RepeatNumBpField.ctxIndex, i);
            paramMap.put(this.blockVo.getBlockName(), childParamMap);
            ((ConcurrentHashMap)AbstratRootBp.outputParamsMap.get()).put(ParamPreField.blocks, paramMap);
            if (this.childDefaultArray != null) {
                JSONArray childArray = (JSONArray)this.childDefaultArray;
                rootBp.executeChild(rootBp, this.taskId, this.taskRecord, childArray, Boolean.valueOf(true));
            }
            ++i;
        }
    }

    protected void runChildBlock(AbstratRootBp rootBp) {
    }

    protected void setBlockInputParamsValue(AbstratRootBp rootBp) throws Exception {
        RepeatNumBp bpData = new RepeatNumBp();
        bpData.setParam(this.numObj);
        this.blockRecord.setBlockInputParamsValue(JSONObject.toJSONString((Object)bpData));
        this.windService.saveBlockRecord(this.blockRecord, this.blockVo.getBlockId(), this.blockVo.getBlockType(), this.taskRecord.getProjectId(), this.taskId, this.taskRecord.getId(), this.startOn);
    }

    public WindService getWindService() {
        return this.windService;
    }

    public Object getParam() {
        return this.param;
    }

    public Map getOutPutParam() {
        return this.outPutParam;
    }

    public Object getNumObj() {
        return this.numObj;
    }

    public void setWindService(WindService windService) {
        this.windService = windService;
    }

    public void setParam(Object param) {
        this.param = param;
    }

    public void setOutPutParam(Map outPutParam) {
        this.outPutParam = outPutParam;
    }

    public void setNumObj(Object numObj) {
        this.numObj = numObj;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof RepeatNumBp)) {
            return false;
        }
        RepeatNumBp other = (RepeatNumBp)o;
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
        Map this$outPutParam = this.getOutPutParam();
        Map other$outPutParam = other.getOutPutParam();
        if (this$outPutParam == null ? other$outPutParam != null : !((Object)this$outPutParam).equals(other$outPutParam)) {
            return false;
        }
        Object this$numObj = this.getNumObj();
        Object other$numObj = other.getNumObj();
        return !(this$numObj == null ? other$numObj != null : !this$numObj.equals(other$numObj));
    }

    protected boolean canEqual(Object other) {
        return other instanceof RepeatNumBp;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        WindService $windService = this.getWindService();
        result = result * 59 + ($windService == null ? 43 : $windService.hashCode());
        Object $param = this.getParam();
        result = result * 59 + ($param == null ? 43 : $param.hashCode());
        Map $outPutParam = this.getOutPutParam();
        result = result * 59 + ($outPutParam == null ? 43 : ((Object)$outPutParam).hashCode());
        Object $numObj = this.getNumObj();
        result = result * 59 + ($numObj == null ? 43 : $numObj.hashCode());
        return result;
    }

    public String toString() {
        return "RepeatNumBp(windService=" + this.getWindService() + ", param=" + this.getParam() + ", outPutParam=" + this.getOutPutParam() + ", numObj=" + this.getNumObj() + ")";
    }
}

