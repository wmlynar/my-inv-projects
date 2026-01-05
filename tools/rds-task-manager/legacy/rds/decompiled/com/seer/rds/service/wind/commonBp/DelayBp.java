/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.alibaba.fastjson.JSONObject
 *  com.seer.rds.service.agv.WindService
 *  com.seer.rds.service.wind.AbstractBp
 *  com.seer.rds.service.wind.AbstratRootBp
 *  com.seer.rds.service.wind.commonBp.DelayBp
 *  com.seer.rds.vo.wind.DelayBpField
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
import com.seer.rds.vo.wind.DelayBpField;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Scope;
import org.springframework.stereotype.Component;

@Component(value="DelayBp")
@Scope(value="prototype")
public class DelayBp
extends AbstractBp {
    private static final Logger log = LoggerFactory.getLogger(DelayBp.class);
    private Long timeMillis;
    @Autowired
    private WindService windService;
    private long longtimeMillis;

    protected void getInputParamsAndExecute(AbstratRootBp rootBp) throws Exception {
        Object timeMillis = rootBp.getInputParamValue(this.taskId, this.inputParams, DelayBpField.timeMillis);
        this.longtimeMillis = timeMillis != null ? Long.parseLong(timeMillis.toString()) : 0L;
        Thread.sleep(this.longtimeMillis);
    }

    protected void setBlockInputParamsValue(AbstratRootBp rootBp) throws Exception {
        this.blockRecord.setBlockInputParams(this.inputParams.toJSONString());
        DelayBp delayBp = new DelayBp();
        delayBp.setTimeMillis(Long.valueOf(this.longtimeMillis));
        this.blockRecord.setBlockInputParamsValue(JSONObject.toJSONString((Object)delayBp));
        this.windService.saveBlockRecord(this.blockRecord, this.blockVo.getBlockId(), this.blockVo.getBlockType(), this.taskRecord.getProjectId(), this.taskId, this.taskRecord.getId(), this.startOn);
    }

    public Long getTimeMillis() {
        return this.timeMillis;
    }

    public WindService getWindService() {
        return this.windService;
    }

    public long getLongtimeMillis() {
        return this.longtimeMillis;
    }

    public void setTimeMillis(Long timeMillis) {
        this.timeMillis = timeMillis;
    }

    public void setWindService(WindService windService) {
        this.windService = windService;
    }

    public void setLongtimeMillis(long longtimeMillis) {
        this.longtimeMillis = longtimeMillis;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof DelayBp)) {
            return false;
        }
        DelayBp other = (DelayBp)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        if (this.getLongtimeMillis() != other.getLongtimeMillis()) {
            return false;
        }
        Long this$timeMillis = this.getTimeMillis();
        Long other$timeMillis = other.getTimeMillis();
        if (this$timeMillis == null ? other$timeMillis != null : !((Object)this$timeMillis).equals(other$timeMillis)) {
            return false;
        }
        WindService this$windService = this.getWindService();
        WindService other$windService = other.getWindService();
        return !(this$windService == null ? other$windService != null : !this$windService.equals(other$windService));
    }

    protected boolean canEqual(Object other) {
        return other instanceof DelayBp;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        long $longtimeMillis = this.getLongtimeMillis();
        result = result * 59 + (int)($longtimeMillis >>> 32 ^ $longtimeMillis);
        Long $timeMillis = this.getTimeMillis();
        result = result * 59 + ($timeMillis == null ? 43 : ((Object)$timeMillis).hashCode());
        WindService $windService = this.getWindService();
        result = result * 59 + ($windService == null ? 43 : $windService.hashCode());
        return result;
    }

    public String toString() {
        return "DelayBp(timeMillis=" + this.getTimeMillis() + ", windService=" + this.getWindService() + ", longtimeMillis=" + this.getLongtimeMillis() + ")";
    }
}

