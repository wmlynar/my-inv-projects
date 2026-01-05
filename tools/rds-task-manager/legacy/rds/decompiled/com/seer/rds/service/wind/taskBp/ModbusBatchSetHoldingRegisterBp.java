/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.alibaba.fastjson.JSONObject
 *  com.seer.rds.config.PropConfig
 *  com.seer.rds.dao.WindTaskRecordMapper
 *  com.seer.rds.modbus.Modbus4jUtils
 *  com.seer.rds.service.agv.WindService
 *  com.seer.rds.service.wind.AbstractBp
 *  com.seer.rds.service.wind.AbstratRootBp
 *  com.seer.rds.service.wind.WindTaskStatus
 *  com.seer.rds.service.wind.taskBp.ModbusBatchSetHoldingRegisterBp
 *  com.seer.rds.vo.wind.ModbusBatchSetHoldingRegisterBpField
 *  com.serotonin.modbus4j.exception.ErrorResponseException
 *  com.serotonin.modbus4j.exception.ModbusInitException
 *  com.serotonin.modbus4j.exception.ModbusTransportException
 *  com.serotonin.modbus4j.sero.messaging.TimeoutException
 *  org.slf4j.Logger
 *  org.slf4j.LoggerFactory
 *  org.springframework.beans.factory.annotation.Autowired
 *  org.springframework.context.annotation.Scope
 *  org.springframework.stereotype.Component
 *  unitauto.JSON
 */
package com.seer.rds.service.wind.taskBp;

import com.alibaba.fastjson.JSONObject;
import com.seer.rds.config.PropConfig;
import com.seer.rds.dao.WindTaskRecordMapper;
import com.seer.rds.modbus.Modbus4jUtils;
import com.seer.rds.service.agv.WindService;
import com.seer.rds.service.wind.AbstractBp;
import com.seer.rds.service.wind.AbstratRootBp;
import com.seer.rds.service.wind.WindTaskStatus;
import com.seer.rds.vo.wind.ModbusBatchSetHoldingRegisterBpField;
import com.serotonin.modbus4j.exception.ErrorResponseException;
import com.serotonin.modbus4j.exception.ModbusInitException;
import com.serotonin.modbus4j.exception.ModbusTransportException;
import com.serotonin.modbus4j.sero.messaging.TimeoutException;
import java.util.ArrayList;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Scope;
import org.springframework.stereotype.Component;
import unitauto.JSON;

@Component(value="ModbusBatchSetHoldingRegisterBp")
@Scope(value="prototype")
public class ModbusBatchSetHoldingRegisterBp
extends AbstractBp {
    private static final Logger log = LoggerFactory.getLogger(ModbusBatchSetHoldingRegisterBp.class);
    @Autowired
    private WindService windService;
    @Autowired
    private WindTaskRecordMapper windTaskRecordMapper;
    String ipModbusHost;
    Integer ipModbusPort;
    Integer ipRegisterAddress;
    Integer ipSlaveId;
    Object ipRegisterData;

    protected void getInputParamsAndExecute(AbstratRootBp rootBp) throws Exception {
        this.ipModbusHost = String.valueOf(rootBp.getInputParamValue(this.taskId, this.inputParams, ModbusBatchSetHoldingRegisterBpField.ipModbusHost));
        this.ipModbusPort = Integer.valueOf(rootBp.getInputParamValue(this.taskId, this.inputParams, ModbusBatchSetHoldingRegisterBpField.ipModbusPort).toString());
        this.ipRegisterAddress = Integer.valueOf(rootBp.getInputParamValue(this.taskId, this.inputParams, ModbusBatchSetHoldingRegisterBpField.ipRegisterAddress).toString());
        this.ipSlaveId = Integer.valueOf(rootBp.getInputParamValue(this.taskId, this.inputParams, ModbusBatchSetHoldingRegisterBpField.ipSlaveId).toString());
        this.ipRegisterData = rootBp.getInputParamValue(this.taskId, this.inputParams, ModbusBatchSetHoldingRegisterBpField.ipRegisterData);
        List ipRegisterDataList = new ArrayList();
        if (this.ipRegisterData != null) {
            try {
                Object parse = JSON.parse((Object)this.ipRegisterData);
                String s = parse.toString();
                ipRegisterDataList = JSONObject.parseArray((String)s, Short.class);
            }
            catch (Exception e) {
                throw new Exception(String.format("@{response.code.paramsError}:%s", this.ipRegisterData), e);
            }
        }
        short[] ipRegisterDataShort = new short[ipRegisterDataList.size()];
        for (int i = 0; i < ipRegisterDataList.size(); ++i) {
            ipRegisterDataShort[i] = (Short)ipRegisterDataList.get(i);
        }
        boolean modbusException = false;
        int socketExceptionCount = 0;
        while (true) {
            try {
                WindTaskStatus.monitorTaskEndErrorAndTaskStop((AbstractBp)this);
                Modbus4jUtils.batchWriteRegisters((String)this.ipModbusHost, (int)this.ipModbusPort, (int)this.ipSlaveId, (int)this.ipRegisterAddress, (short[])ipRegisterDataShort, (String)"ModbusBatchSetHoldingRegisterBp");
            }
            catch (Exception e) {
                if (!(e instanceof ErrorResponseException || e instanceof ModbusTransportException || e instanceof TimeoutException || e instanceof ModbusInitException)) {
                    throw e;
                }
                socketExceptionCount = Modbus4jUtils.socketExceptionHandle((Exception)e, (int)socketExceptionCount, (String)(this.ipModbusHost + ":" + this.ipModbusPort));
                log.error("ModbusBatchSetHoldingRegisterBp [{},{}] {}]", new Object[]{this.ipModbusHost, this.ipModbusPort, e});
                this.saveLogError(e.getMessage());
                if (!modbusException) {
                    this.blockRecord.setOutputParams(JSONObject.toJSONString(AbstratRootBp.outputParamsMap.get()));
                    this.blockRecord.setInputParams(JSONObject.toJSONString(AbstratRootBp.inputParamsMap.get()));
                    this.blockRecord.setInternalVariables(JSONObject.toJSONString(AbstratRootBp.taskVariablesMap.get()));
                    this.blockRecord.setBlockInputParams(this.inputParams != null ? this.inputParams.toJSONString() : null);
                    this.windService.saveSuspendErrorBlockRecord(this.blockRecord, this.blockVo.getBlockId(), this.blockVo.getBlockType(), this.taskRecord.getProjectId(), this.taskId, this.taskRecord.getId(), this.startOn, "modbus @{wind.bp.retry}...");
                    this.windService.updateTaskRecordEndedReason(this.taskRecord.getId(), "[ModbusBatchSetHoldingRegisterBp]modbus @{wind.bp.retry}");
                }
                modbusException = true;
                Thread.sleep(PropConfig.getModbusRetryDelay());
                continue;
            }
            break;
        }
        StringBuilder message = new StringBuilder();
        message.append("ipModbusHost=").append(this.ipModbusHost).append(",ipModbusPort=").append(this.ipModbusPort).append(",ipRegisterAddress=").append(this.ipRegisterAddress).append(",ipSlaveId=").append(this.ipSlaveId).append(",ipRegisterData=").append(this.ipRegisterData);
        log.info("ModbusBatchSetHoldingRegisterBp " + message);
    }

    protected void setBlockInputParamsValue(AbstratRootBp rootBp) throws Exception {
        ModbusBatchSetHoldingRegisterBp bpData = new ModbusBatchSetHoldingRegisterBp();
        bpData.setIpModbusHost(this.ipModbusHost);
        bpData.setIpModbusPort(this.ipModbusPort);
        bpData.setIpSlaveId(this.ipSlaveId);
        bpData.setIpRegisterAddress(this.ipRegisterAddress);
        bpData.setIpRegisterData(this.ipRegisterData);
        this.blockRecord.setBlockInputParamsValue(JSONObject.toJSONString((Object)bpData));
        this.windService.saveBlockRecord(this.blockRecord, this.blockVo.getBlockId(), this.blockVo.getBlockType(), this.taskRecord.getProjectId(), this.taskId, this.taskRecord.getId(), this.startOn);
    }

    public WindService getWindService() {
        return this.windService;
    }

    public WindTaskRecordMapper getWindTaskRecordMapper() {
        return this.windTaskRecordMapper;
    }

    public String getIpModbusHost() {
        return this.ipModbusHost;
    }

    public Integer getIpModbusPort() {
        return this.ipModbusPort;
    }

    public Integer getIpRegisterAddress() {
        return this.ipRegisterAddress;
    }

    public Integer getIpSlaveId() {
        return this.ipSlaveId;
    }

    public Object getIpRegisterData() {
        return this.ipRegisterData;
    }

    public void setWindService(WindService windService) {
        this.windService = windService;
    }

    public void setWindTaskRecordMapper(WindTaskRecordMapper windTaskRecordMapper) {
        this.windTaskRecordMapper = windTaskRecordMapper;
    }

    public void setIpModbusHost(String ipModbusHost) {
        this.ipModbusHost = ipModbusHost;
    }

    public void setIpModbusPort(Integer ipModbusPort) {
        this.ipModbusPort = ipModbusPort;
    }

    public void setIpRegisterAddress(Integer ipRegisterAddress) {
        this.ipRegisterAddress = ipRegisterAddress;
    }

    public void setIpSlaveId(Integer ipSlaveId) {
        this.ipSlaveId = ipSlaveId;
    }

    public void setIpRegisterData(Object ipRegisterData) {
        this.ipRegisterData = ipRegisterData;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof ModbusBatchSetHoldingRegisterBp)) {
            return false;
        }
        ModbusBatchSetHoldingRegisterBp other = (ModbusBatchSetHoldingRegisterBp)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        Integer this$ipModbusPort = this.getIpModbusPort();
        Integer other$ipModbusPort = other.getIpModbusPort();
        if (this$ipModbusPort == null ? other$ipModbusPort != null : !((Object)this$ipModbusPort).equals(other$ipModbusPort)) {
            return false;
        }
        Integer this$ipRegisterAddress = this.getIpRegisterAddress();
        Integer other$ipRegisterAddress = other.getIpRegisterAddress();
        if (this$ipRegisterAddress == null ? other$ipRegisterAddress != null : !((Object)this$ipRegisterAddress).equals(other$ipRegisterAddress)) {
            return false;
        }
        Integer this$ipSlaveId = this.getIpSlaveId();
        Integer other$ipSlaveId = other.getIpSlaveId();
        if (this$ipSlaveId == null ? other$ipSlaveId != null : !((Object)this$ipSlaveId).equals(other$ipSlaveId)) {
            return false;
        }
        WindService this$windService = this.getWindService();
        WindService other$windService = other.getWindService();
        if (this$windService == null ? other$windService != null : !this$windService.equals(other$windService)) {
            return false;
        }
        WindTaskRecordMapper this$windTaskRecordMapper = this.getWindTaskRecordMapper();
        WindTaskRecordMapper other$windTaskRecordMapper = other.getWindTaskRecordMapper();
        if (this$windTaskRecordMapper == null ? other$windTaskRecordMapper != null : !this$windTaskRecordMapper.equals(other$windTaskRecordMapper)) {
            return false;
        }
        String this$ipModbusHost = this.getIpModbusHost();
        String other$ipModbusHost = other.getIpModbusHost();
        if (this$ipModbusHost == null ? other$ipModbusHost != null : !this$ipModbusHost.equals(other$ipModbusHost)) {
            return false;
        }
        Object this$ipRegisterData = this.getIpRegisterData();
        Object other$ipRegisterData = other.getIpRegisterData();
        return !(this$ipRegisterData == null ? other$ipRegisterData != null : !this$ipRegisterData.equals(other$ipRegisterData));
    }

    protected boolean canEqual(Object other) {
        return other instanceof ModbusBatchSetHoldingRegisterBp;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        Integer $ipModbusPort = this.getIpModbusPort();
        result = result * 59 + ($ipModbusPort == null ? 43 : ((Object)$ipModbusPort).hashCode());
        Integer $ipRegisterAddress = this.getIpRegisterAddress();
        result = result * 59 + ($ipRegisterAddress == null ? 43 : ((Object)$ipRegisterAddress).hashCode());
        Integer $ipSlaveId = this.getIpSlaveId();
        result = result * 59 + ($ipSlaveId == null ? 43 : ((Object)$ipSlaveId).hashCode());
        WindService $windService = this.getWindService();
        result = result * 59 + ($windService == null ? 43 : $windService.hashCode());
        WindTaskRecordMapper $windTaskRecordMapper = this.getWindTaskRecordMapper();
        result = result * 59 + ($windTaskRecordMapper == null ? 43 : $windTaskRecordMapper.hashCode());
        String $ipModbusHost = this.getIpModbusHost();
        result = result * 59 + ($ipModbusHost == null ? 43 : $ipModbusHost.hashCode());
        Object $ipRegisterData = this.getIpRegisterData();
        result = result * 59 + ($ipRegisterData == null ? 43 : $ipRegisterData.hashCode());
        return result;
    }

    public String toString() {
        return "ModbusBatchSetHoldingRegisterBp(windService=" + this.getWindService() + ", windTaskRecordMapper=" + this.getWindTaskRecordMapper() + ", ipModbusHost=" + this.getIpModbusHost() + ", ipModbusPort=" + this.getIpModbusPort() + ", ipRegisterAddress=" + this.getIpRegisterAddress() + ", ipSlaveId=" + this.getIpSlaveId() + ", ipRegisterData=" + this.getIpRegisterData() + ")";
    }
}

