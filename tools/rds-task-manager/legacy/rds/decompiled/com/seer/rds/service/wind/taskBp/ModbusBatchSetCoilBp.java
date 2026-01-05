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
 *  com.seer.rds.service.wind.taskBp.ModbusBatchSetCoilBp
 *  com.seer.rds.vo.wind.ModbusBatchSetCoilBpField
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
import com.seer.rds.vo.wind.ModbusBatchSetCoilBpField;
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

@Component(value="ModbusBatchSetCoilBp")
@Scope(value="prototype")
public class ModbusBatchSetCoilBp
extends AbstractBp {
    private static final Logger log = LoggerFactory.getLogger(ModbusBatchSetCoilBp.class);
    @Autowired
    private WindService windService;
    @Autowired
    private WindTaskRecordMapper windTaskRecordMapper;
    String ipModbusHost;
    Integer ipModbusPort;
    Integer ipCoilAddress;
    Integer ipSlaveId;
    Object ipCoilStatus;

    protected void getInputParamsAndExecute(AbstratRootBp rootBp) throws Exception {
        this.ipModbusHost = String.valueOf(rootBp.getInputParamValue(this.taskId, this.inputParams, ModbusBatchSetCoilBpField.ipModbusHost));
        this.ipModbusPort = Integer.valueOf(rootBp.getInputParamValue(this.taskId, this.inputParams, ModbusBatchSetCoilBpField.ipModbusPort).toString());
        this.ipCoilAddress = Integer.valueOf(rootBp.getInputParamValue(this.taskId, this.inputParams, ModbusBatchSetCoilBpField.ipCoilAddress).toString());
        this.ipSlaveId = Integer.valueOf(rootBp.getInputParamValue(this.taskId, this.inputParams, ModbusBatchSetCoilBpField.ipSlaveId).toString());
        this.ipCoilStatus = rootBp.getInputParamValue(this.taskId, this.inputParams, ModbusBatchSetCoilBpField.ipCoilStatus);
        List ipCoilStatusList = new ArrayList();
        if (this.ipCoilStatus != null) {
            try {
                Object parse = JSON.parse((Object)this.ipCoilStatus);
                String s = parse.toString();
                ipCoilStatusList = JSONObject.parseArray((String)s, Boolean.class);
            }
            catch (Exception e) {
                throw new Exception(String.format("@{response.code.paramsError}:%s", this.ipCoilStatus), e);
            }
        }
        boolean[] ipCoilStatusBoolean = new boolean[ipCoilStatusList.size()];
        for (int i = 0; i < ipCoilStatusList.size(); ++i) {
            ipCoilStatusBoolean[i] = (Boolean)ipCoilStatusList.get(i);
        }
        boolean modbusException = false;
        int socketExceptionCount = 0;
        while (true) {
            try {
                WindTaskStatus.monitorTaskEndErrorAndTaskStop((AbstractBp)this);
                Modbus4jUtils.batchWriteCoils((String)this.ipModbusHost, (int)this.ipModbusPort, (int)this.ipSlaveId, (int)this.ipCoilAddress, (boolean[])ipCoilStatusBoolean, (String)"ModbusBatchSetCoilBp");
            }
            catch (Exception e) {
                if (!(e instanceof ErrorResponseException || e instanceof ModbusTransportException || e instanceof TimeoutException || e instanceof ModbusInitException)) {
                    throw e;
                }
                socketExceptionCount = Modbus4jUtils.socketExceptionHandle((Exception)e, (int)socketExceptionCount, (String)(this.ipModbusHost + ":" + this.ipModbusPort));
                log.error("ModbusBatchSetCoilBp [{},{}] {}]", new Object[]{this.ipModbusHost, this.ipModbusPort, e});
                this.saveLogError(e.getMessage());
                if (!modbusException) {
                    this.blockRecord.setOutputParams(JSONObject.toJSONString(AbstratRootBp.outputParamsMap.get()));
                    this.blockRecord.setInputParams(JSONObject.toJSONString(AbstratRootBp.inputParamsMap.get()));
                    this.blockRecord.setInternalVariables(JSONObject.toJSONString(AbstratRootBp.taskVariablesMap.get()));
                    this.blockRecord.setBlockInputParams(this.inputParams != null ? this.inputParams.toJSONString() : null);
                    this.windService.saveSuspendErrorBlockRecord(this.blockRecord, this.blockVo.getBlockId(), this.blockVo.getBlockType(), this.taskRecord.getProjectId(), this.taskId, this.taskRecord.getId(), this.startOn, "modbus @{wind.bp.retry}...");
                    this.windService.updateTaskRecordEndedReason(this.taskRecord.getId(), "[ModbusBatchSetCoilBp]modbus @{wind.bp.retry}");
                }
                modbusException = true;
                Thread.sleep(PropConfig.getModbusRetryDelay());
                continue;
            }
            break;
        }
        StringBuilder message = new StringBuilder();
        message.append("ipModbusHost=").append(this.ipModbusHost).append(",ipModbusPort=").append(this.ipModbusPort).append(",ipCoilAddress=").append(this.ipCoilAddress).append(",ipSlaveId=").append(this.ipSlaveId).append(",ipCoilStatus=").append(this.ipCoilStatus);
        log.info("ModbusBatchSetCoilBp " + message);
    }

    protected void setBlockInputParamsValue(AbstratRootBp rootBp) throws Exception {
        ModbusBatchSetCoilBp bpData = new ModbusBatchSetCoilBp();
        bpData.setIpModbusHost(this.ipModbusHost);
        bpData.setIpModbusPort(this.ipModbusPort);
        bpData.setIpSlaveId(this.ipSlaveId);
        bpData.setIpCoilAddress(this.ipCoilAddress);
        bpData.setIpCoilStatus(this.ipCoilStatus);
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

    public Object getIpCoilStatus() {
        return this.ipCoilStatus;
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

    public void setIpCoilStatus(Object ipCoilStatus) {
        this.ipCoilStatus = ipCoilStatus;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof ModbusBatchSetCoilBp)) {
            return false;
        }
        ModbusBatchSetCoilBp other = (ModbusBatchSetCoilBp)o;
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
        Object this$ipCoilStatus = this.getIpCoilStatus();
        Object other$ipCoilStatus = other.getIpCoilStatus();
        return !(this$ipCoilStatus == null ? other$ipCoilStatus != null : !this$ipCoilStatus.equals(other$ipCoilStatus));
    }

    protected boolean canEqual(Object other) {
        return other instanceof ModbusBatchSetCoilBp;
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
        WindService $windService = this.getWindService();
        result = result * 59 + ($windService == null ? 43 : $windService.hashCode());
        WindTaskRecordMapper $windTaskRecordMapper = this.getWindTaskRecordMapper();
        result = result * 59 + ($windTaskRecordMapper == null ? 43 : $windTaskRecordMapper.hashCode());
        String $ipModbusHost = this.getIpModbusHost();
        result = result * 59 + ($ipModbusHost == null ? 43 : $ipModbusHost.hashCode());
        Object $ipCoilStatus = this.getIpCoilStatus();
        result = result * 59 + ($ipCoilStatus == null ? 43 : $ipCoilStatus.hashCode());
        return result;
    }

    public String toString() {
        return "ModbusBatchSetCoilBp(windService=" + this.getWindService() + ", windTaskRecordMapper=" + this.getWindTaskRecordMapper() + ", ipModbusHost=" + this.getIpModbusHost() + ", ipModbusPort=" + this.getIpModbusPort() + ", ipCoilAddress=" + this.getIpCoilAddress() + ", ipSlaveId=" + this.getIpSlaveId() + ", ipCoilStatus=" + this.getIpCoilStatus() + ")";
    }
}

