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
 *  com.seer.rds.service.wind.taskBp.ReadDIWaitBp
 *  com.seer.rds.util.OkHttpUtil
 *  com.seer.rds.vo.wind.ReadDIWaitBpFieId
 *  org.apache.commons.lang3.BooleanUtils
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
import com.seer.rds.constant.ApiEnum;
import com.seer.rds.exception.BpRuntimeException;
import com.seer.rds.service.wind.AbstractBp;
import com.seer.rds.service.wind.AbstratRootBp;
import com.seer.rds.service.wind.RootBp;
import com.seer.rds.service.wind.WindTaskStatus;
import com.seer.rds.util.OkHttpUtil;
import com.seer.rds.vo.wind.ReadDIWaitBpFieId;
import java.util.Map;
import org.apache.commons.lang3.BooleanUtils;
import org.apache.commons.lang3.StringUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Scope;
import org.springframework.stereotype.Component;
import org.springframework.util.ObjectUtils;

@Component(value="ReadDIWaitBp")
@Scope(value="prototype")
public class ReadDIWaitBp
extends AbstractBp {
    private static final Logger log = LoggerFactory.getLogger(ReadDIWaitBp.class);

    protected void getInputParamsAndExecute(AbstratRootBp rootBp) throws Exception {
        long timeSleep;
        int num;
        Object agvIdObj = this.blockInputParamsValue.get(ReadDIWaitBpFieId.agvId);
        Object idObj = this.blockInputParamsValue.get(ReadDIWaitBpFieId.id);
        Object statusObj = this.blockInputParamsValue.get(ReadDIWaitBpFieId.status);
        Object retryObj = this.blockInputParamsValue.get(ReadDIWaitBpFieId.retry);
        Object retryIntervalObj = this.blockInputParamsValue.get(ReadDIWaitBpFieId.retryInterval);
        if (ObjectUtils.isEmpty(agvIdObj)) {
            throw new BpRuntimeException("@{wind.bp.vehicleIDEmpty}");
        }
        if (ObjectUtils.isEmpty(idObj)) {
            throw new BpRuntimeException("@{wind.bp.DIIDEmpty}");
        }
        if (ObjectUtils.isEmpty(statusObj)) {
            throw new BpRuntimeException("@{wind.bp.DIStatusEmpty}");
        }
        int n = num = retryObj == null ? 0 : Integer.parseInt(retryObj.toString());
        if (num < 0) {
            throw new BpRuntimeException(String.format("@{response.code.paramsError}:%s", retryObj));
        }
        String params = "?vehicles=" + agvIdObj.toString() + "&paths=report.rbk_report.DI";
        Object result = null;
        int timeNum = 0;
        long l = timeSleep = ObjectUtils.isEmpty(retryIntervalObj) ? 1000L : Long.valueOf(retryIntervalObj.toString());
        while (true) {
            Map resultMap;
            if (num > 0 && timeNum == num) {
                this.saveLogInfo(String.format("@{wind.bp.retryOver}: %s", num));
                break;
            }
            if (num > 0) {
                ++timeNum;
            }
            Thread.sleep(timeSleep);
            WindTaskStatus.monitorTaskEndErrorAndTaskStop((AbstractBp)this);
            try {
                resultMap = OkHttpUtil.getWithHttpCode((String)(RootBp.getUrl((String)ApiEnum.robotsStatus.getUri()) + params));
            }
            catch (Exception e) {
                log.error("core connect error {}", (Object)e.getMessage());
                this.saveLogError(e.getMessage());
                continue;
            }
            JSONObject resultObject = JSONObject.parseObject((String)((String)resultMap.get("body")));
            if (resultObject.getJSONArray("report") == null) {
                this.saveLogError(String.format("%s @{wind.bp.nonexistent}", agvIdObj));
                continue;
            }
            JSONObject reportObject = JSONObject.parseObject((String)resultObject.getJSONArray("report").get(0).toString());
            JSONObject rbkObject = JSONObject.parseObject((String)reportObject.getString("rbk_report"));
            JSONArray jsonArrayDI = rbkObject.getJSONArray("DI");
            if (jsonArrayDI == null) {
                this.saveLogError(String.format("%s @{wind.bp.robotDI}", agvIdObj));
                continue;
            }
            for (int i = 0; i < jsonArrayDI.size(); ++i) {
                JSONObject parseObject = JSONObject.parseObject((String)jsonArrayDI.get(i).toString());
                if (!StringUtils.equals((CharSequence)parseObject.getString("id"), (CharSequence)idObj.toString())) continue;
                result = parseObject.get((Object)"status");
                break;
            }
            if (result == null) {
                this.saveLogError(String.format("%s @{wind.bp.nonexistent} DI %s", agvIdObj, idObj));
                continue;
            }
            if (BooleanUtils.compare((boolean)Boolean.valueOf(result.toString()), (boolean)Boolean.valueOf(statusObj.toString())) == 0) break;
            this.saveLogSuspend(String.format("@{wind.bp.deviceExpected}:%s, @{wind.bp.deviceReality}:%s", Boolean.valueOf(statusObj.toString()) != false ? "@{wind.bp.DIStatusOpen}" : "@{wind.bp.DIStatusClose}", Boolean.valueOf(result.toString()) != false ? "@{wind.bp.DIStatusOpen}" : "@{wind.bp.DIStatusClose}"));
        }
        this.blockOutParamsValue.put(ReadDIWaitBpFieId.status, result);
        if (num > 0) {
            this.saveLogResult(result);
        }
    }

    protected void setBlockInputParamsValue(AbstratRootBp rootBp) throws Exception {
    }
}

