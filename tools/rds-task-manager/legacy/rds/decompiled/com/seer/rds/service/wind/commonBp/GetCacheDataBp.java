/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.alibaba.fastjson.JSONObject
 *  com.google.common.collect.Maps
 *  com.seer.rds.service.agv.WindService
 *  com.seer.rds.service.wind.AbstractBp
 *  com.seer.rds.service.wind.AbstratRootBp
 *  com.seer.rds.service.wind.commonBp.CacheDataBp
 *  com.seer.rds.service.wind.commonBp.GetCacheDataBp
 *  com.seer.rds.vo.wind.CacheDataBpField
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
import com.seer.rds.service.agv.WindService;
import com.seer.rds.service.wind.AbstractBp;
import com.seer.rds.service.wind.AbstratRootBp;
import com.seer.rds.service.wind.commonBp.CacheDataBp;
import com.seer.rds.vo.wind.CacheDataBpField;
import com.seer.rds.vo.wind.ParamPreField;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Scope;
import org.springframework.stereotype.Component;

@Component(value="GetCacheDataBp")
@Scope(value="prototype")
public class GetCacheDataBp
extends AbstractBp {
    private static final Logger log = LoggerFactory.getLogger(GetCacheDataBp.class);
    @Autowired
    private WindService windService;
    private Object key;
    private Object value;

    protected void getInputParamsAndExecute(AbstratRootBp rootBp) throws Exception {
        this.key = rootBp.getInputParamValue(this.taskId, this.inputParams, CacheDataBpField.key);
        if (this.key == null) {
            throw new RuntimeException("@{wind.bp.cacheKey}");
        }
        this.value = CacheDataBp.cacheMap.get(this.key.toString());
        Map paramMap = (Map)((ConcurrentHashMap)AbstratRootBp.outputParamsMap.get()).get(ParamPreField.blocks);
        ConcurrentMap childParamMap = Maps.newConcurrentMap();
        childParamMap.put(CacheDataBpField.value, this.value != null ? this.value.toString() : "");
        paramMap.put(this.blockVo.getBlockName(), childParamMap);
        ((ConcurrentHashMap)AbstratRootBp.outputParamsMap.get()).put(ParamPreField.blocks, paramMap);
        this.saveLogResult(this.value);
    }

    protected void setBlockInputParamsValue(AbstratRootBp rootBp) throws Exception {
        GetCacheDataBp bpData = new GetCacheDataBp();
        bpData.setKey(this.key);
        bpData.setValue(this.value);
        this.blockRecord.setBlockInputParamsValue(JSONObject.toJSONString((Object)bpData));
        this.windService.saveBlockRecord(this.blockRecord, this.blockVo.getBlockId(), this.blockVo.getBlockType(), this.taskRecord.getProjectId(), this.taskId, this.taskRecord.getId(), this.startOn);
    }

    public WindService getWindService() {
        return this.windService;
    }

    public Object getKey() {
        return this.key;
    }

    public Object getValue() {
        return this.value;
    }

    public void setWindService(WindService windService) {
        this.windService = windService;
    }

    public void setKey(Object key) {
        this.key = key;
    }

    public void setValue(Object value) {
        this.value = value;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof GetCacheDataBp)) {
            return false;
        }
        GetCacheDataBp other = (GetCacheDataBp)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        WindService this$windService = this.getWindService();
        WindService other$windService = other.getWindService();
        if (this$windService == null ? other$windService != null : !this$windService.equals(other$windService)) {
            return false;
        }
        Object this$key = this.getKey();
        Object other$key = other.getKey();
        if (this$key == null ? other$key != null : !this$key.equals(other$key)) {
            return false;
        }
        Object this$value = this.getValue();
        Object other$value = other.getValue();
        return !(this$value == null ? other$value != null : !this$value.equals(other$value));
    }

    protected boolean canEqual(Object other) {
        return other instanceof GetCacheDataBp;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        WindService $windService = this.getWindService();
        result = result * 59 + ($windService == null ? 43 : $windService.hashCode());
        Object $key = this.getKey();
        result = result * 59 + ($key == null ? 43 : $key.hashCode());
        Object $value = this.getValue();
        result = result * 59 + ($value == null ? 43 : $value.hashCode());
        return result;
    }

    public String toString() {
        return "GetCacheDataBp(windService=" + this.getWindService() + ", key=" + this.getKey() + ", value=" + this.getValue() + ")";
    }
}

