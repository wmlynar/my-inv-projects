/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.alibaba.fastjson.JSONObject
 *  com.google.common.collect.Maps
 *  com.seer.rds.model.wind.BaseRecord
 *  com.seer.rds.service.agv.WindTaskService
 *  com.seer.rds.service.wind.AbstractBp
 *  com.seer.rds.service.wind.AbstratRootBp
 *  com.seer.rds.service.wind.commonBp.GetTaskRecordByOutOrderIdBp
 *  com.seer.rds.vo.wind.GetTaskRecordByOutOrderIdBpField
 *  com.seer.rds.vo.wind.ParamPreField
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
import com.seer.rds.service.agv.WindTaskService;
import com.seer.rds.service.wind.AbstractBp;
import com.seer.rds.service.wind.AbstratRootBp;
import com.seer.rds.vo.wind.GetTaskRecordByOutOrderIdBpField;
import com.seer.rds.vo.wind.ParamPreField;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Scope;
import org.springframework.stereotype.Component;

@Component(value="GetTaskRecordByOutOrderIdBp")
@Scope(value="prototype")
public class GetTaskRecordByOutOrderIdBp
extends AbstractBp {
    private static final Logger log = LoggerFactory.getLogger(GetTaskRecordByOutOrderIdBp.class);
    @Autowired
    private WindTaskService windTaskService;
    private String outOrderId;

    protected void getInputParamsAndExecute(AbstratRootBp rootBp) throws Exception {
        this.outOrderId = (String)rootBp.getInputParamValue(this.taskId, this.inputParams, GetTaskRecordByOutOrderIdBpField.outOrderId);
        List taskRecordListByOutOrderNo = this.windTaskService.getTaskRecordListByOutOrderNo(this.outOrderId);
        Map paramMap = (Map)((ConcurrentHashMap)AbstratRootBp.outputParamsMap.get()).get(ParamPreField.blocks);
        ConcurrentMap childParamMap = Maps.newConcurrentMap();
        List collect = null;
        if (taskRecordListByOutOrderNo != null) {
            collect = taskRecordListByOutOrderNo.stream().map(BaseRecord::getId).collect(Collectors.toList());
        }
        childParamMap.put(GetTaskRecordByOutOrderIdBpField.taskRecordList, null == collect ? "" : collect);
        paramMap.put(this.blockVo.getBlockName(), childParamMap);
        ((ConcurrentHashMap)AbstratRootBp.outputParamsMap.get()).put(ParamPreField.blocks, paramMap);
        this.saveLogResult((Object)(collect == null ? "" : JSONObject.toJSONString(collect)));
    }

    protected void setBlockInputParamsValue(AbstratRootBp rootBp) throws Exception {
    }

    public WindTaskService getWindTaskService() {
        return this.windTaskService;
    }

    public String getOutOrderId() {
        return this.outOrderId;
    }

    public void setWindTaskService(WindTaskService windTaskService) {
        this.windTaskService = windTaskService;
    }

    public void setOutOrderId(String outOrderId) {
        this.outOrderId = outOrderId;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof GetTaskRecordByOutOrderIdBp)) {
            return false;
        }
        GetTaskRecordByOutOrderIdBp other = (GetTaskRecordByOutOrderIdBp)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        WindTaskService this$windTaskService = this.getWindTaskService();
        WindTaskService other$windTaskService = other.getWindTaskService();
        if (this$windTaskService == null ? other$windTaskService != null : !this$windTaskService.equals(other$windTaskService)) {
            return false;
        }
        String this$outOrderId = this.getOutOrderId();
        String other$outOrderId = other.getOutOrderId();
        return !(this$outOrderId == null ? other$outOrderId != null : !this$outOrderId.equals(other$outOrderId));
    }

    protected boolean canEqual(Object other) {
        return other instanceof GetTaskRecordByOutOrderIdBp;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        WindTaskService $windTaskService = this.getWindTaskService();
        result = result * 59 + ($windTaskService == null ? 43 : $windTaskService.hashCode());
        String $outOrderId = this.getOutOrderId();
        result = result * 59 + ($outOrderId == null ? 43 : $outOrderId.hashCode());
        return result;
    }

    public String toString() {
        return "GetTaskRecordByOutOrderIdBp(windTaskService=" + this.getWindTaskService() + ", outOrderId=" + this.getOutOrderId() + ")";
    }
}

