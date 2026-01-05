/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.alibaba.fastjson.JSONObject
 *  com.google.common.collect.Maps
 *  com.seer.rds.service.agv.WindService
 *  com.seer.rds.service.wind.AbstractBp
 *  com.seer.rds.service.wind.AbstratRootBp
 *  com.seer.rds.service.wind.WindTaskStatus
 *  com.seer.rds.service.wind.commonBp.MelsecReadBp
 *  com.seer.rds.util.melsec.MelsecUtils
 *  com.seer.rds.vo.wind.ParamPreField
 *  org.apache.commons.lang3.StringUtils
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
import com.seer.rds.service.wind.WindTaskStatus;
import com.seer.rds.util.melsec.MelsecUtils;
import com.seer.rds.vo.wind.ParamPreField;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import org.apache.commons.lang3.StringUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Scope;
import org.springframework.stereotype.Component;

@Component(value="MelsecReadBp")
@Scope(value="prototype")
public class MelsecReadBp
extends AbstractBp {
    private static final Logger log = LoggerFactory.getLogger(MelsecReadBp.class);
    @Autowired
    private WindService windService;
    private Object ip;
    private Object port;
    private Object type;
    private Object address;
    private Object length;
    private Object expectValue;
    private Object retry;
    private Object retryInterval;

    protected void getInputParamsAndExecute(AbstratRootBp rootBp) throws Exception {
        this.ip = rootBp.getInputParamValue(this.taskId, this.inputParams, "ip");
        this.port = rootBp.getInputParamValue(this.taskId, this.inputParams, "port");
        this.type = rootBp.getInputParamValue(this.taskId, this.inputParams, "type");
        this.address = rootBp.getInputParamValue(this.taskId, this.inputParams, "address");
        this.length = rootBp.getInputParamValue(this.taskId, this.inputParams, "length");
        this.expectValue = rootBp.getInputParamValue(this.taskId, this.inputParams, "expectValue");
        this.retry = rootBp.getInputParamValue(this.taskId, this.inputParams, "retry");
        this.retryInterval = rootBp.getInputParamValue(this.taskId, this.inputParams, "retryInterval");
        if (this.ip == null || StringUtils.isEmpty((CharSequence)this.ip.toString())) {
            throw new RuntimeException("@{wind.bp.deviceIp}");
        }
        if (this.port == null) {
            throw new RuntimeException("@{wind.bp.devicePort}");
        }
        if (this.type == null || StringUtils.isEmpty((CharSequence)this.type.toString())) {
            throw new RuntimeException("@{wind.bp.deviceType}");
        }
        if (this.address == null || StringUtils.isEmpty((CharSequence)this.address.toString())) {
            throw new RuntimeException("@{wind.bp.deviceAddrNo}");
        }
        if (this.retry != null && Boolean.parseBoolean(this.retry.toString()) && this.expectValue == null) {
            throw new RuntimeException("@{wind.bp.ifRetryExpectValueCanNotBeEmpty}");
        }
        Object result = null;
        if (this.retry == null || !Boolean.parseBoolean(this.retry.toString())) {
            result = this.readMelsec(this.ip, this.port, this.address, this.length, this.type);
        } else {
            while (true) {
                WindTaskStatus.monitorTaskEndErrorAndTaskStop((AbstractBp)this);
                try {
                    result = this.readMelsec(this.ip, this.port, this.address, this.length, this.type);
                    if (this.expectValue.toString().equals(result.toString())) break;
                    log.warn("melsec value is not expected ,value = " + result + ",try again...");
                    this.saveLogSuspend(String.format("@{wind.bp.deviceExpected}:%s, @{wind.bp.deviceReality}:%s", this.expectValue, result));
                }
                catch (Exception e) {
                    log.error(e + ",try again...");
                    this.saveLogError(e.getMessage());
                    this.checkIfInterrupt();
                }
                Thread.sleep(this.retryInterval != null ? Long.parseLong(this.retryInterval.toString()) : 1000L);
            }
        }
        Map paramMap = (Map)((ConcurrentHashMap)AbstratRootBp.outputParamsMap.get()).get(ParamPreField.blocks);
        ConcurrentMap childParamMap = Maps.newConcurrentMap();
        childParamMap.put("melsecValue", result);
        paramMap.put(this.blockVo.getBlockName(), childParamMap);
        ((ConcurrentHashMap)AbstratRootBp.outputParamsMap.get()).put(ParamPreField.blocks, paramMap);
    }

    protected void setBlockInputParamsValue(AbstratRootBp rootBp) throws Exception {
        HashMap<String, Object> bpData = new HashMap<String, Object>();
        bpData.put("ip", this.ip);
        bpData.put("port", this.port);
        bpData.put("type", this.type);
        bpData.put("address", this.address);
        bpData.put("length", this.length);
        bpData.put("expectValue", this.expectValue);
        bpData.put("retry", this.retry);
        bpData.put("retryInterval", this.retryInterval);
        this.blockRecord.setBlockInputParamsValue(JSONObject.toJSONString(bpData));
        this.windService.saveBlockRecord(this.blockRecord, this.blockVo.getBlockId(), this.blockVo.getBlockType(), this.taskRecord.getProjectId(), this.taskId, this.taskRecord.getId(), this.startOn);
    }

    protected Object readMelsec(Object ip, Object port, Object address, Object length, Object addrType) throws RuntimeException {
        int type = Integer.parseInt(addrType.toString());
        int portValue = Integer.parseInt(port.toString());
        switch (type) {
            case 0: {
                return MelsecUtils.readBoolean((String)ip.toString(), (int)portValue, (String)address.toString());
            }
            case 1: {
                return MelsecUtils.readNumber((String)ip.toString(), (int)portValue, (String)address.toString());
            }
            case 2: {
                return MelsecUtils.readString((String)ip.toString(), (int)portValue, (String)address.toString(), (short)(null == length ? (short)1 : Short.parseShort(length.toString())));
            }
        }
        throw new RuntimeException("@{wind.bp.deviceUnknowType}:" + addrType);
    }

    public WindService getWindService() {
        return this.windService;
    }

    public Object getIp() {
        return this.ip;
    }

    public Object getPort() {
        return this.port;
    }

    public Object getType() {
        return this.type;
    }

    public Object getAddress() {
        return this.address;
    }

    public Object getLength() {
        return this.length;
    }

    public Object getExpectValue() {
        return this.expectValue;
    }

    public Object getRetry() {
        return this.retry;
    }

    public Object getRetryInterval() {
        return this.retryInterval;
    }

    public void setWindService(WindService windService) {
        this.windService = windService;
    }

    public void setIp(Object ip) {
        this.ip = ip;
    }

    public void setPort(Object port) {
        this.port = port;
    }

    public void setType(Object type) {
        this.type = type;
    }

    public void setAddress(Object address) {
        this.address = address;
    }

    public void setLength(Object length) {
        this.length = length;
    }

    public void setExpectValue(Object expectValue) {
        this.expectValue = expectValue;
    }

    public void setRetry(Object retry) {
        this.retry = retry;
    }

    public void setRetryInterval(Object retryInterval) {
        this.retryInterval = retryInterval;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof MelsecReadBp)) {
            return false;
        }
        MelsecReadBp other = (MelsecReadBp)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        WindService this$windService = this.getWindService();
        WindService other$windService = other.getWindService();
        if (this$windService == null ? other$windService != null : !this$windService.equals(other$windService)) {
            return false;
        }
        Object this$ip = this.getIp();
        Object other$ip = other.getIp();
        if (this$ip == null ? other$ip != null : !this$ip.equals(other$ip)) {
            return false;
        }
        Object this$port = this.getPort();
        Object other$port = other.getPort();
        if (this$port == null ? other$port != null : !this$port.equals(other$port)) {
            return false;
        }
        Object this$type = this.getType();
        Object other$type = other.getType();
        if (this$type == null ? other$type != null : !this$type.equals(other$type)) {
            return false;
        }
        Object this$address = this.getAddress();
        Object other$address = other.getAddress();
        if (this$address == null ? other$address != null : !this$address.equals(other$address)) {
            return false;
        }
        Object this$length = this.getLength();
        Object other$length = other.getLength();
        if (this$length == null ? other$length != null : !this$length.equals(other$length)) {
            return false;
        }
        Object this$expectValue = this.getExpectValue();
        Object other$expectValue = other.getExpectValue();
        if (this$expectValue == null ? other$expectValue != null : !this$expectValue.equals(other$expectValue)) {
            return false;
        }
        Object this$retry = this.getRetry();
        Object other$retry = other.getRetry();
        if (this$retry == null ? other$retry != null : !this$retry.equals(other$retry)) {
            return false;
        }
        Object this$retryInterval = this.getRetryInterval();
        Object other$retryInterval = other.getRetryInterval();
        return !(this$retryInterval == null ? other$retryInterval != null : !this$retryInterval.equals(other$retryInterval));
    }

    protected boolean canEqual(Object other) {
        return other instanceof MelsecReadBp;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        WindService $windService = this.getWindService();
        result = result * 59 + ($windService == null ? 43 : $windService.hashCode());
        Object $ip = this.getIp();
        result = result * 59 + ($ip == null ? 43 : $ip.hashCode());
        Object $port = this.getPort();
        result = result * 59 + ($port == null ? 43 : $port.hashCode());
        Object $type = this.getType();
        result = result * 59 + ($type == null ? 43 : $type.hashCode());
        Object $address = this.getAddress();
        result = result * 59 + ($address == null ? 43 : $address.hashCode());
        Object $length = this.getLength();
        result = result * 59 + ($length == null ? 43 : $length.hashCode());
        Object $expectValue = this.getExpectValue();
        result = result * 59 + ($expectValue == null ? 43 : $expectValue.hashCode());
        Object $retry = this.getRetry();
        result = result * 59 + ($retry == null ? 43 : $retry.hashCode());
        Object $retryInterval = this.getRetryInterval();
        result = result * 59 + ($retryInterval == null ? 43 : $retryInterval.hashCode());
        return result;
    }

    public String toString() {
        return "MelsecReadBp(windService=" + this.getWindService() + ", ip=" + this.getIp() + ", port=" + this.getPort() + ", type=" + this.getType() + ", address=" + this.getAddress() + ", length=" + this.getLength() + ", expectValue=" + this.getExpectValue() + ", retry=" + this.getRetry() + ", retryInterval=" + this.getRetryInterval() + ")";
    }
}

