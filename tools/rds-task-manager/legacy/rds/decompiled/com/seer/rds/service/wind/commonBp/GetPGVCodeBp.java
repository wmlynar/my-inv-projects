/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.alibaba.fastjson.JSONArray
 *  com.alibaba.fastjson.JSONObject
 *  com.seer.rds.constant.ApiEnum
 *  com.seer.rds.exception.BpRuntimeException
 *  com.seer.rds.service.wind.AbstractBp
 *  com.seer.rds.service.wind.AbstratRootBp
 *  com.seer.rds.service.wind.RootBp
 *  com.seer.rds.service.wind.WindTaskStatus
 *  com.seer.rds.service.wind.commonBp.GetPGVCodeBp
 *  com.seer.rds.util.OkHttpUtil
 *  com.seer.rds.vo.wind.CSelectAgvBpField
 *  org.apache.commons.collections.CollectionUtils
 *  org.apache.commons.lang3.StringUtils
 *  org.slf4j.Logger
 *  org.slf4j.LoggerFactory
 *  org.springframework.context.annotation.Scope
 *  org.springframework.stereotype.Component
 */
package com.seer.rds.service.wind.commonBp;

import com.alibaba.fastjson.JSONArray;
import com.alibaba.fastjson.JSONObject;
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
import java.util.Collection;
import org.apache.commons.collections.CollectionUtils;
import org.apache.commons.lang3.StringUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Scope;
import org.springframework.stereotype.Component;

@Component(value="GetPGVCodeBp")
@Scope(value="prototype")
public class GetPGVCodeBp
extends AbstractBp {
    private static final Logger log = LoggerFactory.getLogger(GetPGVCodeBp.class);

    protected void getInputParamsAndExecute(AbstratRootBp rootBp) throws Exception {
        Object vehicleObj = this.blockInputParamsValue.get(CSelectAgvBpField.vehicle);
        if (vehicleObj == null) {
            throw new BpRuntimeException("@{wind.bp.vehicleIDEmpty}");
        }
        Object result = null;
        while (true) {
            WindTaskStatus.monitorTaskEndErrorAndTaskStop((AbstractBp)this);
            try {
                String str = OkHttpUtil.get((String)(RootBp.getUrl((String)ApiEnum.robotsStatus.getUri()) + String.format("?vehicles=%s", vehicleObj.toString())));
                if (StringUtils.isNotEmpty((CharSequence)str)) {
                    JSONObject info;
                    JSONObject jsonObject = JSONObject.parseObject((String)str);
                    if (jsonObject.getInteger("code") != 0) {
                        this.saveLogError(jsonObject.getString("msg"));
                        continue;
                    }
                    JSONArray report = jsonObject.getJSONArray("report");
                    if (!CollectionUtils.isNotEmpty((Collection)report) || (info = report.getJSONObject(0).getJSONObject("rbk_report").getJSONObject("info")) == null || info.getJSONObject("PGV") == null) break;
                    result = info.getJSONObject("PGV").get((Object)"tagValue");
                    break;
                }
            }
            catch (InterruptedIOException e) {
                Thread.currentThread().interrupt();
                this.checkIfInterrupt();
            }
            catch (IOException e) {
                log.error("GetPGVCodeBp connection core error {}", (Throwable)e);
                this.saveLogError("@{response.code.robotStatusSycException}");
            }
            Thread.sleep(1000L);
        }
        this.saveLogResult(result == null ? "" : result);
        this.blockOutParamsValue.put("codeInfo", result == null ? "" : result);
    }

    protected void setBlockInputParamsValue(AbstratRootBp rootBp) throws Exception {
    }
}

