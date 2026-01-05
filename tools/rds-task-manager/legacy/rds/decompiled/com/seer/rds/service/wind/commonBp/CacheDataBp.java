/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.alibaba.fastjson.JSONObject
 *  com.seer.rds.exception.BpRuntimeException
 *  com.seer.rds.service.agv.WindService
 *  com.seer.rds.service.wind.AbstractBp
 *  com.seer.rds.service.wind.AbstratRootBp
 *  com.seer.rds.service.wind.commonBp.CacheDataBp
 *  com.seer.rds.vo.wind.CacheDataBpField
 *  org.slf4j.Logger
 *  org.slf4j.LoggerFactory
 *  org.springframework.beans.factory.annotation.Autowired
 *  org.springframework.context.annotation.Scope
 *  org.springframework.stereotype.Component
 */
package com.seer.rds.service.wind.commonBp;

import com.alibaba.fastjson.JSONObject;
import com.seer.rds.exception.BpRuntimeException;
import com.seer.rds.service.agv.WindService;
import com.seer.rds.service.wind.AbstractBp;
import com.seer.rds.service.wind.AbstratRootBp;
import com.seer.rds.vo.wind.CacheDataBpField;
import java.util.concurrent.ConcurrentHashMap;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Scope;
import org.springframework.stereotype.Component;

@Component(value="CacheDataBp")
@Scope(value="prototype")
public class CacheDataBp
extends AbstractBp {
    private static final Logger log = LoggerFactory.getLogger(CacheDataBp.class);
    @Autowired
    private WindService windService;
    private Object key;
    private Object value;
    public static ConcurrentHashMap<String, Object> cacheMap = new ConcurrentHashMap();

    public static void cacheMap() {
    }

    protected void getInputParamsAndExecute(AbstratRootBp rootBp) throws Exception {
        this.key = rootBp.getInputParamValue(this.taskId, this.inputParams, CacheDataBpField.key);
        this.value = rootBp.getInputParamValue(this.taskId, this.inputParams, CacheDataBpField.value);
        if (this.key == null) {
            throw new BpRuntimeException("@{wind.bp.cacheKey}");
        }
        if (this.value == null) {
            throw new BpRuntimeException("@{wind.bp.cacheValue}");
        }
        cacheMap.put(this.key.toString(), this.value);
        this.windService.dataCache(this.key.toString(), this.value.toString());
    }

    protected void setBlockInputParamsValue(AbstratRootBp rootBp) throws Exception {
        CacheDataBp bpData = new CacheDataBp();
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
        if (!(o instanceof CacheDataBp)) {
            return false;
        }
        CacheDataBp other = (CacheDataBp)o;
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
        return other instanceof CacheDataBp;
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
        return "CacheDataBp(windService=" + this.getWindService() + ", key=" + this.getKey() + ", value=" + this.getValue() + ")";
    }
}

