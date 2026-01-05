/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.alibaba.fastjson.JSONObject
 *  com.google.common.collect.Maps
 *  com.seer.rds.config.PropConfig
 *  com.seer.rds.dao.WindTaskRecordMapper
 *  com.seer.rds.modbus.Modbus4jUtils
 *  com.seer.rds.service.agv.WindService
 *  com.seer.rds.service.wind.AbstractBp
 *  com.seer.rds.service.wind.AbstratRootBp
 *  com.seer.rds.service.wind.WindTaskStatus
 *  com.seer.rds.service.wind.taskBp.ModbusBatchReadInputRegisterBp
 *  com.seer.rds.vo.wind.ModbusBatchReadHoldingRegisterBpField
 *  com.seer.rds.vo.wind.ModbusBatchReadInputRegisterBpField
 *  com.seer.rds.vo.wind.ParamPreField
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
import com.google.common.collect.Maps;
import com.seer.rds.config.PropConfig;
import com.seer.rds.dao.WindTaskRecordMapper;
import com.seer.rds.modbus.Modbus4jUtils;
import com.seer.rds.service.agv.WindService;
import com.seer.rds.service.wind.AbstractBp;
import com.seer.rds.service.wind.AbstratRootBp;
import com.seer.rds.service.wind.WindTaskStatus;
import com.seer.rds.vo.wind.ModbusBatchReadHoldingRegisterBpField;
import com.seer.rds.vo.wind.ModbusBatchReadInputRegisterBpField;
import com.seer.rds.vo.wind.ParamPreField;
import com.serotonin.modbus4j.exception.ErrorResponseException;
import com.serotonin.modbus4j.exception.ModbusInitException;
import com.serotonin.modbus4j.exception.ModbusTransportException;
import com.serotonin.modbus4j.sero.messaging.TimeoutException;
import java.util.Arrays;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Scope;
import org.springframework.stereotype.Component;

@Component(value="ModbusBatchReadInputRegisterBp")
@Scope(value="prototype")
public class ModbusBatchReadInputRegisterBp
extends AbstractBp {
    private static final Logger log = LoggerFactory.getLogger(ModbusBatchReadInputRegisterBp.class);
    @Autowired
    private WindService windService;
    @Autowired
    private WindTaskRecordMapper windTaskRecordMapper;
    String ipModbusHost;
    Integer ipModbusPort;
    Integer ipRegisterOffset;
    Integer ipSlaveId;
    Integer ipLength;

    protected void getInputParamsAndExecute(AbstratRootBp rootBp) throws Exception {
        short[] modbusValue;
        this.ipModbusHost = String.valueOf(rootBp.getInputParamValue(this.taskId, this.inputParams, ModbusBatchReadInputRegisterBpField.ipModbusHost));
        this.ipModbusPort = Integer.valueOf(rootBp.getInputParamValue(this.taskId, this.inputParams, ModbusBatchReadInputRegisterBpField.ipModbusPort).toString());
        this.ipRegisterOffset = Integer.valueOf(rootBp.getInputParamValue(this.taskId, this.inputParams, ModbusBatchReadInputRegisterBpField.ipRegisterOffset).toString());
        this.ipSlaveId = Integer.valueOf(rootBp.getInputParamValue(this.taskId, this.inputParams, ModbusBatchReadInputRegisterBpField.ipSlaveId).toString());
        this.ipLength = Integer.valueOf(rootBp.getInputParamValue(this.taskId, this.inputParams, ModbusBatchReadInputRegisterBpField.ipLength).toString());
        boolean modbusException = false;
        int socketExceptionCount = 0;
        while (true) {
            try {
                WindTaskStatus.monitorTaskEndErrorAndTaskStop((AbstractBp)this);
                modbusValue = Modbus4jUtils.batchReadInputRegisters((String)this.ipModbusHost, (int)this.ipModbusPort, (int)this.ipSlaveId, (int)this.ipRegisterOffset, (int)this.ipLength, (String)"ModbusBatchReadInputRegisterBp");
            }
            catch (Exception e) {
                if (!(e instanceof ErrorResponseException || e instanceof ModbusTransportException || e instanceof TimeoutException || e instanceof ModbusInitException)) {
                    throw e;
                }
                socketExceptionCount = Modbus4jUtils.socketExceptionHandle((Exception)e, (int)socketExceptionCount, (String)(this.ipModbusHost + ":" + this.ipModbusPort));
                log.error("ModbusBatchReadInputRegisterBp [{},{}] {}]", new Object[]{this.ipModbusHost, this.ipModbusPort, e});
                this.saveLogError(e.getMessage());
                if (!modbusException) {
                    this.blockRecord.setOutputParams(JSONObject.toJSONString(AbstratRootBp.outputParamsMap.get()));
                    this.blockRecord.setInputParams(JSONObject.toJSONString(AbstratRootBp.inputParamsMap.get()));
                    this.blockRecord.setInternalVariables(JSONObject.toJSONString(AbstratRootBp.taskVariablesMap.get()));
                    this.blockRecord.setBlockInputParams(this.inputParams != null ? this.inputParams.toJSONString() : null);
                    this.windService.saveSuspendErrorBlockRecord(this.blockRecord, this.blockVo.getBlockId(), this.blockVo.getBlockType(), this.taskRecord.getProjectId(), this.taskId, this.taskRecord.getId(), this.startOn, "modbus @{wind.bp.retry}...");
                    this.windService.updateTaskRecordEndedReason(this.taskRecord.getId(), "[ModbusBatchReadInputRegisterBp]modbus @{wind.bp.retry}");
                }
                modbusException = true;
                Thread.sleep(PropConfig.getModbusRetryDelay());
                continue;
            }
            break;
        }
        StringBuilder message = new StringBuilder();
        message.append("ipModbusHost=").append(this.ipModbusHost).append(",ipModbusPort=").append(this.ipModbusPort).append(",ipRegisterOffset=").append(this.ipRegisterOffset).append(",ipSlaveId=").append(this.ipSlaveId).append(",ipLength=").append(this.ipLength).append(",value=").append(Arrays.toString(modbusValue));
        this.saveLogResult((Object)Arrays.toString(modbusValue));
        log.info("ModbusBatchReadInputRegisterBp " + message);
        Map paramMap = (Map)((ConcurrentHashMap)AbstratRootBp.outputParamsMap.get()).get(ParamPreField.blocks);
        ConcurrentMap childParamMap = Maps.newConcurrentMap();
        childParamMap.put(ModbusBatchReadHoldingRegisterBpField.ctxModbusValue, Arrays.toString(modbusValue));
        paramMap.put(this.blockVo.getBlockName(), childParamMap);
        ((ConcurrentHashMap)AbstratRootBp.outputParamsMap.get()).put(ParamPreField.blocks, paramMap);
    }

    protected void setBlockInputParamsValue(AbstratRootBp rootBp) throws Exception {
        ModbusBatchReadInputRegisterBp bpData = new ModbusBatchReadInputRegisterBp();
        bpData.setIpModbusHost(this.ipModbusHost);
        bpData.setIpModbusPort(this.ipModbusPort);
        bpData.setIpSlaveId(this.ipSlaveId);
        bpData.setIpLength(this.ipLength);
        bpData.setIpRegisterOffset(this.ipRegisterOffset);
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

    public Integer getIpRegisterOffset() {
        return this.ipRegisterOffset;
    }

    public Integer getIpSlaveId() {
        return this.ipSlaveId;
    }

    public Integer getIpLength() {
        return this.ipLength;
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

    public void setIpRegisterOffset(Integer ipRegisterOffset) {
        this.ipRegisterOffset = ipRegisterOffset;
    }

    public void setIpSlaveId(Integer ipSlaveId) {
        this.ipSlaveId = ipSlaveId;
    }

    public void setIpLength(Integer ipLength) {
        this.ipLength = ipLength;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof ModbusBatchReadInputRegisterBp)) {
            return false;
        }
        ModbusBatchReadInputRegisterBp other = (ModbusBatchReadInputRegisterBp)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        Integer this$ipModbusPort = this.getIpModbusPort();
        Integer other$ipModbusPort = other.getIpModbusPort();
        if (this$ipModbusPort == null ? other$ipModbusPort != null : !((Object)this$ipModbusPort).equals(other$ipModbusPort)) {
            return false;
        }
        Integer this$ipRegisterOffset = this.getIpRegisterOffset();
        Integer other$ipRegisterOffset = other.getIpRegisterOffset();
        if (this$ipRegisterOffset == null ? other$ipRegisterOffset != null : !((Object)this$ipRegisterOffset).equals(other$ipRegisterOffset)) {
            return false;
        }
        Integer this$ipSlaveId = this.getIpSlaveId();
        Integer other$ipSlaveId = other.getIpSlaveId();
        if (this$ipSlaveId == null ? other$ipSlaveId != null : !((Object)this$ipSlaveId).equals(other$ipSlaveId)) {
            return false;
        }
        Integer this$ipLength = this.getIpLength();
        Integer other$ipLength = other.getIpLength();
        if (this$ipLength == null ? other$ipLength != null : !((Object)this$ipLength).equals(other$ipLength)) {
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
        return other instanceof ModbusBatchReadInputRegisterBp;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        Integer $ipModbusPort = this.getIpModbusPort();
        result = result * 59 + ($ipModbusPort == null ? 43 : ((Object)$ipModbusPort).hashCode());
        Integer $ipRegisterOffset = this.getIpRegisterOffset();
        result = result * 59 + ($ipRegisterOffset == null ? 43 : ((Object)$ipRegisterOffset).hashCode());
        Integer $ipSlaveId = this.getIpSlaveId();
        result = result * 59 + ($ipSlaveId == null ? 43 : ((Object)$ipSlaveId).hashCode());
        Integer $ipLength = this.getIpLength();
        result = result * 59 + ($ipLength == null ? 43 : ((Object)$ipLength).hashCode());
        WindService $windService = this.getWindService();
        result = result * 59 + ($windService == null ? 43 : $windService.hashCode());
        WindTaskRecordMapper $windTaskRecordMapper = this.getWindTaskRecordMapper();
        result = result * 59 + ($windTaskRecordMapper == null ? 43 : $windTaskRecordMapper.hashCode());
        String $ipModbusHost = this.getIpModbusHost();
        result = result * 59 + ($ipModbusHost == null ? 43 : $ipModbusHost.hashCode());
        return result;
    }

    public String toString() {
        return "ModbusBatchReadInputRegisterBp(windService=" + this.getWindService() + ", windTaskRecordMapper=" + this.getWindTaskRecordMapper() + ", ipModbusHost=" + this.getIpModbusHost() + ", ipModbusPort=" + this.getIpModbusPort() + ", ipRegisterOffset=" + this.getIpRegisterOffset() + ", ipSlaveId=" + this.getIpSlaveId() + ", ipLength=" + this.getIpLength() + ")";
    }
}

