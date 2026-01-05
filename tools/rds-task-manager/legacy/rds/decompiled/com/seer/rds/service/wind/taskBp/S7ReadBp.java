/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.google.common.collect.Maps
 *  com.seer.rds.service.wind.AbstractBp
 *  com.seer.rds.service.wind.AbstratRootBp
 *  com.seer.rds.service.wind.WindTaskStatus
 *  com.seer.rds.service.wind.taskBp.S7ReadBp
 *  com.seer.rds.util.siemens.S7Util
 *  com.seer.rds.vo.wind.ParamPreField
 *  com.seer.rds.vo.wind.S7ReadBpFieId
 *  org.slf4j.Logger
 *  org.slf4j.LoggerFactory
 *  org.springframework.context.annotation.Scope
 *  org.springframework.stereotype.Component
 */
package com.seer.rds.service.wind.taskBp;

import com.google.common.collect.Maps;
import com.seer.rds.service.wind.AbstractBp;
import com.seer.rds.service.wind.AbstratRootBp;
import com.seer.rds.service.wind.WindTaskStatus;
import com.seer.rds.util.siemens.S7Util;
import com.seer.rds.vo.wind.ParamPreField;
import com.seer.rds.vo.wind.S7ReadBpFieId;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Scope;
import org.springframework.stereotype.Component;

@Component(value="S7ReadBp")
@Scope(value="prototype")
public class S7ReadBp
extends AbstractBp {
    private static final Logger log = LoggerFactory.getLogger(S7ReadBp.class);

    protected void getInputParamsAndExecute(AbstratRootBp rootBp) throws Exception {
        String result;
        Object resultValue;
        Object type = this.blockInputParamsValue.get(S7ReadBpFieId.type);
        Object ip = this.blockInputParamsValue.get(S7ReadBpFieId.ip);
        Object blockAndOffset = this.blockInputParamsValue.get(S7ReadBpFieId.blockAndOffset);
        Object dataType = this.blockInputParamsValue.get(S7ReadBpFieId.dataType);
        Object expectValue = this.blockInputParamsValue.get(S7ReadBpFieId.expectValue);
        Object retry = this.blockInputParamsValue.get(S7ReadBpFieId.retry);
        Object retryInterval = this.blockInputParamsValue.get(S7ReadBpFieId.retryInterval);
        Object rack = this.blockInputParamsValue.get(S7ReadBpFieId.rack);
        Object slot = this.blockInputParamsValue.get(S7ReadBpFieId.slot);
        if (type == null) {
            throw new RuntimeException("@{wind.bp.plcTypeCantNotBeEmpty}");
        }
        if (ip == null) {
            throw new RuntimeException("@{wind.bp.plcIpCantNotBeEmpty}");
        }
        if (blockAndOffset == null) {
            throw new RuntimeException("@{wind.bp.addressCantNotBeEmpty}");
        }
        if (dataType == null) {
            throw new RuntimeException("@{wind.bp.dataTypeCantNotBeEmpty}");
        }
        if (retry != null && Boolean.parseBoolean(retry.toString()) && expectValue == null) {
            throw new RuntimeException("@{wind.bp.ifRetryExpectValueCanNotBeEmpty}");
        }
        if (retry == null || !Boolean.parseBoolean(retry.toString())) {
            resultValue = S7Util.S7Read((String)type.toString(), (String)ip.toString(), (String)blockAndOffset.toString(), (String)dataType.toString(), (String)(slot == null ? null : slot.toString()), (String)(rack == null ? null : rack.toString()));
            result = resultValue == null ? null : resultValue.toString();
        } else {
            expectValue = S7Util.parseValueToDataType(expectValue, (String)dataType.toString());
            while (true) {
                WindTaskStatus.monitorTaskEndErrorAndTaskStop((AbstractBp)this);
                try {
                    resultValue = S7Util.S7Read((String)type.toString(), (String)ip.toString(), (String)blockAndOffset.toString(), (String)dataType.toString(), (String)(slot == null ? null : slot.toString()), (String)(rack == null ? null : rack.toString()));
                    if (resultValue != null && expectValue.equals(resultValue)) {
                        result = resultValue.toString();
                        break;
                    }
                    log.info("S7 value is not expected, expect value = {}, read value = {}, try again...", expectValue, resultValue);
                    this.saveLogSuspend(String.format("@{wind.bp.deviceExpected}:%s, @{wind.bp.deviceReality}:%s", expectValue, resultValue));
                }
                catch (Exception e) {
                    log.error("readS7ValueByRetry error,try again...");
                    this.saveLogError(e.getMessage());
                }
                Thread.sleep(retryInterval != null ? Long.parseLong(retryInterval.toString()) : 1000L);
            }
        }
        Map paramMap = (Map)((ConcurrentHashMap)AbstratRootBp.outputParamsMap.get()).get(ParamPreField.blocks);
        ConcurrentMap childParamMap = Maps.newConcurrentMap();
        childParamMap.put("S7Value", result);
        paramMap.put(this.blockVo.getBlockName(), childParamMap);
        ((ConcurrentHashMap)AbstratRootBp.outputParamsMap.get()).put(ParamPreField.blocks, paramMap);
        this.saveLogResult((Object)result);
    }

    protected void setBlockInputParamsValue(AbstratRootBp rootBp) throws Exception {
    }
}

