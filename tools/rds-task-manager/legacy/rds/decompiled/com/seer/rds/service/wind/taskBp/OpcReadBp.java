/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.alibaba.fastjson.JSONObject
 *  com.google.common.collect.Maps
 *  com.seer.rds.constant.OpcTypeEnum
 *  com.seer.rds.service.agv.WindService
 *  com.seer.rds.service.wind.AbstractBp
 *  com.seer.rds.service.wind.AbstratRootBp
 *  com.seer.rds.service.wind.WindTaskStatus
 *  com.seer.rds.service.wind.taskBp.OpcReadBp
 *  com.seer.rds.util.opc.OpcUaOperationUtil
 *  com.seer.rds.vo.wind.ParamPreField
 *  org.slf4j.Logger
 *  org.slf4j.LoggerFactory
 *  org.springframework.beans.factory.annotation.Autowired
 *  org.springframework.context.annotation.Scope
 *  org.springframework.stereotype.Component
 */
package com.seer.rds.service.wind.taskBp;

import com.alibaba.fastjson.JSONObject;
import com.google.common.collect.Maps;
import com.seer.rds.constant.OpcTypeEnum;
import com.seer.rds.service.agv.WindService;
import com.seer.rds.service.wind.AbstractBp;
import com.seer.rds.service.wind.AbstratRootBp;
import com.seer.rds.service.wind.WindTaskStatus;
import com.seer.rds.util.opc.OpcUaOperationUtil;
import com.seer.rds.vo.wind.ParamPreField;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Scope;
import org.springframework.stereotype.Component;

@Component(value="OpcReadBp")
@Scope(value="prototype")
public class OpcReadBp
extends AbstractBp {
    private static final Logger log = LoggerFactory.getLogger(OpcReadBp.class);
    @Autowired
    private WindService windService;
    private Object namespaceIndex;
    private Object address;
    private Object expectValue;
    private Object retry;
    private Object retryInterval;
    private Object expectValueType;

    protected void getInputParamsAndExecute(AbstratRootBp rootBp) throws Exception {
        Object resultValue;
        this.namespaceIndex = rootBp.getInputParamValue(this.taskId, this.inputParams, "namespaceIndex");
        this.address = rootBp.getInputParamValue(this.taskId, this.inputParams, "address");
        this.expectValue = rootBp.getInputParamValue(this.taskId, this.inputParams, "expectValue");
        this.retry = rootBp.getInputParamValue(this.taskId, this.inputParams, "retry");
        this.retryInterval = rootBp.getInputParamValue(this.taskId, this.inputParams, "retryInterval");
        this.expectValueType = rootBp.getInputParamValue(this.taskId, this.inputParams, "expectValueType");
        if (this.address == null) {
            throw new RuntimeException("@{wind.bp.deviceOPCAddr}");
        }
        if (this.retry != null && Boolean.parseBoolean(this.retry.toString()) && this.expectValue == null) {
            throw new RuntimeException("@{wind.bp.ifRetryExpectValueCanNotBeEmpty}");
        }
        if (null != this.expectValueType) {
            this.expectValue = OpcTypeEnum.matchValue((String)String.valueOf(this.expectValue), (Integer)Integer.valueOf((String)this.expectValueType));
        }
        if (null == this.namespaceIndex) {
            this.namespaceIndex = "2";
        }
        String result = null;
        if (this.retry == null || !Boolean.parseBoolean(this.retry.toString())) {
            try {
                this.address = Integer.parseInt(this.address.toString());
                resultValue = OpcUaOperationUtil.readDeviceValue((Integer)Integer.valueOf((String)this.namespaceIndex), (int)((Integer)this.address));
            }
            catch (Exception e) {
                resultValue = OpcUaOperationUtil.readDeviceValue((Integer)Integer.valueOf((String)this.namespaceIndex), (String)this.address.toString());
            }
            result = resultValue.toString();
        } else {
            while (true) {
                WindTaskStatus.monitorTaskEndErrorAndTaskStop((AbstractBp)this);
                try {
                    resultValue = this.address instanceof String ? OpcUaOperationUtil.readDeviceValue((Integer)Integer.valueOf((String)this.namespaceIndex), (String)this.address.toString()) : OpcUaOperationUtil.readDeviceValue((Integer)Integer.valueOf((String)this.namespaceIndex), (int)((Integer)this.address));
                    if (resultValue != null && this.expectValue.equals(resultValue)) {
                        result = resultValue.toString();
                        break;
                    }
                    log.warn("opc value is not expected ,value = " + resultValue + ",try again...");
                    this.saveLogSuspend(String.format("@{wind.bp.deviceExpected}:%s, @{wind.bp.deviceReality}:%s", this.expectValue, resultValue));
                }
                catch (Exception e) {
                    log.error("readOpcValueByRetry error,try again...");
                    this.saveLogError(e.getMessage());
                }
                Thread.sleep(this.retryInterval != null ? Long.parseLong(this.retryInterval.toString()) : 1000L);
            }
        }
        Map paramMap = (Map)((ConcurrentHashMap)AbstratRootBp.outputParamsMap.get()).get(ParamPreField.blocks);
        ConcurrentMap childParamMap = Maps.newConcurrentMap();
        childParamMap.put("opcValue", result);
        paramMap.put(this.blockVo.getBlockName(), childParamMap);
        ((ConcurrentHashMap)AbstratRootBp.outputParamsMap.get()).put(ParamPreField.blocks, paramMap);
        this.saveLogResult((Object)result);
    }

    protected void setBlockInputParamsValue(AbstratRootBp rootBp) throws Exception {
        OpcReadBp bpData = new OpcReadBp();
        bpData.setAddress(this.address);
        bpData.setRetry(this.retry);
        bpData.setExpectValue(this.expectValue);
        bpData.setRetryInterval(this.retryInterval);
        this.blockRecord.setBlockInputParamsValue(JSONObject.toJSONString((Object)bpData));
        this.windService.saveBlockRecord(this.blockRecord, this.blockVo.getBlockId(), this.blockVo.getBlockType(), this.taskRecord.getProjectId(), this.taskId, this.taskRecord.getId(), this.startOn);
    }

    public WindService getWindService() {
        return this.windService;
    }

    public Object getNamespaceIndex() {
        return this.namespaceIndex;
    }

    public Object getAddress() {
        return this.address;
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

    public Object getExpectValueType() {
        return this.expectValueType;
    }

    public void setWindService(WindService windService) {
        this.windService = windService;
    }

    public void setNamespaceIndex(Object namespaceIndex) {
        this.namespaceIndex = namespaceIndex;
    }

    public void setAddress(Object address) {
        this.address = address;
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

    public void setExpectValueType(Object expectValueType) {
        this.expectValueType = expectValueType;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof OpcReadBp)) {
            return false;
        }
        OpcReadBp other = (OpcReadBp)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        WindService this$windService = this.getWindService();
        WindService other$windService = other.getWindService();
        if (this$windService == null ? other$windService != null : !this$windService.equals(other$windService)) {
            return false;
        }
        Object this$namespaceIndex = this.getNamespaceIndex();
        Object other$namespaceIndex = other.getNamespaceIndex();
        if (this$namespaceIndex == null ? other$namespaceIndex != null : !this$namespaceIndex.equals(other$namespaceIndex)) {
            return false;
        }
        Object this$address = this.getAddress();
        Object other$address = other.getAddress();
        if (this$address == null ? other$address != null : !this$address.equals(other$address)) {
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
        if (this$retryInterval == null ? other$retryInterval != null : !this$retryInterval.equals(other$retryInterval)) {
            return false;
        }
        Object this$expectValueType = this.getExpectValueType();
        Object other$expectValueType = other.getExpectValueType();
        return !(this$expectValueType == null ? other$expectValueType != null : !this$expectValueType.equals(other$expectValueType));
    }

    protected boolean canEqual(Object other) {
        return other instanceof OpcReadBp;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        WindService $windService = this.getWindService();
        result = result * 59 + ($windService == null ? 43 : $windService.hashCode());
        Object $namespaceIndex = this.getNamespaceIndex();
        result = result * 59 + ($namespaceIndex == null ? 43 : $namespaceIndex.hashCode());
        Object $address = this.getAddress();
        result = result * 59 + ($address == null ? 43 : $address.hashCode());
        Object $expectValue = this.getExpectValue();
        result = result * 59 + ($expectValue == null ? 43 : $expectValue.hashCode());
        Object $retry = this.getRetry();
        result = result * 59 + ($retry == null ? 43 : $retry.hashCode());
        Object $retryInterval = this.getRetryInterval();
        result = result * 59 + ($retryInterval == null ? 43 : $retryInterval.hashCode());
        Object $expectValueType = this.getExpectValueType();
        result = result * 59 + ($expectValueType == null ? 43 : $expectValueType.hashCode());
        return result;
    }

    public String toString() {
        return "OpcReadBp(windService=" + this.getWindService() + ", namespaceIndex=" + this.getNamespaceIndex() + ", address=" + this.getAddress() + ", expectValue=" + this.getExpectValue() + ", retry=" + this.getRetry() + ", retryInterval=" + this.getRetryInterval() + ", expectValueType=" + this.getExpectValueType() + ")";
    }
}

