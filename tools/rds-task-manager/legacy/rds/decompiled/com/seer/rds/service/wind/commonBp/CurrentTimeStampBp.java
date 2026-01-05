/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.alibaba.fastjson.JSONObject
 *  com.google.common.collect.Maps
 *  com.seer.rds.service.wind.AbstractBp
 *  com.seer.rds.service.wind.AbstratRootBp
 *  com.seer.rds.service.wind.commonBp.CurrentTimeStampBp
 *  com.seer.rds.vo.wind.CurrentTimestampBpField
 *  com.seer.rds.vo.wind.ParamPreField
 *  org.slf4j.Logger
 *  org.slf4j.LoggerFactory
 *  org.springframework.context.annotation.Scope
 *  org.springframework.stereotype.Component
 */
package com.seer.rds.service.wind.commonBp;

import com.alibaba.fastjson.JSONObject;
import com.google.common.collect.Maps;
import com.seer.rds.service.wind.AbstractBp;
import com.seer.rds.service.wind.AbstratRootBp;
import com.seer.rds.vo.wind.CurrentTimestampBpField;
import com.seer.rds.vo.wind.ParamPreField;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Scope;
import org.springframework.stereotype.Component;

@Component(value="CurrentTimeStampBp")
@Scope(value="prototype")
public class CurrentTimeStampBp
extends AbstractBp {
    private static final Logger log = LoggerFactory.getLogger(CurrentTimeStampBp.class);
    private Long currentTimeStamp;

    protected void getInputParamsAndExecute(AbstratRootBp rootBp) throws Exception {
        this.currentTimeStamp = System.currentTimeMillis();
        Map paramMap = (Map)((ConcurrentHashMap)AbstratRootBp.outputParamsMap.get()).get(ParamPreField.blocks);
        ConcurrentMap childParamMap = Maps.newConcurrentMap();
        childParamMap.put(CurrentTimestampBpField.currentTimeStamp, this.currentTimeStamp);
        paramMap.put(this.blockVo.getBlockName(), childParamMap);
        ((ConcurrentHashMap)AbstratRootBp.outputParamsMap.get()).put(ParamPreField.blocks, paramMap);
        this.saveLogResult((Object)this.currentTimeStamp);
    }

    protected void setBlockInputParamsValue(AbstratRootBp rootBp) throws Exception {
        CurrentTimeStampBp bpData = new CurrentTimeStampBp();
        bpData.setCurrentTimeStamp(this.currentTimeStamp);
        this.blockRecord.setBlockInputParamsValue(JSONObject.toJSONString((Object)bpData));
        super.getWindService().saveBlockRecord(this.blockRecord, this.blockVo.getBlockId(), this.blockVo.getBlockType(), this.taskRecord.getProjectId(), this.taskId, this.taskRecord.getId(), this.startOn);
    }

    public Long getCurrentTimeStamp() {
        return this.currentTimeStamp;
    }

    public void setCurrentTimeStamp(Long currentTimeStamp) {
        this.currentTimeStamp = currentTimeStamp;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof CurrentTimeStampBp)) {
            return false;
        }
        CurrentTimeStampBp other = (CurrentTimeStampBp)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        Long this$currentTimeStamp = this.getCurrentTimeStamp();
        Long other$currentTimeStamp = other.getCurrentTimeStamp();
        return !(this$currentTimeStamp == null ? other$currentTimeStamp != null : !((Object)this$currentTimeStamp).equals(other$currentTimeStamp));
    }

    protected boolean canEqual(Object other) {
        return other instanceof CurrentTimeStampBp;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        Long $currentTimeStamp = this.getCurrentTimeStamp();
        result = result * 59 + ($currentTimeStamp == null ? 43 : ((Object)$currentTimeStamp).hashCode());
        return result;
    }

    public String toString() {
        return "CurrentTimeStampBp(currentTimeStamp=" + this.getCurrentTimeStamp() + ")";
    }
}

