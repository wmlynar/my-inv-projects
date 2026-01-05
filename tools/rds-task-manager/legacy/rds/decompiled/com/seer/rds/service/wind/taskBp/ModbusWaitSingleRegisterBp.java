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
 *  com.seer.rds.service.wind.taskBp.ModbusWaitSingleRegisterBp
 *  com.seer.rds.vo.wind.ModbusWaitSingleRegisterBpField
 *  com.serotonin.modbus4j.exception.ErrorResponseException
 *  com.serotonin.modbus4j.exception.ModbusInitException
 *  com.serotonin.modbus4j.exception.ModbusTransportException
 *  com.serotonin.modbus4j.sero.messaging.TimeoutException
 *  org.slf4j.Logger
 *  org.slf4j.LoggerFactory
 *  org.springframework.beans.factory.annotation.Autowired
 *  org.springframework.context.annotation.Scope
 *  org.springframework.stereotype.Component
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
import com.seer.rds.vo.wind.ModbusWaitSingleRegisterBpField;
import com.serotonin.modbus4j.exception.ErrorResponseException;
import com.serotonin.modbus4j.exception.ModbusInitException;
import com.serotonin.modbus4j.exception.ModbusTransportException;
import com.serotonin.modbus4j.sero.messaging.TimeoutException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Scope;
import org.springframework.stereotype.Component;

@Component(value="ModbusWaitSingleRegisterBp")
@Scope(value="prototype")
public class ModbusWaitSingleRegisterBp
extends AbstractBp {
    private static final Logger log = LoggerFactory.getLogger(ModbusWaitSingleRegisterBp.class);
    @Autowired
    private WindService windService;
    @Autowired
    private WindTaskRecordMapper windTaskRecordMapper;
    String ipModbusHost;
    Integer ipModbusPort;
    Integer ipRegisterAddress;
    Integer ipSlaveId;
    Boolean ipReadonlyRegister;
    Integer ipRegisterData;

    protected void getInputParamsAndExecute(AbstratRootBp rootBp) throws Exception {
        this.ipModbusHost = String.valueOf(rootBp.getInputParamValue(this.taskId, this.inputParams, ModbusWaitSingleRegisterBpField.ipModbusHost));
        this.ipModbusPort = Integer.valueOf(rootBp.getInputParamValue(this.taskId, this.inputParams, ModbusWaitSingleRegisterBpField.ipModbusPort).toString());
        this.ipRegisterAddress = Integer.valueOf(rootBp.getInputParamValue(this.taskId, this.inputParams, ModbusWaitSingleRegisterBpField.ipRegisterAddress).toString());
        this.ipSlaveId = Integer.valueOf(rootBp.getInputParamValue(this.taskId, this.inputParams, ModbusWaitSingleRegisterBpField.ipSlaveId).toString());
        this.ipReadonlyRegister = Boolean.valueOf(rootBp.getInputParamValue(this.taskId, this.inputParams, ModbusWaitSingleRegisterBpField.ipReadonlyRegister).toString());
        this.ipRegisterData = Integer.valueOf(rootBp.getInputParamValue(this.taskId, this.inputParams, ModbusWaitSingleRegisterBpField.ipRegisterData).toString());
        Number modbusValue = null;
        boolean modbusException = false;
        int socketExceptionCount = 0;
        while (true) {
            try {
                WindTaskStatus.monitorTaskEndErrorAndTaskStop((AbstractBp)this);
                modbusValue = this.ipReadonlyRegister != false ? (Number)Modbus4jUtils.readInputRegister((String)this.ipModbusHost, (int)this.ipModbusPort, (int)this.ipSlaveId, (int)this.ipRegisterAddress, (int)2, (String)"ModbusWaitSingleRegisterBp") : (Number)Modbus4jUtils.readHoldingRegister((String)this.ipModbusHost, (int)this.ipModbusPort, (int)this.ipSlaveId, (int)this.ipRegisterAddress, (int)2, (String)"ModbusWaitSingleRegisterBp");
                if (modbusValue.equals(this.ipRegisterData)) {
                    log.info("status: {}, ipRegisterData: {}", (Object)modbusValue, (Object)this.ipRegisterData);
                    break;
                }
                this.saveLogSuspend(String.format("@{wind.bp.deviceExpected}:%s, @{wind.bp.deviceReality}:%s", this.ipRegisterData, modbusValue));
                if (modbusException) {
                    this.blockRecord.setOutputParams(JSONObject.toJSONString(AbstratRootBp.outputParamsMap.get()));
                    this.blockRecord.setInputParams(JSONObject.toJSONString(AbstratRootBp.inputParamsMap.get()));
                    this.blockRecord.setInternalVariables(JSONObject.toJSONString(AbstratRootBp.taskVariablesMap.get()));
                    this.blockRecord.setBlockInputParams(this.inputParams != null ? this.inputParams.toJSONString() : null);
                    this.windService.saveBlockRecord(this.blockRecord, this.blockVo.getBlockId(), this.blockVo.getBlockType(), this.taskRecord.getProjectId(), this.taskId, this.taskRecord.getId(), this.startOn);
                    this.windService.updateTaskRecordEndedReason(this.taskRecord.getId(), "[ModbusWaitSingleRegisterBp]modbus @{wind.bp.retryConnect}");
                }
                modbusException = false;
            }
            catch (Exception e) {
                if (!(e instanceof ErrorResponseException || e instanceof ModbusTransportException || e instanceof TimeoutException || e instanceof ModbusInitException)) {
                    throw e;
                }
                socketExceptionCount = Modbus4jUtils.socketExceptionHandle((Exception)e, (int)socketExceptionCount, (String)(this.ipModbusHost + ":" + this.ipModbusPort));
                log.error("ModbusWaitSingleRegisterBp [{},{}] {}]", new Object[]{this.ipModbusHost, this.ipModbusPort, e});
                this.saveLogError(e.getMessage());
                if (!modbusException) {
                    this.blockRecord.setOutputParams(JSONObject.toJSONString(AbstratRootBp.outputParamsMap.get()));
                    this.blockRecord.setInputParams(JSONObject.toJSONString(AbstratRootBp.inputParamsMap.get()));
                    this.blockRecord.setInternalVariables(JSONObject.toJSONString(AbstratRootBp.taskVariablesMap.get()));
                    this.blockRecord.setBlockInputParams(this.inputParams != null ? this.inputParams.toJSONString() : null);
                    this.windService.saveSuspendErrorBlockRecord(this.blockRecord, this.blockVo.getBlockId(), this.blockVo.getBlockType(), this.taskRecord.getProjectId(), this.taskId, this.taskRecord.getId(), this.startOn, "modbus @{wind.bp.retry}...");
                    this.windService.updateTaskRecordEndedReason(this.taskRecord.getId(), "[ModbusWaitSingleRegisterBp]modbus @{wind.bp.retry}");
                }
                modbusException = true;
            }
            Thread.sleep(PropConfig.getModbusRetryDelay());
        }
        StringBuilder message = new StringBuilder();
        message.append("ipModbusHost=").append(this.ipModbusHost).append(",ipModbusPort=").append(this.ipModbusPort).append(",ipRegisterAddress=").append(this.ipRegisterAddress).append(",ipSlaveId=").append(this.ipSlaveId).append(",ipReadonlyRegister=").append(this.ipReadonlyRegister).append(",ipRegisterData=").append(this.ipRegisterData);
        log.info("ModbusWaitSingleRegisterBp " + message);
    }

    protected void setBlockInputParamsValue(AbstratRootBp rootBp) throws Exception {
        ModbusWaitSingleRegisterBp bpData = new ModbusWaitSingleRegisterBp();
        bpData.setIpModbusHost(this.ipModbusHost);
        bpData.setIpModbusPort(this.ipModbusPort);
        bpData.setIpSlaveId(this.ipSlaveId);
        bpData.setIpReadonlyRegister(this.ipReadonlyRegister);
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

    public Boolean getIpReadonlyRegister() {
        return this.ipReadonlyRegister;
    }

    public Integer getIpRegisterData() {
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

    public void setIpReadonlyRegister(Boolean ipReadonlyRegister) {
        this.ipReadonlyRegister = ipReadonlyRegister;
    }

    public void setIpRegisterData(Integer ipRegisterData) {
        this.ipRegisterData = ipRegisterData;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof ModbusWaitSingleRegisterBp)) {
            return false;
        }
        ModbusWaitSingleRegisterBp other = (ModbusWaitSingleRegisterBp)o;
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
        Boolean this$ipReadonlyRegister = this.getIpReadonlyRegister();
        Boolean other$ipReadonlyRegister = other.getIpReadonlyRegister();
        if (this$ipReadonlyRegister == null ? other$ipReadonlyRegister != null : !((Object)this$ipReadonlyRegister).equals(other$ipReadonlyRegister)) {
            return false;
        }
        Integer this$ipRegisterData = this.getIpRegisterData();
        Integer other$ipRegisterData = other.getIpRegisterData();
        if (this$ipRegisterData == null ? other$ipRegisterData != null : !((Object)this$ipRegisterData).equals(other$ipRegisterData)) {
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
        return !(this$ipModbusHost == null ? other$ipModbusHost != null : !this$ipModbusHost.equals(other$ipModbusHost));
    }

    protected boolean canEqual(Object other) {
        return other instanceof ModbusWaitSingleRegisterBp;
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
        Boolean $ipReadonlyRegister = this.getIpReadonlyRegister();
        result = result * 59 + ($ipReadonlyRegister == null ? 43 : ((Object)$ipReadonlyRegister).hashCode());
        Integer $ipRegisterData = this.getIpRegisterData();
        result = result * 59 + ($ipRegisterData == null ? 43 : ((Object)$ipRegisterData).hashCode());
        WindService $windService = this.getWindService();
        result = result * 59 + ($windService == null ? 43 : $windService.hashCode());
        WindTaskRecordMapper $windTaskRecordMapper = this.getWindTaskRecordMapper();
        result = result * 59 + ($windTaskRecordMapper == null ? 43 : $windTaskRecordMapper.hashCode());
        String $ipModbusHost = this.getIpModbusHost();
        result = result * 59 + ($ipModbusHost == null ? 43 : $ipModbusHost.hashCode());
        return result;
    }

    public String toString() {
        return "ModbusWaitSingleRegisterBp(windService=" + this.getWindService() + ", windTaskRecordMapper=" + this.getWindTaskRecordMapper() + ", ipModbusHost=" + this.getIpModbusHost() + ", ipModbusPort=" + this.getIpModbusPort() + ", ipRegisterAddress=" + this.getIpRegisterAddress() + ", ipSlaveId=" + this.getIpSlaveId() + ", ipReadonlyRegister=" + this.getIpReadonlyRegister() + ", ipRegisterData=" + this.getIpRegisterData() + ")";
    }
}

