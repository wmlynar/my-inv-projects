/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.alibaba.fastjson.JSONObject
 *  com.google.common.collect.Maps
 *  com.seer.rds.service.agv.WindService
 *  com.seer.rds.service.wind.AbstractBp
 *  com.seer.rds.service.wind.AbstratRootBp
 *  com.seer.rds.service.wind.commonBp.TimestampBp
 *  com.seer.rds.vo.wind.ParamPreField
 *  com.seer.rds.vo.wind.TimestampBpField
 *  org.apache.commons.lang3.time.DateFormatUtils
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
import com.seer.rds.vo.wind.ParamPreField;
import com.seer.rds.vo.wind.TimestampBpField;
import java.util.Date;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import org.apache.commons.lang3.time.DateFormatUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Scope;
import org.springframework.stereotype.Component;

@Component(value="TimestampBp")
@Scope(value="prototype")
public class TimestampBp
extends AbstractBp {
    private static final Logger log = LoggerFactory.getLogger(TimestampBp.class);
    @Autowired
    private WindService windService;
    private String currDate;

    protected void getInputParamsAndExecute(AbstratRootBp rootBp) throws Exception {
        this.currDate = DateFormatUtils.format((Date)new Date(), (String)"yyyy-MM-dd HH:mm:ss");
        Map paramMap = (Map)((ConcurrentHashMap)AbstratRootBp.outputParamsMap.get()).get(ParamPreField.blocks);
        ConcurrentMap childParamMap = Maps.newConcurrentMap();
        childParamMap.put(TimestampBpField.ctxTimestamp, this.currDate);
        paramMap.put(this.blockVo.getBlockName(), childParamMap);
        ((ConcurrentHashMap)AbstratRootBp.outputParamsMap.get()).put(ParamPreField.blocks, paramMap);
        this.saveLogResult((Object)this.currDate);
    }

    protected void setBlockInputParamsValue(AbstratRootBp rootBp) throws Exception {
        TimestampBp bpData = new TimestampBp();
        bpData.setCurrDate(this.currDate);
        this.blockRecord.setBlockInputParamsValue(JSONObject.toJSONString((Object)bpData));
        this.windService.saveBlockRecord(this.blockRecord, this.blockVo.getBlockId(), this.blockVo.getBlockType(), this.taskRecord.getProjectId(), this.taskId, this.taskRecord.getId(), this.startOn);
    }

    public WindService getWindService() {
        return this.windService;
    }

    public String getCurrDate() {
        return this.currDate;
    }

    public void setWindService(WindService windService) {
        this.windService = windService;
    }

    public void setCurrDate(String currDate) {
        this.currDate = currDate;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof TimestampBp)) {
            return false;
        }
        TimestampBp other = (TimestampBp)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        WindService this$windService = this.getWindService();
        WindService other$windService = other.getWindService();
        if (this$windService == null ? other$windService != null : !this$windService.equals(other$windService)) {
            return false;
        }
        String this$currDate = this.getCurrDate();
        String other$currDate = other.getCurrDate();
        return !(this$currDate == null ? other$currDate != null : !this$currDate.equals(other$currDate));
    }

    protected boolean canEqual(Object other) {
        return other instanceof TimestampBp;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        WindService $windService = this.getWindService();
        result = result * 59 + ($windService == null ? 43 : $windService.hashCode());
        String $currDate = this.getCurrDate();
        result = result * 59 + ($currDate == null ? 43 : $currDate.hashCode());
        return result;
    }

    public String toString() {
        return "TimestampBp(windService=" + this.getWindService() + ", currDate=" + this.getCurrDate() + ")";
    }
}

