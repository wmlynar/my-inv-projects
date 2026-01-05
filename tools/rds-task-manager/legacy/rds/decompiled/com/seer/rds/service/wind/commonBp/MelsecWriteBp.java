/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.alibaba.fastjson.JSONObject
 *  com.seer.rds.service.agv.WindService
 *  com.seer.rds.service.wind.AbstractBp
 *  com.seer.rds.service.wind.AbstratRootBp
 *  com.seer.rds.service.wind.WindTaskStatus
 *  com.seer.rds.service.wind.commonBp.MelsecWriteBp
 *  com.seer.rds.util.melsec.MelsecUtils
 *  org.apache.commons.lang3.StringUtils
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
import com.seer.rds.service.wind.WindTaskStatus;
import com.seer.rds.util.melsec.MelsecUtils;
import java.util.HashMap;
import org.apache.commons.lang3.StringUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Scope;
import org.springframework.stereotype.Component;

@Component(value="MelsecWriteBp")
@Scope(value="prototype")
public class MelsecWriteBp
extends AbstractBp {
    private static final Logger log = LoggerFactory.getLogger(MelsecWriteBp.class);
    @Autowired
    private WindService windService;
    private Object ip;
    private Object port;
    private Object type;
    private Object address;
    private Object newValue;

    protected void getInputParamsAndExecute(AbstratRootBp rootBp) throws Exception {
        this.ip = rootBp.getInputParamValue(this.taskId, this.inputParams, "ip");
        this.port = rootBp.getInputParamValue(this.taskId, this.inputParams, "port");
        this.type = rootBp.getInputParamValue(this.taskId, this.inputParams, "type");
        this.address = rootBp.getInputParamValue(this.taskId, this.inputParams, "address");
        this.newValue = rootBp.getInputParamValue(this.taskId, this.inputParams, "newValue");
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
        if (this.newValue == null) {
            throw new RuntimeException("newValue is null");
        }
        while (true) {
            WindTaskStatus.monitorTaskEndErrorAndTaskStop((AbstractBp)this);
            if (this.writeMelsec(this.ip, this.port, this.address, this.newValue, this.type)) break;
            Thread.sleep(5000L);
        }
    }

    protected void setBlockInputParamsValue(AbstratRootBp rootBp) throws Exception {
        HashMap<String, Object> bpData = new HashMap<String, Object>();
        bpData.put("ip", this.ip);
        bpData.put("port", this.port);
        bpData.put("type", this.type);
        bpData.put("address", this.address);
        bpData.put("newValue", this.newValue);
        this.blockRecord.setBlockInputParamsValue(JSONObject.toJSONString(bpData));
        this.windService.saveBlockRecord(this.blockRecord, this.blockVo.getBlockId(), this.blockVo.getBlockType(), this.taskRecord.getProjectId(), this.taskId, this.taskRecord.getId(), this.startOn);
    }

    protected boolean writeMelsec(Object ip, Object port, Object address, Object newValue, Object addrType) throws RuntimeException {
        int type = Integer.parseInt(addrType.toString());
        int portValue = Integer.parseInt(port.toString());
        switch (type) {
            case 0: {
                return MelsecUtils.writeBoolean((String)ip.toString(), (int)portValue, (String)address.toString(), (boolean)Boolean.parseBoolean(newValue.toString()));
            }
            case 1: {
                return MelsecUtils.writeNumber((String)ip.toString(), (int)portValue, (String)address.toString(), (int)Integer.parseInt(newValue.toString()));
            }
            case 2: {
                return MelsecUtils.writeString((String)ip.toString(), (int)portValue, (String)address.toString(), (String)newValue.toString());
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

    public Object getNewValue() {
        return this.newValue;
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

    public void setNewValue(Object newValue) {
        this.newValue = newValue;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof MelsecWriteBp)) {
            return false;
        }
        MelsecWriteBp other = (MelsecWriteBp)o;
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
        Object this$newValue = this.getNewValue();
        Object other$newValue = other.getNewValue();
        return !(this$newValue == null ? other$newValue != null : !this$newValue.equals(other$newValue));
    }

    protected boolean canEqual(Object other) {
        return other instanceof MelsecWriteBp;
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
        Object $newValue = this.getNewValue();
        result = result * 59 + ($newValue == null ? 43 : $newValue.hashCode());
        return result;
    }

    public String toString() {
        return "MelsecWriteBp(windService=" + this.getWindService() + ", ip=" + this.getIp() + ", port=" + this.getPort() + ", type=" + this.getType() + ", address=" + this.getAddress() + ", newValue=" + this.getNewValue() + ")";
    }
}

