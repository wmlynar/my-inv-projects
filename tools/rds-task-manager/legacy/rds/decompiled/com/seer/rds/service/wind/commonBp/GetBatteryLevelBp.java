/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.alibaba.fastjson.JSON
 *  com.alibaba.fastjson.JSONArray
 *  com.alibaba.fastjson.JSONObject
 *  com.seer.rds.config.GlobalCacheConfig
 *  com.seer.rds.exception.BpRuntimeException
 *  com.seer.rds.service.wind.AbstractBp
 *  com.seer.rds.service.wind.AbstratRootBp
 *  com.seer.rds.service.wind.WindTaskStatus
 *  com.seer.rds.service.wind.commonBp.GetBatteryLevelBp
 *  com.seer.rds.vo.wind.CSelectAgvBpField
 *  org.slf4j.Logger
 *  org.slf4j.LoggerFactory
 *  org.springframework.context.annotation.Scope
 *  org.springframework.stereotype.Component
 */
package com.seer.rds.service.wind.commonBp;

import com.alibaba.fastjson.JSON;
import com.alibaba.fastjson.JSONArray;
import com.alibaba.fastjson.JSONObject;
import com.seer.rds.config.GlobalCacheConfig;
import com.seer.rds.exception.BpRuntimeException;
import com.seer.rds.service.wind.AbstractBp;
import com.seer.rds.service.wind.AbstratRootBp;
import com.seer.rds.service.wind.WindTaskStatus;
import com.seer.rds.vo.wind.CSelectAgvBpField;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Scope;
import org.springframework.stereotype.Component;

@Component(value="GetBatteryLevelBp")
@Scope(value="prototype")
public class GetBatteryLevelBp
extends AbstractBp {
    private static final Logger log = LoggerFactory.getLogger(GetBatteryLevelBp.class);

    protected void getInputParamsAndExecute(AbstratRootBp rootBp) throws Exception {
        Object cache;
        Object vehicleObj = this.blockInputParamsValue.get(CSelectAgvBpField.vehicle);
        if (vehicleObj == null) {
            throw new BpRuntimeException("@{wind.bp.vehicleIDEmpty}");
        }
        Double result = null;
        do {
            Thread.sleep(1000L);
            WindTaskStatus.monitorTaskEndErrorAndTaskStop((AbstractBp)this);
            cache = GlobalCacheConfig.getCache((String)"robotsStatus");
        } while (null == cache);
        JSONObject robotInfoJSON = JSONObject.parseObject((String)cache.toString());
        JSONArray reportArray = JSONArray.parseArray((String)robotInfoJSON.get((Object)"report").toString());
        for (Object reportObj : reportArray) {
            JSONObject reportJson = JSONObject.parseObject((String)reportObj.toString());
            String uuid = reportJson.get((Object)"uuid").toString();
            if (!vehicleObj.toString().equals(uuid)) continue;
            JSONObject rbkReportJson = JSON.parseObject((String)reportJson.get((Object)"rbk_report").toString());
            result = rbkReportJson.get((Object)"battery_level") == null ? null : Double.valueOf(Double.parseDouble(rbkReportJson.get((Object)"battery_level").toString()));
            break;
        }
        this.saveLogResult(result);
        this.blockOutParamsValue.put("batteryLevel", result);
    }

    protected void setBlockInputParamsValue(AbstratRootBp rootBp) throws Exception {
    }
}

