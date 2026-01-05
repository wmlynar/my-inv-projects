/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.alibaba.fastjson.JSONObject
 *  com.seer.rds.constant.OpcTypeEnum
 *  com.seer.rds.service.agv.WindService
 *  com.seer.rds.service.wind.AbstractBp
 *  com.seer.rds.service.wind.AbstratRootBp
 *  com.seer.rds.service.wind.WindTaskStatus
 *  com.seer.rds.service.wind.taskBp.OpcWriteBp
 *  com.seer.rds.util.opc.OpcUaOperationUtil
 *  org.apache.commons.lang3.StringUtils
 *  org.slf4j.Logger
 *  org.slf4j.LoggerFactory
 *  org.springframework.beans.factory.annotation.Autowired
 *  org.springframework.context.annotation.Scope
 *  org.springframework.stereotype.Component
 */
package com.seer.rds.service.wind.taskBp;

import com.alibaba.fastjson.JSONObject;
import com.seer.rds.constant.OpcTypeEnum;
import com.seer.rds.service.agv.WindService;
import com.seer.rds.service.wind.AbstractBp;
import com.seer.rds.service.wind.AbstratRootBp;
import com.seer.rds.service.wind.WindTaskStatus;
import com.seer.rds.util.opc.OpcUaOperationUtil;
import org.apache.commons.lang3.StringUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Scope;
import org.springframework.stereotype.Component;

@Component(value="OpcWriteBp")
@Scope(value="prototype")
public class OpcWriteBp
extends AbstractBp {
    private static final Logger log = LoggerFactory.getLogger(OpcWriteBp.class);
    @Autowired
    private WindService windService;
    private Object namespaceIndex;
    private Object address;
    private Object value;

    protected void getInputParamsAndExecute(AbstratRootBp rootBp) throws Exception {
        this.namespaceIndex = rootBp.getInputParamValue(this.taskId, this.inputParams, "namespaceIndex");
        this.address = rootBp.getInputParamValue(this.taskId, this.inputParams, "address");
        this.value = rootBp.getInputParamValue(this.taskId, this.inputParams, "value");
        if (this.address == null) {
            throw new RuntimeException("@{wind.bp.deviceOPCAddr}");
        }
        if (this.value == null) {
            throw new RuntimeException("@{wind.bp.writeValueCanNotBeEmpty}");
        }
        if (null == this.namespaceIndex) {
            this.namespaceIndex = "2";
        }
        String type = (String)rootBp.getInputParamValue(this.taskId, this.inputParams, "type");
        Object matchValue = this.value;
        if (StringUtils.isNotEmpty((CharSequence)type)) {
            matchValue = OpcTypeEnum.matchValue((String)String.valueOf(this.value), (Integer)Integer.valueOf(type));
        }
        while (true) {
            WindTaskStatus.monitorTaskEndErrorAndTaskStop((AbstractBp)this);
            boolean writeSuccess = false;
            try {
                this.address = Integer.parseInt(this.address.toString());
                writeSuccess = OpcUaOperationUtil.writeDeviceValue((Integer)Integer.valueOf((String)this.namespaceIndex), (int)((Integer)this.address), (Object)matchValue);
            }
            catch (Exception e) {
                writeSuccess = OpcUaOperationUtil.writeDeviceValue((Integer)Integer.valueOf((String)this.namespaceIndex), (String)this.address.toString(), (Object)matchValue);
            }
            if (writeSuccess) break;
            Thread.sleep(5000L);
        }
    }

    protected void setBlockInputParamsValue(AbstratRootBp rootBp) throws Exception {
        OpcWriteBp bpData = new OpcWriteBp();
        bpData.setAddress(this.address);
        bpData.setValue(this.value);
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

    public Object getValue() {
        return this.value;
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

    public void setValue(Object value) {
        this.value = value;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof OpcWriteBp)) {
            return false;
        }
        OpcWriteBp other = (OpcWriteBp)o;
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
        Object this$value = this.getValue();
        Object other$value = other.getValue();
        return !(this$value == null ? other$value != null : !this$value.equals(other$value));
    }

    protected boolean canEqual(Object other) {
        return other instanceof OpcWriteBp;
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
        Object $value = this.getValue();
        result = result * 59 + ($value == null ? 43 : $value.hashCode());
        return result;
    }

    public String toString() {
        return "OpcWriteBp(windService=" + this.getWindService() + ", namespaceIndex=" + this.getNamespaceIndex() + ", address=" + this.getAddress() + ", value=" + this.getValue() + ")";
    }
}

