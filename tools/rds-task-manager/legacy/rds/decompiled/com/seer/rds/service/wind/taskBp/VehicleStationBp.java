/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.alibaba.fastjson.JSONArray
 *  com.alibaba.fastjson.JSONObject
 *  com.seer.rds.config.GlobalCacheConfig
 *  com.seer.rds.constant.ApiEnum
 *  com.seer.rds.exception.BpRuntimeException
 *  com.seer.rds.service.wind.AbstractBp
 *  com.seer.rds.service.wind.AbstratRootBp
 *  com.seer.rds.service.wind.RootBp
 *  com.seer.rds.service.wind.WindTaskStatus
 *  com.seer.rds.service.wind.taskBp.VehicleStationBp
 *  com.seer.rds.util.OkHttpUtil
 *  com.seer.rds.vo.wind.CSelectAgvBpField
 *  org.apache.commons.lang3.StringUtils
 *  org.slf4j.Logger
 *  org.slf4j.LoggerFactory
 *  org.springframework.context.annotation.Scope
 *  org.springframework.stereotype.Component
 *  org.springframework.util.ObjectUtils
 */
package com.seer.rds.service.wind.taskBp;

import com.alibaba.fastjson.JSONArray;
import com.alibaba.fastjson.JSONObject;
import com.seer.rds.config.GlobalCacheConfig;
import com.seer.rds.constant.ApiEnum;
import com.seer.rds.exception.BpRuntimeException;
import com.seer.rds.service.wind.AbstractBp;
import com.seer.rds.service.wind.AbstratRootBp;
import com.seer.rds.service.wind.RootBp;
import com.seer.rds.service.wind.WindTaskStatus;
import com.seer.rds.util.OkHttpUtil;
import com.seer.rds.vo.wind.CSelectAgvBpField;
import java.io.IOException;
import java.io.InterruptedIOException;
import java.util.HashMap;
import org.apache.commons.lang3.StringUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Scope;
import org.springframework.stereotype.Component;
import org.springframework.util.ObjectUtils;

@Component(value="VehicleStationBp")
@Scope(value="prototype")
public class VehicleStationBp
extends AbstractBp {
    private static final Logger log = LoggerFactory.getLogger(VehicleStationBp.class);

    protected void getInputParamsAndExecute(AbstratRootBp rootBp) throws Exception {
        Object obj = this.blockInputParamsValue.get(CSelectAgvBpField.vehicle);
        if (ObjectUtils.isEmpty(obj)) {
            throw new BpRuntimeException("@{wind.bp.vehicleIDEmpty}");
        }
        String params = "?vehicles=" + obj.toString() + "&paths=report.rbk_report.current_station,report.rbk_report.last_station";
        HashMap resultMap = new HashMap();
        String location = "";
        String last_station = "";
        while (true) {
            WindTaskStatus.monitorTaskEndErrorAndTaskStop((AbstractBp)this);
            try {
                resultMap.clear();
                resultMap.putAll(OkHttpUtil.getWithHttpCode((String)(RootBp.getUrl((String)ApiEnum.robotsStatus.getUri()) + params)));
                JSONArray jsonArray = JSONObject.parseObject((String)((String)resultMap.get("body"))).getJSONArray("report");
                if (jsonArray != null) {
                    location = jsonArray.getJSONObject(0).getJSONObject("rbk_report").getString("current_station");
                    last_station = jsonArray.getJSONObject(0).getJSONObject("rbk_report").getString("last_station");
                    log.info("currentStation = {}, lastStation = {}", (Object)location, (Object)last_station);
                    break;
                }
            }
            catch (InterruptedIOException e) {
                if ("StopBranchKey".equals(GlobalCacheConfig.getCacheInterrupt((String)this.taskRecord.getId()))) {
                    throw e;
                }
            }
            catch (IOException e) {
                log.error("VehicleStationBp connect core error {}", (Object)e.getMessage());
                this.saveLogError(e.getMessage());
            }
            catch (Exception e) {
                log.error("VehicleStationBp error {}", (Throwable)e);
            }
            Thread.sleep(2000L);
        }
        this.saveLogResult((Object)location);
        this.blockOutParamsValue.put("station", StringUtils.isEmpty((CharSequence)location) ? "" : location);
        this.blockOutParamsValue.put("lastStation", StringUtils.isEmpty((CharSequence)last_station) ? "" : last_station);
    }

    protected void setBlockInputParamsValue(AbstratRootBp rootBp) throws Exception {
    }
}

