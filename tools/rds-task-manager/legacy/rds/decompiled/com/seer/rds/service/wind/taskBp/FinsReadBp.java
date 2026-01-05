/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.google.common.collect.Maps
 *  com.seer.rds.service.wind.AbstractBp
 *  com.seer.rds.service.wind.AbstratRootBp
 *  com.seer.rds.service.wind.WindTaskStatus
 *  com.seer.rds.service.wind.taskBp.FinsReadBp
 *  com.seer.rds.util.omron.fins.FinsUtil
 *  com.seer.rds.vo.wind.FinsReadBpFieId
 *  com.seer.rds.vo.wind.ParamPreField
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
import com.seer.rds.util.omron.fins.FinsUtil;
import com.seer.rds.vo.wind.FinsReadBpFieId;
import com.seer.rds.vo.wind.ParamPreField;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Scope;
import org.springframework.stereotype.Component;

@Component(value="FinsReadBp")
@Scope(value="prototype")
public class FinsReadBp
extends AbstractBp {
    private static final Logger log = LoggerFactory.getLogger(FinsReadBp.class);

    protected void getInputParamsAndExecute(AbstratRootBp rootBp) throws Exception {
        Object resultValue;
        Object ip = this.blockInputParamsValue.get(FinsReadBpFieId.ip);
        Object port = this.blockInputParamsValue.get(FinsReadBpFieId.port);
        Object area = this.blockInputParamsValue.get(FinsReadBpFieId.area);
        Object address = this.blockInputParamsValue.get(FinsReadBpFieId.finsIoAddr);
        Object offset = this.blockInputParamsValue.get(FinsReadBpFieId.bitOffset);
        Object dataType = this.blockInputParamsValue.get(FinsReadBpFieId.dataType);
        Object expectValue = this.blockInputParamsValue.get(FinsReadBpFieId.expectValue);
        Object retry = this.blockInputParamsValue.get(FinsReadBpFieId.retry);
        Object retryInterval = this.blockInputParamsValue.get(FinsReadBpFieId.retryInterval);
        if (ip == null) {
            throw new RuntimeException("@{wind.bp.plcIpCantNotBeEmpty}");
        }
        if (port == null) {
            throw new RuntimeException("@{wind.bp.devicePort}");
        }
        if (area == null) {
            throw new RuntimeException("@{wind.bp.areaCantNotBeEmpty}");
        }
        if (address == null) {
            throw new RuntimeException("@{wind.bp.addressCantNotBeEmpty}");
        }
        if (offset == null) {
            throw new RuntimeException("@{wind.bp.offsetCantNotBeEmpty}");
        }
        if (dataType == null) {
            throw new RuntimeException("@{wind.bp.dataTypeCantNotBeEmpty}");
        }
        if (retry != null && Boolean.parseBoolean(retry.toString()) && expectValue == null) {
            throw new RuntimeException("@{wind.bp.ifRetryExpectValueCanNotBeEmpty}");
        }
        String result = null;
        int areaInt = Integer.parseInt(area.toString().substring(2), 16);
        if (retry == null || !Boolean.parseBoolean(retry.toString())) {
            try {
                resultValue = this.finsRead(ip.toString(), Integer.valueOf(port.toString()), Integer.valueOf(areaInt), Integer.valueOf(address.toString()), Integer.valueOf(offset.toString()), dataType.toString());
                result = resultValue.toString();
            }
            catch (Exception e) {
                log.error("Read fins value error, error msg: {}", (Object)e.getMessage());
            }
        } else {
            expectValue = FinsUtil.parseValueToDataType(expectValue, (String)dataType.toString());
            while (true) {
                WindTaskStatus.monitorTaskEndErrorAndTaskStop((AbstractBp)this);
                try {
                    resultValue = this.finsRead(ip.toString(), Integer.valueOf(port.toString()), Integer.valueOf(areaInt), Integer.valueOf(address.toString()), Integer.valueOf(offset.toString()), dataType.toString());
                    if (resultValue != null && expectValue.equals(resultValue)) {
                        result = resultValue.toString();
                        break;
                    }
                    log.info("Fins value is not expected, expect value = {}, read value = {}, try again...", expectValue, resultValue);
                    this.saveLogSuspend(String.format("@{wind.bp.deviceExpected}:%s, @{wind.bp.deviceReality}:%s", expectValue, resultValue));
                }
                catch (Exception e) {
                    log.error("readFinsValueByRetry error, try again...");
                    this.saveLogError(e.getMessage());
                }
                Thread.sleep(retryInterval != null ? Long.parseLong(retryInterval.toString()) : 1000L);
            }
        }
        Map paramMap = (Map)((ConcurrentHashMap)AbstratRootBp.outputParamsMap.get()).get(ParamPreField.blocks);
        ConcurrentMap childParamMap = Maps.newConcurrentMap();
        childParamMap.put("finsValue", result);
        paramMap.put(this.blockVo.getBlockName(), childParamMap);
        ((ConcurrentHashMap)AbstratRootBp.outputParamsMap.get()).put(ParamPreField.blocks, paramMap);
        this.saveLogResult((Object)result);
    }

    private Object finsRead(String ip, Integer port, Integer area, Integer address, Integer offset, String dataType) throws Exception {
        Number value;
        switch (dataType) {
            case "Word": {
                value = FinsUtil.readWord((String)ip, (int)port, (int)area, (int)address, (int)offset);
                break;
            }
            case "Bit": {
                value = FinsUtil.readBit((String)ip, (int)port, (int)area, (int)address, (int)offset).getBitData();
                break;
            }
            default: {
                throw new RuntimeException("@{wind.bp.unsupportedDataType}");
            }
        }
        return value;
    }

    protected void setBlockInputParamsValue(AbstratRootBp rootBp) throws Exception {
    }
}

