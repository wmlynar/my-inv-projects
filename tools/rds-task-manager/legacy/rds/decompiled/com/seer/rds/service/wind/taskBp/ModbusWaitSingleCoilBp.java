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
 *  com.seer.rds.service.wind.taskBp.ModbusWaitSingleCoilBp
 *  com.seer.rds.vo.wind.ModbusWaitSingleCoilBpField
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
import com.seer.rds.vo.wind.ModbusWaitSingleCoilBpField;
import com.serotonin.modbus4j.exception.ErrorResponseException;
import com.serotonin.modbus4j.exception.ModbusInitException;
import com.serotonin.modbus4j.exception.ModbusTransportException;
import com.serotonin.modbus4j.sero.messaging.TimeoutException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Scope;
import org.springframework.stereotype.Component;

@Component(value="ModbusWaitSingleCoilBp")
@Scope(value="prototype")
public class ModbusWaitSingleCoilBp
extends AbstractBp {
    private static final Logger log = LoggerFactory.getLogger(ModbusWaitSingleCoilBp.class);
    @Autowired
    private WindService windService;
    @Autowired
    private WindTaskRecordMapper windTaskRecordMapper;
    String ipModbusHost;
    Integer ipModbusPort;
    Integer ipCoilAddress;
    Integer ipSlaveId;
    Boolean ipReadonlyCoil;
    Boolean ipTargetCoilStatus;

    protected void getInputParamsAndExecute(AbstratRootBp rootBp) throws Exception {
        this.ipModbusHost = String.valueOf(rootBp.getInputParamValue(this.taskId, this.inputParams, ModbusWaitSingleCoilBpField.ipModbusHost));
        this.ipModbusPort = Integer.valueOf(rootBp.getInputParamValue(this.taskId, this.inputParams, ModbusWaitSingleCoilBpField.ipModbusPort).toString());
        this.ipCoilAddress = Integer.valueOf(rootBp.getInputParamValue(this.taskId, this.inputParams, ModbusWaitSingleCoilBpField.ipCoilAddress).toString());
        this.ipSlaveId = Integer.valueOf(rootBp.getInputParamValue(this.taskId, this.inputParams, ModbusWaitSingleCoilBpField.ipSlaveId).toString());
        this.ipReadonlyCoil = Boolean.valueOf(rootBp.getInputParamValue(this.taskId, this.inputParams, ModbusWaitSingleCoilBpField.ipReadonlyCoil).toString());
        this.ipTargetCoilStatus = Boolean.parseBoolean(rootBp.getInputParamValue(this.taskId, this.inputParams, ModbusWaitSingleCoilBpField.ipTargetCoilStatus).toString());
        Boolean modbusValue = null;
        boolean modbusException = false;
        int socketExceptionCount = 0;
        while (true) {
            try {
                WindTaskStatus.monitorTaskEndErrorAndTaskStop((AbstractBp)this);
                modbusValue = this.ipReadonlyCoil != false ? Modbus4jUtils.readInputStatus((String)this.ipModbusHost, (int)this.ipModbusPort, (int)this.ipSlaveId, (int)this.ipCoilAddress, (String)"ModbusWaitSingleCoilBp") : Modbus4jUtils.readCoilStatus((String)this.ipModbusHost, (int)this.ipModbusPort, (int)this.ipSlaveId, (int)this.ipCoilAddress, (String)"ModbusWaitSingleCoilBp");
                if (modbusValue.equals(this.ipTargetCoilStatus)) {
                    log.info("ipModbusHost:{}, ipModbusPort:{}, status:{}, coilStatus:{}", new Object[]{this.ipModbusHost, this.ipModbusPort, modbusValue, this.ipTargetCoilStatus});
                    break;
                }
                this.saveLogSuspend(String.format("@{wind.bp.deviceExpected}:%s, @{wind.bp.deviceReality}:%s", this.ipTargetCoilStatus, modbusValue));
                if (modbusException) {
                    this.blockRecord.setOutputParams(JSONObject.toJSONString(AbstratRootBp.outputParamsMap.get()));
                    this.blockRecord.setInputParams(JSONObject.toJSONString(AbstratRootBp.inputParamsMap.get()));
                    this.blockRecord.setInternalVariables(JSONObject.toJSONString(AbstratRootBp.taskVariablesMap.get()));
                    this.blockRecord.setBlockInputParams(this.inputParams != null ? this.inputParams.toJSONString() : null);
                    this.windService.saveBlockRecord(this.blockRecord, this.blockVo.getBlockId(), this.blockVo.getBlockType(), this.taskRecord.getProjectId(), this.taskId, this.taskRecord.getId(), this.startOn);
                    this.windService.updateTaskRecordEndedReason(this.taskRecord.getId(), "[ModbusWaitSingleCoilBp]modbus @{wind.bp.retryConnect}");
                }
                modbusException = false;
            }
            catch (Exception e) {
                if (!(e instanceof ErrorResponseException || e instanceof ModbusTransportException || e instanceof TimeoutException || e instanceof ModbusInitException)) {
                    throw e;
                }
                socketExceptionCount = Modbus4jUtils.socketExceptionHandle((Exception)e, (int)socketExceptionCount, (String)(this.ipModbusHost + ":" + this.ipModbusPort));
                log.error("ModbusWaitSingleCoilBp [{},{}] {}]", new Object[]{this.ipModbusHost, this.ipModbusPort, e});
                this.saveLogError(e.getMessage());
                if (!modbusException) {
                    this.blockRecord.setOutputParams(JSONObject.toJSONString(AbstratRootBp.outputParamsMap.get()));
                    this.blockRecord.setInputParams(JSONObject.toJSONString(AbstratRootBp.inputParamsMap.get()));
                    this.blockRecord.setInternalVariables(JSONObject.toJSONString(AbstratRootBp.taskVariablesMap.get()));
                    this.blockRecord.setBlockInputParams(this.inputParams != null ? this.inputParams.toJSONString() : null);
                    this.windService.saveSuspendErrorBlockRecord(this.blockRecord, this.blockVo.getBlockId(), this.blockVo.getBlockType(), this.taskRecord.getProjectId(), this.taskId, this.taskRecord.getId(), this.startOn, "modbus @{wind.bp.retry}...");
                    this.windService.updateTaskRecordEndedReason(this.taskRecord.getId(), "[ModbusWaitSingleCoilBp]modbus @{wind.bp.retry}");
                }
                modbusException = true;
            }
            Thread.sleep(PropConfig.getModbusRetryDelay());
        }
        StringBuilder message = new StringBuilder();
        message.append("ipModbusHost=").append(this.ipModbusHost).append(",ipModbusPort=").append(this.ipModbusPort).append(",ipCoilAddress=").append(this.ipCoilAddress).append(",ipSlaveId=").append(this.ipSlaveId).append(",ipReadonlyCoil=").append(this.ipReadonlyCoil).append(",ipTargetCoilStatus=").append(this.ipTargetCoilStatus);
        log.info("ModbusWaitSingleCoilBp {}", (Object)message);
    }

    protected void setBlockInputParamsValue(AbstratRootBp rootBp) throws Exception {
        ModbusWaitSingleCoilBp bpData = new ModbusWaitSingleCoilBp();
        bpData.setIpModbusHost(this.ipModbusHost);
        bpData.setIpModbusPort(this.ipModbusPort);
        bpData.setIpSlaveId(this.ipSlaveId);
        bpData.setIpCoilAddress(this.ipCoilAddress);
        bpData.setIpReadonlyCoil(this.ipReadonlyCoil);
        bpData.setIpTargetCoilStatus(this.ipTargetCoilStatus);
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

    public Integer getIpCoilAddress() {
        return this.ipCoilAddress;
    }

    public Integer getIpSlaveId() {
        return this.ipSlaveId;
    }

    public Boolean getIpReadonlyCoil() {
        return this.ipReadonlyCoil;
    }

    public Boolean getIpTargetCoilStatus() {
        return this.ipTargetCoilStatus;
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

    public void setIpCoilAddress(Integer ipCoilAddress) {
        this.ipCoilAddress = ipCoilAddress;
    }

    public void setIpSlaveId(Integer ipSlaveId) {
        this.ipSlaveId = ipSlaveId;
    }

    public void setIpReadonlyCoil(Boolean ipReadonlyCoil) {
        this.ipReadonlyCoil = ipReadonlyCoil;
    }

    public void setIpTargetCoilStatus(Boolean ipTargetCoilStatus) {
        this.ipTargetCoilStatus = ipTargetCoilStatus;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof ModbusWaitSingleCoilBp)) {
            return false;
        }
        ModbusWaitSingleCoilBp other = (ModbusWaitSingleCoilBp)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        Integer this$ipModbusPort = this.getIpModbusPort();
        Integer other$ipModbusPort = other.getIpModbusPort();
        if (this$ipModbusPort == null ? other$ipModbusPort != null : !((Object)this$ipModbusPort).equals(other$ipModbusPort)) {
            return false;
        }
        Integer this$ipCoilAddress = this.getIpCoilAddress();
        Integer other$ipCoilAddress = other.getIpCoilAddress();
        if (this$ipCoilAddress == null ? other$ipCoilAddress != null : !((Object)this$ipCoilAddress).equals(other$ipCoilAddress)) {
            return false;
        }
        Integer this$ipSlaveId = this.getIpSlaveId();
        Integer other$ipSlaveId = other.getIpSlaveId();
        if (this$ipSlaveId == null ? other$ipSlaveId != null : !((Object)this$ipSlaveId).equals(other$ipSlaveId)) {
            return false;
        }
        Boolean this$ipReadonlyCoil = this.getIpReadonlyCoil();
        Boolean other$ipReadonlyCoil = other.getIpReadonlyCoil();
        if (this$ipReadonlyCoil == null ? other$ipReadonlyCoil != null : !((Object)this$ipReadonlyCoil).equals(other$ipReadonlyCoil)) {
            return false;
        }
        Boolean this$ipTargetCoilStatus = this.getIpTargetCoilStatus();
        Boolean other$ipTargetCoilStatus = other.getIpTargetCoilStatus();
        if (this$ipTargetCoilStatus == null ? other$ipTargetCoilStatus != null : !((Object)this$ipTargetCoilStatus).equals(other$ipTargetCoilStatus)) {
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
        return other instanceof ModbusWaitSingleCoilBp;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        Integer $ipModbusPort = this.getIpModbusPort();
        result = result * 59 + ($ipModbusPort == null ? 43 : ((Object)$ipModbusPort).hashCode());
        Integer $ipCoilAddress = this.getIpCoilAddress();
        result = result * 59 + ($ipCoilAddress == null ? 43 : ((Object)$ipCoilAddress).hashCode());
        Integer $ipSlaveId = this.getIpSlaveId();
        result = result * 59 + ($ipSlaveId == null ? 43 : ((Object)$ipSlaveId).hashCode());
        Boolean $ipReadonlyCoil = this.getIpReadonlyCoil();
        result = result * 59 + ($ipReadonlyCoil == null ? 43 : ((Object)$ipReadonlyCoil).hashCode());
        Boolean $ipTargetCoilStatus = this.getIpTargetCoilStatus();
        result = result * 59 + ($ipTargetCoilStatus == null ? 43 : ((Object)$ipTargetCoilStatus).hashCode());
        WindService $windService = this.getWindService();
        result = result * 59 + ($windService == null ? 43 : $windService.hashCode());
        WindTaskRecordMapper $windTaskRecordMapper = this.getWindTaskRecordMapper();
        result = result * 59 + ($windTaskRecordMapper == null ? 43 : $windTaskRecordMapper.hashCode());
        String $ipModbusHost = this.getIpModbusHost();
        result = result * 59 + ($ipModbusHost == null ? 43 : $ipModbusHost.hashCode());
        return result;
    }

    public String toString() {
        return "ModbusWaitSingleCoilBp(windService=" + this.getWindService() + ", windTaskRecordMapper=" + this.getWindTaskRecordMapper() + ", ipModbusHost=" + this.getIpModbusHost() + ", ipModbusPort=" + this.getIpModbusPort() + ", ipCoilAddress=" + this.getIpCoilAddress() + ", ipSlaveId=" + this.getIpSlaveId() + ", ipReadonlyCoil=" + this.getIpReadonlyCoil() + ", ipTargetCoilStatus=" + this.getIpTargetCoilStatus() + ")";
    }
}

